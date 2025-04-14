import { useState } from "react";
import KeysModal from "~components/modals/KeysModal";
import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";


export default function KeysTab() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const userKeys = useVault().userKeys as any
    const deleteKey = useVault().deleteKey

    const openModal = (action) => {
        setActiveModal(action);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveModal(null);
    };

    return (
        // Main container
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col max-h-[80vh]"> {/* Adjust max-h as needed */}

            {/* --- Non-Scrolling Top Section --- */}
            <div className="flex-shrink-0"> {/* Prevents this section from shrinking */}
                <h2 className="text-lg font-semibold mb-4">Key Management</h2> {/* Added margin */}

                {/* Button Container */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"> {/* Use grid, add gap and margin */}
                    <button
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        onClick={() => openModal('Generate')}
                    >
                        Generation wizard
                    </button>
                    <button
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        onClick={() => openModal('Export')}
                    >
                        Export wizard
                    </button>
                    <button
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        onClick={() => openModal('Import')}
                    >
                        Import wizard
                    </button>
                </div>
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto border border-gray-200 rounded-md shadow-sm">


                {/* Handle Empty State */}
                {(!userKeys || userKeys.length === 0) && (
                    <div className="p-4 text-center text-gray-500">No keys found.</div>
                )}

                {/* Display Key List only if loaded, no error, and not empty */}
                {userKeys && userKeys.length > 0 && (
                    <div className="divide-y divide-gray-200"> {/* Divider for list items */}
                        {/* Map over the userKeys array */}
                        {(userKeys as PublicKeyInfo[]).map((key) => ( // Type assertion if needed
                            <div
                                key={key.fingerprint ?? crypto.randomUUID()} // Use fingerprint or fallback key
                                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50 transition-colors duration-150"
                            >
                                {/* Key Information Section (Left Side) */}
                                <div className="flex-grow mb-3 sm:mb-0 sm:mr-4">
                                    <p className="font-mono text-sm text-gray-800 truncate" title={key.fingerprint}>
                                        Fingerprint: ...{key.fingerprint?.slice(-16) ?? 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Created: {formatDate(key.dateCreated)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Expires: {formatDate(key.dateExpire)}
                                    </p>
                                </div>

                                {/* Action Buttons Section (Right Side) */}
                                <div className="flex-shrink-0 flex items-center space-x-2">
                                    <button
                                        onClick={() => key.publicKey && navigator.clipboard.writeText(key.publicKey)}
                                        disabled={!key.publicKey}
                                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                        title={key.publicKey ? "Copy Public Key to Clipboard" : "Public key not available"}
                                    >
                                        Copy Public Key
                                    </button>
                                    <button
                                        onClick={() => deleteKey(key.fingerprint)}
                                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* --- End Scrollable Key List Section --- */}


            {/* Modal rendering remains conditional */}
            {isModalOpen && (
                <KeysModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    action={activeModal}
                />
            )}

        </div> // End main container
    );
}