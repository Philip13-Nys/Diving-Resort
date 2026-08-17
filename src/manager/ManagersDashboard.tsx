import { Card } from "../app/components/ui/card";
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
import { useEffect, useState } from "react";
import { customerDb, db } from "../app/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

type Booking = {
  id: string;
  bookingRef?: string;
  guestName?: string;
  guest?: string;
  room?: string;
  roomName?: string;
  roomType?: string;

  checkIn?: string;
  checkOut?: string;

  total?: number;
  totalAmount?: number;
  amount?: number;

  status?: string;

  createdAt?: any;
};

type RevenueData = {
  month: string;
  revenue: number;
  bookings: number;
};

type OccupancyData = {
  day: string;
  occupied: number;
  available: number;
};

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

const convertToDate = (value: any): Date | null => {
  if (!value) return null;

  if (value?.toDate) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [averageDailyRate, setAverageDailyRate] = useState(0);
  const [revenueData, setRevenueData] = useState<
    {
      month: string;
      revenue: number;
      bookings: number;
    }[]
  >([]);

  const [occupancyData, setOccupancyData] = useState<
    {
      day: string;
      occupied: number;
      available: number;
    }[]
  >([]);

  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      console.log("Loading dashboard data...");

      const bookingSnapshot = await getDocs(collection(customerDb, "Bookings"));

      const bookings: Booking[] = bookingSnapshot.docs.map((doc) => {
        const data = doc.data();

        console.log("Booking:", doc.id, data);

        return {
          id: doc.id,
          ...data,
        } as Booking;
      });

      console.log("Total bookings:", bookings.length);

      setTotalBookings(bookings.length);

      const revenue = bookings.reduce((sum, booking) => {
        const amount =
          Number(booking.total) ||
          Number(booking.totalAmount) ||
          Number(booking.amount) ||
          0;

        return sum + amount;
      }, 0);

      setTotalRevenue(revenue);

      if (bookings.length > 0) {
        const totalNights = bookings.reduce((sum, booking) => {
          if (!booking.checkIn || !booking.checkOut) {
            return sum;
          }

          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);

          const difference = checkOut.getTime() - checkIn.getTime();

          const nights = Math.max(
            1,
            Math.ceil(difference / (1000 * 60 * 60 * 24)),
          );

          return sum + nights;
        }, 0);

        if (totalNights > 0) {
          setAverageDailyRate(revenue / totalNights);
        }
      }

      const monthly: Record<
        string,
        {
          revenue: number;
          bookings: number;
        }
      > = {};

      bookings.forEach((booking) => {
        let date: Date;

        if (booking.createdAt?.toDate) {
          date = booking.createdAt.toDate();
        } else if (booking.createdAt) {
          date = new Date(booking.createdAt);
        } else if (booking.checkIn) {
          date = new Date(booking.checkIn);
        } else {
          return;
        }

        if (isNaN(date.getTime())) return;

        const month = date.toLocaleString("en-US", {
          month: "short",
        });

        if (!monthly[month]) {
          monthly[month] = {
            revenue: 0,
            bookings: 0,
          };
        }

        monthly[month].bookings += 1;

        monthly[month].revenue +=
          Number(booking.total) ||
          Number(booking.totalAmount) ||
          Number(booking.amount) ||
          0;
      });

      const monthOrder = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const chartData: RevenueData[] = monthOrder
        .filter((month) => monthly[month])
        .map((month) => ({
          month,
          revenue: monthly[month].revenue,
          bookings: monthly[month].bookings,
        }));

      setRevenueData(chartData);

      const sortedBookings = [...bookings].sort((a, b) => {
        const getTime = (booking: Booking) => {
          if (booking.createdAt?.toDate) {
            return booking.createdAt.toDate().getTime();
          }

          if (booking.createdAt) {
            return new Date(booking.createdAt).getTime();
          }

          return 0;
        };

        return getTime(b) - getTime(a);
      });

      setRecentBookings(sortedBookings.slice(0, 10));

      // ==========================================
      // OCCUPANCY
      // ==========================================

      const roomSnapshot = await getDocs(collection(db, "rooms"));

      const totalRooms = roomSnapshot.size;

      console.log("=================================");
      console.log("TOTAL ROOMS:", totalRooms);

      roomSnapshot.forEach((doc) => {
        console.log("ROOM:", doc.id, doc.data());
      });

      console.log("=================================");

      if (totalRooms > 0) {
        const today = new Date();

        // Remove time from today's date
        today.setHours(0, 0, 0, 0);

        const occupiedRooms = bookings.filter((booking) => {
          if (!booking.checkIn || !booking.checkOut) {
            return false;
          }

          const checkIn = convertToDate(booking.checkIn);
          const checkOut = convertToDate(booking.checkOut);

          if (!checkIn || !checkOut) {
            return false;
          }

          checkIn.setHours(0, 0, 0, 0);
          checkOut.setHours(0, 0, 0, 0);

          return today >= checkIn && today < checkOut;
        }).length;

        const rate = (occupiedRooms / totalRooms) * 100;

        setOccupancyRate(Math.min(100, Math.round(rate)));

        console.log("Occupied rooms:", occupiedRooms);
        console.log("Available rooms:", totalRooms - occupiedRooms);
        console.log("Occupancy rate:", rate);

        // ==========================================
        // WEEKLY OCCUPANCY
        // ==========================================

        const weeklyData: OccupancyData[] = [];

        for (let i = 6; i >= 0; i--) {
          const date = new Date();

          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);

          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });

          const occupied = bookings.filter((booking) => {
            if (!booking.checkIn || !booking.checkOut) {
              return false;
            }

            const checkIn = convertToDate(booking.checkIn);
            const checkOut = convertToDate(booking.checkOut);

            if (!checkIn || !checkOut) {
              return false;
            }

            checkIn.setHours(0, 0, 0, 0);
            checkOut.setHours(0, 0, 0, 0);

            return date >= checkIn && date < checkOut;
          }).length;

          weeklyData.push({
            day: dayName,
            occupied,
            available: Math.max(0, totalRooms - occupied),
          });
        }

        setOccupancyData(weeklyData);
      } else {
        console.log("NO ROOMS FOUND IN FIRESTORE");
        setOccupancyRate(0);
        setOccupancyData([]);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        <p className="text-gray-500 mt-2">Business operations overview</p>
      </div>

      {/* Key Metrics */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>

              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₱{totalRevenue.toLocaleString()}
              </p>

              <p className="text-sm text-gray-500 mt-1">From all bookings</p>
            </div>

            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Occupancy */}

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Occupancy Rate</p>

              <p className="text-2xl font-bold text-gray-900 mt-1">
                {occupancyRate}%
              </p>

              <p className="text-sm text-green-600 mt-1">Current occupancy</p>
            </div>

            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Hotel className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Bookings */}

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>

              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalBookings}
              </p>

              <p className="text-sm text-green-600 mt-1">All bookings</p>
            </div>

            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        {/* ADR */}

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Daily Rate</p>

              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₱{Math.round(averageDailyRate).toLocaleString()}
              </p>

              <p className="text-sm text-green-600 mt-1">Average per night</p>
            </div>

            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue & Bookings
          </h2>

          {revenueData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No booking data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis yAxisId="left" />

                <YAxis yAxisId="right" orientation="right" />

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
          )}
        </Card>

        {/* Occupancy Chart */}

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Weekly Occupancy
          </h2>

          {occupancyData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No room data available
            </div>
          ) : (
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
          )}
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

      {/* Recent Reservations */}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Reservations
        </h2>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Loading reservations...
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No reservations yet.
          </div>
        ) : (
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
                {recentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {booking.guestName || booking.guest || "Guest"}
                    </td>

                    <td className="py-3 px-4 text-sm text-gray-700">
                      {booking.room ||
                        booking.roomName ||
                        booking.roomType ||
                        "N/A"}
                    </td>

                    <td className="py-3 px-4 text-sm text-gray-700">
                      {booking.checkIn || "N/A"}
                    </td>

                    <td className="py-3 px-4 text-sm text-gray-700">
                      {booking.checkOut || "N/A"}
                    </td>

                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      ₱
                      {(
                        Number(booking.total) ||
                        Number(booking.totalAmount) ||
                        Number(booking.amount) ||
                        0
                      ).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {booking.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
