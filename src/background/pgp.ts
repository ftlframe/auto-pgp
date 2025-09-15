import * as openpgp from 'openpgp';
import { decrypt } from '~lib/crypto/vault';
import type { Contact, KeyPair, PublicKeyInfo } from '~types/vault';
import { handleAddContact } from './contacts';
import { globalVars } from './userState';
import { securePasswordStore } from './vault';

export let pendingEncryptionRequest: any = null;

export async function handlePgpEncryptRequest(payload: {
    recipients: string[];
    content: string;
    selections?: {
        userKeyFingerprint: string;
        recipientKeyFingerprints: { [email: string]: string };
        newContactKeys: { [email: string]: string };
    }
}) {
    try {
        const unlockedVault = securePasswordStore.getVault();
        const derivedKey = securePasswordStore.getKey();
        const currentUserEmail = globalVars.getEmail();

        if (!unlockedVault || !derivedKey) {
            pendingEncryptionRequest = payload;
            return { success: false, error: "vault_locked" };
        }

        const userVaultEntry = unlockedVault.vault.get(currentUserEmail);
        if (!userVaultEntry) {
            return { success: false, error: "No vault entry found for the current user." };
        }

        let selectedUserKey: KeyPair | undefined;
        const recipientPublicKeys: openpgp.Key[] = [];

        // --- Determine the user's signing key first ---
        const userKeyPairs = Array.from(userVaultEntry.keyPairs.values());
        if (payload.selections?.userKeyFingerprint) {
            // User made an explicit choice
            selectedUserKey = userVaultEntry.keyPairs.get(payload.selections.userKeyFingerprint);
        } else if (userKeyPairs.length === 1) {
            // Auto-select if there's only one key
            selectedUserKey = userKeyPairs[0];
        } else if (userKeyPairs.length > 1 && !payload.selections) {
            // If there's ambiguity and no selection has been made yet, we must ask.
            // This logic is part of the ambiguity check below.
        } else if (userKeyPairs.length === 0) {
            return { success: false, error: "No PGP key found for you. Please generate one first." };
        }

        // --- If this is the first pass, check for any ambiguities ---
        if (!payload.selections) {
            const selectionsNeeded = {
                userKeyOptions: [],
                recipientKeyOptions: {},
                newContacts: []
            };

            if (userKeyPairs.length > 1) {
                selectionsNeeded.userKeyOptions = userKeyPairs.map(kp => ({ fingerprint: kp.fingerprint, created: kp.created }));
            }

            for (const recipientEmail of payload.recipients) {
                const contact = userVaultEntry.contacts.get(recipientEmail);
                if (!contact) {
                    selectionsNeeded.newContacts.push(recipientEmail);
                } else if (contact.publicKeys.length > 1) {
                    selectionsNeeded.recipientKeyOptions[recipientEmail] = contact.publicKeys.map(pk => ({
                        fingerprint: pk.fingerprint, created: pk.created, nickname: pk.nickname
                    }));
                }
            }

            // If any selections are needed, return now and wait for the user to respond.
            if (selectionsNeeded.userKeyOptions.length > 0 || Object.keys(selectionsNeeded.recipientKeyOptions).length > 0 || selectionsNeeded.newContacts.length > 0) {
                return { success: false, error: "key_selection_required", payload: selectionsNeeded };
            }
        }

        // --- Process the full recipient list to gather public keys ---
        for (const recipientEmail of payload.recipients) {
            const contact = userVaultEntry.contacts.get(recipientEmail);
            let armoredKey: string | undefined;

            if (payload.selections?.newContactKeys?.[recipientEmail]) {
                // This is a new contact, use the key provided from the modal
                armoredKey = payload.selections.newContactKeys[recipientEmail];
                await handleAddContact(currentUserEmail, { name: recipientEmail, email: recipientEmail, publicKeyArmored: armoredKey });
            } else if (payload.selections?.recipientKeyFingerprints?.[recipientEmail]) {
                // This is a contact with multiple keys, use the selected one
                const fingerprint = payload.selections.recipientKeyFingerprints[recipientEmail];
                armoredKey = contact?.publicKeys.find(k => k.fingerprint === fingerprint)?.armoredKey;
            } else if (contact?.publicKeys.length === 1) {
                // This is a simple case, auto-select the only key
                armoredKey = contact.publicKeys[0].armoredKey;
            }

            if (armoredKey) {
                recipientPublicKeys.push(await openpgp.readKey({ armoredKey }));
            }
        }

        // --- Final check and encryption ---
        if (!selectedUserKey) return { success: false, error: "Could not determine a signing key." };
        if (recipientPublicKeys.length === 0) return { success: false, error: "No valid recipient public keys found." };

        const decryptedPrivateKeyArmor = await decrypt(derivedKey, selectedUserKey.iv, selectedUserKey.encryptedPrivateKey);
        const userPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
        const message = await openpgp.createMessage({ text: payload.content });
        const encryptedMessage = await openpgp.encrypt({
            message,
            encryptionKeys: recipientPublicKeys,
            signingKeys: userPrivateKey,
        });

        return { success: true, encryptedContent: encryptedMessage };

    } catch (error) {
        console.error("PGP Encryption failed:", error);
        return { success: false, error: error.message };
    }
}