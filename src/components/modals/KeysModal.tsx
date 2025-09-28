import { useState } from "react";
import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";
import type { PublicKeyInfo } from "~types/vault";
import { XMarkIcon } from "@heroicons/react/24/solid"; // Using an icon for the close button

export default function KeysModal({ isOpen, onClose, action }) {
    const { userKeys, email, generatePair } = useVault();
    const [isLoading, setIsLoading] = useState(false);

    const [passphrase, setPassphrase] = useState("");
    const [confirmPassphrase, setConfirmPassphrase] = useState("");

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (passphrase !== confirmPassphrase) {
            alert("Passphrases do not match.");
            return;
        }
        setIsLoading(true);
        try {
            await generatePair(passphrase);
            onClose(); // Close the modal on success
        } catch (error) {
            console.error("Key generation failed:", error);
            alert("Key generation failed. See the console for more details.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 capitalize">{action} Key</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {action === "Generate" && (
                        <div>
                            <p className="mb-4 text-gray-700 dark:text-gray-300">This will generate a new PGP key pair for your email address: <strong className="text-purple-600 dark:text-purple-400">{email}</strong>.</p>
                            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">This process may take a few seconds.</p>

                            <div className="space-y-4 mb-6">
                                <input
                                    type="password"
                                    value={passphrase}
                                    onChange={e => setPassphrase(e.target.value)}
                                    placeholder="Optional: PGP Key Passphrase"
                                    className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 ..."
                                />
                                <input
                                    type="password"
                                    value={confirmPassphrase}
                                    onChange={e => setConfirmPassphrase(e.target.value)}
                                    placeholder="Confirm Passphrase"
                                    className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 ..."
                                />
                            </div>
                            <button
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                onClick={handleGenerate}
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isLoading ? 'Generating...' : 'Generate New Key'}
                            </button>
                        </div>
                    )}

                    {(action === "Export" || action === "Import") && (
                        <div>
                            <p className="mb-4 text-gray-700 dark:text-gray-300">Please select a key to {action.toLowerCase()}.</p>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fingerprint</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expires</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {(userKeys || []).map((key) => (
                                            <tr key={key.fingerprint} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 font-mono" title={key.fingerprint}>...{key.fingerprint?.slice(-16) ?? 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(key.created)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(key.expires)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <button className="text-blue-600 dark:text-blue-400 hover:underline">
                                                        {action}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {action === "Import" && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Import functionality is not yet implemented.</p>}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 mt-auto">
                    <div className="flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}