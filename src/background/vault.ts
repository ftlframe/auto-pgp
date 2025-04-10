import { Storage } from "@plasmohq/storage"; // Or import your own storage wrapper
import { deriveKey, encrypt, decrypt, generateSalt } from "~lib/crypto/vault";
import type { Vault, VaultEntry, KeyPair, Contact } from "~types/vault";
import { storage } from "./index"; // Import shared storage instance

/**
 * Securely stores derived key and vault data in memory.
 * Wipes sensitive data on lock.
 */
export const securePasswordStore = {
    _password: new Uint8Array(), // Temporary storage, wiped quickly
    _salt: new Uint8Array(),     // Temporary storage, wiped quickly
    _derivedKey: null as CryptoKey | null,
    _vault: null as Vault | null,

    async setAndDerive(password: string, salt: string): Promise<void> {
        const encoder = new TextEncoder();
        this._password = encoder.encode(password);
        this._salt = encoder.encode(salt);

        // Immediately start overwriting original strings
        let tempPassword = password.padEnd(64, ' ').slice(0, 64); // Overwrite attempt
        this._derivedKey = await deriveKey(tempPassword, salt);
        tempPassword = ''.padEnd(64, ' '); // More overwriting

        let tempSalt = salt.padEnd(64, ' ').slice(0, 64); // Overwrite attempt
        tempSalt = ''.padEnd(64, ' '); // More overwriting

        // Wipe temporary arrays after deriving the key
        crypto.getRandomValues(this._password);
        crypto.getRandomValues(this._salt);
        this._password = new Uint8Array();
        this._salt = new Uint8Array();
    },

    getKey(): CryptoKey | null {
        return this._derivedKey;
    },

    setVault(vault: Vault | null): void {
        this._vault = vault;
    },

    getVault(): Vault | null {
        return this._vault;
    },

    async wipe(): Promise<void> {
        // Overwrite sensitive data
        if (this._vault) {
            // Consider more robust wiping if needed, though JS GC is usually sufficient
            this._vault = null;
        }

        // Key doesn't need overwriting since it's non-extractable by default
        this._derivedKey = null;

        // Ensure temporary password/salt arrays were already cleared in setAndDerive
        this._password = new Uint8Array();
        this._salt = new Uint8Array();
        console.log("Secure store wiped.");
    }
};

// --- Vault Operation Handlers ---

export async function handleUnlock(password: string) {
    try {
        console.log('Unlocking vault');
        const salt = await storage.get<string>("salt");
        const encrypted = await storage.get<string>("vault");
        const iv = await storage.get<string>("iv");

        if (!salt || !encrypted || !iv) {
            return { success: false, error: "Vault not initialized or corrupted" };
        }

        await securePasswordStore.setAndDerive(password, salt);
        const derivedKey = securePasswordStore.getKey();

        if (!derivedKey) {
            // This should not happen if setAndDerive succeeded, but check anyway
            throw new Error("Key derivation failed unexpectedly.");
        }

        const decrypted = await decrypt(derivedKey, iv, encrypted);
        const parsed = JSON.parse(decrypted); // Assuming decrypt returns string

        // Reconstruct the vault structure with Maps
        const reconstructedVault: Vault = { vault: new Map<string, VaultEntry>() };
        if (parsed.vault && Array.isArray(parsed.vault)) {
            for (const [email, entryData] of parsed.vault) {
                const vaultEntry: VaultEntry = {
                    keyPairs: new Map<string, KeyPair>(),
                    contacts: new Map<string, Contact>()
                };

                if (entryData.keyPairs && Array.isArray(entryData.keyPairs)) {
                    for (const [keyId, keyPairData] of entryData.keyPairs) {
                        // Rehydrate dates
                        const keyPair: KeyPair = {
                            ...keyPairData,
                            dateCreated: new Date(keyPairData.dateCreated),
                            dateExpire: keyPairData.dateExpire ? new Date(keyPairData.dateExpire) : null
                        };
                        vaultEntry.keyPairs.set(keyId, keyPair);
                    }
                }

                if (entryData.contacts && Array.isArray(entryData.contacts)) {
                    for (const [contactId, contactData] of entryData.contacts) {
                        // Add potential rehydration for contacts if needed
                        vaultEntry.contacts.set(contactId, contactData);
                    }
                }
                reconstructedVault.vault.set(email, vaultEntry);
            }
        }

        securePasswordStore.setVault(reconstructedVault);

        console.log("Vault unlocked and loaded into memory.");
        console.log(securePasswordStore.getVault())
        return { success: true, error: null };

    } catch (err) {
        console.error("Unlock failed:", err);
        // Wipe any potentially derived key on failure
        await securePasswordStore.wipe();
        return { success: false, error: "Decryption failed. Incorrect password?" };
    }
}

export async function handleInit(password: string) {
    try {
        const existingSalt = await storage.get('salt');
        if (existingSalt) {
            return { success: false, error: 'Vault already initialized (salt exists).' };
        }

        const salt = generateSalt();
        await securePasswordStore.setAndDerive(password, salt);
        const derivedKey = securePasswordStore.getKey();

        if (!derivedKey) {
            throw new Error("Key derivation failed during init.");
        }

        // Create an empty vault structure
        const emptyVault: Vault = { vault: new Map<string, VaultEntry>() };

        // Convert Map to serializable format for encryption
        const serializableVault = {
            vault: Array.from(emptyVault.vault.entries()) // Starts empty
        };

        const { ciphertext, iv } = await encrypt(
            derivedKey,
            JSON.stringify(serializableVault)
        );

        await storage.set('salt', salt);
        await storage.set('iv', iv);
        await storage.set('vault', ciphertext);

        securePasswordStore.setVault(emptyVault); // Store the empty vault in memory

        console.log("Vault initialized successfully.");
        return { success: true, error: null };

    } catch (err) {
        console.error("Vault initialization failed:", err);
        await securePasswordStore.wipe(); // Clean up on failure
        return { success: false, error: `Initialization failed: ${err.message}` };
    }
}


// Renamed from handleEncrypt to avoid confusion with crypto's encrypt
export async function handleEncryptAndStoreVault() {
    try {
        const derivedKey = securePasswordStore.getKey();
        const vault = securePasswordStore.getVault();

        if (!derivedKey) throw new Error("Vault is locked. Cannot encrypt.");
        if (!vault) throw new Error("No vault data in memory to encrypt.");

        console.log("Encrypting and storing vault...");

        // Convert current vault state to serializable format
        const serializableVault = {
            vault: Array.from(vault.vault.entries()).map(([email, entry]) => [
                email,
                {
                    keyPairs: Array.from(entry.keyPairs.entries()),
                    contacts: Array.from(entry.contacts.entries())
                }
            ])
        };

        const { ciphertext, iv } = await encrypt(
            derivedKey,
            JSON.stringify(serializableVault)
        );

        await storage.set("vault", ciphertext);
        await storage.set("iv", iv);

        console.log("Vault encrypted and stored.");
        return { success: true };

    } catch (error) {
        console.error("Encryption failed:", error);
        // Don't wipe here automatically, as the user might still be active
        return { success: false, error: "Encryption failed" };
    }
}