import * as openpgp from 'openpgp';
import { decrypt, deriveKey } from '~lib/crypto/vault';
import type { Contact, KeyPair, PublicKeyInfo } from '~types/vault';
import { handleAddContact } from './contacts';
import { globalVars } from './userState';
import { securePasswordStore } from './vault';
import { storage } from '~background';

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
    console.groupCollapsed(`[PGP Encrypt] Starting request for: ${payload.recipients.join(', ')}`);
    console.log("Full payload received:", payload);

    try {
        const unlockedVault = securePasswordStore.getVault();
        const derivedKey = securePasswordStore.getKey();
        const currentUserEmail = globalVars.getEmail();

        console.log(`Current user: ${currentUserEmail}, Vault status: ${unlockedVault ? 'Unlocked' : 'Locked'}`);

        if (!unlockedVault || !derivedKey) {
            console.warn("Vault is locked. Aborting and storing pending request.");
            console.groupEnd();
            return { success: false, error: "vault_locked" };
        }

        const userVaultEntry = unlockedVault.vault.get(currentUserEmail);
        if (!userVaultEntry) {
            console.error("No vault entry found for current user.");
            console.groupEnd();
            return { success: false, error: "No vault entry found for the current user." };
        }

        let selectedUserKey: KeyPair | undefined;
        const recipientPublicKeys: openpgp.Key[] = [];
        const userKeyPairs = Array.from(userVaultEntry.keyPairs.values());

        // --- Step 1: Initial Ambiguity Check (only on the first request) ---
        if (!payload.selections) {
            console.group("Phase 1: Analyzing for key ambiguities");
            const selectionsNeeded = { userKeyOptions: [], recipientKeyOptions: {}, newContacts: [] };
            let hasAmbiguity = false;

            console.log(`User key analysis: Found ${userKeyPairs.length} key(s).`);
            if (userKeyPairs.length > 1) {
                hasAmbiguity = true;
                selectionsNeeded.userKeyOptions = userKeyPairs.map(kp => ({ fingerprint: kp.fingerprint, created: kp.created }));
                console.log("-> User key ambiguity found.");
            }

            for (const recipientEmail of payload.recipients) {
                const contact = userVaultEntry.contacts.get(recipientEmail);
                if (!contact) {
                    hasAmbiguity = true;
                    selectionsNeeded.newContacts.push(recipientEmail);
                    console.log(`-> Recipient '${recipientEmail}': New contact.`);
                } else if (contact.publicKeys.length > 1) {
                    hasAmbiguity = true;
                    selectionsNeeded.recipientKeyOptions[recipientEmail] = contact.publicKeys.map(pk => ({
                        fingerprint: pk.fingerprint, created: pk.created, nickname: pk.nickname
                    }));
                    console.log(`-> Recipient '${recipientEmail}': Found ${contact.publicKeys.length} keys (ambiguity).`);
                } else if (contact.publicKeys.length === 1) {
                    console.log(`-> Recipient '${recipientEmail}': Found 1 key (auto-selecting).`);
                } else {
                    console.warn(`-> Recipient '${recipientEmail}': Contact exists but has no keys.`);
                }
            }

            console.groupEnd();
            if (hasAmbiguity) {
                console.log("Conclusion: Selections needed. Returning to UI.", selectionsNeeded);
                console.groupEnd();
                return { success: false, error: "key_selection_required", payload: selectionsNeeded };
            }
        }

        // --- Step 2: Gather All Keys (for a simple case OR a final request with selections) ---
        console.group("Phase 2: Gathering keys for encryption");

        if (payload.selections?.userKeyFingerprint) {
            selectedUserKey = userVaultEntry.keyPairs.get(payload.selections.userKeyFingerprint);
            console.log(`Signing key: User selected fingerprint ...${selectedUserKey?.fingerprint.slice(-16)}`);
        } else if (userKeyPairs.length >= 1) {
            selectedUserKey = userKeyPairs[0];
            console.log(`Signing key: Auto-selected fingerprint ...${selectedUserKey?.fingerprint.slice(-16)}`);
        }

        for (const recipientEmail of payload.recipients) {
            let armoredKey: string | undefined;
            if (payload.selections?.newContactKeys?.[recipientEmail]) {
                armoredKey = payload.selections.newContactKeys[recipientEmail];
                console.log(`Recipient '${recipientEmail}': Using newly provided key.`);
                await handleAddContact(currentUserEmail, { name: recipientEmail, email: recipientEmail, publicKeyArmored: armoredKey });
            } else if (payload.selections?.recipientKeyFingerprints?.[recipientEmail]) {
                const fingerprint = payload.selections.recipientKeyFingerprints[recipientEmail];
                armoredKey = userVaultEntry.contacts.get(recipientEmail)?.publicKeys.find(k => k.fingerprint === fingerprint)?.armoredKey;
                console.log(`Recipient '${recipientEmail}': Using user-selected key ...${fingerprint.slice(-16)}`);
            } else {
                const contact = userVaultEntry.contacts.get(recipientEmail);
                if (contact?.publicKeys.length === 1) {
                    armoredKey = contact.publicKeys[0].armoredKey;
                    console.log(`Recipient '${recipientEmail}': Using auto-selected key ...${contact.publicKeys[0].fingerprint.slice(-16)}`);
                }
            }
            if (armoredKey) {
                recipientPublicKeys.push(await openpgp.readKey({ armoredKey }));
            }
        }

        console.groupEnd();

        // --- Step 3: Final Checks and Encryption ---
        if (!selectedUserKey) {
            console.error("Final check failed: Could not determine a signing key.");
            console.groupEnd();
            return { success: false, error: "Could not determine a signing key." };
        }
        if (recipientPublicKeys.length === 0) {
            console.error("Final check failed: No valid public keys found for any recipients.");
            console.groupEnd();
            return { success: false, error: `No valid public keys found for any recipients. Please add them as contacts.` };
        }

        console.log("Decrypting signing key from vault...");
        const decryptedPrivateKeyArmor = await decrypt(derivedKey, selectedUserKey.iv, selectedUserKey.encryptedPrivateKey);
        if (!decryptedPrivateKeyArmor) throw new Error("Failed to decrypt private key for signing.");

        let keyPassphrase = ''; // Default to empty for keys made without a passphrase
        if (selectedUserKey.encryptedPassphrase && selectedUserKey.ivPassphrase) {
            console.log("Decrypting PGP key's own passphrase...");
            const decryptedPass = await decrypt(derivedKey, selectedUserKey.ivPassphrase, selectedUserKey.encryptedPassphrase);
            if (decryptedPass) {
                keyPassphrase = decryptedPass;
            }
        }

        console.log(`Unlocking signing key with its passphrase (length: ${keyPassphrase.length})...`);
        const lockedPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
        const userPrivateKey = await openpgp.decryptKey({
            privateKey: lockedPrivateKey,
            passphrase: keyPassphrase // Use the dynamically retrieved passphrase
        });

        const message = await openpgp.createMessage({ text: payload.content });

        console.log(`Finalizing: Encrypting for public keys with Key IDs:`, recipientPublicKeys.map(k => k.getKeyID().toHex().toUpperCase()));
        console.log(`Finalizing: Signing with key: ...${selectedUserKey.fingerprint.slice(-16)}`);

        const encryptedMessage = await openpgp.encrypt({
            message,
            encryptionKeys: recipientPublicKeys,
            signingKeys: userPrivateKey,
        });

        console.groupCollapsed("[PGP Encrypt] Verifying encrypted message headers");
        const parsedMessage = await openpgp.readMessage({ armoredMessage: encryptedMessage });
        const finalKeyIds = parsedMessage.getEncryptionKeyIDs().map(keyId => keyId.toHex().toUpperCase());
        console.log("Key IDs found in final message:", finalKeyIds);
        console.groupEnd();

        console.log("Encryption successful.");
        console.groupEnd();
        return { success: true, encryptedContent: encryptedMessage };

    } catch (error) {
        console.error("PGP Encryption failed:", error);
        console.groupEnd();
        return { success: false, error: error.message };
    }
}

