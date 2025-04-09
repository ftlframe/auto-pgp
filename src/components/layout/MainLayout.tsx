import { useContext, useEffect, useState } from "react";
import ContactTab from "~components/content/ContactsTab";
import KeysTab from "~components/content/KeysTab";
import { OverviewTab } from "~components/content/OverviewTabs";
import { useVault } from "~contexts/VaultContext";

export function MainLayout() {
    const [activeTab, setActiveTab] = useState('overview')
    const vault = useVault()
    useEffect(() => {
        async function getter() {

            await vault.getEmail()
        }

        getter();
    }, []) 
    return (
        <div className="rounded-lg">
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-purple-600 mb-4">Auto-PGP { vault.email !== ''? '- ' + vault.email: ' - /'}</h1>
                    <nav className="flex space-x-8">
                        <button
                            className={`pb-2 px-1 ${activeTab === 'overview'
                                ? 'border-b-2 border-purple-500 text-purple-600 font-semibold'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`pb-2 px-1 ${activeTab === 'keys'
                                ? 'border-b-2 border-purple-500 text-purple-600 font-semibold'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('keys')}
                        >
                            Keys
                        </button>
                        <button
                            className={`pb-2 px-1 ${activeTab === 'contacts'
                                ? 'border-b-2 border-purple-500 text-purple-600 font-semibold'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('contacts')}
                        >
                            Contacts
                        </button>
                    </nav>
                </div>
            </header>
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
                {activeTab === 'overview' && <OverviewTab/>}

                {activeTab === 'keys' && <KeysTab/>}

                {activeTab === 'contacts' && <ContactTab/>}
            </main>
        </div>
    );
}