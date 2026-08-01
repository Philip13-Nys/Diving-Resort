import { CreditCard, Plus, Edit, Trash2, Check, X } from 'lucide-react';

const paymentMethods = [
  {
    id: 1,
    name: 'Visa',
    type: 'Credit Card',
    provider: 'Stripe',
    status: 'Active',
    fees: '2.9% + $0.30',
    enabled: true,
  },
  {
    id: 2,
    name: 'Mastercard',
    type: 'Credit Card',
    provider: 'Stripe',
    status: 'Active',
    fees: '2.9% + $0.30',
    enabled: true,
  },
  {
    id: 3,
    name: 'American Express',
    type: 'Credit Card',
    provider: 'Stripe',
    status: 'Active',
    fees: '3.5% + $0.30',
    enabled: true,
  },
  {
    id: 4,
    name: 'PayPal',
    type: 'Digital Wallet',
    provider: 'PayPal',
    status: 'Active',
    fees: '3.49% + $0.49',
    enabled: true,
  },
  {
    id: 5,
    name: 'Bank Transfer',
    type: 'Direct Transfer',
    provider: 'Manual',
    status: 'Active',
    fees: 'Free',
    enabled: true,
  },
  {
    id: 6,
    name: 'Cash',
    type: 'Physical',
    provider: 'Manual',
    status: 'Active',
    fees: 'Free',
    enabled: true,
  },
  {
    id: 7,
    name: 'Apple Pay',
    type: 'Digital Wallet',
    provider: 'Stripe',
    status: 'Inactive',
    fees: '2.9% + $0.30',
    enabled: false,
  },
  {
    id: 8,
    name: 'Google Pay',
    type: 'Digital Wallet',
    provider: 'Stripe',
    status: 'Inactive',
    fees: '2.9% + $0.30',
    enabled: false,
  },
];

export default function PaymentConfiguration() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Configuration Settings</h1>
          <p className="text-gray-600 mt-1">Manage available payment methods and payment-related configurations</p>
        </div>
        <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
          <Plus className="size-4" />
          Add Payment Method
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <p className="text-sm text-white/80 mb-2">Active Payment Methods</p>
          <p className="text-4xl font-bold">6</p>
          <p className="text-sm text-white/90 mt-1">Currently enabled</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <p className="text-sm text-white/80 mb-2">Total Transactions</p>
          <p className="text-4xl font-bold">2,847</p>
          <p className="text-sm text-white/90 mt-1">This month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <p className="text-sm text-white/80 mb-2">Processing Volume</p>
          <p className="text-4xl font-bold">$847K</p>
          <p className="text-sm text-white/90 mt-1">This month</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paymentMethods.map((method) => (
                <tr key={method.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                        <CreditCard className="size-5 text-cyan-600" />
                      </div>
                      <span className="font-medium text-gray-900">{method.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {method.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{method.provider}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {method.fees}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        method.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {method.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={method.enabled} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="size-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="size-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Gateway Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stripe API Key</label>
              <input
                type="password"
                defaultValue="sk_live_••••••••••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Client ID</label>
              <input
                type="password"
                defaultValue="••••••••••••••••••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>USD - US Dollar</option>
                <option>EUR - Euro</option>
                <option>GBP - British Pound</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Rules</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payment Amount</label>
              <input
                type="number"
                defaultValue="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Payment Amount</label>
              <input
                type="number"
                defaultValue="50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-refund"
                  defaultChecked
                  className="size-4 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="auto-refund" className="text-sm text-gray-700">
                  Enable automatic refunds
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fraud-detection"
                  defaultChecked
                  className="size-4 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="fraud-detection" className="text-sm text-gray-700">
                  Enable fraud detection
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          Test Configuration
        </button>
        <button className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
