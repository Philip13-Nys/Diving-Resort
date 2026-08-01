import { Card } from "../app/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, Users, Calendar } from "lucide-react";

const monthlyRevenue = [
  { month: "Jan", revenue: 45000, target: 50000 },
  { month: "Feb", revenue: 52000, target: 50000 },
  { month: "Mar", revenue: 61000, target: 55000 },
  { month: "Apr", revenue: 58000, target: 55000 },
  { month: "May", revenue: 67000, target: 60000 },
  { month: "Jun", revenue: 73000, target: 60000 },
];

const roomTypeRevenue = [
  { name: "Standard Room", value: 28000, bookings: 145 },
  { name: "Deluxe Room", value: 35000, bookings: 98 },
  { name: "Ocean View Suite", value: 42000, bookings: 73 },
  { name: "Beach Front Villa", value: 56000, bookings: 45 },
];

const bookingChannels = [
  { name: "Direct Booking", value: 42 },
  { name: "Online Travel Agency", value: 35 },
  { name: "Walk-in", value: 15 },
  { name: "Corporate", value: 8 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export default function SalesAnalytics() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
        <p className="text-gray-500 mt-2">
          Analyze sales performance and revenue trends
        </p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">$356K</p>
              <p className="text-xs text-green-600 mt-1">+18% YTD</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Daily Rate</p>
              <p className="text-xl font-bold text-gray-900">$374</p>
              <p className="text-xs text-blue-600 mt-1">+5% vs target</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-xl font-bold text-gray-900">1,038</p>
              <p className="text-xs text-purple-600 mt-1">+12% YTD</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Stay Duration</p>
              <p className="text-xl font-bold text-gray-900">4.2 days</p>
              <p className="text-xs text-orange-600 mt-1">Stable</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Revenue vs Target
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Actual Revenue" />
              <Bar dataKey="target" fill="#e5e7eb" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Channels Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingChannels}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {bookingChannels.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Room Type Performance */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue by Room Type
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Room Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Total Revenue
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Total Bookings
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Avg. Revenue per Booking
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {roomTypeRevenue.map((room) => {
                const avgRevenue = Math.round(room.value / room.bookings);
                const totalRevenue = roomTypeRevenue.reduce(
                  (sum, r) => sum + r.value,
                  0,
                );
                const contribution = Math.round(
                  (room.value / totalRevenue) * 100,
                );
                return (
                  <tr
                    key={room.name}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {room.name}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      ${room.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{room.bookings}</td>
                    <td className="py-3 px-4 text-gray-700">${avgRevenue}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${contribution}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700 w-12">
                          {contribution}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
