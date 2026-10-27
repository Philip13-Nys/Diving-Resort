import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorOpen,
  FileBarChart,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Users,
  Wallet,
  ArrowRight,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { customerDb } from "../firebase";

type Booking = {
  id: string;
  bookingRef: string;
  guest: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  amountPaid: number;
  status: string;
  paymentStatus: string;
  nights: number;
};

const normalizeStatus = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

const toDateString = (value: unknown): string => {
  if (!value) return "";

  let date: Date;

  if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    date = (value as { toDate: () => Date }).toDate();
  } else if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    date = new Date((value as { seconds: number }).seconds * 1000);
  } else {
    const raw = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }

    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getNights = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) => {
  if (!value) return "—";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isActiveBooking = (status: string) =>
  ["confirmed", "reserved", "checked-in", "checked in"].includes(
    normalizeStatus(status),
  );

const isCheckedIn = (status: string) =>
  ["checked-in", "checked in"].includes(normalizeStatus(status));

const isCancelled = (status: string) =>
  ["cancelled", "canceled", "rejected"].includes(normalizeStatus(status));

const getStatusStyle = (status: string) => {
  const normalized = normalizeStatus(status);

  if (["checked-out", "completed"].includes(normalized)) {
    return "bg-purple-100 text-purple-700";
  }

  if (isCheckedIn(normalized)) {
    return "bg-green-100 text-green-700";
  }

  if (["confirmed", "reserved"].includes(normalized)) {
    return "bg-blue-100 text-blue-700";
  }

  if (isCancelled(normalized)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
};

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  icon: typeof BedDouble;
  iconClass: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-gray-500">
            {title}
          </p>
          <p className="mt-2 break-words text-xl font-bold text-gray-900 sm:text-2xl">
            {value}
          </p>
        </div>

        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="break-words text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">{subtitle}</p>
      </div>

      <Icon className="size-5 shrink-0 text-gray-400" />
    </div>
  );
}

