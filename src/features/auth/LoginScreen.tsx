import { useEffect, useState } from "react";
import { useVault } from "~contexts/VaultContext";

export function LoginScreen() {
    const vault = useVault()
    useEffect(() => {
    }, []);

    const handleSubmit = async (e) => {

        // Check for salt in storage if it exists -> not first time
        e.preventDefault();
        try {
            if (vault.isFirstTime) {
                vault.initVault(e.target.password.value)
            }
            else {
                vault.unlockVault(e.target.password.value);
            }

        }
        catch (error) {
            console.log(error)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl p-6 w-80">
                {vault.isFirstTime ? (
                    <div className="mb-4">
                        <p className="text-lg font-semibold text-purple-700">Set the master password...</p>
                        <p className="text-sm text-gray-600">
                            Don&apos;t share it with anyone. It will be used to decrypt your personal vault.
                        </p>
                    </div>
                ) : (
                    <p className="text-lg font-semibold text-purple-700 mb-4">
                        Enter your master password to unlock the vault
                    </p>
                )}
                <input
                    type="password"
                    name="password"
                    className="w-full p-2 mb-4 text-gray-800 bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Master Password"
                />
                <button
                    type="submit"
                    className="w-full py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                    {vault.isFirstTime ? "Set" : "Unlock"}
                </button>
            </form>
        </div>
    );
}