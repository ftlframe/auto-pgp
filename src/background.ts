import { Storage } from "@plasmohq/storage"
import { generatePGPKeyPair } from "~lib/crypto/keys"
import { deriveKey, encrypt, decrypt, generateSalt } from "~lib/crypto/vault"
import type { KeyPair, Vault } from "~types/vault"

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
            console.log("Vault popup closed");
            handleLock().catch((err) => console.error("Failed to auto-lock vault:", err));
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
         * ==================
         * Key operations
         * ==================
         */

        case "GENERATE_KEYS": {
            handleKeyGenerate(request.name, request.email).then(sendResponse)
            return true;
        }

    }
})

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
 * @param password Plaintext password
 * @returns a success flag if the operations went good
 */

// TODO: Try to unlock vault from stored key if it's in there and if it's not will need to reprompt?
async function handleUnlock(password: string) {
    try {
        console.log("Unlocking vault")

        const salt = await storage.get("salt")
        const key = await securePasswordStore.setAndDerive(password, salt);
        const encrypted = await storage.get("vault")
        const iv = await storage.get("iv")

        if (!encrypted || !iv) {
            return { success: false, error: "No vault found" }
        }

        console.log('Decrypting...')
        console.log(`${securePasswordStore.getKey() instanceof CryptoKey}`)
        const decrypted = await decrypt(securePasswordStore.getKey() as CryptoKey, iv, encrypted)

        console.log('Setting vault in memory...')
        securePasswordStore.setVault(JSON.parse(decrypted));
        // TODO: Remove JSON decrypted vault here

        return { success: true, error: null }
    } catch (err) {
        return { success: false, error: "Decryption failed" }
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

    const emptyVault = {
        keyPairs: [],
        contacts: []
    }

    const ciphertext = await encrypt(securePasswordStore.getKey(), emptyVault)

    await storage.set('salt', salt)
    await storage.set('iv', ciphertext.iv);
    await storage.set('vault', ciphertext.ciphertext);

    return {
        success: true,
        error: null,
    }
}

async function handleLock() {
    console.log(securePasswordStore.getVault())
    await handleEncrypt(securePasswordStore.getVault())
    securePasswordStore.wipe();
    // await storage.clear()
    return { success: true }
}

async function handleEncrypt(vault: any) {
    if (!securePasswordStore.getKey()) throw new Error("Vault locked")

    const encrypted = await encrypt(securePasswordStore.getKey(), vault)
    await storage.set("vault", encrypted.ciphertext)
    await storage.set("iv", encrypted.iv)

    return { success: true }
}


async function handleKeyGenerate(name: string, email: string) {
    console.log(securePasswordStore.getVault())
    if (!securePasswordStore._derivedKey) {
        console.log('Re-enter password!')
        return;
    }

    const { publicKey, privateKey } = await generatePGPKeyPair(name, email)
    const keyPair: KeyPair = {
        fingerprint: email,
        publicKey: publicKey,
        encryptedPrivateKey: privateKey
    }

    const vault = securePasswordStore.getVault() as Vault
    vault.keyPairs.push({
        fingerprint: email,
        publicKey: publicKey,
        encryptedPrivateKey: privateKey
    })

    securePasswordStore.setVault(vault)
    console.log(securePasswordStore.getVault())

}


// TODO: Auto-lock utilities
// function resetActivityTimer() {
//     clearTimeout(activityTimeout)
//     activityTimeout = setTimeout(() => handleLock(), 120_000) // 2 minutes
// }

// chrome.idle.onStateChanged.addListener((state) => {
//     if (state === "locked") handleLock()
// })