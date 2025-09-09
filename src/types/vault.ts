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
    id: string;          // Unique ID for this contact entry (e.g., crypto.randomUUID())
    name?: string;        // Optional: User-friendly name for the contact
    email: string;       // Primary identifier, should be unique per user's contact list
    publicKey: string;   // The PGP public key block
    fingerprint?: string; // Optional: Extracted fingerprint of the publicKey for display/verification
    dateAdded?: Date;     // Optional: When was this contact added?
    notes?: string;       // Optional: Any personal notes about this contact
}

export interface VaultEntry {
    keyPairs: Map<string, KeyPair>;  // Map of key pairs indexed by ID or fingerprint
    contacts: Map<string, Contact>;   // Map of contacts indexed by email
}
export interface Vault {
    vault: Map<string, VaultEntry>;  // Use email as the key for O(1) lookups
}
