import { useState } from "react";
import { useVault } from "~contexts/VaultContext";

export default function ContactsModal({ isOpen, onClose }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [publicKeyArmored, setPublicKey] = useState("");
    const [error, setError] = useState("");
    const vault = useVault();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); // Clear previous errors
        const response = await vault.addContact({ name, email, publicKeyArmored });
        if (response.success) {
            onClose(); // Close modal on success
        } else {
            setError(response.error || "An unknown error occurred.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Add New Contact</h3>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded" />
                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email Address" className="w-full p-2 border rounded" required />
                        <textarea value={publicKeyArmored} onChange={e => setPublicKey(e.target.value)} placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..." rows={8} className="w-full p-2 border rounded font-mono text-xs" required />
                    </div>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Save Contact</button>
                    </div>
                </form>
            </div>
        </div>
    );
}