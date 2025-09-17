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
            return { success: false, error: "Vault is locked." };
        }

        const email = emailParam || globalVars.getEmail();
        if (!email) {
            return { success: false, error: "Email address is required." };
        }

        const { publicKey, privateKey, fingerprint } = await generatePGPKeyPair(email);
        const { ciphertext: encryptedPrivateKey, iv } = await encrypt(derivedKey, privateKey);

        let vaultEntry = currentVault.vault.get(email);
        if (!vaultEntry) {
            vaultEntry = { keyPairs: new Map(), contacts: new Map() };
            currentVault.vault.set(email, vaultEntry);
        }

        const newKeyPair: KeyPair = {
            fingerprint: fingerprint,
            armoredKey: publicKey,      // Corrected from publicKey
            encryptedPrivateKey: encryptedPrivateKey,
            iv: iv,
            created: new Date(),        // Corrected from dateCreated
            expires: null
        };

        vaultEntry.keyPairs.set(fingerprint, newKeyPair);
        securePasswordStore.setVault(currentVault);
        await handleEncryptAndStoreVault();

        return { success: true, fingerprint: fingerprint };
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