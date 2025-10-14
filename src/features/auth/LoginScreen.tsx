import { useEffect, useState } from "react";
import { useVault } from "~contexts/VaultContext";

export function LoginScreen() {
    const { attemptLogin } = useVault();
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
            // If successful, the context will handle setting isUnlocked,
            // and the UI will automatically switch to the MainLayout.
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 w-80 text-center">
                <h2 className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                    Welcome to Auto-PGP
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                    Enter your master password to continue. If this is your first time, a new vault will be created.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 mb-4 text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg"
                        placeholder="Master Password"
                        autoFocus
                    />
                    {error && <p className="text-red-500 dark:text-red-400 text-sm my-4">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                        {isLoading ? "..." : "Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}