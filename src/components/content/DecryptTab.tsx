import { useEffect, useState } from "react";
import { useVault } from "~contexts/VaultContext";
import { useTheme } from "~contexts/ThemeContext";
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";

export default function DecryptTab() {
    const [armoredMessage, setArmoredMessage] = useState("");
    const [senderEmail, setSenderEmail] = useState(""); // State for sender's email
    const [decryptedText, setDecryptedText] = useState("");
    const [verification, setVerification] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const { colorScheme } = useTheme();
    const { decryptManual } = useVault();

    // Try to paste from clipboard on component load
    useEffect(() => {
        navigator.clipboard.readText().then(text => {
            if (text.includes("-----BEGIN PGP MESSAGE-----")) {
                setArmoredMessage(text);
            }
        });
    }, []);

    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();
        setArmoredMessage(text);
    };

    const handleCopyDecrypted = () => {
        navigator.clipboard.writeText(decryptedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDecrypt = async (e) => {
        e.preventDefault();
        if (!armoredMessage) {
            setError("PGP message is required.");
            return;
        }
        setIsLoading(true);
        setError("");
        setVerification(null);
        setDecryptedText("");

        // Pass both the message and the sender's email
        const result = await decryptManual(armoredMessage, senderEmail);

        if (result.success) {
            setDecryptedText(result.decryptedContent);
            if (result.verification) {
                setVerification(result.verification);
            }
        } else {
            setError(result.error || "Decryption failed.");
        }
        setIsLoading(false);
    };

    const accentColor = colorScheme === 'purple' ? 'purple' : 'kiwi';
    const buttonClasses = `bg-${accentColor}-600 hover:bg-${accentColor}-700`;
    const focusRingClasses = `focus:ring-${accentColor}-500 focus:border-${accentColor}-500`;

    return (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            <div className="pb-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manual Decryption</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Paste an encrypted PGP message to decrypt it.</p>
            </div>

            <form onSubmit={handleDecrypt} className="mt-6 space-y-4">
                <div>
                    <label htmlFor="pgpMessage" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                        PGP Message
                    </label>
                    <div className="mt-1 relative">
                        <textarea
                            id="pgpMessage"
                            rows={10}
                            value={armoredMessage}
                            onChange={(e) => setArmoredMessage(e.target.value)}
                            placeholder="-----BEGIN PGP MESSAGE-----..."
                            className={`w-full p-2 border rounded-md font-mono text-xs bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-600 ${focusRingClasses}`}
                        />
                        <button type="button" onClick={handlePaste} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                            <ClipboardDocumentIcon className="h-5 w-5" title="Paste from Clipboard" />
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Sender's Email (Optional, for verification)
                    </label>
                    <input
                        id="senderEmail"
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="e.g., sender@example.com"
                        className={`mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-600 ${focusRingClasses}`}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${buttonClasses}`}
                >
                    {isLoading ? "Decrypting..." : "Decrypt"}
                </button>

                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

                {decryptedText && (
                    <div className="space-y-2 pt-4">
                        {verification && (
                            <div className={`p-3 border-l-4 rounded-r-md ${verification.status === 'valid' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                <p className={`font-semibold ${verification.status === 'valid' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                    {verification.text}
                                </p>
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Decrypted Content:</h3>
                        <div className="relative p-4 bg-gray-100 dark:bg-slate-900 rounded-md whitespace-pre-wrap font-sans text-gray-800 dark:text-slate-200">
                            {decryptedText}
                            <button type="button" onClick={handleCopyDecrypted} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                                {copied ? <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}