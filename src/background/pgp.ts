import * as openpgp from 'openpgp';
import { decrypt } from '~lib/crypto/vault';
import type { KeyPair } from '~types/vault';
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

        let userPrivateKey; // This will hold the final, unlocked private key

        if (selectedUserKey.encryptedPassphrase && selectedUserKey.ivPassphrase) {
            // --- KEY HAS A PASSPHRASE: Perform two-step unlock ---
            console.log("Decrypting PGP key's own passphrase...");
            const keyPassphrase = await decrypt(derivedKey, selectedUserKey.ivPassphrase, selectedUserKey.encryptedPassphrase);

            console.log(`Unlocking signing key with its passphrase...`);
            const lockedPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
            userPrivateKey = await openpgp.decryptKey({
                privateKey: lockedPrivateKey,
                passphrase: keyPassphrase || ''
            });
        } else {
            // --- KEY HAS NO PASSPHRASE: Just read the unencrypted key ---
            console.log("Reading unencrypted signing key...");
            userPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
        }

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

export async function handlePgpDecryptRequest(payload: { armoredMessage: string, senderEmail: string }) {
    console.groupCollapsed(`[PGP Decrypt] Starting request...`);
    const { armoredMessage, senderEmail } = payload;

    try {
        const unlockedVault = securePasswordStore.getVault();
        const derivedKey = securePasswordStore.getKey();
        const currentUserEmail = globalVars.getEmail();

        // --- Step 1: Check if the vault is locked ---
        if (!unlockedVault || !derivedKey) {
            console.warn("Vault is locked. Aborting and returning 'vault_locked' error.");
            console.groupEnd();
            return { success: false, error: "vault_locked" };
        }

        const userVaultEntry = unlockedVault.vault.get(currentUserEmail);
        if (!userVaultEntry) throw new Error("Could not find user vault entry.");

        // --- Step 2: Find the correct private key ---
        const encryptedMessage = await openpgp.readMessage({ armoredMessage });
        const requiredKeyIds = encryptedMessage.getEncryptionKeyIDs().map(keyId => keyId.toHex().toUpperCase());

        const userPrivateKeys = Array.from(userVaultEntry.keyPairs.values());
        let matchingKey: KeyPair | undefined;
        for (const keyPair of userPrivateKeys) {
            const publicKey = await openpgp.readKey({ armoredKey: keyPair.armoredKey });
            const allAvailableIds = [publicKey.getKeyID().toHex().toUpperCase(), ...publicKey.getSubkeys().map(sk => sk.getKeyID().toHex().toUpperCase())];
            const isMatch = requiredKeyIds.some(reqId => allAvailableIds.some(availId => availId.endsWith(reqId)));
            if (isMatch) {
                matchingKey = keyPair;
                break;
            }
        }
        if (!matchingKey) throw new Error("You do not possess the required private key to decrypt this message.");
        console.log(`Found matching private key: ...${matchingKey.fingerprint.slice(-16)}`);

        // --- Step 3: Decrypt and Unlock the Private Key ---
        const decryptedPrivateKeyArmor = await decrypt(derivedKey, matchingKey.iv, matchingKey.encryptedPrivateKey);
        if (!decryptedPrivateKeyArmor) throw new Error("Failed to decrypt private key from vault.");

        let privateKey;
        if (matchingKey.encryptedPassphrase && matchingKey.ivPassphrase) {
            const keyPassphrase = await decrypt(derivedKey, matchingKey.ivPassphrase, matchingKey.encryptedPassphrase);
            const lockedPrivateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
            privateKey = await openpgp.decryptKey({ privateKey: lockedPrivateKey, passphrase: keyPassphrase || '' });
        } else {
            privateKey = await openpgp.readPrivateKey({ armoredKey: decryptedPrivateKeyArmor });
        }

        // --- Step 4: Decrypt the message and verify the signature ---
        const senderContact = userVaultEntry.contacts.get(senderEmail);
        let verificationKeys: openpgp.Key[] = [];
        if (senderContact?.publicKeys.length > 0) {
            verificationKeys = await Promise.all(senderContact.publicKeys.map(pk => openpgp.readKey({ armoredKey: pk.armoredKey })));
        }

        const { data: decrypted, signatures } = await openpgp.decrypt({
            message: encryptedMessage,
            decryptionKeys: privateKey,
            verificationKeys: verificationKeys
        });

        let verification = { status: 'unsigned', text: "Message is not signed." };
        if (signatures?.length > 0) {
            try {
                await signatures[0].verified;
                verification = { status: 'valid', text: `✓ Verified Signature from ${senderEmail}` };
            } catch (e) {
                verification = { status: 'invalid', text: `❌ WARNING: Invalid Signature! Message may have been tampered with.` };
            }
        }

        console.log("%cDecryption and verification successful!", "color: green; font-weight: bold;");
        console.groupEnd();
        return { success: true, decryptedContent: decrypted, verification };

    } catch (error) {
        console.error("Decryption failed:", error);
        console.groupEnd();
        return { success: false, error: error.message };
    }
}

