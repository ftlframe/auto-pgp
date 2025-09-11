import { useEffect, useState } from "react";
import ContactsModal from "~components/modals/contacts/ContactModal";
import { useVault } from "~contexts/VaultContext";
import type { Contact } from "~types/vault";

export default function ContactTab() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const vault = useVault();
    const contacts: Contact[] = vault.contacts || [];

    useEffect(() => {
        // When the component mounts (or when the vault is unlocked and email is available),
        // fetch the list of contacts.
        if (vault.isUnlocked && vault.email) {
            vault.getContacts();
        }
    }, [vault.isUnlocked, vault.email]); // Re-run if these change

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Contact Management</h2>
                <button
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => setIsModalOpen(true)}
                >
                    Add Contact
                </button>
            </div>

            <div>
                {contacts.length === 0 ? (
                    <p className="text-gray-500 text-center p-4">No contacts found. Add one to get started!</p>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {contacts.map((contact) => (
                                    <tr key={contact.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{contact.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{contact.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ContactsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}