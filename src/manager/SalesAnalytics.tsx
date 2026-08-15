import { Card } from "../app/components/ui/card";
import {
  BarChart,
  Bar,
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
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../app/firebase";

interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
}

interface RoomTypeRevenue {
  name: string;
  value: number;
  bookings: number;
}

interface BookingChannel {
  name: string;
  value: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export default function SalesAnalytics() {
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [roomTypeRevenue, setRoomTypeRevenue] = useState<RoomTypeRevenue[]>([]);
  const [bookingChannels, setBookingChannels] = useState<BookingChannel[]>([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [avgDailyRate, setAvgDailyRate] = useState(0);
  const [avgStayDuration, setAvgStayDuration] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, "reservations"));

        console.log(
          "Reservations:",
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        );

        // Analytics will be calculated here
      } catch (error) {
        console.error("Error loading sales analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Loading sales analytics...</p>
        </div>
      </div>
    );
  }
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
              <p className="text-xl font-bold text-gray-900">
                ${totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Based on actual bookings
              </p>
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
              <p className="text-xl font-bold text-gray-900">
                ${avgDailyRate.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Based on actual bookings
              </p>
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
              <p className="text-xl font-bold text-gray-900">
                {totalBookings.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Based on actual bookings
              </p>
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
              <p className="text-xl font-bold text-gray-900">
                {avgStayDuration.toFixed(1)} days
              </p>
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
