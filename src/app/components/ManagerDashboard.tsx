import { TrendingUp, TrendingDown, Users, Calendar, DollarSign } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const stats = [
  { label: 'Total Bookings', value: '156', change: '+12%', trend: 'up' },
  { label: 'Revenue Today', value: '$8,450', change: '+8%', trend: 'up' },
  { label: 'Active Guests', value: '89', change: '-3%', trend: 'down' },
  { label: 'Pending Checkouts', value: '23', change: '+5%', trend: 'up' },
];

const revenueData = [
  { id: 1, month: 'Jan', revenue: 45000 },
  { id: 2, month: 'Feb', revenue: 52000 },
  { id: 3, month: 'Mar', revenue: 48000 },
  { id: 4, month: 'Apr', revenue: 61000 },
  { id: 5, month: 'May', revenue: 58000 },
  { id: 6, month: 'Jun', revenue: 67000 },
];

const activityData = [
  { id: 1, activity: 'Room Bookings', count: 45 },
  { id: 2, activity: 'Diving Sessions', count: 32 },
  { id: 3, activity: 'Restaurant', count: 78 },
  { id: 4, activity: 'Spa Services', count: 21 },
  { id: 5, activity: 'Equipment Rental', count: 15 },
];

const recentActivities = [
  { manager: 'Sarah Johnson', action: 'Approved 3 room bookings', time: '5 mins ago' },
  { manager: 'Mike Chen', action: 'Updated diving schedule', time: '12 mins ago' },
  { manager: 'Emma Williams', action: 'Processed payment refund', time: '23 mins ago' },
  { manager: 'David Brown', action: 'Added new equipment inventory', time: '1 hour ago' },
  { manager: 'Lisa Martinez', action: 'Assigned diving instructor', time: '2 hours ago' },
];

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Monitor manager activities, performance, and reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{stat.label}</span>
              {stat.trend === 'up' ? (
                <TrendingUp className="size-4 text-green-600" />
              ) : (
                <TrendingDown className="size-4 text-red-600" />
              )}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
              <span
                className={`text-sm font-medium mb-1 ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#0891b2" fill="#06b6d4" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="activity" angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Manager Activities</h3>
        <div className="space-y-3">
          {recentActivities.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-4 pb-3 border-b border-gray-100 last:border-0">
              <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold">
                {activity.manager.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.manager}</p>
                <p className="text-sm text-gray-600">{activity.action}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
