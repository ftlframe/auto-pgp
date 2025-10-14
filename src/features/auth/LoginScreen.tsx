import { useState } from "react";
import { useVault } from "~contexts/VaultContext";
import { useTheme } from "~contexts/ThemeContext";

export function LoginScreen() {
    const { attemptLogin } = useVault();
    const { colorScheme } = useTheme();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length > 0) {
            setIsLoading(true);
            const result = await attemptLogin(password);
            if (!result.success) {
                setError(result.error || "Login failed.");
            }
            // If successful, the context handles the UI switch.
            setIsLoading(false);
        }
    };

    const accentTextClasses = colorScheme === 'purple'
        ? 'text-purple-700 dark:text-purple-400'
        : 'text-kiwi-dark dark:text-kiwi';

    const buttonClasses = colorScheme === 'purple'
        ? 'bg-purple-600 hover:bg-purple-700'
        : 'bg-kiwi hover:bg-kiwi-dark';

    const focusRingClasses = colorScheme === 'purple'
        ? 'focus:ring-purple-500'
        : 'focus:ring-kiwi';
    return (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-slate-900 p-4">
            <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 w-80 text-center">
                <h2 className={`text-lg font-semibold ${accentTextClasses}`}>
                    Welcome to Auto-PGP
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 mb-4">
                    Enter your master password to continue. If this is your first time, a new vault will be created.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full p-2 mb-4 text-gray-800 dark:text-slate-200 bg-gray-200 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 ${focusRingClasses}`}
                        placeholder="Master Password"
                        autoFocus
                    />
                    {error && <p className="text-red-500 dark:text-red-400 text-sm my-4">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${buttonClasses}`}
                    >
                        {isLoading ? "..." : "Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}