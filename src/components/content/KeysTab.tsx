export default function KeysTab() {
    return (
        <div className="bg-white rounded-xl shadow-sm">
            {/* Keys Content */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Security Keys</h2>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                    Add Key
                </button>
            </div>
            <div className="divide-y divide-gray-200">
                {/* Key List Items */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                        <h3 className="font-medium">Main Encryption Key</h3>
                        <p className="text-sm text-gray-500">Created: 2023-08-15</p>
                    </div>
                    <span className="text-sm text-purple-600">Active</span>
                </div>
            </div>
        </div>
    );
}