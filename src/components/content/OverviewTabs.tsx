export function OverviewTab() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overview Content */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Overview</h2>
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <span>Total Passwords</span>
                        <span className="font-semibold">24</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Last Updated</span>
                        <span className="font-semibold">2 hours ago</span>
                    </div>
                </div>
            </div>
            {
                
            }
        </div>
    );
}