import { generatePGPKeyPair } from "~lib/crypto/keys";
import { encrypt } from "~lib/crypto/vault";
import type { Vault, VaultEntry, KeyPair } from "~types/vault";
import { handleEncryptAndStoreVault, securePasswordStore } from "./vault";
import { globalVars } from "./userState";

// TODO: Import/export, think of how to do it


export async function handleKeyGenerate(emailParam?: string) {
    try {
        const derivedKey = securePasswordStore.getKey();
        const currentVault = securePasswordStore.getVault();

        if (!derivedKey || !currentVault) {
            console.error("Cannot generate keys: Vault is locked or not loaded.");
            return { success: false, error: "Vault is locked." };
        }

        // Use provided email, fallback to global state, finally error if none
        const email = emailParam || globalVars.getEmail();
        if (!email) {
            console.error("Cannot generate keys: No email specified or detected.");
            return { success: false, error: "Email address is required." };
        }

        console.log(`Generating PGP key pair for ${email}...`);
        // Assume generatePGPKeyPair includes fingerprint generation
        const { publicKey, privateKey, fingerprint } = await generatePGPKeyPair(email);

        console.log(`Encrypting private key for ${email}...`);
        const { ciphertext: encryptedPrivateKey, iv } = await encrypt(derivedKey, privateKey);

        // Get or create the vault entry for this email
        let vaultEntry = currentVault.vault.get(email);
        if (!vaultEntry) {
            console.log(`Creating new vault entry for ${email}.`);
            vaultEntry = {
                keyPairs: new Map<string, KeyPair>(),
                contacts: new Map<string, any>() // Use 'any' or specific Contact type
            };
            currentVault.vault.set(email, vaultEntry);
        } else {
            console.log(`Adding key to existing vault entry for ${email}.`);
        }

        // Create the new KeyPair object
        const newKeyPair: KeyPair = {
            fingerprint: fingerprint, // Use the actual fingerprint
            publicKey: publicKey,
            encryptedPrivateKey: encryptedPrivateKey,
            iv: iv,
            dateCreated: new Date(),
            dateExpire: null // Or implement expiry logic
        };

        // Add the new key pair using a unique ID (e.g., fingerprint or UUID)
        const keyId = fingerprint || crypto.randomUUID(); // Prefer fingerprint if available
        vaultEntry.keyPairs.set(keyId, newKeyPair);
        securePasswordStore.setVault(currentVault);

        console.log("[Background] New key generated. Saving updated vault...");
        await handleEncryptAndStoreVault();

        console.log(`Successfully generated and added key ${keyId} for ${email}.`);
        // await handleEncryptAndStoreVault(); // Optional: Save immediately

        return { success: true, fingerprint: keyId };

    } catch (error) {
        console.error("Key generation failed:", error);
        return { success: false, error: `Key generation failed: ${error.message}` };
    }
}

/**
 * Function to return keys with basic info to the front
 * @param email User email, uses the stored one by default
 * @returns Returns the keys without any sensitive info
 */
export async function handleGetKeys(email?: string) {
    // Ensure vault is unlocked.
    // Decrypt private keys ONLY if explicitly needed and handle securely.
    // Return public keys, fingerprints, dates etc.
    const currentVault = securePasswordStore.getVault();
    const targetEmail = email || globalVars.getEmail();

    if (!currentVault || !securePasswordStore.getKey()) {
        return { success: false, error: "Vault locked", keys: [] };
    }
    if (!targetEmail) {
        return { success: false, error: "No email specified", keys: [] };
    }

    const entry = currentVault.vault.get(targetEmail);
    const keys = entry ? Array.from(entry.keyPairs.values()).map(kp => ({
        fingerprint: kp.fingerprint,
        publicKey: kp.publicKey, // Return public key safely
        dateCreated: kp.dateCreated,
        dateExpire: kp.dateExpire
        // DO NOT return encryptedPrivateKey or iv unless absolutely necessary
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

    // Consider triggering an auto-save/encrypt.
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