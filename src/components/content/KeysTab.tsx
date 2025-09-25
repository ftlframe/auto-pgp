import { useState } from "react";
import KeysModal from "~components/modals/KeysModal";
import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";
import { KeyIcon } from "@heroicons/react/24/outline";
import type { PublicKeyInfo } from "~types/vault";

// A small, self-contained component for the "empty state"
const EmptyState = ({ onGenerateClick }) => (
    <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <KeyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">No PGP Keys Found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by generating your first key pair.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onGenerateClick}
                className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
            >
                Generate Your First Key
            </button>
        </div>
    </div>
);

// A component for the list of keys, to keep the main component clean
const KeyList = ({ keys, onDelete }) => (
    <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
        {(keys as PublicKeyInfo[]).map((key) => (
            <div key={key.fingerprint} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex-grow mb-3 sm:mb-0 sm:mr-4">
                    <p className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate" title={key.fingerprint}>
                        Fingerprint: ...{key.fingerprint?.slice(-16) ?? 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Created: {formatDate(key.created)}
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <button
                        onClick={() => navigator.clipboard.writeText(key.armoredKey)}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900"
                    >
                        Copy Public Key
                    </button>
                    <button
                        onClick={() => onDelete(key.fingerprint)}
                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900"
                    >
                        Delete
                    </button>
                </div>
            </div>
        ))}
    </div>
);


// The main component
export default function KeysTab() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeModalAction, setActiveModalAction] = useState(null);
    const { userKeys, deleteKey } = useVault();

    const openModal = (action) => {
        setActiveModalAction(action);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Key Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your personal PGP key pairs are stored here.</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => openModal('Import')}
                        className="rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        Import
                    </button>
                    <button
                        onClick={() => openModal('Generate')}
                        className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
                    >
                        Generate New Key
                    </button>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div>
                {(!userKeys || userKeys.length === 0) ? (
                    <EmptyState onGenerateClick={() => openModal('Generate')} />
                ) : (
                    <KeyList keys={userKeys} onDelete={deleteKey} />
                )}
            </div>

            {/* --- MODAL --- */}
            {isModalOpen && (
                <KeysModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    action={activeModalAction}
                />
            )}
        </div>
    );
}