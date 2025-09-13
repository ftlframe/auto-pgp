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
        const selectionsNeeded = {
            userKeyOptions: [],
            recipientKeyOptions: {},
            newContacts: []
        };

        const userKeyPairs = Array.from(userVaultEntry.keyPairs.values());

        if (payload.selections) {
            // --- THIS BLOCK IS NOW SMARTER ---
            console.log("[Auto-PGP] Received request with user selections.");
            const selections = payload.selections;

            // A. Determine the user's signing key
            if (selections.userKeyFingerprint) {
                // The user made an explicit choice in the modal.
                selectedUserKey = userVaultEntry.keyPairs.get(selections.userKeyFingerprint);
            } else if (userKeyPairs.length === 1) {
                // No choice was presented for the user key (because there was only one),
                // so we must auto-select it again here on the final request.
                selectedUserKey = userKeyPairs[0];
            }
            // --- END CORRECTION ---

            if (selections.newContactKeys) {
                for (const email in selections.newContactKeys) {
                    const armoredKey = selections.newContactKeys[email];
                    await handleAddContact(currentUserEmail, { name: email, email: email, publicKeyArmored: armoredKey });
                    const key = await openpgp.readKey({ armoredKey });
                    recipientPublicKeys.push(key);
                }
            }

            if (selections.recipientKeyFingerprints) {
                for (const email in selections.recipientKeyFingerprints) {
                    const contact = userVaultEntry.contacts.get(email);
                    const fingerprint = selections.recipientKeyFingerprints[email];
                    const keyInfo = contact?.publicKeys.find(k => k.fingerprint === fingerprint);
                    if (keyInfo) {
                        const key = await openpgp.readKey({ armoredKey: keyInfo.armoredKey });
                        recipientPublicKeys.push(key);
                    } else {
                        return { success: false, error: `Could not find selected key for ${email}` };
                    }
                }
            }
        } else {
            // This is the initial request, so we analyze for ambiguities.
            // This logic remains the same.
            if (userKeyPairs.length === 0) {
                return { success: false, error: "No PGP key found for you. Please generate one first." };
            } else if (userKeyPairs.length === 1) {
                selectedUserKey = userKeyPairs[0];
            } else {
                selectionsNeeded.userKeyOptions = userKeyPairs.map(kp => ({ fingerprint: kp.fingerprint, created: kp.dateCreated }));
            }

            for (const recipientEmail of payload.recipients) {
                const contact = userVaultEntry.contacts.get(recipientEmail);
                if (!contact) {
                    selectionsNeeded.newContacts.push(recipientEmail);
                } else if (!contact.publicKeys || contact.publicKeys.length === 0) {
                    return { success: false, error: `Contact ${recipientEmail} exists but has no public key stored.` };
                } else if (contact.publicKeys.length === 1) {
                    const key = await openpgp.readKey({ armoredKey: contact.publicKeys[0].armoredKey });
                    recipientPublicKeys.push(key);
                } else {
                    selectionsNeeded.recipientKeyOptions[recipientEmail] = contact.publicKeys.map(pk => ({
                        fingerprint: pk.fingerprint, created: pk.created, nickname: pk.nickname
                    }));
                }
            }
        }

        if (selectionsNeeded.userKeyOptions.length > 0 || Object.keys(selectionsNeeded.recipientKeyOptions).length > 0 || selectionsNeeded.newContacts.length > 0) {
            return { success: false, error: "key_selection_required", payload: selectionsNeeded };
        }

        if (!selectedUserKey) {
            return { success: false, error: "Could not determine a signing key." };
        }
        if (recipientPublicKeys.length === 0) {
            return { success: false, error: "No valid recipient public keys found." };
        }

        const decryptedPrivateKeyArmor = await decrypt(derivedKey, selectedUserKey.iv, selectedUserKey.encryptedPrivateKey);
        const userPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });

        const message = await openpgp.createMessage({ text: payload.content });

        console.log("[Auto-PGP] Performing encryption and signing...");
        const encryptedMessage = await openpgp.encrypt({
            message,
            encryptionKeys: recipientPublicKeys,
            signingKeys: userPrivateKey,
        });

        console.log("[Auto-PGP] Encryption successful.");
        return { success: true, encryptedContent: encryptedMessage };

    } catch (error) {
        console.error("PGP Encryption failed:", error);
        return { success: false, error: error.message };
    }
}