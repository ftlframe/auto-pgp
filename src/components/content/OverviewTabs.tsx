import { useState } from "react";
import { useVault } from "~contexts/VaultContext";
import KeysModal from "~components/modals/KeysModal";
import ContactsModal from "~components/modals/contacts/ContactModal";
import { useTheme } from "~contexts/ThemeContext";

export function OverviewTab() {
    const { userKeys, contacts, lockVault } = useVault();
    const { colorScheme } = useTheme();
    const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);
    const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

    const keyCount = userKeys?.length ?? 0;
    const contactCount = contacts?.length ?? 0;

    // Define dynamic classes for the main action buttons based on the color scheme.
    // This makes the UI readable by giving each primary action a distinct color.
    const generateKeyBtnClasses = colorScheme === 'purple'
        ? 'bg-purple-600 hover:bg-purple-700 focus-visible:outline-purple-500'
        : 'bg-kiwi hover:bg-kiwi-dark focus-visible:outline-kiwi';

    const addContactBtnClasses = 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-500';

    return (
        <div className="p-4 bg-gray-50 dark:bg-slate-800">
            <div className="grid grid-cols-2 gap-4">

                {/* --- 1. Keys Card --- */}
                <div className="flex flex-col p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-semibold text-gray-600 dark:text-slate-400">Your PGP Keys</h3>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white my-4 flex-grow">{keyCount}</p>
                    <button
                        onClick={() => setIsKeysModalOpen(true)}
                        className={`w-full text-white px-3 py-2 text-sm font-semibold rounded-md transition-colors ${generateKeyBtnClasses}`}
                    >
                        Generate Key
                    </button>
                </div>

                {/* --- 2. Contacts Card --- */}
                <div className="flex flex-col p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-semibold text-gray-600 dark:text-slate-400">Saved Contacts</h3>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white my-4 flex-grow">{contactCount}</p>
                    <button
                        onClick={() => setIsContactsModalOpen(true)}
                        className={`w-full text-white px-3 py-2 text-sm font-semibold rounded-md transition-colors ${addContactBtnClasses}`}
                    >
                        Add Contact
                    </button>
                </div>

                {/* --- 3. Vault Status Card --- */}
                <div className="flex flex-col p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-semibold text-gray-600 dark:text-slate-400">Vault Status</h3>
                    <div className="my-4 flex-grow flex items-center">
                        <span className="inline-block h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                        <span className="text-lg font-bold text-green-800 dark:text-green-400">Unlocked</span>
                    </div>
                    <button
                        onClick={lockVault}
                        className="w-full bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-slate-100 px-3 py-2 text-sm font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                    >
                        Lock Vault Now
                    </button>
                </div>

                {/* --- 4. Import/Export Card (Placeholder) --- */}
                <div className="flex flex-col p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-semibold text-gray-600 dark:text-slate-400">Data Management</h3>
                    <div className="my-4 flex-grow flex items-center">
                        <p className="text-sm text-gray-500 dark:text-slate-400">Import or export your keys and contacts.</p>
                    </div>
                    <button
                        disabled
                        className="w-full bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-3 py-2 text-sm font-semibold rounded-md cursor-not-allowed"
                    >
                        Import / Export
                    </button>
                </div>

            </div>

            {/* --- Modals --- */}
            {isKeysModalOpen && (
                <KeysModal
                    isOpen={isKeysModalOpen}
                    onClose={() => setIsKeysModalOpen(false)}
                    action="Generate"
                />
            )}
            {isContactsModalOpen && (
                <ContactsModal
                    isOpen={isContactsModalOpen}
                    onClose={() => setIsContactsModalOpen(false)}
                />
            )}
        </div>
    );
}