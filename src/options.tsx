import ThemeProvider, { useTheme } from "~contexts/ThemeContext";
import "~style.css"; // Import your Tailwind styles

// This is the main content of your full settings page.
const OptionsContent = () => {
    const { theme } = useTheme(); // It can still use the theme context
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <div className="max-w-4xl mx-auto py-10 px-4">
                <header className="mb-10">
                    <h1 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">Auto-PGP Settings</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                        Manage advanced settings, security configurations, and data import/export.
                    </p>
                </header>

                <div className="space-y-8">
                    {/* Placeholder for future "Brute-Force Protection" settings */}
                    <section>
                        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-slate-700 pb-2">Security</h2>
                        <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <p className="text-gray-500 dark:text-slate-400">
                                Advanced security settings, like auto-lock timer duration and brute-force protection, will be available here.
                            </p>
                        </div>
                    </section>

                    {/* Placeholder for future "Import/Export" settings */}
                    <section>
                        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-slate-700 pb-2">Data Management</h2>
                         <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <p className="text-gray-500 dark:text-slate-400">
                                Import or export your entire encrypted vault, individual keys, and contacts.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// This is the root component for the options page, which provides the theme context.
const OptionsIndex = () => {
    return (
        <ThemeProvider>
            <OptionsContent />
        </ThemeProvider>
    );
};

export default OptionsIndex;