import { useVault } from "~contexts/VaultContext";

export default function KeysModal({ isOpen, onClose, action, keys }) {
    const vault = useVault();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold capitalize">
                            {action} key
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {action !== "Generate" &&

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
                                    {keys.map((key) => (
                                        <tr key={key.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.fingerprint}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{key.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{key.phone}</td>
                                            {action !== 'add' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button className={`mr-2 ${action === 'edit' ? 'text-blue-600 hover:text-blue-800' : 'text-red-600 hover:text-red-800'}`}>
                                                        {action === 'edit' ? 'Edit' : 'Delete'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        }
                        {action === "Generate" &&
                            <div>
                                <button className={`mr-2 text-blue-600 hover:text-blue-80`} onClick={() => {vault.generatePair(vault.email)}}>
                                    Generate
                                </button>
                                <button className={`mr-2 text-blue-600 hover:text-blue-80`} onClick={() => {vault.lockVault('123')}}>
                                    Lock
                                </button>
                                <button className={`mr-2 text-blue-600 hover:text-blue-80`} onClick={() => {vault.unlockVault('123')}}>
                                    Unlock
                                </button>
                            </div>
                        }
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
