import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  DollarSign,
  Users,
  Hotel,
  TrendingUp,
  Activity,
  Plus,
  FileText,
  Wrench,
  Edit,
} from "lucide-react";
import { useNavigate } from "react-router";

const revenueData = [
  { month: "Jan", revenue: 45000, bookings: 120 },
  { month: "Feb", revenue: 52000, bookings: 145 },
  { month: "Mar", revenue: 61000, bookings: 165 },
  { month: "Apr", revenue: 58000, bookings: 155 },
  { month: "May", revenue: 67000, bookings: 180 },
  { month: "Jun", revenue: 73000, bookings: 195 },
];

const occupancyData = [
  { day: "Mon", occupied: 85, available: 15 },
  { day: "Tue", occupied: 92, available: 8 },
  { day: "Wed", occupied: 88, available: 12 },
  { day: "Thu", occupied: 95, available: 5 },
  { day: "Fri", occupied: 98, available: 2 },
  { day: "Sat", occupied: 100, available: 0 },
  { day: "Sun", occupied: 97, available: 3 },
];

const quickActions = [
  {
    label: "View Full Activity Log",
    description: "Audit system events and user actions",
    icon: Activity,
    color: "bg-indigo-100 text-indigo-600",
    href: "/manager/activity-logs",
  },
  {
    label: "Add New Room Type",
    description: "Create a new category of rooms",
    icon: Plus,
    color: "bg-blue-100 text-blue-600",
    href: "/manager/rooms?tab=types&action=add",
  },
  {
    label: "Add New Room",
    description: "Register an individual room",
    icon: Hotel,
    color: "bg-cyan-100 text-cyan-600",
    href: "/manager/rooms?tab=rooms&action=add",
  },
  {
    label: "Reports",
    description: "Generate and download reports",
    icon: FileText,
    color: "bg-purple-100 text-purple-600",
    href: "/manager/reports",
  },
  {
    label: "New Maintenance Request",
    description: "Log a new repair or maintenance task",
    icon: Wrench,
    color: "bg-orange-100 text-orange-600",
    href: "/manager/maintenance?action=new",
  },
  {
    label: "Edit Pricing",
    description: "Update room rates and pricing policies",
    icon: Edit,
    color: "bg-green-100 text-green-600",
    href: "/manager/pricing",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Business operations overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">$73,000</p>
              <p className="text-sm text-green-600 mt-1">
                +12% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">94%</p>
              <p className="text-sm text-green-600 mt-1">+5% from last week</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Hotel className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">195</p>
              <p className="text-sm text-green-600 mt-1">+8% from last month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Daily Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">$374</p>
              <p className="text-sm text-green-600 mt-1">+3% from last month</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue & Bookings
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis key="left" yAxisId="left" />
              <YAxis key="right" yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookings"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Weekly Occupancy
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="occupied" fill="#3b82f6" />
              <Bar dataKey="available" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-center group"
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-700 leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Reservations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Guest Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Room
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Check-in
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Check-out
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-900">
                  John Martinez
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Ocean View Suite 101
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">Jun 8, 2026</td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Jun 12, 2026
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  $1,800
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    Confirmed
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-900">Sarah Chen</td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Deluxe Room 205
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Jun 10, 2026
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Jun 15, 2026
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  $2,250
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    Pending
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm text-gray-900">
                  Michael Johnson
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Beach Front Villa 3
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">Jun 9, 2026</td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  Jun 16, 2026
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  $4,900
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    Confirmed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
