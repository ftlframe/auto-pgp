export default function ContactTab() {
    return (
        <div className="bg-white rounded-xl shadow-sm">
            {/* Contacts Content */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Shared Contacts</h2>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                    Add Contact
                </button>
            </div>
            <div className="divide-y divide-gray-200">
                {/* Contact List Items */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                        <h3 className="font-medium">John Doe</h3>
                        <p className="text-sm text-gray-500">john@example.com</p>
                    </div>
                    <span className="text-sm text-gray-500">Last active: 2h ago</span>
                </div>
            </div>
        </div>
    );
}