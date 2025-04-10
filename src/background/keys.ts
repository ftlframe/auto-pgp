import { generatePGPKeyPair } from "~lib/crypto/keys";
import { encrypt } from "~lib/crypto/vault";
import type { Vault, VaultEntry, KeyPair } from "~types/vault";
import { securePasswordStore } from "./vault";
import { globalVars } from "./userState";

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

        // Update the vault in the secure store (doesn't auto-save yet)
        securePasswordStore.setVault(currentVault);

        console.log(`Successfully generated and added key ${keyId} for ${email}.`);
        // TODO: Consider triggering an auto-save/encrypt here or rely on lock/close
        // await handleEncryptAndStoreVault(); // Optional: Save immediately

        return { success: true, fingerprint: keyId };

    } catch (error) {
        console.error("Key generation failed:", error);
        return { success: false, error: `Key generation failed: ${error.message}` };
    }
}

export async function handleGetKeys(email?: string) {
    // TODO: Implement logic to retrieve keys for a specific email (or all if email is omitted)
    // Ensure vault is unlocked.
    // Decrypt private keys ONLY if explicitly needed and handle securely.
    // Return public keys, fingerprints, dates etc.
    console.warn("handleGetKeys not implemented");
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

export async function handleDeleteKey(email: string, keyId: string) {
    // TODO: Implement logic to delete a specific key pair.
    // Ensure vault is unlocked.
    // Find the key by email and keyId (fingerprint/UUID).
    // Remove it from the map.
    // Update the vault in securePasswordStore.
    // Consider triggering an auto-save/encrypt.
    console.warn("handleDeleteKey not implemented");
    const currentVault = securePasswordStore.getVault();
    if (!currentVault || !securePasswordStore.getKey()) {
        return { success: false, error: "Vault locked" };
    }
    const entry = currentVault.vault.get(email);
    if (entry && entry.keyPairs.has(keyId)) {
        entry.keyPairs.delete(keyId);
        securePasswordStore.setVault(currentVault);
        // await handleEncryptAndStoreVault(); // Optional: Save immediately
        return { success: true };
    }
    return { success: false, error: "Key not found" };
}