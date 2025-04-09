import { Storage } from "@plasmohq/storage"
import { generatePGPKeyPair } from "~lib/crypto/keys"
import { deriveKey, encrypt, decrypt, generateSalt } from "~lib/crypto/vault"
import type { Contact, KeyPair, Vault, VaultEntry } from "~types/vault"

const storage = new Storage({
    area: 'local'
})


let activityTimeout: NodeJS.Timeout
/**
 * TODO:
 * Session timeout
 * Other vault operations
 */

/**
 * Used to know when the user clicks off the extension to trigger auto-encryption
 */
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "vault-ui") {
        console.log("Vault popup opened");

        port.onDisconnect.addListener(() => {
            /**
             * TODO: Edge case
             * User sets master password and then closes?
             * This throws an error that the vault is locked because of how the init of the vault is handled
             */
            console.log("Vault popup closed");
            handleLock().catch((err) => console.error("Failed to auto-lock vault:", err));
            // Change the email back to an empty string
        });
    }
});

// Message Handling
// We return true to keep the channel open for async response
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        /**
         * ==================
         * Basic operations
         * ==================
         */
        case "UNLOCK": {
            handleUnlock(request.password).then(sendResponse)
            return true
        }

        case "LOCK": {
            handleLock().then(sendResponse)
            return true
        }

        case "ENCRYPT_DATA": {
            handleEncrypt(request.data).then(sendResponse)
            return true
        }

        case "INIT_VAULT": {
            handleInit(request.password).then(sendResponse)
            return true;
        }
        /**
         * =================
         * Helper functions
         * =================
         */

        case "SET_EMAIL": {
            console.log('SET_EMAIL')
            globalVars.setEmail(request.payload.email)
            return true;
        }
        case "GET_EMAIL": {
            console.log('GET_EMAIL')
            console.log(globalVars.getEmail())

            handleSendEmail().then(sendResponse)
            return true;
        }
        /**
         * ==================
         * Key operations
         * ==================
         */

        case "GENERATE_KEYS": {
            handleKeyGenerate(request.email).then(sendResponse)
            return true;
        }

        case "GET_KEYS": {
            return true;
        }

        case "DELETE_KEY": {
            return true;
        }

        /**
         * ==================
         * Contact operations
         * ==================
         */

        case "ADD_CONTACT": {
            return true;
        }

        case "GET_CONTACTS": {
            return true;
        }

        case "DELETE_CONTACT": {
            return true;
        }

        /**
         * ==================
         * Content script messages
         * ==================
         */

        case "GMAIL_EMAIL_DETECTED": {
            const userEmail = request.email
            globalVars.setEmail(userEmail);
        }

        case "PGP_ENCRYPT_REQUEST": {
            console.log(request.payload.recipients)
            console.log(request.payload.content)
        }

    }
})

async function handleSendEmail() {
    const _email = globalVars.getEmail()
    return { email: _email }
}

const globalVars = {
    _email: "",

    getEmail() {
        return this._email;
    },
    setEmail(email: string) {
        this._email = email;
    }
}


/**
 * A way to securely store the password and salt on login.
 * The password field and salt field get overwritten.
 * This is done to ensure security if the JS garbage collector doesn't instantly erase it from memory.
 * The `deriveKey` function from `pgp.ts` has a `false` flag so that the key isn't exportable.
 */
const securePasswordStore = {
    _password: new Uint8Array(),
    _salt: new Uint8Array(),
    _derivedKey: null as CryptoKey,
    _vault: null,

    /**
     * Function thattakes the plaintext password and salt, derives the key using
     * crypto functions from `/lib/crypto/pgp.ts` and stores it for future use.
     * The password and salt field get overwritten as soon as possible.
     * @param password Plaintext password
     * @param salt Generated salt
     */
    async setAndDerive(password: string, salt: string) {
        const encoder = new TextEncoder()
        this._password = encoder.encode(password)
        this._salt = encoder.encode(salt)

        // Immediately start overwriting original strings
        password = password.padEnd(64, ' ').slice(0, 64)
        this._derivedKey = await deriveKey(password, salt)

        salt = salt.padEnd(64, ' ').slice(0, 64)
    },

    getKey(): CryptoKey {
        return this._derivedKey
    },

    setVault(vault: any) {
        this._vault = vault;
    },

    getVault() {
        return this._vault;
    },


    /**
     * Securely wipes and overwrites the data in the fields to
     * ensure memory safety and to protect against incursions into memory.
     */
    async wipe() {
        crypto.getRandomValues(this._password)
        crypto.getRandomValues(this._salt)
        this._password = new Uint8Array()
        this._salt = new Uint8Array()
        this._vault = new Uint8Array()

        // Key doesn't need overwriting since it's non-extractable
        this._derivedKey = null
    }
}


/**
 * Unlocks the vault and stores it in local memory for use.
 * TODO: Try to unlock vault from stored key if it's in there and if it's not will need to reprompt?
 * @param password Plaintext password
 * @returns a success flag if the operations went good
 */
