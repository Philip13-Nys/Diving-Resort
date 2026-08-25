import {
  TrendingUp,
  Users,
  Calendar,
  Waves,
  AlertCircle,
  Clock,
  CheckCircle,
  UserRound,
  Loader2,
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

type BookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "checked-in"
  | "checked-out";

type PaymentStatus = "paid" | "partial" | "unpaid";

type Booking = {
  id: string;
  guest: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  nights: number;
};

type StaffMember = {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  status: string;
  certifications: string[];
};

export default function Dashboard() {
  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

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

        const checkIn = data.checkIn || "";
        const checkOut = data.checkOut || "";

        let nights = Number(data.nights || 0);

        if (!nights && checkIn && checkOut) {
          const start = new Date(`${checkIn}T00:00:00`);
          const end = new Date(`${checkOut}T00:00:00`);

          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            nights = Math.max(
              0,
              Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
              ),
            );
          }
        }

        return {
          id: bookingDoc.id,
          guest: data.customerName || "Unknown Guest",
          email: data.customerEmail || "",
          room: data.roomName || "Unknown Room",
          checkIn,
          checkOut,
          guests: Number(data.guests || 0),
          total: Number(
            data.totalPrice ??
              data.totalAmount ??
              data.total ??
              Number(data.roomRate || 0) * nights,
          ),

          status:
            data.status === "confirmed"
              ? "confirmed"
              : data.status === "cancelled"
                ? "cancelled"
                : data.status === "checked-in"
                  ? "checked-in"
                  : data.status === "checked-out"
                    ? "checked-out"
                    : "pending",

          paymentStatus:
            data.paymentStatus === "paid"
              ? "paid"
              : data.paymentStatus === "partial"
                ? "partial"
                : "unpaid",

          nights,
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
          phone: data.phone || "",
          joinDate: data.joinDate || "",
          status: data.status || "Inactive",
          certifications: Array.isArray(data.certifications)
            ? data.certifications
            : [],
        };
      });

      setBookings(bookingData);
      setStaff(staffData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
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

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  };

  const isToday = (value: string) => {
    const date = getDate(value);
    if (!date) return false;

    return date.getTime() === today.getTime();
  };

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "confirmed" || booking.status === "checked-in",
      ),
    [bookings],
  );

  const bookingsToday = useMemo(
    () =>
      bookings.filter(
        (booking) => isToday(booking.checkIn) && booking.status !== "cancelled",
      ),
    [bookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "pending"),
    [bookings],
  );

  const completedToday = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "checked-out" && isToday(booking.checkOut),
      ),
    [bookings],
  );

  const totalRevenue = useMemo(() => {
    return bookings
      .filter((booking) => booking.status !== "cancelled")
      .reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  }, [bookings]);

  const activeGuests = useMemo(
    () => activeBookings.reduce((sum, booking) => sum + booking.guests, 0),
    [activeBookings],
  );

  const activeStaff = useMemo(
    () =>
      staff.filter((member) => (member.status || "").toLowerCase() === "active")
        .length,
    [staff],
  );

  const revenueData = useMemo(() => {
    const data: {
      date: string;
      revenue: number;
      bookings: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dateKey = date.toISOString().split("T")[0];

      const dayBookings = bookings.filter(
        (booking) =>
          booking.checkIn === dateKey && booking.status !== "cancelled",
      );

      data.push({
        date: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        revenue: dayBookings.reduce((sum, booking) => sum + booking.total, 0),
        bookings: dayBookings.length,
      });
    }

    return data;
  }, [bookings, today]);

  const bookingStatusData = useMemo(() => {
    return [
      {
        status: "Pending",
        count: bookings.filter((booking) => booking.status === "pending")
          .length,
      },
      {
        status: "Confirmed",
        count: bookings.filter((booking) => booking.status === "confirmed")
          .length,
      },
      {
        status: "Checked In",
        count: bookings.filter((booking) => booking.status === "checked-in")
          .length,
      },
      {
        status: "Checked Out",
        count: bookings.filter((booking) => booking.status === "checked-out")
          .length,
      },
      {
        status: "Cancelled",
        count: bookings.filter((booking) => booking.status === "cancelled")
          .length,
      },
    ];
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .filter((booking) => booking.status !== "cancelled")
      .sort((a, b) => {
        const aDate = getDate(a.checkIn)?.getTime() || 0;
        const bDate = getDate(b.checkIn)?.getTime() || 0;

        return bDate - aDate;
      })
      .slice(0, 5);
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    return [...bookings]
      .filter((booking) => {
        const date = getDate(booking.checkIn);

        if (!date) return false;

        return (
          date.getTime() >= today.getTime() && booking.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        const aDate = getDate(a.checkIn)?.getTime() || 0;
        const bDate = getDate(b.checkIn)?.getTime() || 0;

        return aDate - bDate;
      })
      .slice(0, 5);
  }, [bookings, today]);

  const overviewStats = [
    {
      label: "Total Revenue",
      value: formatPeso(totalRevenue),
      type: "peso",
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Active Guests",
      value: activeGuests.toLocaleString(),
      icon: Users,
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Bookings Today",
      value: bookingsToday.length.toLocaleString(),
      icon: Calendar,
      color: "from-purple-500 to-pink-600",
    },
    {
      label: "Active Staff",
      value: activeStaff.toLocaleString(),
      icon: UserRound,
      color: "from-orange-500 to-amber-600",
    },
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>

        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening with your resort today.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}
          >
            <div className="flex items-center justify-between mb-3">
              {stat.type === "peso" ? (
                <span className="text-4xl font-semibold text-white leading-none">
                  ₱
                </span>
              ) : (
                stat.icon && <stat.icon className="size-8 opacity-80" />
              )}

              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                Live
              </span>
            </div>

            <p className="text-sm text-white/80 mb-1">{stat.label}</p>

            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Revenue Trend
              </h3>

              <p className="text-sm text-gray-500">
                Based on booking check-in dates
              </p>
            </div>

            <TrendingUp className="size-5 text-cyan-600" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="date" />

              <YAxis />

              <YAxis
                tickFormatter={(value) =>
                  `₱${Number(value).toLocaleString("en-PH")}`
                }
              />

              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "revenue" ? formatPeso(Number(value)) : value,
                  name === "revenue" ? "Revenue" : "Bookings",
                ]}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0891b2"
                fill="#06b6d4"
                fillOpacity={0.4}
                name="Revenue"
              />

              <Area
                type="monotone"
                dataKey="bookings"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.25}
                name="Bookings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Database-backed Alerts */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Alerts
          </h3>

          <div className="space-y-3">
            {pendingBookings.length > 0 && (
              <div className="p-3 rounded-lg border-l-4 bg-orange-50 border-orange-500">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 mt-0.5 text-orange-600" />

                  <p className="text-sm text-gray-900 flex-1">
                    {pendingBookings.length} booking
                    {pendingBookings.length !== 1 ? "s are" : " is"} waiting for
                    approval.
                  </p>
                </div>
              </div>
            )}

            {bookingsToday.length > 0 && (
              <div className="p-3 rounded-lg border-l-4 bg-blue-50 border-blue-500">
                <div className="flex items-start gap-2">
                  <Calendar className="size-4 mt-0.5 text-blue-600" />

                  <p className="text-sm text-gray-900 flex-1">
                    {bookingsToday.length} check-in
                    {bookingsToday.length !== 1 ? "s" : ""} scheduled today.
                  </p>
                </div>
              </div>
            )}

            {completedToday.length > 0 && (
              <div className="p-3 rounded-lg border-l-4 bg-green-50 border-green-500">
                <div className="flex items-start gap-2">
                  <CheckCircle className="size-4 mt-0.5 text-green-600" />

                  <p className="text-sm text-gray-900 flex-1">
                    {completedToday.length} booking
                    {completedToday.length !== 1 ? "s" : ""} completed today.
                  </p>
                </div>
              </div>
            )}

            {pendingBookings.length === 0 &&
              bookingsToday.length === 0 &&
              completedToday.length === 0 && (
                <div className="p-4 rounded-lg bg-gray-50 text-center">
                  <CheckCircle className="size-6 text-green-600 mx-auto mb-2" />

                  <p className="text-sm text-gray-600">No current alerts.</p>
                </div>
              )}
          </div>

          {/* Upcoming Check-ins */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              Upcoming Check-ins
            </h4>

            <div className="space-y-2">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="size-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold text-sm">
                      {booking.guest
                        ? booking.guest.charAt(0).toUpperCase()
                        : "G"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.guest}
                      </p>

                      <p className="text-xs text-gray-600">
                        {booking.room} • {booking.checkIn}
                      </p>
                    </div>

                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      {booking.guests}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming check-ins.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Status
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingStatusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis type="number" />

              <YAxis dataKey="status" type="category" width={100} />

              <Tooltip />

              <Bar dataKey="count" fill="#0891b2" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Bookings
          </h3>

          <div className="space-y-3">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div className="size-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    {booking.status === "checked-out" ? (
                      <CheckCircle className="size-5 text-green-600" />
                    ) : (
                      <Calendar className="size-5 text-cyan-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {booking.guest}
                    </p>

                    <p className="text-sm text-gray-600">
                      Room: {booking.room}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {booking.status}
                      </span>

                      <span className="text-xs text-gray-400">•</span>

                      <span className="text-xs font-medium text-gray-700">
                        ₱{booking.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                No bookings found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="size-6" />
            <h4 className="text-sm font-medium text-white/80">
              Today's Reservations
            </h4>
          </div>

          <p className="text-4xl font-bold mb-1">{bookingsToday.length}</p>

          <p className="text-sm text-white/90">From your Bookings collection</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <UserRound className="size-6" />
            <h4 className="text-sm font-medium text-white/80">Active Staff</h4>
          </div>

          <p className="text-4xl font-bold mb-1">{activeStaff}</p>

          <p className="text-sm text-white/90">From your Staff collection</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Waves className="size-6" />
            <h4 className="text-sm font-medium text-white/80">
              Pending Bookings
            </h4>
          </div>

          <p className="text-4xl font-bold mb-1">{pendingBookings.length}</p>

          <p className="text-sm text-white/90">Waiting for approval</p>
        </div>
      </div>
    </div>
  );
}
