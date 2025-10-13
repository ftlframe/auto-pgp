// src/types/vault.ts

export interface PublicKeyInfo {
    armoredKey: string;             // The -----BEGIN PGP PUBLIC KEY BLOCK----- string
    fingerprint: string;            // Unqique key fingerprint
    created: Date;                  // Date of creation
    expires?: Date | null;          // Optional expiration date
    nickname?: string;              // Optional user-provided name for the key
}

// For the user's own keys, which also include an encrypted private key.
export interface KeyPair extends PublicKeyInfo {
    encryptedPrivateKey: string;    // Encrypted private key
    iv: string;                     // IV
    encryptedPassphrase?: string;   // Optional encrypted passhprase for key
    ivPassphrase?: string;          // IV for the optional passphrase
}

export interface Contact {
    id: string;                     // Unique identifier
    name?: string;                  // Optional name
    email: string;                  // Contacts full e-mail
    publicKeys: PublicKeyInfo[];    // Public keys associated with contact
    dateAdded?: Date;               // When the contact was added
    notes?: string;                 // Optional notes
}

export interface VaultEntry {
    keyPairs: Map<string, KeyPair>;
    contacts: Map<string, Contact>;
}

export interface Vault {
    vault: Map<string, VaultEntry>;
}

