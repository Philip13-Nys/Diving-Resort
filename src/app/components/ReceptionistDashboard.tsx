import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { customerDb } from "../firebase";

type Booking = {
  id: string;
  guest: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: "confirmed" | "pending" | "cancelled" | "checked-in" | "checked-out";
  paymentStatus: "paid" | "partial" | "unpaid";
  nights: number;
};

export default function ReceptionistDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(customerDb, "Bookings"));

      const bookingData: Booking[] = snapshot.docs.map((bookingDoc) => {
        const data = bookingDoc.data();

        const checkIn = data.checkIn || "";
        const checkOut = data.checkOut || "";

        let nights = Number(data.nights || 0);

        // Calculate nights when the database does not contain it
        if (!nights && checkIn && checkOut) {
          const start = new Date(checkIn);
          const end = new Date(checkOut);

          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const difference = end.getTime() - start.getTime();

            nights = Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
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

      setBookings(bookingData);
    } catch (error) {
      console.error("Error loading dashboard bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in local time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDateOnly = (value: string) => {
    if (!value) return null;

    // Handles YYYY-MM-DD safely
    const date = new Date(`${value}T00:00:00`);

    return isNaN(date.getTime()) ? null : date;
  };

  const isToday = (value: string) => {
    const date = getDateOnly(value);

    if (!date) return false;

    return date.getTime() === today.getTime();
  };

  const isTomorrow = (value: string) => {
    const date = getDateOnly(value);

    if (!date) return false;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return date.getTime() === tomorrow.getTime();
  };

  // Pending check-ins = pending or confirmed bookings whose check-in is today
  const pendingCheckIns = useMemo(() => {
    return bookings.filter(
      (booking) =>
        (booking.status === "pending" || booking.status === "confirmed") &&
        isToday(booking.checkIn),
    );
  }, [bookings]);

  // Pending check-outs = checked-in/confirmed bookings whose check-out is today
  const pendingCheckOuts = useMemo(() => {
    return bookings.filter(
      (booking) =>
        (booking.status === "checked-in" || booking.status === "confirmed") &&
        isToday(booking.checkOut),
    );
  }, [bookings]);

  // Active reservations = confirmed or checked-in
  const activeReservations = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "confirmed" || booking.status === "checked-in",
    );
  }, [bookings]);

  // Completed today = checked-out bookings today
  const completedToday = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "checked-out" && isToday(booking.checkOut),
    );
  }, [bookings]);

  // Recent bookings
  const recentTransactions = useMemo(() => {
    return [...bookings]
      .filter((booking) => booking.status !== "cancelled")
      .sort((a, b) => {
        const dateA = getDateOnly(a.checkIn)?.getTime() || 0;
        const dateB = getDateOnly(b.checkIn)?.getTime() || 0;

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [bookings]);

  // Upcoming check-ins
  const upcomingReservations = useMemo(() => {
    return [...bookings]
      .filter((booking) => {
        const checkIn = getDateOnly(booking.checkIn);

        if (!checkIn) return false;

        return (
          booking.status !== "cancelled" && checkIn.getTime() >= today.getTime()
        );
      })
      .sort((a, b) => {
        const dateA = getDateOnly(a.checkIn)?.getTime() || 0;
        const dateB = getDateOnly(b.checkIn)?.getTime() || 0;

        return dateA - dateB;
      })
      .slice(0, 5);
  }, [bookings]);

  const stats = [
    {
      label: "Pending Check-ins",
      value: pendingCheckIns.length,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Pending Check-outs",
      value: pendingCheckOuts.length,
      color: "bg-orange-100 text-orange-700",
    },
    {
      label: "Active Reservations",
      value: activeReservations.length,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Completed Today",
      value: completedToday.length,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  const formatDate = (value: string) => {
    if (!value) return "No date";

    const date = getDateOnly(value);

    if (!date) return value;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getCheckInLabel = (value: string) => {
    if (isToday(value)) {
      return "Today";
    }

    if (isTomorrow(value)) {
      return "Tomorrow";
    }

    return formatDate(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Receptionist Dashboard Overview
        </h1>

        <p className="text-gray-600 mt-1">
          Oversee receptionist operations, reservations, and customer
          transactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>

                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>

              <div
                className={`size-12 rounded-full ${stat.color} flex items-center justify-center`}
              >
                <Calendar className="size-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent bookings + upcoming check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>

            <span className="text-xs text-gray-500">
              {recentTransactions.length} records
            </span>
          </div>

          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {booking.guest}
                      </span>

                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        {booking.room}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                      <span>Booking</span>

                      <span>•</span>

                      <span className="font-semibold text-gray-900">
                        ₱{booking.total.toLocaleString()}
                      </span>

                      <span>•</span>

                      <span>{formatDate(booking.checkIn)}</span>
                    </div>
                  </div>

                  {booking.status === "checked-out" ? (
                    <CheckCircle className="size-5 text-green-600 shrink-0" />
                  ) : (
                    <Clock className="size-5 text-orange-600 shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                No recent bookings found.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Check-ins */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Check-ins
          </h3>

          <div className="space-y-3">
            {upcomingReservations.length > 0 ? (
              upcomingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold shrink-0">
                    {reservation.guest
                      ? reservation.guest.charAt(0).toUpperCase()
                      : "G"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {reservation.guest}
                    </p>

                    <p className="text-sm text-gray-600">{reservation.room}</p>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Clock className="size-3 text-gray-500" />

                      <span className="text-xs text-gray-500">
                        {getCheckInLabel(reservation.checkIn)}
                      </span>

                      <span className="text-xs text-gray-400">•</span>

                      <span className="text-xs text-gray-500">
                        {reservation.nights} nights
                      </span>

                      <span className="text-xs text-gray-400">•</span>

                      <span className="text-xs text-gray-500">
                        {reservation.guests} guest
                        {reservation.guests !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                No upcoming check-ins.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <AlertCircle className="size-12 shrink-0" />

          <div>
            <h3 className="text-lg font-semibold">Quick Actions Available</h3>

            <p className="text-cyan-50 mt-1">
              Process check-ins, handle payments, manage reservations, and
              assist guests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
