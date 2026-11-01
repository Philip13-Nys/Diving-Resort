import { useRecordRevision } from "../useBookingInventory";
import { getLiveBookingSnapshot as getBookingSnapshot } from "../bookingStore";
import {
  TrendingUp,
  Calendar,
  Waves,
  AlertCircle,
  CheckCircle,
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
  amountPaid: number;
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
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,admin:Staff",
  );
  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const [bookingSnapshot, staffSnapshot] = await Promise.all([
          getBookingSnapshot(),
          getDocs(collection(db, "Staff")),
        ]);

        const bookingData: Booking[] = bookingSnapshot.docs.map(
          (bookingDoc) => {
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

            const paymentStatus: PaymentStatus =
              data.paymentStatus === "paid"
                ? "paid"
                : data.paymentStatus === "partial"
                  ? "partial"
                  : "unpaid";

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
              amountPaid: Number(data.amountPaid ?? 0),

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

              paymentStatus,
              nights,
            };
          },
        );

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

    loadDashboardData();
  }, [recordRevision]);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayKey = useMemo(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [today]);

  const getDate = (value: string) => {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    return isNaN(date.getTime()) ? null : date;
  };

  const isToday = (value: string) => {
    return value === todayKey;
  };

  const paidBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.paymentStatus === "paid" && booking.status !== "cancelled",
      ),
    [bookings],
  );

  const getRecognizedRevenue = (booking: Booking) => {
    return booking.amountPaid > 0
      ? Math.min(booking.amountPaid, booking.total)
      : booking.total;
  };

  const totalRevenue = useMemo(
    () =>
      paidBookings.reduce(
        (sum, booking) => sum + getRecognizedRevenue(booking),
        0,
      ),
    [paidBookings],
  );

  const bookingsToday = useMemo(
    () =>
      bookings.filter(
        (booking) => isToday(booking.checkIn) && booking.status !== "cancelled",
      ),
    [bookings, todayKey],
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
    [bookings, todayKey],
  );

  const revenueData = useMemo(() => {
    const data: { date: string; revenue: number; bookings: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      const dayBookings = paidBookings.filter(
        (booking) => booking.checkIn === dateKey,
      );

      data.push({
        date: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        revenue: dayBookings.reduce(
          (sum, booking) => sum + getRecognizedRevenue(booking),
          0,
        ),
        bookings: dayBookings.length,
      });
    }

    return data;
  }, [paidBookings, today]);

  const bookingStatusData = useMemo(
    () => [
      {
        status: "Pending",
        count: bookings.filter((b) => b.status === "pending").length,
      },
      {
        status: "Confirmed",
        count: bookings.filter((b) => b.status === "confirmed").length,
      },
      {
        status: "Checked In",
        count: bookings.filter((b) => b.status === "checked-in").length,
      },
      {
        status: "Checked Out",
        count: bookings.filter((b) => b.status === "checked-out").length,
      },
      {
        status: "Cancelled",
        count: bookings.filter((b) => b.status === "cancelled").length,
      },
    ],
    [bookings],
  );

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .filter((booking) => booking.status !== "cancelled")
        .sort(
          (a, b) =>
            (getDate(b.checkIn)?.getTime() || 0) -
            (getDate(a.checkIn)?.getTime() || 0),
        )
        .slice(0, 5),
    [bookings],
  );

  const upcomingBookings = useMemo(
    () =>
      [...bookings]
        .filter((booking) => {
          const date = getDate(booking.checkIn);

          return (
            date &&
            date.getTime() >= today.getTime() &&
            booking.status !== "cancelled" &&
            booking.status !== "checked-out"
          );
        })
        .sort(
          (a, b) =>
            (getDate(a.checkIn)?.getTime() || 0) -
            (getDate(b.checkIn)?.getTime() || 0),
        )
        .slice(0, 5),
    [bookings, today],
  );

  const activeStaff = useMemo(
    () =>
      staff.filter((member) => member.status.trim().toLowerCase() === "active")
        .length,
    [staff],
  );

  const cardClass =
    "rounded-xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-sm min-w-0";

  const headingClass = "text-lg font-semibold text-foreground";
  const mutedClass = "text-sm text-muted-foreground";

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard Overview
        </h1>
        <p className={`${mutedClass} mt-1`}>
          Welcome back! Here's what's happening with your resort today.
        </p>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Total Revenue */}
        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-sky-800 to-cyan-600 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <TrendingUp className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/85">Total Revenue</p>
          <p className="relative break-words text-2xl font-bold sm:text-3xl">
            {formatPeso(totalRevenue)}
          </p>
          <p className="relative mt-2 text-xs text-white/80">
            From fully paid, non-cancelled bookings
          </p>
        </div>

        {/* Pending Bookings */}
        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-amber-600 to-yellow-400 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <Waves className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/90">
            Pending Bookings
          </p>
          <p className="relative text-3xl font-bold">
            {pendingBookings.length.toLocaleString()}
          </p>
          <p className="relative mt-2 text-xs text-white/85">
            Waiting for approval
          </p>
        </div>

        {/* Today's Booking */}
        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <Calendar className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/85">Today's Booking</p>
          <p className="relative text-3xl font-bold">
            {bookingsToday.length.toLocaleString()}
          </p>
          <p className="relative mt-2 text-xs text-white/80">
            Non-cancelled bookings checking in today
          </p>
        </div>
      </div>

      {/* Revenue Trend and Alerts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className={`${cardClass} xl:col-span-2`}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={headingClass}>Revenue Trend</h2>
              <p className={`${mutedClass} mt-1`}>
                Paid bookings by check-in date · Last 7 days
              </p>
            </div>
            <TrendingUp className="size-5 text-primary" />
          </div>

          <div className="h-[280px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueData}
                margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) =>
                    `₱${Number(value).toLocaleString("en-PH")}`
                  }
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={75}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue"
                      ? formatPeso(Number(value))
                      : Number(value),
                    name === "revenue" ? "Paid Revenue" : "Paid Bookings",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  name="revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Alerts and Upcoming Check-ins */}
        <section className={cardClass}>
          <h2 className={`${headingClass} mb-4`}>Current Alerts</h2>

          <div className="space-y-3">
            {pendingBookings.length > 0 && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <p className="text-sm text-foreground">
                    {pendingBookings.length} booking
                    {pendingBookings.length !== 1 ? "s are" : " is"} waiting for
                    approval.
                  </p>
                </div>
              </div>
            )}

            {bookingsToday.length > 0 && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-sky-500" />
                  <p className="text-sm text-foreground">
                    {bookingsToday.length} check-in
                    {bookingsToday.length !== 1 ? "s" : ""} scheduled today.
                  </p>
                </div>
              </div>
            )}

            {completedToday.length > 0 && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <p className="text-sm text-foreground">
                    {completedToday.length} booking
                    {completedToday.length !== 1 ? "s" : ""} completed today.
                  </p>
                </div>
              </div>
            )}

            {pendingBookings.length === 0 &&
              bookingsToday.length === 0 &&
              completedToday.length === 0 && (
                <div className="rounded-lg bg-muted/50 p-5 text-center">
                  <CheckCircle className="mx-auto mb-2 size-6 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">
                    No current alerts.
                  </p>
                </div>
              )}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="mb-3 font-semibold text-foreground">
              Upcoming Check-ins
            </h3>

            <div className="space-y-2">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/40 p-2.5"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {booking.guest.charAt(0).toUpperCase() || "G"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {booking.guest}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {booking.room} · {booking.checkIn}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {booking.guests} guest{booking.guests === 1 ? "" : "s"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No upcoming check-ins.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Booking Status and Recent Bookings */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={cardClass}>
          <h2 className={`${headingClass} mb-5`}>Booking Status</h2>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bookingStatusData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="status"
                  type="category"
                  width={90}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#0d9488"
                  name="Bookings"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className={`${headingClass} mb-5`}>Recent Bookings</h2>

          <div className="space-y-1">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start gap-3 border-b border-border py-3 last:border-0"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    {booking.status === "checked-out" ? (
                      <CheckCircle className="size-5 text-emerald-500" />
                    ) : (
                      <Calendar className="size-5 text-primary" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {booking.guest}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      Room: {booking.room}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs capitalize text-muted-foreground">
                        {booking.status}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span
                        className={`text-xs font-medium ${
                          booking.paymentStatus === "paid"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {booking.paymentStatus === "paid"
                          ? "Paid"
                          : booking.paymentStatus === "partial"
                            ? "Partially paid"
                            : "Unpaid"}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-medium text-foreground">
                        {formatPeso(booking.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No bookings found.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Summary: Active Staff card removed */}
    </div>
  );
}
