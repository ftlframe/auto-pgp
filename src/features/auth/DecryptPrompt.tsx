import { useState } from "react";
import { useVault } from "~contexts/VaultContext";

export function DecryptPrompt() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    // --- FIX: Get the correct function from the context ---
    const { performDecryption } = useVault();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (password) {
            // --- FIX: Call performDecryption, not unlockVault ---
            const result = await performDecryption(password);
            if (result.success) {
                window.close(); // Close the popup after submitting
            } else {
                setError(result.error || "Decryption failed.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
            <div className="bg-white shadow-xl rounded-2xl p-6 w-80 text-center">
                <h2 className="text-lg font-semibold text-purple-700 mb-2">Password Required</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Enter your master password to decrypt this message.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 mb-4 text-gray-800 bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="Master Password"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <button
                        type="submit"
                        className="w-full py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                    >
                        Decrypt
                    </button>
                </form>
            </div>
        </div>
    );
}