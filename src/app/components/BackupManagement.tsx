import { Database, Download, Upload, RefreshCw, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';

const backupHistory = [
  {
    id: 1,
    name: 'Daily Backup - June 07, 2026',
    type: 'Automatic',
    date: '2026-06-07 03:00:00',
    size: '2.4 GB',
    status: 'Completed',
    duration: '12 min',
  },
  {
    id: 2,
    name: 'Daily Backup - June 06, 2026',
    type: 'Automatic',
    date: '2026-06-06 03:00:00',
    size: '2.3 GB',
    status: 'Completed',
    duration: '11 min',
  },
  {
    id: 3,
    name: 'Manual Backup - Settings Update',
    type: 'Manual',
    date: '2026-06-05 14:30:00',
    size: '2.3 GB',
    status: 'Completed',
    duration: '10 min',
  },
  {
    id: 4,
    name: 'Daily Backup - June 05, 2026',
    type: 'Automatic',
    date: '2026-06-05 03:00:00',
    size: '2.2 GB',
    status: 'Completed',
    duration: '11 min',
  },
  {
    id: 5,
    name: 'Daily Backup - June 04, 2026',
    type: 'Automatic',
    date: '2026-06-04 03:00:00',
    size: '2.2 GB',
    status: 'Completed',
    duration: '12 min',
  },
  {
    id: 6,
    name: 'Weekly Backup - Week 22',
    type: 'Automatic',
    date: '2026-06-01 02:00:00',
    size: '2.1 GB',
    status: 'Completed',
    duration: '15 min',
  },
];

const storageStats = [
  { label: 'Total Backups', value: '47', color: 'from-blue-500 to-cyan-600' },
  { label: 'Storage Used', value: '108 GB', color: 'from-purple-500 to-pink-600' },
  { label: 'Last Backup', value: '3h ago', color: 'from-green-500 to-emerald-600' },
  { label: 'Next Backup', value: 'In 21h', color: 'from-orange-500 to-amber-600' },
];

const databaseTables = [
  { name: 'Users', records: '1,247', size: '45 MB', lastUpdated: '2 hours ago' },
  { name: 'Bookings', records: '8,956', size: '320 MB', lastUpdated: '15 mins ago' },
  { name: 'Transactions', records: '12,445', size: '580 MB', lastUpdated: '5 mins ago' },
  { name: 'Staff', records: '156', size: '12 MB', lastUpdated: '1 day ago' },
  { name: 'Audit Logs', records: '45,678', size: '890 MB', lastUpdated: '1 min ago' },
  { name: 'Settings', records: '89', size: '2 MB', lastUpdated: '3 days ago' },
];

export default function BackupManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup and Data Management</h1>
          <p className="text-gray-600 mt-1">
            Manage system backups, data recovery, and database maintenance for data security
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="size-4" />
            Restore
          </button>
          <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
            <Database className="size-4" />
            Create Backup
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {storageStats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}>
            <p className="text-sm text-white/80 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Schedule</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Daily Backup</p>
                  <p className="text-sm text-gray-600">Every day at 3:00 AM</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Weekly Backup</p>
                  <p className="text-sm text-gray-600">Every Sunday at 2:00 AM</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Database className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Monthly Backup</p>
                  <p className="text-sm text-gray-600">1st of each month at 1:00 AM</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Backup Location</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>Local Server Storage</option>
                <option>AWS S3 Bucket</option>
                <option>Google Cloud Storage</option>
                <option>Azure Blob Storage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retention Period (days)</label>
              <input
                type="number"
                defaultValue="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compression Level</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>High (Slower, Smaller)</option>
                <option>Medium (Balanced)</option>
                <option>Low (Faster, Larger)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="encrypt"
                defaultChecked
                className="size-4 text-cyan-600 rounded focus:ring-cyan-500"
              />
              <label htmlFor="encrypt" className="text-sm text-gray-700">
                Encrypt backups (AES-256)
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Backup History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Backup Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {backupHistory.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Database className="size-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{backup.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        backup.type === 'Automatic'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {backup.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{backup.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{backup.size}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{backup.duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">{backup.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                        <Download className="size-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-cyan-50 rounded-lg transition-colors" title="Restore">
                        <RefreshCw className="size-4 text-cyan-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Database Tables</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {databaseTables.map((table) => (
              <div key={table.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{table.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{table.records} records</p>
                  </div>
                  <span className="text-sm font-medium text-cyan-600">{table.size}</span>
                </div>
                <p className="text-xs text-gray-500">Updated {table.lastUpdated}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="size-5 text-green-600 mt-0.5" />
        <div>
          <h4 className="font-semibold text-green-900">Backup Status: Healthy</h4>
          <p className="text-sm text-green-800 mt-1">
            All scheduled backups are running successfully. Last backup completed 3 hours ago with no errors.
          </p>
        </div>
      </div>
    </div>
  );
}
