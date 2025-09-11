import * as openpgp from 'openpgp';
import { handleEncryptAndStoreVault, securePasswordStore } from "./vault";
import type { Contact, PublicKeyInfo, VaultEntry } from "~types/vault";

export async function handleAddContact(currentUserEmail: string, newContactData: { name: string, email: string, publicKeyArmored: string, notes?: string }) {
    const currentVault = securePasswordStore.getVault();
    if (!currentVault || !securePasswordStore.getKey()) {
        return { success: false, error: "Vault locked" };
    }

    try {
        const userVaultEntry = currentVault.vault.get(currentUserEmail);

        // We are now explicitly checking if the user's vault entry exists.
        // This entry is only created when the user generates their first key.
        if (!userVaultEntry) {
            return { success: false, error: "User vault entry not found. Please generate a key pair for yourself first." };
        }

        const publicKey = await openpgp.readKey({ armoredKey: newContactData.publicKeyArmored });
        const fingerprint = publicKey.getFingerprint().toUpperCase();
        const created = await publicKey.getCreationTime();

        const newKeyInfo: PublicKeyInfo = {
            armoredKey: newContactData.publicKeyArmored,
            fingerprint: fingerprint,
            created: created
        };

        let existingContact = userVaultEntry.contacts.get(newContactData.email);

        if (existingContact) {
            if (!existingContact.publicKeys.some(k => k.fingerprint === newKeyInfo.fingerprint)) {
                existingContact.publicKeys.push(newKeyInfo);
                console.log(`[Background] Added new key to existing contact ${newContactData.email}.`);
            }
        } else {
            existingContact = {
                id: crypto.randomUUID(),
                name: newContactData.name,
                email: newContactData.email,
                publicKeys: [newKeyInfo],
                dateAdded: new Date(),
                notes: newContactData.notes || ""
            };
            console.log(`[Background] Creating new contact for ${newContactData.email}.`);
        }

        userVaultEntry.contacts.set(newContactData.email, existingContact);
        securePasswordStore.setVault(currentVault);

        await handleEncryptAndStoreVault();
        console.log(`[Background] Vault saved.`);

        return { success: true, contact: existingContact };

    } catch (error) {
        console.error("Failed to add contact:", error);
        return { success: false, error: "Invalid PGP public key provided or another error occurred." };
    }
}

export async function handleGetContacts(email: string) {
    const currentVault = securePasswordStore.getVault();
    if (!currentVault || !securePasswordStore.getKey()) {
        return { success: false, error: "Vault locked", contacts: [] };
    }
    const entry = currentVault.vault.get(email);
    const contacts = entry ? Array.from(entry.contacts.values()) : [];
    return { success: true, contacts: contacts };
}

export async function handleDeleteContact(email: string, contactId: string) {
    // ... to be implemented later
    return { success: false, error: "Not yet implemented." };
}