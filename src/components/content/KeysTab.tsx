import { useState } from "react";
import KeysModal from "~components/modals/KeysModal";
import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";
import type { PublicKeyInfo } from "~types/vault";

// A small, self-contained component for the "empty state"
const EmptyState = ({ onGenerateClick }) => (
    <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">No PGP Keys Found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by generating your first key pair.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onGenerateClick}
                className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
                Generate Your First Key
            </button>
        </div>
    </div>
);

// A component for the list of keys, to keep the main component clean
const KeyList = ({ keys, onDelete }) => (
    <div className="divide-y divide-gray-200 border border-gray-200 rounded-md">
        {(keys as PublicKeyInfo[]).map((key) => (
            <div key={key.fingerprint} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50">
                <div className="flex-grow mb-3 sm:mb-0 sm:mr-4">
                    <p className="font-mono text-sm text-gray-800 truncate" title={key.fingerprint}>
                        Fingerprint: ...{key.fingerprint?.slice(-16) ?? 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Created: {formatDate(key.created)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Expires: {formatDate(key.expires)}
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <button
                        onClick={() => navigator.clipboard.writeText(key.armoredKey)}
                        disabled={!key.armoredKey}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50"
                        title={key.armoredKey ? "Copy Public Key to Clipboard" : "Public key not available"}
                    >
                        Copy Public Key
                    </button>
                    <button
                        onClick={() => onDelete(key.fingerprint)}
                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
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
        <div className="p-4 bg-white rounded-xl shadow-sm">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Key Management</h2>
                    <p className="text-sm text-gray-500">Your personal PGP key pairs are stored here.</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => openModal('Import')}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
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