// =======================================================================
// --- DECRYPTION LOGIC ---
// =======================================================================

let pendingDecryptionRequest: { armoredMessage: string, keyFingerprint: string, tabId: number } | null = null;

export function storePendingDecryption(request: { armoredMessage: string, keyFingerprint: string, tabId: number }) {
    pendingDecryptionRequest = request;
}

export function getPendingDecryption() {
    return pendingDecryptionRequest;
}

export async function handlePgpDecryptRequest(payload: { armoredMessage: string }) {
    console.groupCollapsed(`[PGP Decrypt] Phase 1: Analyzing message`);
    console.log("Received armored message:", payload.armoredMessage);

    try {
        const unlockedVault = securePasswordStore.getVault();
        const currentUserEmail = globalVars.getEmail();

        console.log(`Current user: ${currentUserEmail}, Vault status: ${unlockedVault ? 'Unlocked' : 'Locked'}`);
        if (!unlockedVault || !currentUserEmail) {
            console.warn("Vault is locked or user is unknown. Aborting.");
            console.groupEnd();
            return { success: false, error: "Vault is locked or user is unknown." };
        }

        const userVaultEntry = unlockedVault.vault.get(currentUserEmail);
        if (!userVaultEntry) {
            console.error("No vault entry for current user.");
            console.groupEnd();
            return { success: false, error: "No vault entry for current user." };
        }

        const encryptedMessage = await openpgp.readMessage({ armoredMessage: payload.armoredMessage });
        const requiredKeyIds = encryptedMessage.getEncryptionKeyIDs().map(keyId => keyId.toHex().toUpperCase());
        console.log("Message requires one of these Key IDs:", requiredKeyIds);

        const userPrivateKeys = Array.from(userVaultEntry.keyPairs.values());
        const availableKeyFingerprints = userPrivateKeys.map(kp => kp.fingerprint);
        console.log("User has these available private key fingerprints:", availableKeyFingerprints);

        let matchingKey: KeyPair | undefined;
        // This loop correctly inspects the primary key and all subkeys.
        for (const keyPair of userPrivateKeys) {
            const publicKey = await openpgp.readKey({ armoredKey: keyPair.armoredKey });

            const primaryKeyId = publicKey.getKeyID().toHex().toUpperCase();
            const subkeyIds = publicKey.getSubkeys().map(subkey => subkey.getKeyID().toHex().toUpperCase());
            const allAvailableIds = [primaryKeyId, ...subkeyIds];

            // Check if any of the message's required IDs match any of this key's available IDs.
            const isMatch = requiredKeyIds.some(requiredId =>
                allAvailableIds.some(availId => availId.endsWith(requiredId))
            );

            if (isMatch) {
                matchingKey = keyPair;
                break;
            }
        }

        if (!matchingKey) {
            console.error("Conclusion: No matching private key found in vault.");
            console.groupEnd();
            return { success: false, error: "You do not possess the required private key to decrypt this message." };
        }

        console.log(`Found a matching private key in vault: ...${matchingKey.fingerprint.slice(-16)}`);
        console.log("Conclusion: Password is required to proceed.");
        console.groupEnd();
        return { success: false, error: "password_required", keyFingerprint: matchingKey.fingerprint };

    } catch (error) {
        console.error("Decryption analysis failed:", error);
        console.groupEnd();
        return { success: false, error: error.message };
    }
}

