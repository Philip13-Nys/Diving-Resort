import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { customerDb } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

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

        const checkIn =
          data.checkIn instanceof Timestamp
            ? data.checkIn.toDate().toISOString().split("T")[0]
            : String(data.checkIn || "");

        const checkOut =
          data.checkOut instanceof Timestamp
            ? data.checkOut.toDate().toISOString().split("T")[0]
            : String(data.checkOut || "");

        let nights = Number(data.nights || 0);

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDateOnly = (value: string) => {
    if (!value) return null;
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

  const pendingCheckIns = useMemo(() => {
    return bookings.filter(
      (booking) => booking.status === "confirmed" && isToday(booking.checkIn),
    );
  }, [bookings]);

  const pendingCheckOuts = useMemo(() => {
    return bookings.filter(
      (booking) => booking.status === "checked-in" && isToday(booking.checkOut),
    );
  }, [bookings]);

  const activeReservations = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "confirmed" || booking.status === "checked-in",
    );
  }, [bookings]);

  const completedToday = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "checked-out" && isToday(booking.checkOut),
    );
  }, [bookings]);

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

  const upcomingCheckIns = useMemo(() => {
    return [...bookings]
      .filter((booking) => {
        const checkIn = getDateOnly(booking.checkIn);

        if (!checkIn) return false;

        return (
          booking.status === "confirmed" && checkIn.getTime() >= today.getTime()
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

  const handleCheckIn = async (bookingId: string) => {
    try {
      await updateDoc(doc(customerDb, "Bookings", bookingId), {
        status: "checked-in",
      });

      await loadBookings();
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      await updateDoc(doc(customerDb, "Bookings", bookingId), {
        status: "checked-out",
      });

      await loadBookings();
    } catch (error) {
      console.error("Error checking out:", error);
    }
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
    <div className="min-h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Receptionist Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage today's arrivals, departures, reservations, and guest
            activity.
          </p>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>

                <div
                  className={`size-11 rounded-xl ${stat.color} flex items-center justify-center`}
                >
                  <Calendar className="size-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RECENT TRANSACTIONS */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Transactions
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Latest guest reservations and activity
              </p>
            </div>

            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              {recentTransactions.length} records
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition"
                >
                  {/* Guest avatar */}
                  <div className="size-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-semibold shrink-0">
                    {booking.guest.charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {booking.guest}
                      </p>

                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {booking.room}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{formatDate(booking.checkIn)}</span>
                      <span>•</span>
                      <span>{booking.nights} nights</span>
                      <span>•</span>
                      <span>
                        {booking.guests} guest
                        {booking.guests !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₱{booking.total.toLocaleString()}
                    </p>

                    <div className="flex items-center justify-end gap-1 mt-1">
                      {booking.status === "checked-out" ? (
                        <>
                          <CheckCircle className="size-3.5 text-green-600" />
                          <span className="text-xs text-green-600">
                            Completed
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="size-3.5 text-orange-500" />
                          <span className="text-xs text-orange-500">
                            Active
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Calendar className="size-8 mx-auto text-gray-300" />

                <p className="mt-3 text-sm font-medium text-gray-600">
                  No recent transactions
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  New reservations will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ARRIVALS + DEPARTURES */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* UPCOMING CHECK-INS */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Check-ins
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Guests arriving today and upcoming
                </p>
              </div>

              <div className="size-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              {upcomingCheckIns.length > 0 ? (
                upcomingCheckIns.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-semibold shrink-0">
                        {reservation.guest.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {reservation.guest}
                        </p>

                        <p className="text-sm text-gray-500">
                          {reservation.room}
                        </p>
                      </div>

                      {isToday(reservation.checkIn) ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          Today
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                          {formatDate(reservation.checkIn)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          {reservation.nights} night
                          {reservation.nights !== 1 ? "s" : ""}
                        </span>

                        <span>•</span>

                        <span>
                          {reservation.guests} guest
                          {reservation.guests !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {isToday(reservation.checkIn) && (
                        <button
                          onClick={() => handleCheckIn(reservation.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <CheckCircle className="size-8 mx-auto text-gray-300" />

                  <p className="mt-3 text-sm font-medium text-gray-600">
                    No upcoming check-ins
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    You're all caught up.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PENDING CHECK-OUTS */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pending Check-outs
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Guests scheduled to leave today
                </p>
              </div>

              <div className="size-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              {pendingCheckOuts.length > 0 ? (
                pendingCheckOuts.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold shrink-0">
                        {booking.guest.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {booking.guest}
                        </p>

                        <p className="text-sm text-gray-500">{booking.room}</p>
                      </div>

                      <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
                        Today
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Check-out: {formatDate(booking.checkOut)}
                      </div>

                      <button
                        onClick={() => handleCheckOut(booking.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition"
                      >
                        Check Out
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <CheckCircle className="size-8 mx-auto text-gray-300" />

                  <p className="mt-3 text-sm font-medium text-gray-600">
                    No pending check-outs
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    No guests are scheduled to leave today.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK ACTION / INFO */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
              <AlertCircle className="size-5" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                Receptionist Tasks
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Process check-ins and check-outs, monitor reservations, and
                assist guests with their stay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
