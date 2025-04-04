// types/vault.ts
export interface KeyPair {
    fingerprint: string;
    publicKey: string;
    encryptedPrivateKey: string; // Encrypted with derived key
}

export interface Contact {
    email: string,
    publicKey: string
}

export interface Vault {
    keyPairs: KeyPair[];
    contacts: Contact[];
}
