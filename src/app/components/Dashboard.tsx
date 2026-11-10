import { cancelled, collectedBookingAmount, normalizeBookingValue } from "../bookingAvailability";
import { useRecordRevision } from "../useBookingInventory";
import { getLiveBookingSnapshot as getBookingSnapshot, getLivePaymentSnapshot as getPaymentSnapshot } from "../bookingStore";
import {
  TrendingUp,
  CreditCard,
  Wallet,
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
import { Link } from "react-router-dom";
import { addDays, format, parseISO, subDays } from "date-fns";

type BookingStatus =
  | "confirmed"
  | "pending"
  | "pending-payment-verification"
  | "cancelled"
  | "checked-in"
  | "checked-out";

type PaymentStatus = "paid" | "partial" | "unpaid";

type Booking = {
  id: string;
  guest: string;
  email: string;
  room: string;
  category: "Room" | "Service" | "Package";
  subject: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  amountPaid: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  nights: number;
};

type PaymentAlert = {
  id: string;
  guest: string;
  amount: number;
};

export default function Dashboard() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,customer:Payments,admin:Payments",
  );
  const formatPeso = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [rangeEnd, setRangeEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [bookingSnapshot, paymentSnapshot] = await Promise.all([
          getBookingSnapshot(),
          getPaymentSnapshot(),
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

            const kinds = [data.bookingType, data.itemType].map((value) =>
              String(value || "").trim().toLowerCase(),
            );
            const category: Booking["category"] = kinds.includes("package")
              ? "Package"
              : kinds.includes("service") || kinds.includes("activity")
                ? "Service"
                : "Room";
            const subject = category === "Room"
              ? String(data.roomName || data.roomTypeName || data.roomType || "Room assignment pending")
              : category === "Package"
                ? String(data.packageName || data.itemName || "Package booking")
                : String(data.serviceName || data.activityName || data.itemName || "Service booking");

            return {
              id: bookingDoc.id,
              guest: data.customerName || "Unknown Guest",
              email: data.customerEmail || "",
              room: data.roomName || data.roomTypeName || data.roomType || "Room assignment pending",
              category,
              subject,
              checkIn,
              checkOut,
              guests: Number(data.guests || 0),
              total: Number(
                data.totalPrice ??
                  data.totalAmount ??
                  data.total ??
                  Number(data.roomRate || 0) * nights,
              ),
              amountPaid: Number(data.amountPaid ?? data.paid ?? 0),

              status:
                data.status === "confirmed"
                  ? "confirmed"
                  : data.status === "pending-payment-verification"
                    ? "pending-payment-verification"
                  : cancelled(data)
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

        setBookings(bookingData);
        setPendingPayments(paymentSnapshot.docs
          .filter((paymentDoc) => {
            const payment = paymentDoc.data();
            const method = String(payment.method ?? payment.paymentMethod ?? "").toLowerCase();
            const status = normalizeBookingValue(payment.status);
            const verification = normalizeBookingValue(
              payment.verificationStatus ??
                (status === "pending-verification" ? "pending" : "verified"),
            );
            return method.includes("gcash") &&
              ["pending", "pending-verification"].includes(status) &&
              verification === "pending";
          })
          .map((paymentDoc) => {
            const payment = paymentDoc.data();
            return {
              id: paymentDoc.id,
              guest: String(payment.guest ?? payment.customerName ?? "Guest"),
              amount: Number(payment.amount ?? 0),
            };
          }));
        setLoadError(false);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [recordRevision]);

  const paidBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          collectedBookingAmount(booking) > 0,
      ),
    [bookings],
  );

  const getRecognizedRevenue = (booking: Booking) => {
    return collectedBookingAmount(booking);
  };

  const totalRevenue = useMemo(
    () =>
      paidBookings.reduce(
        (sum, booking) => sum + getRecognizedRevenue(booking),
        0,
      ),
    [paidBookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "pending"),
    [bookings],
  );

  const outstandingBalance = useMemo(
    () => bookings.reduce((sum, booking) =>
      cancelled(booking) ? sum : sum + Math.max(0, booking.total - collectedBookingAmount(booking)), 0),
    [bookings],
  );

  const bookingsInRange = useMemo(
    () => bookings.filter((booking) => booking.checkIn >= rangeStart && booking.checkIn <= rangeEnd),
    [bookings, rangeStart, rangeEnd],
  );

  const revenueData = useMemo(() => {
    const data: { date: string; revenue: number; bookings: number }[] = [];
    const paidByDate = new Map<string, Booking[]>();
    for (const booking of paidBookings) {
      if (booking.checkIn < rangeStart || booking.checkIn > rangeEnd) continue;
      const dayBookings = paidByDate.get(booking.checkIn) ?? [];
      dayBookings.push(booking);
      paidByDate.set(booking.checkIn, dayBookings);
    }

    for (let date = parseISO(rangeStart); date <= parseISO(rangeEnd); date = addDays(date, 1)) {
      const dateKey = format(date, "yyyy-MM-dd");
      const dayBookings = paidByDate.get(dateKey) ?? [];

      data.push({
        date: dateKey,
        revenue: dayBookings.reduce(
          (sum, booking) => sum + getRecognizedRevenue(booking),
          0,
        ),
        bookings: dayBookings.length,
      });
    }

    return data;
  }, [paidBookings, rangeStart, rangeEnd]);

  const bookingStatusData = useMemo(
    () => [
      {
        status: "Pending",
        count: bookingsInRange.filter((b) => b.status === "pending").length,
      },
      {
        status: "Payment Review",
        count: bookingsInRange.filter((b) => b.status === "pending-payment-verification").length,
      },
      {
        status: "Confirmed",
        count: bookingsInRange.filter((b) => b.status === "confirmed").length,
      },
      {
        status: "Checked In",
        count: bookingsInRange.filter((b) => b.status === "checked-in").length,
      },
      {
        status: "Checked Out",
        count: bookingsInRange.filter((b) => b.status === "checked-out").length,
      },
      {
        status: "Cancelled",
        count: bookingsInRange.filter((b) => b.status === "cancelled").length,
      },
    ],
    [bookingsInRange],
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

      {loadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Dashboard data could not be loaded. Refresh to try again.
        </p>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-sky-800 to-cyan-600 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <TrendingUp className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/85">Collected Revenue</p>
          <p className="relative break-words text-2xl font-bold sm:text-3xl">
            {formatPeso(totalRevenue)}
          </p>
          <p className="relative mt-2 text-xs text-white/80">
            From accepted payments on non-cancelled bookings
          </p>
        </div>

        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-amber-600 to-yellow-400 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <AlertCircle className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/90">
            Pending Approvals
          </p>
          <p className="relative text-3xl font-bold">
            {pendingBookings.length.toLocaleString()}
          </p>
          <p className="relative mt-2 text-xs text-white/85">
            Waiting for approval
          </p>
        </div>

        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <CreditCard className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/85">Payments to Verify</p>
          <p className="relative text-3xl font-bold">
            {pendingPayments.length.toLocaleString()}
          </p>
          <p className="relative mt-2 text-xs text-white/80">
            GCash submissions awaiting review
          </p>
        </div>

        <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 to-sky-500 p-5 text-white shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10" />
          <div className="relative mb-3 flex items-center justify-between gap-3">
            <Wallet className="size-7 shrink-0 opacity-90" />
          </div>
          <p className="relative mb-1 text-sm text-white/85">Outstanding Balances</p>
          <p className="relative break-words text-2xl font-bold sm:text-3xl">
            {formatPeso(outstandingBalance)}
          </p>
          <p className="relative mt-2 text-xs text-white/80">
            Unpaid amount on non-cancelled bookings
          </p>
        </div>
      </div>

      <section className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={headingClass}>Needs Attention</h2>
          <span className={mutedClass}>Open a record to take action</span>
        </div>
        {pendingBookings.length === 0 && pendingPayments.length === 0 && outstandingBalance === 0 ? (
          <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">No items need attention.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
              <p className="mb-3 font-medium text-foreground">Booking approvals ({pendingBookings.length})</p>
              {pendingBookings.slice(0, 3).map((booking) => (
                <Link key={booking.id} to={`/receptionist/reservations?search=${encodeURIComponent(booking.id)}`} className="mb-2 block rounded-md bg-card p-2 text-sm text-primary hover:underline">
                  {booking.guest} · {booking.category}: {booking.subject}
                </Link>
              ))}
              <Link to="/receptionist/reservations" className="text-sm font-medium text-primary hover:underline">View reservations</Link>
            </div>
            <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-4">
              <p className="mb-3 font-medium text-foreground">Payments to verify ({pendingPayments.length})</p>
              {pendingPayments.slice(0, 3).map((payment) => (
                <Link key={payment.id} to={`/receptionist/payments?verification=${encodeURIComponent(payment.id)}`} className="mb-2 block rounded-md bg-card p-2 text-sm text-primary hover:underline">
                  {payment.guest} · {formatPeso(payment.amount)}
                </Link>
              ))}
              <Link to="/receptionist/payments" className="text-sm font-medium text-primary hover:underline">Review payments</Link>
            </div>
            <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-4">
              <p className="mb-3 font-medium text-foreground">Outstanding balances</p>
              <p className="mb-3 text-xl font-semibold text-foreground">{formatPeso(outstandingBalance)}</p>
              <Link to="/receptionist/payments" className="text-sm font-medium text-primary hover:underline">View balances</Link>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={headingClass}>Booking charts</h2>
          <p className={mutedClass}>Choose check-in dates for both charts.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            From
            <input
              type="date"
              value={rangeStart}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) return;
                setRangeStart(next);
                if (next > rangeEnd) setRangeEnd(next);
              }}
              className="h-10 rounded-lg border border-border bg-card px-3 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            To
            <input
              type="date"
              value={rangeEnd}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) return;
                setRangeEnd(next);
                if (next < rangeStart) setRangeStart(next);
              }}
              className="h-10 rounded-lg border border-border bg-card px-3 text-foreground"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={cardClass}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={headingClass}>Revenue Trend</h2>
              <p className={`${mutedClass} mt-1`}>
                Accepted payments for bookings checking in during the selected dates
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
                  tickFormatter={(value) => format(parseISO(String(value)), "MMM d")}
                  interval="preserveStartEnd"
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
                  labelFormatter={(value) => format(parseISO(String(value)), "MMM d, yyyy")}
                  formatter={(value, name) => [
                    name === "revenue"
                      ? formatPeso(Number(value))
                      : Number(value),
                    name === "revenue" ? "Collected Revenue" : "Bookings with payments",
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

        <section className={cardClass}>
          <div className="mb-5">
            <h2 className={headingClass}>Booking Status</h2>
            <p className={`${mutedClass} mt-1`}>Bookings checking in during the selected dates</p>
          </div>

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

      </div>

    </div>
  );
}
