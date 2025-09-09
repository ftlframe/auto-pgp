export default function ContactTable({ action, contacts }) {
    return (
        <div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        {action !== 'add' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {contacts.map((contact) => (
                        <tr key={contact.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phone}</td>
                            {action !== 'add' && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button className={`mr-2 ${action === 'edit' ? 'text-blue-600 hover:text-blue-800' : 'text-red-600 hover:text-red-800'}`}>
                                        {action === 'edit' ? 'Edit' : 'Delete'}
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    {action === 'add' && (
                        <tr>
                            <td className="px-6 py-4 text-center">
                                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                                    Add New Contact
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}