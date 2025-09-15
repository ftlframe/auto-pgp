import { useState } from "react";
import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";
import type { PublicKeyInfo } from "~types/vault";

export default function KeysModal({ isOpen, onClose, action }) {
    const { userKeys, email, generatePair } = useVault();
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            await generatePair();
            onClose(); // Close the modal on success
        } catch (error) {
            console.error("Key generation failed:", error);
            // In a real app, you might set an error state here instead of alerting
            alert("Key generation failed. See the console for more details.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold capitalize">{action} Key</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {action === "Generate" && (
                        <div>
                            <p className="mb-4 text-gray-700">This will generate a new PGP key pair for your email address: <strong>{email}</strong>.</p>
                            <p className="mb-6 text-sm text-gray-500">This process may take a few seconds.</p>
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
                            <p className="mb-4 text-gray-700">Please select a key to {action.toLowerCase()}.</p>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fingerprint</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(userKeys || []).map((key) => (
                                            <tr key={key.fingerprint}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono" title={key.fingerprint}>...{key.fingerprint?.slice(-16) ?? 'N/A'}</td>
                                                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(key.dateCreated)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(key.dateExpire)}</td> */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button className="text-blue-600 hover:text-blue-800 hover:underline">
                                                        {action}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {action === "Import" && <p className="mt-4 text-sm text-gray-500">Import functionality is not yet implemented.</p>}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t mt-auto">
                    <div className="flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-100">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}