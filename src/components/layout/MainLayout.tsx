import { useEffect, useState } from "react";
import ContactTab from "~components/content/ContactsTab";
import KeysTab from "~components/content/KeysTab";
import { OverviewTab } from "~components/content/OverviewTabs";
import { useTheme } from "~contexts/ThemeContext";
import { useVault } from "~contexts/VaultContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

const ThemeToggleButton = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
            ) : (
                <MoonIcon className="h-5 w-5" />
            )}
        </button>
    )
}

export function MainLayout() {
    const [activeTab, setActiveTab] = useState('overview');
    const vault = useVault();
    
    const { isUnlocked, getEmail, getKeys, getContacts } = vault;
    useEffect(() => {
        // This function will run reliably whenever isUnlocked changes to true.
        async function fetchInitialData() {
            console.log("[MainLayout] Vault is unlocked. Fetching all initial data...");
            await Promise.all([
                getEmail(),
                getKeys(),
                getContacts()
            ]);
            console.log("[MainLayout] Initial data fetch complete.");
        }

        if (isUnlocked) {
            fetchInitialData();
        }
    // The dependency array is stable because the functions are wrapped in useCallback
    }, [isUnlocked, getEmail, getKeys, getContacts]);

    return (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-full flex flex-col">
            <header className="bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                <div className="mx-auto px-4 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400 truncate pr-2">
                            Auto-PGP {vault.email ? `- ${vault.email}` : ''}
                        </h1>
                        <ThemeToggleButton />
                    </div>
                    <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'overview'
                                ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'keys'
                                ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            onClick={() => setActiveTab('keys')}
                        >
                            Keys
                        </button>
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'contacts'
                                ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            onClick={() => setActiveTab('contacts')}
                        >
                            Contacts
                        </button>
                    </nav>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full py-4 px-4">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'keys' && <KeysTab />}
                    {activeTab === 'contacts' && <ContactTab />}
                </div>
            </main>
        </div>
    );
}