async function handleUnlock(password: string) {
    try {
        console.log('Unlocking vault');

        const salt = await storage.get("salt");
        await securePasswordStore.setAndDerive(password, salt);
        const encrypted = await storage.get("vault");
        const iv = await storage.get("iv");

        if (!encrypted || !iv) {
            return { success: false, error: "No vault found" };
        }

        const decrypted = await decrypt(
            securePasswordStore.getKey() as CryptoKey,
            iv,
            encrypted
        );

        // Only parse once now
        const parsed = JSON.parse(decrypted);
        console.log("Decrypted vault:", parsed);

        const reconstructedVault: Vault = {
            vault: new Map<string, VaultEntry>()
        };

        // Reconstruct the vault structure
        if (parsed.vault && Array.isArray(parsed.vault)) {
            for (const [email, entryData] of parsed.vault) {
                const vaultEntry: VaultEntry = {
                    keyPairs: new Map<string, KeyPair>(),
                    contacts: new Map<string, Contact>()
                };

                if (entryData.keyPairs && Array.isArray(entryData.keyPairs)) {
                    for (const [keyId, keyPair] of entryData.keyPairs) {
                        vaultEntry.keyPairs.set(keyId, {
                            ...keyPair,
                            dateCreated: new Date(keyPair.dateCreated),
                            dateExpire: keyPair.dateExpire ? new Date(keyPair.dateExpire) : null
                        });
                    }
                }

                if (entryData.contacts && Array.isArray(entryData.contacts)) {
                    for (const [contactId, contact] of entryData.contacts) {
                        vaultEntry.contacts.set(contactId, contact);
                    }
                }
                
                reconstructedVault.vault.set(email, vaultEntry);
            }
        }
        console.log(reconstructedVault);
        
        securePasswordStore.setVault(reconstructedVault);
        return { success: true, error: null };
    } catch (err) {
        console.error("Unlock failed:", err);
        return { success: false, error: "Decryption failed" };
    }
}
/**
 * 1. Generate the salt
 * 2. Set the derived key safely
 * 3. Create the initial vault
 * 4. Encrypt with middleware (AES-GCM)
 * 5. Store the salt, IV and ciphertext in base64  
 * @param password 
 * @returns a response based on success
 */
async function handleInit(password: string) {

    const existingSalt = await storage.get('salt');
    if (existingSalt) {
        return {
            success: false,
            error: 'Salt already exists'
        }
    }

    const salt = generateSalt();

    await securePasswordStore.setAndDerive(password, salt);

    // Create an empty vault structure using the Map-based approach
    const emptyVault: Vault = {

        vault: new Map<string, VaultEntry>()

    };

    // Convert Map to serializable format
    const serializableVault = {
        vault: Array.from(emptyVault.vault.entries())
    };

    const ciphertext = await encrypt(
        securePasswordStore.getKey(),
        JSON.stringify(serializableVault)
    );

    await storage.set('salt', salt)
    await storage.set('iv', ciphertext.iv);
    await storage.set('vault', ciphertext.ciphertext);

    securePasswordStore.setVault(emptyVault)

    console.log(`Initialized vault ${emptyVault}`)
    return {
        success: true,
        error: null,
    }
}

async function handleLock() {
    await handleEncrypt(securePasswordStore.getVault())
    securePasswordStore.wipe();
    // await storage.clear()
    return { success: true }
}

async function handleEncrypt(vault: Vault) {
    try {
        if (!securePasswordStore.getKey()) throw new Error("Vault locked");

        // Convert to serializable format (only once)
        const serializableVault = {
            vault: Array.from(vault.vault.entries()).map(([email, entry]) => [
                email,
                {
                    keyPairs: Array.from(entry.keyPairs.entries()),
                    contacts: Array.from(entry.contacts.entries())
                }
            ])
        };

        // Stringify only once here
        const encrypted = await encrypt(
            securePasswordStore.getKey(),
            JSON.stringify(serializableVault) // Single stringification
        );

        await storage.set("vault", encrypted.ciphertext);
        await storage.set("iv", encrypted.iv);

        return { success: true };
    } catch (error) {
        console.error("Encryption failed:", error);
        return { success: false, error: "Encryption failed" };
    }
}

/**
 * Puts a newly generated key pair into the vault based on identity.
 * The private key gets encrypted with the derived key and salt
 * @param name Identity parameter
 * @param email Identity parameter
 */
async function handleKeyGenerate(email: string = '') {
    if (!securePasswordStore._derivedKey) {
        console.log('Re-enter password!');
        return;
    }

    // Assume generatePGPKeyPair now returns fingerprint
    const { publicKey, privateKey, fingerprint } = await generatePGPKeyPair(email);

    const cipher = await encrypt(securePasswordStore.getKey(), privateKey);

    const fetchedVault = securePasswordStore.getVault() as Vault;
    console.log('Fetched vault')
    console.log(fetchedVault)

    if (!fetchedVault.vault) {
        fetchedVault.vault = new Map<string, VaultEntry>();
    }

    const fetchedEmail = email === '' ? globalVars.getEmail() : email;

    // Get or create vault entry
    let vaultEntry = fetchedVault.vault.get(fetchedEmail);
    if (!vaultEntry) {
        vaultEntry = {
            keyPairs: new Map<string, KeyPair>(),
            contacts: new Map<string, Contact>()
        };
        fetchedVault.vault.set(fetchedEmail, vaultEntry);
    }

    // Create new key pair with proper fingerprint
    const keyPair: KeyPair = {
        fingerprint: fingerprint,  // Use actual key fingerprint
        publicKey: publicKey,
        encryptedPrivateKey: cipher.ciphertext,
        iv: cipher.iv,
        dateCreated: new Date(),
        dateExpire: null
    };

    // Add to correct vault entry
    vaultEntry.keyPairs.set(crypto.randomUUID(), keyPair);

    securePasswordStore.setVault(fetchedVault);
    console.log('Updated vault:', securePasswordStore.getVault());
}


// TODO: Auto-lock utilities
// function resetActivityTimer() {
//     clearTimeout(activityTimeout)
//     activityTimeout = setTimeout(() => handleLock(), 120_000) // 2 minutes
// }

// chrome.idle.onStateChanged.addListener((state) => {
//     if (state === "locked") handleLock()
// })