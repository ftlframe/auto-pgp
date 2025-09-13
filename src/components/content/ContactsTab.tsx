import { useEffect, useState } from "react";
import ContactsModal from "~components/modals/contacts/ContactModal";
import { useVault } from "~contexts/VaultContext";
import type { Contact } from "~types/vault";
import ContactCard from "./ContactCard"; // <-- Import the new component

export default function ContactTab() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const vault = useVault();
    const contacts: Contact[] = vault.contacts || [];

    useEffect(() => {
        if (vault.isUnlocked && vault.email) {
            vault.getContacts();
        }
    }, [vault.isUnlocked, vault.email]);

    return (
        <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Contact Management</h2>
                <button
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm"
                    onClick={() => setIsModalOpen(true)}
                >
                    Add Contact
                </button>
            </div>

            <div className="space-y-4">
                {contacts.length === 0 ? (
                    <p className="text-gray-500 text-center p-8">No contacts found. Add one to get started!</p>
                ) : (
                    contacts.map((contact) => (
                        <ContactCard key={contact.id} contact={contact} />
                    ))
                )}
            </div>

            <ContactsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}