import { useState } from 'react';
import { Calendar, X, Check, FileText, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const monthlyData = [
  { id: 1, month: 'Jan', total: 12400, manager: 3200, receptionist: 4800, diving: 4400 },
  { id: 2, month: 'Feb', total: 15200, manager: 3800, receptionist: 5600, diving: 5800 },
  { id: 3, month: 'Mar', total: 13800, manager: 3500, receptionist: 5100, diving: 5200 },
  { id: 4, month: 'Apr', total: 18600, manager: 4600, receptionist: 6800, diving: 7200 },
  { id: 5, month: 'May', total: 16800, manager: 4200, receptionist: 6200, diving: 6400 },
  { id: 6, month: 'Jun', total: 21200, manager: 5400, receptionist: 7800, diving: 8000 },
];

const topEarners = [
  { id: 1, name: 'Sarah Johnson', role: 'Manager', commission: '$5,420', transactions: 156, rate: '3.5%', commissionRaw: 5420 },
  { id: 2, name: 'Carlos Rodriguez', role: 'Diving Instructor', commission: '$4,890', transactions: 98, rate: '5.0%', commissionRaw: 4890 },
  { id: 3, name: 'Emma Williams', role: 'Receptionist', commission: '$4,320', transactions: 203, rate: '2.1%', commissionRaw: 4320 },
  { id: 4, name: 'Mike Chen', role: 'Manager', commission: '$3,980', transactions: 142, rate: '3.5%', commissionRaw: 3980 },
  { id: 5, name: 'Anna Peterson', role: 'Restaurant Manager', commission: '$3,650', transactions: 187, rate: '2.0%', commissionRaw: 3650 },
];

const commissionStats = [
  { label: 'Total Commission', value: '$21,200', change: '+15%', color: 'from-green-500 to-emerald-600' },
  { label: 'Avg Per Employee', value: '$1,240', change: '+8%', color: 'from-blue-500 to-cyan-600' },
  { label: 'Pending Payouts', value: '$8,450', change: '-12%', color: 'from-orange-500 to-amber-600' },
  { label: 'Total Transactions', value: '1,847', change: '+23%', color: 'from-purple-500 to-pink-600' },
];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();

type EarnerDetail = typeof topEarners[0];

export default function CommissionReport() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(currentYear);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [detailEarner, setDetailEarner] = useState<EarnerDetail | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  function openReportModal() {
    setReportGenerated(false);
    setShowReportModal(true);
  }

  function handleGenerateReport(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setReportGenerated(true);
    }, 1200);
  }

  function handleDownloadReport() {
    const lines = [
      `Commission Report — ${months[reportMonth]} ${reportYear}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Employee,Role,Commission,Transactions,Rate',
      ...topEarners.map((e) => `${e.name},${e.role},${e.commission},${e.transactions},${e.rate}`),
      '',
      'Monthly Summary',
      'Month,Total,Management,Reception,Diving',
      ...monthlyData.map((d) => `${d.month},$${d.total},$${d.manager},$${d.receptionist},$${d.diving}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${months[reportMonth].toLowerCase()}-${reportYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowReportModal(false);
    setSuccessMsg(`Commission report for ${months[reportMonth]} ${reportYear} downloaded.`);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <Check className="size-5 text-green-600 shrink-0" />
          {successMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commission Report</h1>
        <p className="text-gray-600 mt-1">Generate and review commission-related records and calculations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {commissionStats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}>
            <p className="text-sm text-white/80 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-white/90">{stat.change} from last month</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#0891b2" strokeWidth={2} name="Total Commission" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="manager" fill="#3b82f6" name="Management" />
              <Bar dataKey="receptionist" fill="#06b6d4" name="Reception" />
              <Bar dataKey="diving" fill="#8b5cf6" name="Diving" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Commission Earners</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topEarners.map((earner) => (
                <tr key={earner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {earner.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{earner.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{earner.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-green-600">{earner.commission}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{earner.transactions}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {earner.rate}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setDetailEarner(earner)}
                      className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={openReportModal}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <Calendar className="size-4" />
          Generate Monthly Report
        </button>
        <button
          onClick={() => {
            const lines = [
              'Employee,Role,Commission,Transactions,Rate',
              ...topEarners.map((e) => `${e.name},${e.role},${e.commission},${e.transactions},${e.rate}`),
            ];
            const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'commission-earners.csv';
            a.click();
            URL.revokeObjectURL(url);
            setSuccessMsg('Commission data exported to CSV.');
            setTimeout(() => setSuccessMsg(''), 3500);
          }}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export to CSV
        </button>
      </div>

      {/* Generate Monthly Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Generate Monthly Commission Report</h2>
              <button onClick={() => setShowReportModal(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              {!reportGenerated ? (
                <form onSubmit={handleGenerateReport} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select the period for the commission report. The report will include all earnings, transactions, and department breakdowns.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        {months.map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        {[currentYear - 1, currentYear].map((y) => (
                          <option key={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-60"
                    >
                      {generating ? (
                        <>
                          <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <FileText className="size-4" />
                          Generate Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                    <Check className="size-5 text-green-600 shrink-0" />
                    Report for <strong>{months[reportMonth]} {reportYear}</strong> is ready.
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Report Period</span>
                      <span className="font-medium">{months[reportMonth]} {reportYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Commission</span>
                      <span className="font-medium text-green-600">$21,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions</span>
                      <span className="font-medium">1,847</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employees Included</span>
                      <span className="font-medium">{topEarners.length}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                    >
                      <Download className="size-4" />
                      Download CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {detailEarner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Commission Details</h2>
              <button onClick={() => setDetailEarner(null)} className="text-white/80 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                  {detailEarner.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{detailEarner.name}</h3>
                  <p className="text-gray-600">{detailEarner.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Commission</p>
                  <p className="text-2xl font-bold text-green-600">{detailEarner.commission}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Commission Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{detailEarner.rate}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-semibold">{detailEarner.transactions}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Avg per Transaction</span>
                  <span className="font-semibold">
                    ${(detailEarner.commissionRaw / detailEarner.transactions).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Pending Payout</span>
                  <span className="font-semibold text-orange-600">
                    ${(detailEarner.commissionRaw * 0.4).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Paid Out</span>
                  <span className="font-semibold text-green-600">
                    ${(detailEarner.commissionRaw * 0.6).toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setDetailEarner(null)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
