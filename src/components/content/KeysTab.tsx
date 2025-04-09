import { useState } from "react";
import KeysModal from "~components/modals/KeysModal";
import { useVault } from "~contexts/VaultContext";

export default function KeysTab() {
    const vault = useVault();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    const openModal = (action) => {
        setActiveModal(action);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveModal(null);
    };
    return (
        <div className="bg-white rounded-xl shadow-sm">
            {/* Keys Content */}
            <h2 className="text-lg font-semibold">Key operations</h2>
            <div className="border-b border-gray-200 flex justify-between items-center">
                <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => openModal('Generate')}
                >
                    Generation wizard
                </button>
            </div>
            <div className="border-b border-gray-200 flex justify-between items-center">
                <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => openModal('Revoke')}
                >
                    Revoke key
                </button>
            </div>
            <div className="border-b border-gray-200 flex justify-between items-center">
                <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => openModal('Import/export')}
                >
                    Import/export wizard
                </button>
            </div>
            <div className="divide-y divide-gray-200">
                {/* Key List Items */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                        <h3 className="font-medium">Main Encryption Key</h3>
                        <p className="text-sm text-gray-500">Created: 2023-08-15</p>
                    </div>
                    <span className="text-sm text-purple-600">Active</span>
                </div>
            </div>
            <KeysModal
                isOpen={isModalOpen}
                onClose={closeModal}
                action={activeModal}
                keys={[]}
            />
        </div>
    );
}