import { useTheme } from "~contexts/ThemeContext";
import { SunIcon, MoonIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";

// A simple button component for toggling the theme.
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

// The main settings tab component.
export default function SettingsTab() {
    const { theme, colorScheme, setColorScheme } = useTheme();

    const openOptionsPage = () => {
        chrome.runtime.openOptionsPage();
    };

    return (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            <div className="pb-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Manage your extension's appearance and behavior.</p>
            </div>

            <div className="mt-6 space-y-6">
                {/* Appearance Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Appearance</h3>

                    {/* Theme Toggle */}
                    <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-700 dark:text-slate-300">Interface Theme</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Current: <span className="capitalize font-semibold">{theme}</span>
                            </p>
                        </div>
                        <ThemeToggleButton />
                    </div>

                    {/* Color Scheme Selector */}
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                        <p className="font-medium text-gray-700 dark:text-slate-300 mb-3">Accent Color</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setColorScheme('purple')}
                                className={`w-full py-2 rounded-md font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all ${colorScheme === 'purple' ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-slate-800' : ''}`}
                            >
                                Purple
                            </button>
                            <button
                                onClick={() => setColorScheme('kiwi')}
                                className={`w-full py-2 rounded-md font-semibold text-white bg-kiwi-dark hover:bg-kiwi transition-all ${colorScheme === 'kiwi' ? 'ring-2 ring-offset-2 ring-kiwi dark:ring-offset-slate-800' : ''}`}
                            >
                                Kiwi
                            </button>
                        </div>
                    </div>
                </section>

                {/* Advanced Settings Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Advanced</h3>
                    <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-700 dark:text-slate-300">More Options</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Manage security, data import/export, and more.
                            </p>
                        </div>
                        <button
                            onClick={openOptionsPage}
                            className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
                        >
                            <Cog6ToothIcon className="h-5 w-5" />
                            <span>Advanced Settings</span>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}