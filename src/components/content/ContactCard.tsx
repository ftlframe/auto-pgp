import PublicKeyItem from "./PublicKeyItem";

export default function ContactCard({ contact }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
            <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                <p className="font-mono text-sm text-gray-600">{contact.email}</p>
            </div>
            <div className="max-h-32 overflow-y-auto">
                {contact.publicKeys.length > 0 ? (
                    contact.publicKeys.map(pk => (
                        <PublicKeyItem key={pk.fingerprint} contactEmail={contact.email} keyInfo={pk} />
                    ))
                ) : (
                    <p className="p-4 text-sm text-gray-500">No public keys stored for this contact.</p>
                )}
            </div>
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-right">
                {/* Placeholder for future "Edit/Delete Contact" buttons */}
                <button className="text-xs text-gray-500 hover:underline">Manage Contact</button>
            </div>
        </div>
    );
}