export async function handleManualDecrypt(armoredMessage: string, senderEmail: string) {
    console.groupCollapsed(`[PGP Decrypt] Manual Decrypt Attempt`);
    try {
        // Step 1: Get the Master Key from memory (vault is already unlocked)
        const derivedKey = securePasswordStore.getKey();
        if (!derivedKey) {
            throw new Error("Vault is locked. Cannot perform manual decryption.");
        }

        // Step 2: Get all user's private keys from the in-memory vault
        const vault = securePasswordStore.getVault();
        if (!vault) throw new Error("Vault not loaded in memory.");

        const currentUserEmail = globalVars.getEmail();
        const userVaultEntry = vault.vault.get(currentUserEmail);
        if (!userVaultEntry) throw new Error("Could not find user vault entry.");

        let allPrivateKeys: KeyPair[] = [];
        for (const entry of vault.vault.values()) {
            allPrivateKeys.push(...entry.keyPairs.values());
        }

        if (allPrivateKeys.length === 0) {
            throw new Error("No private keys found in your vault to decrypt with.");
        }

        // Step 3: Decrypt and unlock all available private keys
        const unlockedPrivateKeys = await Promise.all(
            allPrivateKeys.map(async (keyPair) => {
                const armoredKey = await decrypt(derivedKey, keyPair.iv, keyPair.encryptedPrivateKey);
                if (!armoredKey) return null;

                const key = await openpgp.readPrivateKey({ armoredKey });
                if (keyPair.encryptedPassphrase && keyPair.ivPassphrase) {
                    const pass = await decrypt(derivedKey, keyPair.ivPassphrase, keyPair.encryptedPassphrase);
                    return openpgp.decryptKey({ privateKey: key, passphrase: pass || '' });
                }
                return key;
            })
        );

        const validKeys = unlockedPrivateKeys.filter(k => k !== null);
        if (validKeys.length === 0) {
            throw new Error("Failed to unlock any of your private keys.");
        }

        // --- STEP 4: Decrypt & VERIFY ---
        const message = await openpgp.readMessage({ armoredMessage });

        // --- VERIFICATION LOGIC ---
        console.log(`Looking for verification keys for sender: ${senderEmail}`);
        let verificationKeys: openpgp.Key[] = [];
        if (senderEmail) { // Only attempt verification if an email is provided
            const senderContact = userVaultEntry.contacts.get(senderEmail);
            if (senderContact && senderContact.publicKeys.length > 0) {
                console.log(`-> Found ${senderContact.publicKeys.length} potential public key(s) for the sender.`);
                verificationKeys = await Promise.all(
                    senderContact.publicKeys.map(pk => openpgp.readKey({ armoredKey: pk.armoredKey }))
                );
            } else {
                console.log(`-> No public keys found in contacts for ${senderEmail}. Cannot verify signature.`);
            }
        }
        // --- END VERIFICATION LOGIC ---

        const { data: decrypted, signatures } = await openpgp.decrypt({
            message,
            decryptionKeys: validKeys,
            verificationKeys: verificationKeys
        });

        // Check the result of the verification
        let verification = { status: 'unsigned', text: "Message is not signed." };
        if (signatures?.length > 0) {
            try {
                await signatures[0].verified;
                verification = { status: 'valid', text: `✓ Verified Signature from ${senderEmail}` };
            } catch (e) {
                verification = { status: 'invalid', text: `❌ WARNING: Invalid Signature! Message may have been tampered with.` };
            }
        }


        console.log("%cManual Decryption successful!", "color: green; font-weight: bold;");
        console.groupEnd();
        return { success: true, decryptedContent: decrypted, verification };

    } catch (error) {
        console.error("Manual decryption failed:", error);
        console.groupEnd();
        if (error.message.includes("Error decrypting message")) {
            return { success: false, error: "Decryption failed. You may not have the correct private key for this message." };
        }
        return { success: false, error: error.message };
    }
}