export async function handlePerformDecryption(password: string) {
    console.groupCollapsed(`[PGP Decrypt] Phase 2: Performing decryption with password`);

    if (!pendingDecryptionRequest) {
        console.error("No pending decryption request found.");
        console.groupEnd();
        return { success: false, error: "No pending decryption request found." };
    }

    const { armoredMessage, keyFingerprint } = pendingDecryptionRequest;

    try {
        console.log("Re-deriving master key from password...");
        const salt = await storage.get<string>("salt");
        if (!salt) throw new Error("Salt not found.");
        const derivedKey = await deriveKey(password, salt);

        console.log(`Finding private key with fingerprint: ...${keyFingerprint.slice(-16)}`);
        const userVaultEntry = securePasswordStore.getVault()?.vault.get(globalVars.getEmail());
        const keyPairToUse = userVaultEntry?.keyPairs.get(keyFingerprint);
        if (!keyPairToUse) throw new Error("Could not find the required private key after unlock.");

        console.log("Decrypting the PGP private key from vault...");
        const decryptedPrivateKeyArmor = await decrypt(derivedKey, keyPairToUse.iv, keyPairToUse.encryptedPrivateKey);
        if (!decryptedPrivateKeyArmor) throw new Error("Failed to decrypt private key. Master password may be incorrect.");

        console.log("Reading the unencrypted private key object...");
        let keyPassphrase = ''; // Default to empty
        if (keyPairToUse.encryptedPassphrase && keyPairToUse.ivPassphrase) {
            console.log("Decrypting PGP key's own passphrase...");
            const decryptedPass = await decrypt(derivedKey, keyPairToUse.ivPassphrase, keyPairToUse.encryptedPassphrase);
            if (decryptedPass) {
                keyPassphrase = decryptedPass;
            }
        }

        console.log(`Unlocking private key with its passphrase (length: ${keyPassphrase.length})...`);
        const lockedPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
        const privateKey = await openpgp.decryptKey({
            privateKey: lockedPrivateKey,
            passphrase: keyPassphrase // Use the dynamically retrieved passphrase
        });

        const message = await openpgp.readMessage({ armoredMessage });

        console.log("Performing final message decryption...");
        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKey
        });

        console.log("%cDecryption successful!", "color: green; font-weight: bold;");
        console.groupEnd();
        pendingDecryptionRequest = null;
        return { success: true, decryptedContent: decrypted };
    } catch (error) {
        pendingDecryptionRequest = null;
        console.error("Final decryption failed:", error);
        console.groupEnd();
        return { success: false, error: "Decryption failed. The password may be incorrect." };
    }
}