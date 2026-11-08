import ServiceAvailabilityPanel from "../app/components/ServiceAvailabilityPanel";
import { toCsv, downloadFile, servicePackageRevenue } from "../app/reportData";
import { completedPayment } from "../app/bookingAvailability";
import { useRecordRevision } from "../app/useBookingInventory";
import {
  getLiveBookingSnapshot as getBookingSnapshot,
  getLivePaymentSnapshot as getPaymentSnapshot,
} from "../app/bookingStore";
import { AsyncButton } from "../app/components/ui/async-action";
import { useEffect, useMemo, useState } from "react";
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
  ResponsiveContainer,
} from "recharts";
import { Download, Loader2 } from "lucide-react";

import { collection, getDocs } from "firebase/firestore";
import { customerDb } from "../app/firebase";

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

type Booking = {
  id: string;
  guest: string;
  email: string;
  room: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  bookingType: string;
  itemType: string;
  serviceName: string;
  packageName: string;
  activityName: string;
  itemName: string;
  subtotal: number;
  roomSubtotal: number;
  reservationFee: number;
  addOns: { name: string; type: string; price: number }[];
};

type Payment = {
  id: string;
  bookingId: string;
  guest: string;
  room: string;
  amount: number;
  method: string;
  type: string;
  date: string;
  time: string;
  status: string;
};

const COLORS = [
  "#0d7377",
  "#14b8a6",
  "#06b6d4",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
];

