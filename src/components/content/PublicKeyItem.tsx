import { useVault } from "~contexts/VaultContext";
import { formatDate } from "~lib/utils";

export default function PublicKeyItem({ contactEmail, keyInfo }) {
    const vault = useVault();

    const handleCopy = () => {
        navigator.clipboard.writeText(keyInfo.armoredKey);
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete this key (${keyInfo.fingerprint.slice(-8)})?`)) {
            vault.deleteContactKey(contactEmail, keyInfo.fingerprint);
        }
    };

    return (
        <div className="flex justify-between items-center p-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate" title={keyInfo.fingerprint}>
                    ...{keyInfo.fingerprint.slice(-16)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {formatDate(keyInfo.created)}
                </p>
            </div>
            <div className="flex space-x-2">
                <button onClick={handleCopy} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Copy</button>
                <button onClick={handleDelete} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
            </div>
        </div>
    );
}