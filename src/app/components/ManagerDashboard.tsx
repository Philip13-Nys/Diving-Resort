import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { db, customerDb } from "../firebase";

type Booking = {
  id: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: string;
  paymentStatus: string;
};

type StaffMember = {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  status: string;
};

export default function ManagerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [bookingSnapshot, staffSnapshot] = await Promise.all([
        getDocs(collection(customerDb, "Bookings")),
        getDocs(collection(db, "Staff")),
      ]);

      const bookingData: Booking[] = bookingSnapshot.docs.map((bookingDoc) => {
        const data = bookingDoc.data();

        return {
          id: bookingDoc.id,
          guest: data.customerName || "Unknown Guest",
          room: data.roomName || "Unknown Room",
          checkIn: data.checkIn || "",
          checkOut: data.checkOut || "",
          guests: Number(data.guests || 0),
          total: Number(data.totalPrice ?? data.totalAmount ?? data.total ?? 0),
          status: data.status || "pending",
          paymentStatus: data.paymentStatus || "unpaid",
        };
      });

      const staffData: StaffMember[] = staffSnapshot.docs.map((staffDoc) => {
        const data = staffDoc.data();

        return {
          id: staffDoc.id,
          name: data.name || "Unknown Staff",
          position: data.position || "",
          department: data.department || "",
          email: data.email || "",
          status: data.status || "Inactive",
        };
      });

      setBookings(bookingData);
      setStaff(staffData);
    } catch (error) {
      console.error("Error loading manager dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const getDate = (value: string) => {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    return isNaN(date.getTime()) ? null : date;
  };

  const isToday = (value: string) => {
    const date = getDate(value);

    return date ? date.getTime() === today.getTime() : false;
  };

  const formatPeso = (value: number) =>
    `₱${value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  /*
   * Real database statistics
   */

  const totalBookings = bookings.filter(
    (booking) => booking.status !== "cancelled",
  ).length;

  const revenueToday = bookings
    .filter(
      (booking) => isToday(booking.checkIn) && booking.status !== "cancelled",
    )
    .reduce((sum, booking) => sum + booking.total, 0);

  const activeGuests = bookings
    .filter(
      (booking) =>
        booking.status === "confirmed" || booking.status === "checked-in",
    )
    .reduce((sum, booking) => sum + booking.guests, 0);

  const pendingCheckouts = bookings.filter(
    (booking) =>
      isToday(booking.checkOut) &&
      (booking.status === "confirmed" || booking.status === "checked-in"),
  ).length;

  const activeStaff = staff.filter(
    (member) => (member.status || "").toLowerCase() === "active",
  ).length;

  /*
   * Revenue for the last 6 months
   */
  const revenueData = useMemo(() => {
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);

      date.setMonth(date.getMonth() - i);

      const month = date.getMonth();
      const year = date.getFullYear();

      const monthBookings = bookings.filter((booking) => {
        if (!booking.checkIn) return false;

        const bookingDate = getDate(booking.checkIn);

        if (!bookingDate) return false;

        return (
          bookingDate.getMonth() === month &&
          bookingDate.getFullYear() === year &&
          booking.status !== "cancelled"
        );
      });

      data.push({
        month: date.toLocaleDateString(undefined, {
          month: "short",
        }),

        revenue: monthBookings.reduce((sum, booking) => sum + booking.total, 0),
      });
    }

    return data;
  }, [bookings, today]);

  /*
   * Real booking status/activity breakdown
   */
  const activityData = useMemo(() => {
    return [
      {
        activity: "Pending",
        count: bookings.filter((booking) => booking.status === "pending")
          .length,
      },
      {
        activity: "Confirmed",
        count: bookings.filter((booking) => booking.status === "confirmed")
          .length,
      },
      {
        activity: "Checked In",
        count: bookings.filter((booking) => booking.status === "checked-in")
          .length,
      },
      {
        activity: "Checked Out",
        count: bookings.filter((booking) => booking.status === "checked-out")
          .length,
      },
      {
        activity: "Cancelled",
        count: bookings.filter((booking) => booking.status === "cancelled")
          .length,
      },
    ];
  }, [bookings]);

  /*
   * Recent real bookings
   */
  const recentBookings = useMemo(() => {
    return [...bookings]
      .filter((booking) => booking.status !== "cancelled")
      .sort((a, b) => {
        const dateA = getDate(a.checkIn)?.getTime() || 0;

        const dateB = getDate(b.checkIn)?.getTime() || 0;

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Bookings",
      value: totalBookings.toString(),
      icon: Calendar,
    },
    {
      label: "Revenue Today",
      value: formatPeso(revenueToday),
      icon: null,
    },
    {
      label: "Active Guests",
      value: activeGuests.toString(),
      icon: Users,
    },
    {
      label: "Pending Checkouts",
      value: pendingCheckouts.toString(),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Manager Dashboard Overview
        </h1>

        <p className="text-gray-600 mt-1">
          Monitor manager activities, performance, and reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">{stat.label}</span>

              {stat.icon ? (
                <stat.icon className="size-5 text-cyan-600" />
              ) : (
                <span className="text-2xl font-bold text-green-600">₱</span>
              )}
            </div>

            <span className="text-3xl font-bold text-gray-900">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Trend
            </h3>

            <TrendingUp className="size-5 text-cyan-600" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

              <YAxis
                tickFormatter={(value) =>
                  `₱${Number(value).toLocaleString("en-PH")}`
                }
              />

              <Tooltip
                formatter={(value: number) => formatPeso(Number(value))}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0891b2"
                fill="#06b6d4"
                fillOpacity={0.3}
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Booking Activity */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Activity
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="activity"
                angle={-15}
                textAnchor="end"
                height={80}
              />

              <YAxis />

              <Tooltip />

              <Bar dataKey="count" fill="#0891b2" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Bookings
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Latest booking records from your database
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {bookings.length} total records
          </span>
        </div>

        <div className="space-y-3">
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start gap-4 pb-3 border-b border-gray-100 last:border-0"
              >
                <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold">
                  {booking.guest ? booking.guest.charAt(0).toUpperCase() : "G"}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-gray-900">{booking.guest}</p>

                  <p className="text-sm text-gray-600">Room {booking.room}</p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 capitalize">
                      {booking.status}
                    </span>

                    <span className="text-gray-400">•</span>

                    <span className="text-sm font-medium text-gray-700">
                      {formatPeso(booking.total)}
                    </span>
                  </div>
                </div>

                {booking.status === "checked-out" ? (
                  <CheckCircle className="size-5 text-green-600" />
                ) : (
                  <Clock className="size-5 text-orange-500" />
                )}
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              No booking records found.
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="size-6" />

            <h4 className="text-sm font-medium text-white/80">
              Today's Reservations
            </h4>
          </div>

          <p className="text-4xl font-bold">
            {
              bookings.filter(
                (booking) =>
                  isToday(booking.checkIn) && booking.status !== "cancelled",
              ).length
            }
          </p>

          <p className="text-sm text-white/90 mt-1">
            Based on today's check-ins
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Users className="size-6" />

            <h4 className="text-sm font-medium text-white/80">Active Staff</h4>
          </div>

          <p className="text-4xl font-bold">{activeStaff}</p>

          <p className="text-sm text-white/90 mt-1">From Staff collection</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold">₱</span>

            <h4 className="text-sm font-medium text-white/80">Total Revenue</h4>
          </div>

          <p className="text-4xl font-bold">
            {formatPeso(
              bookings
                .filter((booking) => booking.status !== "cancelled")
                .reduce((sum, booking) => sum + booking.total, 0),
            )}
          </p>

          <p className="text-sm text-white/90 mt-1">From booking records</p>
        </div>
      </div>
    </div>
  );
}
