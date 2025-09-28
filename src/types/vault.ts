// src/types/vault.ts

// This is now the ONE definitive interface for public key info.
export interface PublicKeyInfo {
    armoredKey: string;     // The -----BEGIN PGP PUBLIC KEY BLOCK----- string
    fingerprint: string;
    created: Date;
    expires?: Date | null;  // Optional expiration date
    nickname?: string;      // Optional user-provided name for the key
}

// For the user's own keys, which also include an encrypted private key.
export interface KeyPair extends PublicKeyInfo {
    encryptedPrivateKey: string;
    iv: string;
    encryptedPassphrase?: string;
    ivPassphrase?: string;
}

export interface Contact {
    id: string;
    name?: string;
    email: string;
    publicKeys: PublicKeyInfo[]; // This now uses our unified type
    dateAdded?: Date;
    notes?: string;
}

export interface VaultEntry {
    keyPairs: Map<string, KeyPair>;
    contacts: Map<string, Contact>;
}

export interface Vault {
    vault: Map<string, VaultEntry>;
}