function EmptyState({
  message,
  description,
}: {
  message: string;
  description: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <CalendarDays className="mx-auto size-8 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-600">{message}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

export default function ManagerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadBookings = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError("");

    try {
      const snapshot = await getDocs(collection(customerDb, "Bookings"));

      const bookingData: Booking[] = snapshot.docs.map((bookingDoc) => {
        const data = bookingDoc.data();

        const checkIn = toDateString(data.checkIn ?? data.bookingDate);
        const checkOut = toDateString(data.checkOut);

        const nights =
          Number(data.nights) > 0
            ? Number(data.nights)
            : getNights(checkIn, checkOut);

        const total = Number(
          data.totalPrice ??
            data.totalAmount ??
            data.total ??
            Number(data.roomRate || 0) * nights,
        );

        return {
          id: bookingDoc.id,
          bookingRef: String(
            data.bookingRef ??
              data.reservationId ??
              data.bookingCode ??
              bookingDoc.id,
          ),
          guest: String(
            data.customerName ??
              data.guestName ??
              data.fullName ??
              "Unknown Guest",
          ),
          email: String(data.customerEmail ?? data.email ?? ""),
          room: String(
            data.roomName ??
              data.roomTypeName ??
              data.roomType ??
              "Unknown Room",
          ),
          checkIn,
          checkOut,
          guests: Number(data.guests ?? data.numberOfGuests ?? 0),
          total: Number.isFinite(total) ? total : 0,
          amountPaid: Number(data.amountPaid ?? data.paidAmount ?? 0),
          status: normalizeStatus(data.status || "pending"),
          paymentStatus: normalizeStatus(data.paymentStatus || "unpaid"),
          nights,
        };
      });

      setBookings(bookingData);
    } catch (error) {
      console.error("Error loading manager dashboard:", error);
      setLoadError(
        "Unable to load bookings. Please check your Firebase connection and permissions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const today = getLocalDateString();

  const currentMonth = today.slice(0, 7);

  const occupiedBookings = useMemo(
    () => bookings.filter((booking) => isCheckedIn(booking.status)),
    [bookings],
  );

  const todaysCheckIns = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.checkIn === today &&
          isActiveBooking(booking.status) &&
          !isCheckedIn(booking.status),
      ),
    [bookings, today],
  );

  const todaysCheckOuts = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.checkOut === today && isCheckedIn(booking.status),
      ),
    [bookings, today],
  );

  const todaysCompletedCheckOuts = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.checkOut === today &&
          normalizeStatus(booking.status) === "checked-out",
      ),
    [bookings, today],
  );

  const activeBookings = useMemo(
    () => bookings.filter((booking) => isActiveBooking(booking.status)),
    [bookings],
  );

  const revenueToday = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.checkIn === today && !isCancelled(booking.status),
        )
        .reduce((sum, booking) => sum + booking.total, 0),
    [bookings, today],
  );

  const revenueMonth = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.checkIn.startsWith(currentMonth) &&
            !isCancelled(booking.status),
        )
        .reduce((sum, booking) => sum + booking.total, 0),
    [bookings, currentMonth],
  );

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .filter((booking) => !isCancelled(booking.status))
        .sort((a, b) => {
          const dateA = a.checkIn || "";
          const dateB = b.checkIn || "";

          if (dateA !== dateB) return dateB.localeCompare(dateA);

          return b.id.localeCompare(a.id);
        })
        .slice(0, 5),
    [bookings],
  );

  const schedule = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            (booking.checkIn === today && isActiveBooking(booking.status)) ||
            (booking.checkOut === today && isCheckedIn(booking.status)),
        )
        .sort((a, b) => {
          const dateA = a.checkOut === today ? 0 : 1;
          const dateB = b.checkOut === today ? 0 : 1;

          return dateA - dateB;
        })
        .slice(0, 5),
    [bookings, today],
  );

  const todayLabel = new Date().toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading manager dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-full w-full min-w-0 overflow-x-hidden bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">
              Manager Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage resort operations, bookings, and guest activities.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadBookings(true)}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loadError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Occupied Rooms"
            value={occupiedBookings.length}
            icon={BedDouble}
            iconClass="bg-blue-100 text-blue-700"
          />
          <StatCard
            title="Today's Check-ins"
            value={todaysCheckIns.length}
            icon={LogIn}
            iconClass="bg-green-100 text-green-700"
          />
          <StatCard
            title="Revenue Today"
            value={formatCurrency(revenueToday)}
            icon={Wallet}
            iconClass="bg-purple-100 text-purple-700"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(revenueMonth)}
            icon={CreditCard}
            iconClass="bg-orange-100 text-orange-700"
          />
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              to="/walk-in"
              className="group min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <ClipboardList size={19} />
                </span>
                <ArrowRight
                  size={17}
                  className="text-gray-400 transition group-hover:translate-x-1"
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">
                New Walk-in
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Create a walk-in booking
              </p>
            </Link>

            <Link
              to="/room-availability"
              className="group min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <DoorOpen size={19} />
                </span>
                <ArrowRight
                  size={17}
                  className="text-gray-400 transition group-hover:translate-x-1"
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">
                Check Room Availability
              </h3>
              <p className="mt-1 text-xs text-gray-500">View available rooms</p>
            </Link>

            <Link
              to="/payments"
              className="group min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <CreditCard size={19} />
                </span>
                <ArrowRight
                  size={17}
                  className="text-gray-400 transition group-hover:translate-x-1"
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">
                Process Payment
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Manage guest payments
              </p>
            </Link>

            <Link
              to="/reports"
              className="group min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <FileBarChart size={19} />
                </span>
                <ArrowRight
                  size={17}
                  className="text-gray-400 transition group-hover:translate-x-1"
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">
                View Reports
              </h3>
              <p className="mt-1 text-xs text-gray-500">View booking reports</p>
            </Link>
          </div>
        </section>

        {/* Today's Schedule and Guest Overview */}
        <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <PanelHeader
              title="Today's Schedule"
              subtitle={todayLabel}
              icon={Clock}
            />

            <div className="space-y-3 p-4">
              {schedule.length > 0 ? (
                schedule.map((booking) => {
                  const isCheckout = booking.checkOut === today;

                  return (
                    <div
                      key={booking.id}
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50"
                    >
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          isCheckout
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isCheckout ? (
                          <LogOut size={18} />
                        ) : (
                          <LogIn size={18} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {booking.guest}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {isCheckout ? "Check-out" : "Check-in"} ·{" "}
                          {isCheckout
                            ? formatDate(booking.checkOut)
                            : formatDate(booking.checkIn)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          Room: {booking.room}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${
                          isCheckout
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isCheckout ? "Check-out" : "Check-in"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  message="No scheduled arrivals or departures"
                  description="Today's check-ins and check-outs will appear here."
                />
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <PanelHeader
              title="Guest Overview"
              subtitle="Current guest activity"
              icon={Users}
            />

            <div className="space-y-3 p-4">
              {[
                {
                  label: "Total Bookings",
                  value: bookings.length,
                  color: "text-gray-900",
                },
                {
                  label: "Today's Check-ins",
                  value: todaysCheckIns.length,
                  color: "text-green-700",
                },
                {
                  label: "Today's Check-outs",
                  value:
                    todaysCheckOuts.length + todaysCompletedCheckOuts.length,
                  color: "text-orange-700",
                },
                {
                  label: "Currently Checked In",
                  value: occupiedBookings.length,
                  color: "text-emerald-700",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-4"
                >
                  <span className="min-w-0 break-words text-sm text-gray-600">
                    {item.label}
                  </span>
                  <span
                    className={`shrink-0 text-base font-bold ${item.color}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Bookings */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-4 py-5 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Recent Bookings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Latest resort reservations
              </p>
            </div>

            <Link
              to="/reservations"
              className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-medium text-blue-600 hover:text-blue-700 sm:self-center"
            >
              View All <ArrowRight size={15} />
            </Link>
          </div>

          {recentBookings.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Booking ID",
                      "Guest",
                      "Room",
                      "Check-in",
                      "Check-out",
                      "Amount",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {recentBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-100 transition last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-gray-700">
                        {booking.bookingRef}
                      </td>

                      <td className="max-w-[190px] px-4 py-4">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {booking.guest}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-gray-500">
                          {booking.email || "No email provided"}
                        </p>
                      </td>

                      <td className="max-w-[160px] truncate px-4 py-4 text-xs text-gray-600">
                        {booking.room}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                        {formatDate(booking.checkIn)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                        {formatDate(booking.checkOut)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-gray-900">
                        {formatCurrency(booking.total)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${getStatusStyle(
                            booking.status,
                          )}`}
                        >
                          {booking.status.replace(/-/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              message="No bookings found"
              description="Bookings from your customer database will appear here."
            />
          )}
        </section>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Resort operations overview</span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Dashboard data loaded from Firebase
          </span>
        </div>
      </div>
    </main>
  );
}
