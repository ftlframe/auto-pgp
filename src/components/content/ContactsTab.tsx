import { useEffect, useState } from "react";
import ContactsModal from "~components/modals/contacts/ContactModal";
import { useVault } from "~contexts/VaultContext";
import type { Contact } from "~types/vault";
import ContactCard from "./ContactCard";
import { UserGroupIcon } from "@heroicons/react/24/outline";

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
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contact Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your contacts and their public keys.</p>
                </div>
                <button
                    className="bg-blue-600 text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
                    onClick={() => setIsModalOpen(true)}
                >
                    Add Contact
                </button>
            </div>

            <div className="space-y-4">
                {contacts.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">No Contacts Found</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding your first contact.</p>
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                                Add Your First Contact
                            </button>
                        </div>
                    </div>
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