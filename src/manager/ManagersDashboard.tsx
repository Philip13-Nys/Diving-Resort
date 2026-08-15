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

const revenueData: {
  month: string;
  revenue: number;
  bookings: number;
}[] = [];

const occupancyData: {
  day: string;
  occupied: number;
  available: number;
}[] = [];

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
              <p className="text-2xl font-bold text-gray-900 mt-1">₱0</p>
              <p className="text-sm text-gray-500 mt-1">No data yet</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">0%</p>
              <p className="text-sm text-green-600 mt-1">No data yet</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
              <p className="text-sm text-green-600 mt-1">No data yet</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">$0</p>
              <p className="text-sm text-green-600 mt-1">No data eyt</p>
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
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  No reservations yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
