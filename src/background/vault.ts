import { Storage } from "@plasmohq/storage";
import { deriveKey, encrypt, decrypt, generateSalt } from "~lib/crypto/vault";
import type { Vault, VaultEntry, KeyPair, Contact } from "~types/vault";
import { storage } from "./index";

/**
 * Securely stores derived key and vault data in memory.
 */
export const securePasswordStore = {
    _derivedKey: null as CryptoKey | null,
    _vault: null as Vault | null,

    async setAndDerive(password: string, salt: string): Promise<void> {
        console.log("[SecureStore] Deriving master key from password and salt...");
        this._derivedKey = await deriveKey(password, salt);
        console.log("[SecureStore] Master key derived and stored in memory.");
    },

    getKey(): CryptoKey | null {
        return this._derivedKey;
    },

    setVault(vault: Vault | null): void {
        console.log("[SecureStore] In-memory vault has been updated.");
        this._vault = vault;
    },

    getVault(): Vault | null {
        return this._vault;
    },

    async wipe(): Promise<void> {
        this._vault = null;
        this._derivedKey = null;
        console.log("[SecureStore] In-memory vault and derived key have been wiped.");
    }
};


// --- Login ---
export async function handleLoginAttempt(password: string) {
    const salt = await storage.get<string>("salt");

    if (salt) {
        // If salt exists, the vault is already initialized. Attempt to unlock.
        console.log("[Vault] Salt found. Attempting to unlock existing vault...");
        return handleUnlock(password);
    } else {
        // If no salt, this is the first time. Initialize a new vault.
        console.log("[Vault] No salt found. Initializing new vault...");
        return handleInit(password);
    }
}

// --- Vault Operation Handlers ---

export async function handleUnlock(password: string) {
    console.groupCollapsed(`[Vault] handleUnlock`);
    try {
        console.log("Fetching salt, iv, and encrypted vault from storage...");
        const salt = await storage.get<string>("salt");
        const encrypted = await storage.get<string>("vault");
        const iv = await storage.get<string>("iv");

        if (!salt || !encrypted || !iv) {
            console.error("Required data not found in storage. Vault may not be initialized.");
            console.groupEnd();
            return { success: false, error: "Vault not initialized or corrupted" };
        }
        console.log("Data fetched. Proceeding with key derivation and decryption...");

        await securePasswordStore.setAndDerive(password, salt);
        const derivedKey = securePasswordStore.getKey();

        if (!derivedKey) {
            throw new Error("Key derivation failed unexpectedly after setAndDerive.");
        }

        const decrypted = await decrypt(derivedKey, iv, encrypted);

        if (decrypted === null) {
            console.warn("Vault decryption returned null. Password is likely incorrect.");
            console.groupEnd();
            return { success: false, error: 'Bad password!' }
        }
        console.log("Vault decrypted successfully. Reconstructing data structure...");
        const parsed = JSON.parse(decrypted);

        const reconstructedVault: Vault = { vault: new Map<string, VaultEntry>() };
        if (parsed.vault && Array.isArray(parsed.vault)) {
            for (const [email, entryData] of parsed.vault) {
                const vaultEntry: VaultEntry = {
                    keyPairs: new Map<string, KeyPair>(),
                    contacts: new Map<string, Contact>()
                };

                if (entryData.keyPairs && Array.isArray(entryData.keyPairs)) {
                    for (const [keyId, keyPairData] of entryData.keyPairs) {
                        const keyPair: KeyPair = {
                            ...keyPairData,
                            created: new Date(keyPairData.created), // Corrected rehydration
                            expires: keyPairData.expires ? new Date(keyPairData.expires) : null
                        };
                        vaultEntry.keyPairs.set(keyId, keyPair);
                    }
                }

                if (entryData.contacts && Array.isArray(entryData.contacts)) {
                    for (const [contactId, contactData] of entryData.contacts) {
                        const contact: Contact = {
                            ...contactData,
                            publicKeys: contactData.publicKeys.map(pk => ({
                                ...pk,
                                created: new Date(pk.created)
                            })),
                            dateAdded: contactData.dateAdded ? new Date(contactData.dateAdded) : undefined,
                        };
                        vaultEntry.contacts.set(contactId, contact);
                    }
                }
                reconstructedVault.vault.set(email, vaultEntry);
            }
        }

        securePasswordStore.setVault(reconstructedVault);
        console.log("Vault unlocked and loaded into memory.");
        console.groupEnd();
        return { success: true, error: null };

    } catch (err) {
        console.error("Unlock failed:", err);
        console.groupEnd();
        await securePasswordStore.wipe();
        return { success: false, error: "Decryption failed. Incorrect password?" };
    }
}

export async function handleInit(password: string) {
    console.groupCollapsed(`[Vault] handleInit`);
    try {
        const existingSalt = await storage.get('salt');
        if (existingSalt) {
            console.warn("Initialization attempted, but vault already exists.");
            console.groupEnd();
            return { success: false, error: 'Vault already initialized (salt exists).' };
        }

        console.log("Generating salt and deriving master key...");
        const salt = generateSalt();
        await securePasswordStore.setAndDerive(password, salt);
        const derivedKey = securePasswordStore.getKey();

        if (!derivedKey) {
            throw new Error("Key derivation failed during init.");
        }

        console.log("Creating and encrypting empty vault structure...");
        const emptyVault: Vault = { vault: new Map<string, VaultEntry>() };
        const serializableVault = {
            vault: Array.from(emptyVault.vault.entries())
        };
        const { ciphertext, iv } = await encrypt(derivedKey, JSON.stringify(serializableVault));

        console.log("Saving initial vault data to storage...");
        await storage.set('salt', salt);
        await storage.set('iv', iv);
        await storage.set('vault', ciphertext);

        securePasswordStore.setVault(emptyVault);

        console.log("Vault initialized successfully.");
        console.groupEnd();
        return { success: true, error: null };

    } catch (err) {
        console.error("Vault initialization failed:", err);
        console.groupEnd();
        await securePasswordStore.wipe();
        return { success: false, error: `Initialization failed: ${err.message}` };
    }
}


export async function handleEncryptAndStoreVault() {
    try {
        const derivedKey = securePasswordStore.getKey();
        const vault = securePasswordStore.getVault();

        if (!derivedKey) throw new Error("Vault is locked. Cannot encrypt.");
        if (!vault) throw new Error("No vault data in memory to encrypt.");

        console.log("[Vault] Encrypting and storing current in-memory vault...");

        const serializableVault = {
            vault: Array.from(vault.vault.entries()).map(([email, entry]) => [
                email,
                {
                    keyPairs: Array.from(entry.keyPairs.entries()),
                    contacts: Array.from(entry.contacts.entries())
                }
            ])
        };

        const { ciphertext, iv } = await encrypt(derivedKey, JSON.stringify(serializableVault));

        await storage.set("vault", ciphertext);
        await storage.set("iv", iv);

        console.log("[Vault] Vault encrypted and stored successfully.");
        return { success: true };

    } catch (error) {
        console.error("handleEncryptAndStoreVault failed:", error);
        return { success: false, error: "Encryption failed" };
    }
}