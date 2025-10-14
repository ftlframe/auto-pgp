import { useEffect, useState } from "react";
import ContactTab from "~components/content/ContactsTab";
import KeysTab from "~components/content/KeysTab";
import { OverviewTab } from "~components/content/OverviewTabs";
import SettingsTab from "~components/content/SettingsTab";
import { useTheme } from "~contexts/ThemeContext";
import { useVault } from "~contexts/VaultContext";

export function MainLayout() {
    const [activeTab, setActiveTab] = useState('overview');
    const vault = useVault();
    const { colorScheme } = useTheme(); // Get the current color scheme

    // This robust useEffect hook fetches all necessary data once the vault is unlocked.
    const { isUnlocked, getEmail, getKeys, getContacts } = vault;
    useEffect(() => {
        async function fetchInitialData() {
            await Promise.all([getEmail(), getKeys(), getContacts()]);
        }
        if (isUnlocked) {
            fetchInitialData();
        }
    }, [isUnlocked, getEmail, getKeys, getContacts]);

    // Define color classes based on the selected scheme for a dynamic UI
    const accentColor = colorScheme === 'purple' ? 'purple' : 'emerald';
    const activeTabClasses = `border-b-2 border-${accentColor}-500 text-${accentColor}-600 dark:text-${accentColor}-400 font-semibold`;
    const inactiveTabClasses = 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300';

    return (
        <div className="rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-200 h-full flex flex-col">
            <header className="bg-white dark:bg-slate-800 shadow-sm flex-shrink-0">
                <div className="mx-auto px-4 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className={`text-2xl font-bold text-${accentColor}-600 dark:text-${accentColor}-400 truncate pr-2`}>
                            auto-PGP {vault.email ? `- ${vault.email}` : ''}
                        </h1>
                        {/* The theme toggle button is now located in the SettingsTab */}
                    </div>
                    <nav className="flex space-x-8 border-b border-gray-200 dark:border-slate-700">
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'overview' ? activeTabClasses : inactiveTabClasses}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'keys' ? activeTabClasses : inactiveTabClasses}`}
                            onClick={() => setActiveTab('keys')}
                        >
                            Keys
                        </button>
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'contacts' ? activeTabClasses : inactiveTabClasses}`}
                            onClick={() => setActiveTab('contacts')}
                        >
                            Contacts
                        </button>
                        <button
                            className={`pb-2 px-1 text-sm font-medium ${activeTab === 'settings' ? activeTabClasses : inactiveTabClasses}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            Settings
                        </button>
                    </nav>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full py-4 px-4">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'keys' && <KeysTab />}
                    {activeTab === 'contacts' && <ContactTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </main>
        </div>
    );
}