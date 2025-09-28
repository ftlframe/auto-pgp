import { generatePGPKeyPair } from "~lib/crypto/keys";
import { encrypt } from "~lib/crypto/vault";
import type { Vault, VaultEntry, KeyPair } from "~types/vault";
import { handleEncryptAndStoreVault, securePasswordStore } from "./vault";
import { globalVars } from "./userState";

// TODO: Import/export, think of how to do it


export async function handleKeyGenerate(payload: { email?: string, passphrase?: string }) {
    console.groupCollapsed("[Keys] handleKeyGenerate");
    console.log("Received payload:", payload);
    try {
        const derivedKey = securePasswordStore.getKey();
        const currentVault = securePasswordStore.getVault();
        if (!derivedKey || !currentVault) {
            throw new Error("Vault is locked.");
        }

        const email = payload.email || globalVars.getEmail();
        if (!email) {
            throw new Error("Email address is required.");
        }
        console.log(`Generating key for ${email} with passphrase: ${payload.passphrase ? 'Yes' : 'No'}`);

        // 1. Generate the PGP key, passing the passphrase to the library
        const { publicKey, privateKey, fingerprint } = await generatePGPKeyPair(email, payload.passphrase);

        // 2. Encrypt the private key with the user's master key
        const { ciphertext: encryptedPrivateKey, iv } = await encrypt(derivedKey, privateKey);

        // 3. If a passphrase was provided, encrypt it with the master key as well
        let encryptedPassphrase, ivPassphrase;
        if (payload.passphrase) {
            console.log("Encrypting provided PGP key passphrase for storage...");
            const result = await encrypt(derivedKey, payload.passphrase);
            encryptedPassphrase = result.ciphertext;
            ivPassphrase = result.iv;
        }

        let vaultEntry = currentVault.vault.get(email);
        if (!vaultEntry) {
            vaultEntry = { keyPairs: new Map(), contacts: new Map() };
            currentVault.vault.set(email, vaultEntry);
        }

        // 4. Create the new KeyPair object with all properties
        const newKeyPair: KeyPair = {
            fingerprint: fingerprint,
            armoredKey: publicKey,
            created: new Date(),
            expires: null,
            encryptedPrivateKey: encryptedPrivateKey,
            iv: iv,
            encryptedPassphrase: encryptedPassphrase,   // Will be undefined if no passphrase was used
            ivPassphrase: ivPassphrase                  // Will be undefined if no passphrase was used
        };

        vaultEntry.keyPairs.set(fingerprint, newKeyPair);
        securePasswordStore.setVault(currentVault);

        console.log("Saving new key pair to vault...");
        await handleEncryptAndStoreVault();

        console.log(`Successfully generated and added key ${fingerprint}.`);
        console.groupEnd();
        return { success: true, fingerprint: fingerprint };

    } catch (error) {
        console.error("Key generation failed:", error);
        console.groupEnd();
        return { success: false, error: `Key generation failed: ${error.message}` };
    }
}

/**
 * Function to return keys with basic info to the front
 * @param email User email, uses the stored one by default
 * @returns Returns the keys without any sensitive info
 */
export async function handleGetKeys(email?: string) {
    const currentVault = securePasswordStore.getVault();
    const targetEmail = email || globalVars.getEmail();

    if (!currentVault || !securePasswordStore.getKey()) {
        return { success: false, error: "Vault locked", keys: [] };
    }
    if (!targetEmail) {
        return { success: false, error: "No email specified", keys: [] };
    }

    const entry = currentVault.vault.get(targetEmail);
    // Map the KeyPair data to the PublicKeyInfo shape for the frontend
    const keys = entry ? Array.from(entry.keyPairs.values()).map(kp => ({
        fingerprint: kp.fingerprint,
        armoredKey: kp.armoredKey,
        created: kp.created,
        expires: kp.expires,
    })) : [];

    return { success: true, keys: keys };
}
/**
 * Find the key by email and keyId (fingerprint/UUID) and removes it from the map
 * @param keyId Keys unique fingerprint
 * @param email User email, uses the stored email by default
 * @returns Response to the front
 */
export async function handleDeleteKey(keyId: string, email?: string) {
    const currentVault = securePasswordStore.getVault();
    const targetEmail = email || globalVars.getEmail();

    if (!currentVault || !securePasswordStore.getKey()) {
        return { success: false, error: "Vault locked" };
    }
    const entry = currentVault.vault.get(targetEmail);
    if (entry && entry.keyPairs.has(keyId)) {
        entry.keyPairs.delete(keyId);
        securePasswordStore.setVault(currentVault);

        console.log("[Background] Key deleted. Saving updated vault...");
        await handleEncryptAndStoreVault();

        return { success: true };
    }
    return { success: false, error: "Key not found" };
}