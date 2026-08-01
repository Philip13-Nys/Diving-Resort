import { useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, X, Check, Download, FileText } from 'lucide-react';
import { AreaChart, Area, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const financialStats = [
  { label: 'Total Revenue', value: '$847,500', change: '+18.5%', trend: 'up' },
  { label: 'Total Expenses', value: '$312,400', change: '+5.2%', trend: 'up' },
  { label: 'Net Profit', value: '$535,100', change: '+28.4%', trend: 'up' },
  { label: 'Profit Margin', value: '63.1%', change: '+6.8%', trend: 'up' },
];

const revenueData = [
  { id: 1, month: 'Jan', revenue: 125000, expenses: 48000 },
  { id: 2, month: 'Feb', revenue: 132000, expenses: 51000 },
  { id: 3, month: 'Mar', revenue: 128000, expenses: 49500 },
  { id: 4, month: 'Apr', revenue: 145000, expenses: 53000 },
  { id: 5, month: 'May', revenue: 138000, expenses: 52000 },
  { id: 6, month: 'Jun', revenue: 179500, expenses: 58900 },
];

const revenueByCategory = [
  { id: 1, name: 'Accommodations', value: 425000, percentage: 50.2 },
  { id: 2, name: 'Diving Services', value: 210000, percentage: 24.8 },
  { id: 3, name: 'Restaurant & Bar', value: 145000, percentage: 17.1 },
  { id: 4, name: 'Spa Services', value: 42500, percentage: 5.0 },
  { id: 5, name: 'Equipment Rental', value: 25000, percentage: 2.9 },
];

const COLORS = ['#0891b2', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

const paymentMethods = [
  { method: 'Credit Card', amount: '$512,400', percentage: 60.4, transactions: 1234 },
  { method: 'Cash', amount: '$168,750', percentage: 19.9, transactions: 456 },
  { method: 'Debit Card', amount: '$127,125', percentage: 15.0, transactions: 678 },
  { method: 'Bank Transfer', amount: '$39,225', percentage: 4.7, transactions: 89 },
];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();

export default function SalesReports() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(currentYear);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  function openReportModal() {
    setReportReady(false);
    setShowReportModal(true);
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setReportReady(true);
    }, 1400);
  }

  function handleDownloadReport() {
    const label = reportPeriod === 'monthly'
      ? `${months[reportMonth]} ${reportYear}`
      : reportPeriod === 'quarterly'
      ? `Q${Math.ceil((reportMonth + 1) / 3)} ${reportYear}`
      : `Annual ${reportYear}`;

    const lines = [
      `Financial Report — ${label}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Revenue by Category',
      'Category,Revenue,Percentage',
      ...revenueByCategory.map((c) => `${c.name},$${c.value.toLocaleString()},${c.percentage}%`),
      '',
      'Monthly Revenue vs Expenses',
      'Month,Revenue,Expenses,Net',
      ...revenueData.map((d) => `${d.month},$${d.revenue},$${d.expenses},$${d.revenue - d.expenses}`),
      '',
      'Payment Methods',
      'Method,Amount,Percentage,Transactions',
      ...paymentMethods.map((p) => `${p.method},${p.amount},${p.percentage}%,${p.transactions}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${label.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowReportModal(false);
    setSuccessMsg(`Financial report for ${label} downloaded successfully.`);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  function handleExportData() {
    const lines = [
      'Month,Revenue,Expenses,Net Profit',
      ...revenueData.map((d) => `${d.month},$${d.revenue},$${d.expenses},$${d.revenue - d.expenses}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-financial-data.csv';
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('Financial data exported to CSV.');
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
        <h1 className="text-2xl font-bold text-gray-900">Sales and Financial Reports</h1>
        <p className="text-gray-600 mt-1">Monitor revenue, sales performance, and overall financial transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {financialStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#0891b2" fill="#06b6d4" fillOpacity={0.4} name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#fca5a5" fillOpacity={0.4} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueByCategory.map((entry) => (
                  <Cell key={`cell-${entry.id}`} fill={COLORS[(entry.id - 1) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown by Category</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {revenueByCategory.map((category) => (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[(category.id - 1) % COLORS.length] }} />
                    <span className="font-medium text-gray-900">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{category.percentage}%</span>
                    <span className="font-semibold text-gray-900">${category.value.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${category.percentage}%`, backgroundColor: COLORS[(category.id - 1) % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payment Method Distribution</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paymentMethods.map((method) => (
                <tr key={method.method} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <CreditCard className="size-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{method.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-gray-900">{method.amount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${method.percentage}%` }} />
                      </div>
                      <span className="text-sm text-gray-600">{method.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{method.transactions}</td>
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
          <DollarSign className="size-4" />
          Generate Financial Report
        </button>
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="size-4" />
          Export Data
        </button>
      </div>

      {/* Generate Financial Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Generate Financial Report</h2>
              <button onClick={() => setShowReportModal(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              {!reportReady ? (
                <form onSubmit={handleGenerate} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Configure the reporting period and type for your financial report.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <div className="flex gap-2">
                      {(['monthly', 'quarterly', 'annual'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReportPeriod(t)}
                          className={`flex-1 py-2 text-sm rounded-lg border transition-colors capitalize ${
                            reportPeriod === t
                              ? 'bg-cyan-600 text-white border-cyan-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reportPeriod === 'monthly' && (
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
                  )}

                  {reportPeriod === 'quarterly' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                        <select
                          value={Math.ceil((reportMonth + 1) / 3)}
                          onChange={(e) => setReportMonth((Number(e.target.value) - 1) * 3)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value={1}>Q1 (Jan–Mar)</option>
                          <option value={2}>Q2 (Apr–Jun)</option>
                          <option value={3}>Q3 (Jul–Sep)</option>
                          <option value={4}>Q4 (Oct–Dec)</option>
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
                  )}

                  {reportPeriod === 'annual' && (
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
                  )}

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
                    Financial report is ready to download.
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-medium text-green-600">$847,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses</span>
                      <span className="font-medium text-red-600">$312,400</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                      <span className="text-gray-700 font-medium">Net Profit</span>
                      <span className="font-bold text-green-600">$535,100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categories Included</span>
                      <span className="font-medium">{revenueByCategory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions</span>
                      <span className="font-medium">2,457</span>
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
    </div>
  );
}
