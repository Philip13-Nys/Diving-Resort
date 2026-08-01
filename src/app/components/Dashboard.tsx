import { TrendingUp, Users, DollarSign, Calendar, Waves, Utensils, Wrench, AlertCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const overviewStats = [
  { label: 'Total Revenue', value: '$847.5K', change: '+18.5%', icon: DollarSign, color: 'from-green-500 to-emerald-600' },
  { label: 'Active Guests', value: '89', change: '+12%', icon: Users, color: 'from-blue-500 to-cyan-600' },
  { label: 'Bookings Today', value: '23', change: '+8%', icon: Calendar, color: 'from-purple-500 to-pink-600' },
  { label: 'Occupancy Rate', value: '78%', change: '+5%', icon: Waves, color: 'from-orange-500 to-amber-600' },
];

const revenueData = [
  { id: 1, date: 'Jun 1', revenue: 28500, bookings: 12 },
  { id: 2, date: 'Jun 2', revenue: 31200, bookings: 15 },
  { id: 3, date: 'Jun 3', revenue: 29800, bookings: 13 },
  { id: 4, date: 'Jun 4', revenue: 33500, bookings: 16 },
  { id: 5, date: 'Jun 5', revenue: 30200, bookings: 14 },
  { id: 6, date: 'Jun 6', revenue: 35100, bookings: 18 },
  { id: 7, date: 'Jun 7', revenue: 37200, bookings: 20 },
];

const departmentPerformance = [
  { id: 1, department: 'Accommodations', revenue: 145000, target: 150000, percentage: 96.7 },
  { id: 2, department: 'Diving Services', revenue: 68000, target: 65000, percentage: 104.6 },
  { id: 3, department: 'Restaurant', revenue: 52000, target: 50000, percentage: 104.0 },
  { id: 4, department: 'Spa & Wellness', revenue: 18500, target: 20000, percentage: 92.5 },
  { id: 5, department: 'Equipment Rental', revenue: 9800, target: 10000, percentage: 98.0 },
];

const recentActivities = [
  { id: 1, type: 'booking', user: 'Receptionist Sarah', action: 'New booking confirmed', time: '2 mins ago', icon: Calendar },
  { id: 2, type: 'payment', user: 'Manager Mike', action: 'Payment processed $1,200', time: '8 mins ago', icon: DollarSign },
  { id: 3, type: 'diving', user: 'Instructor Carlos', action: 'Diving session completed', time: '15 mins ago', icon: Waves },
  { id: 4, type: 'service', user: 'Chef Anna', action: 'Special menu order prepared', time: '23 mins ago', icon: Utensils },
  { id: 5, type: 'maintenance', user: 'Supervisor James', action: 'AC unit repaired in Room 305', time: '45 mins ago', icon: Wrench },
];

const alerts = [
  { id: 1, type: 'warning', message: '12 pending check-ins for today', priority: 'medium' },
  { id: 2, type: 'info', message: 'Staff meeting scheduled at 3:00 PM', priority: 'low' },
  { id: 3, type: 'critical', message: '3 equipment maintenance due this week', priority: 'high' },
];

const upcomingBookings = [
  { id: 1, guest: 'John Anderson', room: '201', checkIn: '2:00 PM', guests: 2 },
  { id: 2, guest: 'Maria Garcia', room: '305', checkIn: '3:30 PM', guests: 4 },
  { id: 3, guest: 'Robert Kim', room: '412', checkIn: '4:00 PM', guests: 2 },
  { id: 4, guest: 'Sophie Laurent', room: '108', checkIn: '5:30 PM', guests: 3 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your resort today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="size-8 opacity-80" />
              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">{stat.change}</span>
            </div>
            <p className="text-sm text-white/80 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#0891b2" fill="#06b6d4" fillOpacity={0.4} name="Revenue ($)" />
              <Area type="monotone" dataKey="bookings" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Bookings" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.priority === 'high'
                    ? 'bg-red-50 border-red-500'
                    : alert.priority === 'medium'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className={`size-4 mt-0.5 ${
                      alert.priority === 'high'
                        ? 'text-red-600'
                        : alert.priority === 'medium'
                        ? 'text-orange-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <p className="text-sm text-gray-900 flex-1">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Upcoming Check-ins</h4>
            <div className="space-y-2">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="size-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold text-sm">
                    {booking.guest.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{booking.guest}</p>
                    <p className="text-xs text-gray-600">Room {booking.room} • {booking.checkIn}</p>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {booking.guests}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="department" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#0891b2" name="Revenue" />
              <Bar dataKey="target" fill="#e5e7eb" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="size-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <activity.icon className="size-5 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                  <p className="text-sm text-gray-600">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance vs Target</h3>
        <div className="space-y-4">
          {departmentPerformance.map((dept) => (
            <div key={dept.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{dept.department}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    ${dept.revenue.toLocaleString()} / ${dept.target.toLocaleString()}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      dept.percentage >= 100 ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {dept.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    dept.percentage >= 100 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <h4 className="text-sm font-medium text-white/80 mb-2">Today's Reservations</h4>
          <p className="text-4xl font-bold mb-1">23</p>
          <p className="text-sm text-white/90">+3 from yesterday</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <h4 className="text-sm font-medium text-white/80 mb-2">Staff on Duty</h4>
          <p className="text-4xl font-bold mb-1">42</p>
          <p className="text-sm text-white/90">Out of 67 total staff</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <h4 className="text-sm font-medium text-white/80 mb-2">Guest Satisfaction</h4>
          <p className="text-4xl font-bold mb-1">4.8</p>
          <p className="text-sm text-white/90">Based on 156 reviews</p>
        </div>
      </div>
    </div>
  );
}
