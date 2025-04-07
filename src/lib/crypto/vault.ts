/**
 * Function to generate a random salt for key derivation
 * @param length Salt length, default is 16
 * @returns Return the salt string
 */
export function generateSalt(length = 16): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}

/**
 * Function that derives the plaintext password using the `PBKDF2` function by default
 * @param password Plaintext password
 * @param salt Random generated salt
 * @returns Derived key that is type of CryptoKey
 */
export async function deriveKey(password, salt): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Gets the vault string encoding
 * @param vault Vault object
 * @returns Encoded vault in Uint8Array
 */
function getVaultEncoding(vault): Uint8Array {
    let enc = new TextEncoder();
    return enc.encode(vault)
}

/**
 * 
 * @param derivedKey Derived key using 
 * @param vault 
 * @returns 
 */
export async function encrypt(derivedKey, vault) {
    
    let encoded = getVaultEncoding(JSON.stringify(vault))
    let iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        derivedKey,
        encoded
    );

    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
        ciphertext: encryptedBase64,
        iv: ivBase64
    };
}

/**
 * Decryption function to decrypt the encrypted vault.
 * @param derivedKey Key derived from the plaintext using a random generated salt that was previously generated
 * @param ivBase64 IV needed to decrypt for AES-GCM
 * @param ciphertextBase64 Ciphertext in encoded in `base64`
 * @returns Returns a decoded buffer -> vault was previously stringified to JSON
 */
export async function decrypt(derivedKey, ivBase64, ciphertextBase64): Promise<string> {
    try {
        // Convert base64 strings back to ArrayBuffers
        const ivUint8 = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const encryptedUint8 = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivUint8
            },
            derivedKey as CryptoKey,
            encryptedUint8
        );
        
        // Convert the decrypted buffer to a string
        const dec = new TextDecoder();
        
        return dec.decode(decryptedBuffer);
    }
    catch(error) {
        console.log(error)
    }
}
