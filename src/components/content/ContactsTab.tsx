import { useEffect, useState } from "react";
import ContactsModal from "~components/modals/contacts/ContactModal";

export default function ContactTab() {

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

    useEffect(() => {
        
    }, [])

    return (
        <div className="bg-white rounded-xl items shadow-sm">
            <h2 className="text-lg font-semibold">Contact operations</h2>
            <div className="border-b border-gray-200 flex justify-between items-center">
                <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => openModal('add')}
                >
                    Add Contact
                </button>
            </div>
            <div className="border-b border-gray-200 flex justify-between items-center">
                <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => openModal('edit')}
                >
                    Edit Contact
                </button>
            </div>
            <div className="border-b border-gray-200 flex justify-between items-center">
                <button
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    onClick={() => openModal('delete')}
                >
                    Delete Contact
                </button>
            </div>

            <ContactsModal
                isOpen={isModalOpen}
                onClose={closeModal}
                action={activeModal}
                contacts={[]}
            />
        </div>
    );
}