const formatPeso = (value: number) =>
  `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const parseDate = (value: string) => {
  if (!value) return null;

  let date = new Date(`${value}T00:00:00`);

  if (isNaN(date.getTime())) {
    date = new Date(value);
  }

  return isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getWeekStart = (date: Date) => {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
};

const getMonthStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const getYearStart = (date: Date) => new Date(date.getFullYear(), 0, 1);

function RevenueByItemChart({
  title,
  rows,
}: {
  title: string;
  rows: ReturnType<typeof servicePackageRevenue>;
}) {
  return (
    <div
      className="min-w-0 bg-white rounded-xl border p-5"
      style={{ borderColor: "rgba(13,115,119,0.1)" }}
    >
      <h3
        className="font-medium mb-1"
        style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
      >
        {title}
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Collected revenue, excluding reservation fees.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No collected revenue for this period.
        </p>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(230, rows.length * 48)}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(13,115,119,0.08)"
            />
            <XAxis
              type="number"
              tickFormatter={(value) => formatPeso(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border bg-white p-3 text-sm shadow-sm">
                    <p className="font-medium">{payload[0].payload.name}</p>
                    <p>
                      Collected:{" "}
                      {formatPeso(Number(payload[0].payload.collected))}
                    </p>
                    <p>Bookings: {payload[0].payload.bookings}</p>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="collected"
              name="Collected revenue"
              fill="#0d7377"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Reports() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,customer:Payments,admin:Payments",
  );
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadReportData();
  }, [recordRevision]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const [bookingSnapshot, paymentSnapshot] = await Promise.all([
        getBookingSnapshot(),
        getPaymentSnapshot(),
      ]);

      const bookingData: Booking[] = bookingSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          guest: data.customerName ?? data.guest ?? "Unknown Guest",
          email: data.customerEmail ?? data.email ?? "",
          room: data.roomName ?? data.room ?? "",
          roomType:
            data.roomType ??
            data.roomTypeName ??
            data.roomName ??
            data.room ??
            "",
          checkIn: data.checkIn ?? "",
          checkOut: data.checkOut ?? "",
          guests: Number(data.guests ?? data.pax ?? 0),
          total: Number(
            data.totalPrice ??
              data.totalAmount ??
              data.amount ??
              data.total ??
              0,
          ),
          status: data.status ?? "pending",
          paymentStatus: data.paymentStatus ?? "unpaid",
          amountPaid: Number(data.amountPaid ?? data.paid ?? 0),
          bookingType: String(data.bookingType || ""),
          itemType: String(data.itemType || ""),
          serviceName: String(data.serviceName || ""),
          packageName: String(data.packageName || ""),
          activityName: String(data.activityName || ""),
          itemName: String(data.itemName || ""),
          subtotal: Number(data.subtotal ?? NaN),
          roomSubtotal: Number(data.roomSubtotal ?? NaN),
          reservationFee: Number(data.reservationFee || 0),
          addOns: Array.isArray(data.addOns) ? data.addOns : [],
        };
      });

      const paymentData: Payment[] = paymentSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          bookingId: data.bookingId ?? "",
          guest: data.guest ?? data.customerName ?? "",
          room: data.room ?? data.roomName ?? "",
          amount: Number(data.amount ?? 0),
          method: data.method ?? "cash",
          type: data.type ?? "full",
          date: data.createdAt?.toDate?.().toISOString() ?? data.date ?? "",
          time: data.time ?? "",
          status: completedPayment(data) ? "completed" : "pending",
        };
      });

      setBookings(bookingData);
      setPayments(paymentData);
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => {
    const now = new Date();
    return startOfDay(
      new Date(
        selectedYear,
        selectedMonth,
        Math.min(
          now.getDate(),
          new Date(selectedYear, selectedMonth + 1, 0).getDate(),
        ),
      ),
    );
  }, [selectedMonth, selectedYear]);
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([
      selectedYear,
      ...Array.from({ length: 11 }, (_, index) => currentYear - 5 + index),
      ...bookings
        .map((booking) => Number(booking.checkIn.slice(0, 4)))
        .filter(
          (year) => Number.isInteger(year) && year >= 1900 && year <= 2100,
        ),
    ]),
  ).sort((a, b) => b - a);

  const validBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          !["cancelled", "canceled", "rejected"].includes(
            booking.status.toLowerCase(),
          ),
      ),
    [bookings],
  );

  const periodBookings = useMemo(() => {
    if (period === "daily") {
      return validBookings.filter((booking) => {
        const date = parseDate(booking.checkIn);
        return date ? isSameDay(date, today) : false;
      });
    }

    if (period === "weekly") {
      const weekStart = getWeekStart(today);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      return validBookings.filter((booking) => {
        const date = parseDate(booking.checkIn);

        if (!date) return false;

        return date >= weekStart && date < weekEnd;
      });
    }

    if (period === "yearly") {
      const yearStart = getYearStart(today);
      const nextYear = new Date(today.getFullYear() + 1, 0, 1);

      return validBookings.filter((booking) => {
        const date = parseDate(booking.checkIn);

        if (!date) return false;

        return date >= yearStart && date < nextYear;
      });
    }

    const monthStart = getMonthStart(today);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return validBookings.filter((booking) => {
      const date = parseDate(booking.checkIn);

      if (!date) return false;

      return date >= monthStart && date < nextMonth;
    });
  }, [period, validBookings, today]);

  const collected = (booking: Booking) =>
    Math.max(0, Math.min(booking.total, booking.amountPaid));
  const roomCollected = (booking: Booking) => {
    const addOns = booking.addOns.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0,
    );
    const recorded = Number.isFinite(booking.roomSubtotal)
      ? booking.roomSubtotal
      : booking.total - addOns - booking.reservationFee;
    return booking.total > 0
      ? Math.round(
          (Math.max(0, recorded) / booking.total) * collected(booking) * 100,
        ) / 100
      : 0;
  };

  const totalRevenue = useMemo(
    () => periodBookings.reduce((sum, booking) => sum + collected(booking), 0),
    [periodBookings],
  );

  const totalBookings = periodBookings.length;

  const averageRevenue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  const roomTypeData = useMemo(() => {
    const map = new Map<string, number>();

    periodBookings
      .filter(
        (booking) =>
          !["service", "activity", "package"].includes(
            (booking.bookingType || booking.itemType).toLowerCase(),
          ),
      )
      .forEach((booking) => {
        const type = booking.roomType?.trim() || "Unknown";

        map.set(type, (map.get(type) || 0) + roomCollected(booking));
      });

    const total = [...map.values()].reduce((sum, amount) => sum + amount, 0);

    return Array.from(map.entries())
      .filter(([, value]) => value > 0)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodBookings]);

  const paymentMethodData = useMemo(() => {
    const map = new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

    payments.forEach((payment) => {
      if (payment.status !== "completed") return;
      const date = parseDate(payment.date);
      if (!date) return;
      if (period === "daily" && !isSameDay(date, today)) return;
      if (
        period === "weekly" &&
        (date < getWeekStart(today) ||
          date >= new Date(getWeekStart(today).getTime() + 7 * 86400000))
      )
        return;
      if (
        period === "monthly" &&
        (date.getFullYear() !== today.getFullYear() ||
          date.getMonth() !== today.getMonth())
      )
        return;
      if (period === "yearly" && date.getFullYear() !== today.getFullYear())
        return;
      const method = payment.method?.toLowerCase() || "unknown";

      const current = map.get(method) || {
        amount: 0,
        count: 0,
      };

      current.amount += Number(payment.amount || 0);
      current.count += 1;

      map.set(method, current);
    });

    return Array.from(map.entries())
      .map(([method, data]) => ({
        method:
          method === "gcash"
            ? "GCash"
            : method.charAt(0).toUpperCase() + method.slice(1),
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [payments, period, today]);

  const topGuests = useMemo(() => {
    const map = new Map<
      string,
      {
        visits: number;
        spent: number;
      }
    >();

    periodBookings.forEach((booking) => {
      const name = booking.guest?.trim() || "Unknown Guest";

      const current = map.get(name) || {
        visits: 0,
        spent: 0,
      };

      current.visits += 1;
      current.spent += collected(booking);

      map.set(name, current);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        visits: data.visits,
        spent: data.spent,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [periodBookings]);

  const monthlyRevenue = useMemo(() => {
    const now = today;

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

      const month = date.getMonth();
      const year = date.getFullYear();

      const monthBookings = validBookings.filter((booking) => {
        const checkIn = parseDate(booking.checkIn);

        if (!checkIn) return false;

        return checkIn.getMonth() === month && checkIn.getFullYear() === year;
      });

      return {
        month: date.toLocaleDateString("en-US", {
          month: "short",
        }),

        revenue: monthBookings.reduce(
          (sum, booking) => sum + collected(booking),
          0,
        ),

        bookings: monthBookings.length,
      };
    });
  }, [validBookings, today]);

  const itemRevenue = useMemo(
    () => servicePackageRevenue(periodBookings),
    [periodBookings],
  );

  const exportReport = () => {
    const rows = [
      [
        "Resort Report",
        `${period} ${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`,
      ],
      ["Collected revenue", totalRevenue],
      ["Bookings", totalBookings],
      [],
      ["Type", "Service / Package", "Bookings", "Collected revenue"],
      ...itemRevenue.map((item) => [
        item.type,
        item.name,
        item.bookings,
        item.collected,
      ]),
      [],
      ["Payment method", "Collections", "Transactions"],
      ...paymentMethodData.map((item) => [
        item.method,
        item.amount,
        item.count,
      ]),
      [],
      [
        "Guest",
        "Room",
        "Arrival",
        "Departure",
        "Booking value",
        "Paid",
        "Status",
      ],
      ...periodBookings.map((item) => [
        item.guest,
        item.room,
        item.checkIn,
        item.checkOut,
        item.total,
        item.amountPaid,
        item.status,
      ]),
    ];
    downloadFile(
      toCsv(rows),
      "resort-report-" +
        period +
        "-" +
        selectedYear +
        "-" +
        String(selectedMonth + 1).padStart(2, "0") +
        ".csv",
    );

    setSuccess("Report exported successfully.");

    setTimeout(() => setSuccess(""), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading report data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
          {success}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly", "yearly"] as ReportPeriod[]).map(
            (p) => (
              <AsyncButton
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-2 rounded-lg text-sm capitalize border transition-all"
                style={{
                  background: period === p ? "#0d7377" : "white",
                  color: period === p ? "white" : "#4a7a7a",
                  borderColor:
                    period === p ? "#0d7377" : "rgba(13,115,119,0.2)",
                }}
              >
                {p}
              </AsyncButton>
            ),
          )}
        </div>

        <div className="flex gap-2">
          <select
            aria-label="Report month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "rgba(13,115,119,0.2)" }}
          >
            {Array.from({ length: 12 }, (_, month) => (
              <option key={month} value={month}>
                {new Date(2000, month, 1).toLocaleString("en-US", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
          <select
            aria-label="Report year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "rgba(13,115,119,0.2)" }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <AsyncButton
          onClick={exportReport}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
          style={{
            borderColor: "rgba(13,115,119,0.2)",
            color: "#0d7377",
          }}
        >
          <Download className="w-4 h-4" />
          Export Report
        </AsyncButton>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#0d7377",
              fontFamily: "Georgia, serif",
            }}
          >
            {formatPeso(totalRevenue)}
          </p>

          <p
            className="text-xs"
            style={{
              color: "#4a7a7a",
            }}
          >
            Booking Value
          </p>
        </div>

        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#14b8a6",
              fontFamily: "Georgia, serif",
            }}
          >
            {totalBookings}
          </p>

          <p
            className="text-xs"
            style={{
              color: "#4a7a7a",
            }}
          >
            Total Bookings
          </p>
        </div>

        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#f97316",
              fontFamily: "Georgia, serif",
            }}
          >
            {formatPeso(averageRevenue)}
          </p>

          <p
            className="text-xs"
            style={{
              color: "#4a7a7a",
            }}
          >
            Avg. Revenue / Booking
          </p>
        </div>
      </div>

      {/* Revenue + Room Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-5"
            style={{
              color: "#0a2e2e",
              fontFamily: "Georgia, serif",
            }}
          >
            Revenue & Bookings
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyRevenue} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(13,115,119,0.08)"
              />

              <XAxis dataKey="month" />

              <YAxis
                yAxisId="left"
                tickFormatter={(value) =>
                  `₱${(Number(value) / 1000).toFixed(0)}K`
                }
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
              />

              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "Revenue"
                    ? formatPeso(Number(value))
                    : Number(value),
                  name === "Revenue" ? "Collected revenue" : "Bookings",
                ]}
              />

              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#0d7377"
                name="Revenue"
              />

              <Bar
                yAxisId="right"
                dataKey="bookings"
                fill="#14b8a6"
                name="Bookings"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-5"
            style={{
              color: "#0a2e2e",
              fontFamily: "Georgia, serif",
            }}
          >
            Revenue by Room Type
          </h3>

          {roomTypeData.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No room type data found.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={roomTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {roomTypeData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: number) => [
                      formatPeso(Number(value)),
                      "Collected revenue",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2">
                {roomTypeData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: COLORS[index % COLORS.length],
                      }}
                    />

                    <span
                      className="flex-1"
                      style={{
                        color: "#4a7a7a",
                      }}
                    >
                      {item.name}
                    </span>

                    <span
                      style={{
                        color: "#0a2e2e",
                      }}
                    >
                      {formatPeso(item.value)} · {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueByItemChart
          title="Services Revenue"
          rows={itemRevenue.filter((item) => item.type === "Service")}
        />
        <RevenueByItemChart
          title="Packages Revenue"
          rows={itemRevenue.filter((item) => item.type === "Package")}
        />
      </div>

      {/* Payments + Top Guests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments */}
        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-4"
            style={{
              color: "#0a2e2e",
              fontFamily: "Georgia, serif",
            }}
          >
            Payment Methods
          </h3>

          {paymentMethodData.length === 0 ? (
            <p className="text-sm text-gray-500">No payment records found.</p>
          ) : (
            <div className="space-y-4">
              {paymentMethodData.map((payment) => {
                const total = paymentMethodData.reduce(
                  (sum, item) => sum + item.amount,
                  0,
                );

                const percentage =
                  total > 0 ? Math.round((payment.amount / total) * 100) : 0;

                return (
                  <div key={payment.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span
                        style={{
                          color: "#0a2e2e",
                        }}
                      >
                        {payment.method}
                      </span>

                      <span
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
                        {formatPeso(payment.amount)} ({payment.count} txns)
                      </span>
                    </div>

                    <div
                      className="h-2 rounded-full"
                      style={{
                        background: "#e2f3f2",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          background: "#0d7377",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Guests */}
        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-4"
            style={{
              color: "#0a2e2e",
              fontFamily: "Georgia, serif",
            }}
          >
            Top Guests
          </h3>

          {topGuests.length === 0 ? (
            <p className="text-sm text-gray-500">No guest records found.</p>
          ) : (
            <div className="space-y-3">
              {topGuests.map((guest, index) => (
                <div key={guest.name} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full text-xs flex items-center justify-center"
                    style={{
                      background: index === 0 ? "#f97316" : "#e2f3f2",
                      color: index === 0 ? "#fff" : "#0d7377",
                    }}
                  >
                    {index + 1}
                  </span>

                  <div className="flex-1">
                    <p
                      className="text-sm"
                      style={{
                        color: "#0a2e2e",
                      }}
                    >
                      {guest.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {guest.visits} {guest.visits === 1 ? "visit" : "visits"}
                    </p>
                  </div>

                  <span
                    className="text-sm font-medium"
                    style={{
                      color: "#0d7377",
                    }}
                  >
                    {formatPeso(guest.spent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ServiceAvailabilityPanel exportable />
    </div>
  );
}
