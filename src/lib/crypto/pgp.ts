export async function deriveKey(password, salt) {
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

function getVaultEncoding(vault) {

    let enc = new TextEncoder();
    return enc.encode(vault)
}

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

export async function decrypt(derivedKey, ivBase64, ciphertextBase64) {
    // Convert base64 strings back to ArrayBuffers
    const ivUint8 = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const encryptedUint8 = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivUint8
        },
        derivedKey,
        encryptedUint8
    );
    
    // Convert the decrypted buffer to a string
    const dec = new TextDecoder();
    
    return dec.decode(decryptedBuffer);
}


export function generateSalt(length = 16) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}