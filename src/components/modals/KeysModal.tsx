import { useState } from "react";
import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";
import type { PublicKeyInfo } from "~types/vault";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useTheme } from "~contexts/ThemeContext";
import { useSettings } from "~contexts/SettingsContent";

export default function KeysModal({ isOpen, onClose, action }) {
    const { userKeys, email, generatePair } = useVault();
    const { settings } = useSettings(); // Get the current PGP settings
    const { colorScheme } = useTheme(); // Get the current color scheme
    const [isLoading, setIsLoading] = useState(false);
    const [passphrase, setPassphrase] = useState("");
    const [confirmPassphrase, setConfirmPassphrase] = useState("");

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (passphrase !== confirmPassphrase) {
            alert("Passphrases do not match.");
            return;
        }
        setIsLoading(true);
        try {
            // Pass both the passphrase and the current settings to the generatePair function
            await generatePair(passphrase, settings);
            onClose();
        } catch (error) {
            console.error("Key generation failed:", error);
            alert("Key generation failed. See the console for more details.");
        } finally {
            setIsLoading(false);
        }
    };

    const primaryButtonClasses = colorScheme === 'purple'
        ? 'bg-purple-600 hover:bg-purple-700'
        : 'bg-kiwi hover:bg-kiwi-dark';

    const settingsText = settings.keyType === 'rsa'
        ? `RSA (${settings.rsaBits} bits)`
        : 'ECC';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 capitalize">{action} Key</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {action === "Generate" && (
                        <div>
                            <p className="mb-2 text-gray-700 dark:text-slate-300">This will generate a new PGP key pair for <strong className={`font-semibold ${colorScheme === 'purple' ? 'text-purple-600' : 'text-kiwi-dark'} dark:${colorScheme === 'purple' ? 'text-purple-400' : 'text-kiwi'}`}>{email}</strong> using your current settings.</p>
                            <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">This process may take a few seconds.</p>

                            <div className="p-3 mb-6 bg-gray-100 dark:bg-slate-700 rounded-md text-sm">
                                <p className="text-gray-600 dark:text-slate-300">
                                    Current Algorithm: <strong className="text-gray-800 dark:text-slate-100">{settingsText}</strong>. You can change this in the extension's options page.
                                </p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <input
                                    type="password"
                                    value={passphrase}
                                    onChange={e => setPassphrase(e.target.value)}
                                    placeholder="Optional: PGP Key Passphrase"
                                    className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-600 focus:ring-kiwi focus:border-kiwi"
                                />
                                <input
                                    type="password"
                                    value={confirmPassphrase}
                                    onChange={e => setConfirmPassphrase(e.target.value)}
                                    placeholder="Confirm Passphrase"
                                    className="w-full p-2 border rounded bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-600 focus:ring-kiwi focus:border-kiwi"
                                />
                            </div>

                            <button
                                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center justify-center ${primaryButtonClasses}`}
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
                            <p className="mb-4 text-gray-700 dark:text-slate-300">This feature is not yet implemented.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700 mt-auto">
                    <div className="flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}