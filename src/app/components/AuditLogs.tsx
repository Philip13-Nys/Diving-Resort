import { useState } from 'react';
import { FileText, Search, Filter, Download, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const auditLogs = [
  {
    id: 1,
    timestamp: '2026-06-07 14:32:15',
    user: 'Sarah Johnson',
    action: 'Updated room rate',
    module: 'System Settings',
    details: 'Changed Deluxe Room rate from $230 to $250',
    ipAddress: '192.168.1.100',
    status: 'Success',
    severity: 'Info',
  },
  {
    id: 2,
    timestamp: '2026-06-07 14:28:42',
    user: 'Mike Chen',
    action: 'Created new user',
    module: 'User Management',
    details: 'Added new receptionist account for Emma Williams',
    ipAddress: '192.168.1.105',
    status: 'Success',
    severity: 'Info',
  },
  {
    id: 3,
    timestamp: '2026-06-07 14:15:33',
    user: 'Administrator',
    action: 'Login attempt failed',
    module: 'Authentication',
    details: 'Failed login from unknown IP address',
    ipAddress: '203.45.67.89',
    status: 'Failed',
    severity: 'Warning',
  },
  {
    id: 4,
    timestamp: '2026-06-07 13:45:21',
    user: 'Emma Williams',
    action: 'Processed payment',
    module: 'Transactions',
    details: 'Payment of $1,200 for booking #BR-2024-456',
    ipAddress: '192.168.1.102',
    status: 'Success',
    severity: 'Info',
  },
  {
    id: 5,
    timestamp: '2026-06-07 13:22:18',
    user: 'David Brown',
    action: 'Deleted staff record',
    module: 'Staff Management',
    details: 'Removed terminated employee John Doe',
    ipAddress: '192.168.1.108',
    status: 'Success',
    severity: 'Critical',
  },
  {
    id: 6,
    timestamp: '2026-06-07 12:58:09',
    user: 'Lisa Martinez',
    action: 'Updated payment method',
    module: 'Payment Config',
    details: 'Enabled Apple Pay payment option',
    ipAddress: '192.168.1.110',
    status: 'Success',
    severity: 'Info',
  },
  {
    id: 7,
    timestamp: '2026-06-07 12:34:55',
    user: 'Sarah Johnson',
    action: 'Generated report',
    module: 'Reports',
    details: 'Downloaded sales report for May 2026',
    ipAddress: '192.168.1.100',
    status: 'Success',
    severity: 'Info',
  },
  {
    id: 8,
    timestamp: '2026-06-07 11:42:30',
    user: 'System',
    action: 'Database backup',
    module: 'System',
    details: 'Automated daily backup completed successfully',
    ipAddress: 'localhost',
    status: 'Success',
    severity: 'Info',
  },
  {
    id: 9,
    timestamp: '2026-06-07 10:15:22',
    user: 'Mike Chen',
    action: 'Permission change',
    module: 'User Management',
    details: 'Modified permissions for receptionist role',
    ipAddress: '192.168.1.105',
    status: 'Success',
    severity: 'Warning',
  },
  {
    id: 10,
    timestamp: '2026-06-07 09:30:14',
    user: 'Unknown',
    action: 'Unauthorized access attempt',
    module: 'Security',
    details: 'Attempted to access admin panel without credentials',
    ipAddress: '198.51.100.45',
    status: 'Blocked',
    severity: 'Critical',
  },
];

const activityStats = [
  { label: 'Total Activities', value: '1,247', color: 'from-blue-500 to-cyan-600' },
  { label: 'Critical Events', value: '23', color: 'from-red-500 to-pink-600' },
  { label: 'Warnings', value: '156', color: 'from-orange-500 to-amber-600' },
  { label: 'Failed Attempts', value: '12', color: 'from-purple-500 to-violet-600' },
];

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return <AlertCircle className="size-4 text-red-600" />;
      case 'Warning':
        return <AlertCircle className="size-4 text-orange-600" />;
      case 'Info':
        return <Info className="size-4 text-blue-600" />;
      default:
        return <CheckCircle className="size-4 text-green-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Success: 'bg-green-100 text-green-700',
      Failed: 'bg-red-100 text-red-700',
      Blocked: 'bg-orange-100 text-orange-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs / System Activity Logs</h1>
          <p className="text-gray-600 mt-1">
            Track and review all activities performed within the system for security and monitoring
          </p>
        </div>
        <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
          <Download className="size-4" />
          Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activityStats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}>
            <p className="text-sm text-white/80 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-white/90 mt-1">Last 30 days</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by user, action, or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option>All Severities</option>
              <option>Critical</option>
              <option>Warning</option>
              <option>Info</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="size-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold text-xs">
                        {log.user.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-sm text-gray-600">{log.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(log.severity)}
                      <span className="text-sm text-gray-600">{log.severity}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">Showing 10 of 1,247 activities</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Previous</button>
            <button className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm">1</button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">2</button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">3</button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Next</button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="size-5 text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-900">Security Notice</h4>
          <p className="text-sm text-amber-800 mt-1">
            Audit logs are retained for 90 days. Critical security events trigger immediate notifications to administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
