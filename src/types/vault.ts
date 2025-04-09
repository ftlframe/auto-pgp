// types/vault.ts
export interface KeyPair {
    fingerprint: string;
    publicKey: string;
    encryptedPrivateKey: string; // Encrypted with derived key
    iv: string;
    dateCreated: Date;
    dateExpire: Date | null;
}

export interface Contact {
    email: string,
    publicKey: string
}
export interface VaultEntry {
    keyPairs: Map<string, KeyPair>;  // Map of key pairs indexed by ID or fingerprint
    contacts: Map<string, Contact>;   // Map of contacts indexed by email
}
export interface Vault {
    vault: Map<string, VaultEntry>;  // Use email as the key for O(1) lookups
}
