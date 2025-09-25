import PublicKeyItem from "./PublicKeyItem";

export default function ContactCard({ contact }) {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{contact.name}</h3>
                <p className="font-mono text-sm text-gray-600 dark:text-gray-400">{contact.email}</p>
            </div>
            <div className="max-h-32 overflow-y-auto">
                {contact.publicKeys.length > 0 ? (
                    contact.publicKeys.map(pk => (
                        <PublicKeyItem key={pk.fingerprint} contactEmail={contact.email} keyInfo={pk} />
                    ))
                ) : (
                    <p className="p-4 text-sm text-gray-500 dark:text-white">No public keys stored for this contact.</p>
                )}
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-right">
                <button className="text-xs text-gray-500 dark:text-gray-400 hover:underline">Manage Contact</button>
            </div>
        </div>
    );
}