import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import ThemeProvider, { useTheme } from "~contexts/ThemeContext";
import "~style.css";
import SettingsProvider, { useSettings, type AppSettings } from "~contexts/SettingsContent";

// This is the button component that toggles the theme.
const ThemeToggleButton = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
            ) : (
                <MoonIcon className="h-5 w-5" />
            )}
        </button>
    );
};

// This is the main content of your settings page.
const OptionsContent = () => {
    const { theme } = useTheme();
    const { settings, updateSetting, isLoading } = useSettings();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <div className="max-w-3xl mx-auto py-12 px-6">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold text-kiwi-dark dark:text-kiwi">Auto-PGP Settings</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                        Manage your extension's appearance and cryptography settings.
                    </p>
                </header>

                <div className="space-y-10">
                    {/* Appearance Section */}
                    <section>
                        <h2 className="text-2xl font-semibold border-b border-gray-300 dark:border-slate-700 pb-2 text-slate-800 dark:text-slate-200">Appearance</h2>
                        <div className="mt-4 p-6 flex justify-between items-center bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <div>
                                <p className="font-medium text-lg text-gray-800 dark:text-slate-200">Interface Theme</p>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    Current: <span className="capitalize font-semibold">{theme}</span> Mode
                                </p>
                            </div>
                            <ThemeToggleButton />
                        </div>
                    </section>

                    {/* Cryptography Settings Section */}
                    <section>
                        <h2 className="text-2xl font-semibold border-b border-gray-300 dark:border-slate-700 pb-2 text-slate-800 dark:text-slate-200">Cryptography</h2>
                        <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm space-y-8">
                            {/* Key Type Setting */}
                            <div>
                                <label htmlFor="keyType" className="font-medium text-lg text-gray-800 dark:text-slate-200">Default Key Type</label>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">Algorithm used for new key generation. RSA is standard, ECC is more modern but less compatible.</p>
                                <select
                                    id="keyType"
                                    value={settings.keyType}
                                    onChange={(e) => updateSetting('keyType', e.target.value as AppSettings['keyType'])}
                                    className="block w-full max-w-xs rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-kiwi focus:outline-none focus:ring-kiwi sm:text-sm"
                                >
                                    <option value="rsa">RSA (Recommended)</option>
                                    <option value="ecc">ECC (Elliptic Curve)</option>
                                </select>
                            </div>
                            {/* RSA Bit Strength Setting */}
                            {settings.keyType === 'rsa' && (
                                <div>
                                    <label htmlFor="rsaBits" className="font-medium text-lg text-gray-800 dark:text-slate-200">RSA Key Strength</label>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">Higher bit counts are more secure but may be slower on older devices. 4096 is the modern standard.</p>
                                    <select
                                        id="rsaBits"
                                        value={settings.rsaBits}
                                        onChange={(e) => updateSetting('rsaBits', parseInt(e.target.value, 10) as AppSettings['rsaBits'])}
                                        className="block w-full max-w-xs rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-base focus:border-kiwi focus:outline-none focus:ring-kiwi sm:text-sm"
                                    >
                                        <option value={2048}>2048 bits (Standard)</option>
                                        <option value={3072}>3072 bits (Strong)</option>
                                        <option value={4096}>4096 bits (Very Strong)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// This is the root component for the options page, which provides the necessary contexts.
const OptionsIndex = () => {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <OptionsContent />
            </SettingsProvider>
        </ThemeProvider>
    );
};

export default OptionsIndex;