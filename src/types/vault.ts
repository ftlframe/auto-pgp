// A new interface to hold details for a single public key.
// This allows us to store more than just the key string.
export interface PublicKeyInfo {
  armoredKey: string;                   // The -----BEGIN PGP PUBLIC KEY BLOCK----- string
  fingerprint: string;
  created: Date;
  nickname?: string;                    // Optional user-provided name for the key
}

export interface KeyPair {
    fingerprint: string;
    publicKey: string;
    encryptedPrivateKey: string;        // Encrypted with derived key
    iv: string;
    dateCreated: Date;
    dateExpire: Date | null;
}

export interface Contact {
    id: string;                         // Unique ID for this contact entry
    name?: string;                      // User-friendly name
    email: string;                      // Primary identifier
    publicKeys: PublicKeyInfo[];        // An array to hold multiple keys
    dateAdded?: Date;
    notes?: string;
}

export interface VaultEntry {
    keyPairs: Map<string, KeyPair>;     // Map of the user's own key pairs
    contacts: Map<string, Contact>;     // Map of contacts, using their email as the key
}

export interface Vault {
    vault: Map<string, VaultEntry>;     // The main vault, using the user's email as the key
}