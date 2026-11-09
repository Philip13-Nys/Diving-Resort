import { exportWorkbook, servicePackageRevenue } from "../reportData";
import { completedPayment, cancelled, displayRecordId } from "../bookingAvailability";
import { useRecordRevision } from "../useBookingInventory";
import {
  getLiveBookingSnapshot as getBookingSnapshot,
  getLivePaymentSnapshot as getPaymentSnapshot,
} from "../bookingStore";
import { AsyncButton, AsyncForm } from "./ui/async-action";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  X,
  Check,
  Download,
  FileText,
  Loader2,
} from "lucide-react";

import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Booking = {
  id: string;
  guest: string;
  room: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
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
  status: string;
  paymentStatus: string;
  paymentMethod: string;
};

const COLORS = ["#1d4ed8", "#0284c7", "#3b82f6", "#60a5fa", "#93c5fd"];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();

const formatPeso = (value: number) =>
  `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SalesReports() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,customer:Payments,admin:Payments",
  );
  const [receipts, setReceipts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [showReportModal, setShowReportModal] = useState(false);

  const [reportPeriod, setReportPeriod] = useState<
    "monthly" | "quarterly" | "annual"
  >("monthly");

  const [reportMonth, setReportMonth] = useState(new Date().getMonth());

  const [reportYear, setReportYear] = useState(currentYear);

  const [generating, setGenerating] = useState(false);

  const [reportReady, setReportReady] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadBookings();
  }, [recordRevision]);

  const loadBookings = async () => {
    try {
      setLoading(true);

      const [snapshot, paymentSnapshot] = await Promise.all([
        getBookingSnapshot(),
        getPaymentSnapshot(),
      ]);
      setReceipts(paymentSnapshot.docs.map((doc) => doc.data()));

      const data: Booking[] = snapshot.docs.map((bookingDoc) => {
        const value = bookingDoc.data();

        return {
          id: bookingDoc.id,

          guest: value.customerName || "Unknown Guest",

          room: value.roomName || "Unknown Room",
          roomType: value.roomTypeName || value.roomType || value.roomName || "",

          checkIn: value.checkIn || "",

          checkOut: value.checkOut || "",

          guests: Number(value.guests || 0),

          total: Number(
            value.totalPrice ?? value.totalAmount ?? value.total ?? 0,
          ),
          amountPaid: Number(value.amountPaid ?? value.paid ?? 0),
          bookingType: String(value.bookingType || ""),
          itemType: String(value.itemType || ""),
          serviceName: String(value.serviceName || ""),
          packageName: String(value.packageName || ""),
          activityName: String(value.activityName || ""),
          itemName: String(value.itemName || ""),
          subtotal: Number(value.subtotal ?? NaN),
          roomSubtotal: Number(value.roomSubtotal ?? NaN),
          reservationFee: Number(value.reservationFee || 0),
          addOns: Array.isArray(value.addOns) ? value.addOns : [],

          status: value.status || "pending",

          paymentStatus: value.paymentStatus || "unpaid",

          paymentMethod:
            value.paymentMethod || value.paymentType || "Not specified",
        };
      });

      setBookings(data);
    } catch (error) {
      console.error("Error loading sales report:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDate = (value: string) => {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    return isNaN(date.getTime()) ? null : date;
  };

  const validBookings = useMemo(() => {
    return bookings.filter((booking) => !cancelled(booking));
  }, [bookings]);

  const reportBookings = useMemo(() => {
    return validBookings.filter((booking) => {
      const date = getDate(booking.checkIn);

      if (!date) return false;

      const year = date.getFullYear();

      const month = date.getMonth();

      if (reportPeriod === "annual") {
        return year === reportYear;
      }

      if (reportPeriod === "quarterly") {
        const selectedQuarter = Math.floor(reportMonth / 3);

        const bookingQuarter = Math.floor(month / 3);

        return year === reportYear && bookingQuarter === selectedQuarter;
      }

      return year === reportYear && month === reportMonth;
    });
  }, [validBookings, reportPeriod, reportMonth, reportYear]);

  const reportPayments = receipts.filter((receipt) => {
    if (!completedPayment(receipt)) return false;
    const date = receipt.createdAt?.toDate?.() || new Date(receipt.date || "");
    if (!Number.isFinite(date.getTime()) || date.getFullYear() !== reportYear)
      return false;
    return (
      reportPeriod === "annual" ||
      (reportPeriod === "quarterly"
        ? Math.floor(date.getMonth() / 3) === Math.floor(reportMonth / 3)
        : date.getMonth() === reportMonth)
    );
  });
  const collected = (booking: Booking) =>
    Math.max(0, Math.min(booking.total, booking.amountPaid));
  const totalRevenue = reportBookings.reduce(
    (sum, booking) => sum + collected(booking),
    0,
  );
  const averageRevenue = reportBookings.length
    ? totalRevenue / reportBookings.length
    : 0;
  const paymentTotal =
    reportPayments.reduce(
      (sum, receipt) => sum + Math.round(Number(receipt.amount || 0) * 100),
      0,
    ) / 100;

  const revenueData = useMemo(() => {
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(reportYear, reportMonth, 1);

      date.setMonth(date.getMonth() - i);

      const month = date.getMonth();

      const year = date.getFullYear();

      const monthBookings = validBookings.filter((booking) => {
        const bookingDate = getDate(booking.checkIn);

        if (!bookingDate) return false;

        return (
          bookingDate.getMonth() === month && bookingDate.getFullYear() === year
        );
      });

      const revenue = monthBookings.reduce(
        (sum, booking) => sum + collected(booking),
        0,
      );

      result.push({
        month: date.toLocaleDateString(undefined, {
          month: "short",
        }),

        revenue,
        bookings: monthBookings.length,
      });
    }

    return result;
  }, [validBookings, reportMonth, reportYear]);

  const revenueByCategory = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const booking of reportBookings) {
      const kinds = [booking.bookingType, booking.itemType].map((value) => value.toLowerCase());
      if (kinds.some((kind) => ["service", "activity", "package"].includes(kind))) continue;
      const addOns = booking.addOns.reduce((sum, item) => sum + Number(item.price || 0), 0);
      const roomSubtotal = Number.isFinite(booking.roomSubtotal)
        ? booking.roomSubtotal
        : booking.total - addOns - booking.reservationFee;
      const amount = booking.total > 0
        ? Math.round(Math.max(0, roomSubtotal) / booking.total * collected(booking) * 100) / 100
        : 0;
      const type = booking.roomType.trim() || "Unknown room type";
      amounts.set(type, (amounts.get(type) || 0) + amount);
    }
    const total = [...amounts.values()].reduce((sum, value) => sum + value, 0);
    return [...amounts].filter(([, value]) => value > 0).map(([name, value], id) => ({
      id,
      name,
      value,
      percentage: total ? value / total * 100 : 0,
    })).sort((a, b) => b.value - a.value);
  }, [reportBookings]);

  const itemRevenue = useMemo(() => servicePackageRevenue(reportBookings), [reportBookings]);

  const reportYears = [...new Set([
    reportYear,
    ...Array.from({ length: 11 }, (_, index) => currentYear - 5 + index),
    ...bookings.map((booking) => Number(booking.checkIn.slice(0, 4)))
      .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 2100),
  ])].sort((a, b) => b - a);

  const paymentMethods = Object.values(
    reportPayments.reduce((map: Record<string, any>, receipt) => {
      const method = String(
        receipt.method || receipt.paymentMethod || "Unspecified",
      ).trim().toLowerCase();
      const row = (map[method] ||= { method, amount: 0, transactions: 0 });
      row.amount =
        (Math.round(row.amount * 100) +
          Math.round(Number(receipt.amount || 0) * 100)) /
        100;
      row.transactions++;
      return map;
    }, {}),
  ).map((row: any) => ({
    ...row,
    method: row.method === "gcash"
      ? "GCash"
      : row.method.charAt(0).toUpperCase() + row.method.slice(1),
    percentage: paymentTotal ? (row.amount / paymentTotal) * 100 : 0,
  }));

  const reportLabel =
    reportPeriod === "monthly"
      ? `${months[reportMonth]} ${reportYear}`
      : reportPeriod === "quarterly"
        ? `Q${Math.floor(reportMonth / 3) + 1} ${reportYear}`
        : `Annual ${reportYear}`;

  const openReportModal = () => {
    setReportReady(false);
    setShowReportModal(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    setGenerating(true);

    await loadBookings();

    setGenerating(false);
    setReportReady(true);
  };

  const downloadExcel = (name: string) => exportWorkbook(name, [
    { name: "Summary", rows: [
      ["Collections", "Bookings", "Average revenue per booking"],
      [totalRevenue, reportBookings.length, averageRevenue],
    ] },
    { name: "Services", rows: [
      ["Service", "Bookings", "Collected revenue"],
      ...itemRevenue.filter((row) => row.type === "Service").map((row) => [row.name, row.bookings, row.collected]),
    ] },
    { name: "Packages", rows: [
      ["Package", "Bookings", "Collected revenue"],
      ...itemRevenue.filter((row) => row.type === "Package").map((row) => [row.name, row.bookings, row.collected]),
    ] },
    { name: "Payment Methods", rows: [
      ["Payment method", "Collected", "Transactions"],
      ...paymentMethods.map((row) => [row.method, row.amount, row.transactions]),
    ] },
    { name: "Bookings", rows: [
      ["Booking", "Guest", "Room / Item", "Arrival", "Departure", "Booking value", "Collected", "Status"],
      ...reportBookings.map((booking) => [
        displayRecordId(booking.id),
        booking.guest,
        [booking.bookingType, booking.itemType].some((kind) => ["service", "activity", "package"].includes(kind.toLowerCase()))
          ? booking.packageName || booking.serviceName || booking.activityName || booking.itemName || "Service / package"
          : booking.room,
        booking.checkIn,
        booking.checkOut,
        booking.total,
        collected(booking),
        booking.status,
      ]),
    ] },
  ], reportLabel);

  const handleDownloadReport = () => {
    downloadExcel(`Financial Report ${reportLabel}`);

    setShowReportModal(false);

    setSuccessMsg(
      `Financial report for ${reportLabel} downloaded successfully.`,
    );

    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleExportData = () => {
    downloadExcel(`Sales Financial Data ${reportLabel}`);

    setSuccessMsg("Financial data exported to Excel.");

    setTimeout(() => setSuccessMsg(""), 3500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          Loading financial data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <Check className="size-5 text-green-600" />

          {successMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Sales and Financial Reports
        </h1>

        <p className="text-gray-600 mt-1">
          Monitor revenue, sales performance, and financial records from your
          database.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {(["monthly", "quarterly", "annual"] as const).map((period) => (
            <AsyncButton
              key={period}
              type="button"
              onClick={() => setReportPeriod(period)}
              className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
                reportPeriod === period
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {period}
            </AsyncButton>
          ))}
        </div>
        {reportPeriod !== "annual" && (
          <select
            aria-label={reportPeriod === "quarterly" ? "Report quarter" : "Report month"}
            value={reportPeriod === "quarterly" ? Math.floor(reportMonth / 3) : reportMonth}
            onChange={(event) => setReportMonth(reportPeriod === "quarterly" ? Number(event.target.value) * 3 : Number(event.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {reportPeriod === "quarterly"
              ? [0, 1, 2, 3].map((quarter) => <option key={quarter} value={quarter}>Q{quarter + 1}</option>)
              : months.map((month, index) => <option key={month} value={index}>{month}</option>)}
          </select>
        )}
        <select
          aria-label="Report year"
          value={reportYear}
          onChange={(event) => setReportYear(Number(event.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {reportYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <AsyncButton onClick={openReportModal} className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
            Generate Financial Report
          </AsyncButton>
          <AsyncButton onClick={handleExportData} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-blue-700 hover:bg-gray-50">
            <Download className="size-4" /> Export Data
          </AsyncButton>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Collected Revenue", value: formatPeso(totalRevenue), color: "#1d4ed8" },
          { label: "Total Bookings", value: String(reportBookings.length), color: "#0284c7" },
          { label: "Avg. Revenue / Booking", value: formatPeso(averageRevenue), color: "#2563eb" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-1 text-3xl" style={{ color: stat.color, fontFamily: "Georgia, serif" }}>{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue & Bookings
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,99,235,0.10)" />

              <XAxis dataKey="month" />

              <YAxis
                yAxisId="revenue"
                tickFormatter={(value) =>
                  `₱${(Number(value) / 1000).toFixed(0)}K`
                }
              />
              <YAxis yAxisId="bookings" orientation="right" allowDecimals={false} />

              <Tooltip
                formatter={(value: number, name: string) => [name === "Revenue" ? formatPeso(Number(value)) : Number(value), name === "Revenue" ? "Collected revenue" : "Bookings"]}
              />
              <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="#1d4ed8" />
              <Bar yAxisId="bookings" dataKey="bookings" name="Bookings" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Room Type
          </h3>

          {revenueByCategory.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height={180}>
              <RePieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value: number) => formatPeso(Number(value))}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              {revenueByCategory.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2 text-xs">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-gray-600">{category.name}</span>
                  <span className="text-gray-900">{formatPeso(category.value)} · {category.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
              No collected room revenue for this period.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(["Service", "Package"] as const).map((type) => {
          const rows = itemRevenue.filter((item) => item.type === type);
          return (
            <div key={type} className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-1 font-medium text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{type}s Revenue</h3>
              <p className="mb-4 text-xs text-gray-500">Collected revenue, excluding reservation fees.</p>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-500">No collected revenue for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(230, rows.length * 48)}>
                  <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(37,99,235,0.10)" />
                    <XAxis type="number" tickFormatter={(value) => formatPeso(Number(value))} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="rounded-lg border bg-white p-3 text-sm shadow-sm">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p>Collected: {formatPeso(Number(payload[0].payload.collected))}</p>
                        <p>Bookings: {payload[0].payload.bookings}</p>
                      </div>
                    ) : null} />
                    <Bar dataKey="collected" name="Collected revenue" fill={type === "Service" ? "#1d4ed8" : "#0284c7"} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Distribution */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Payment Method Distribution
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Completed payment receipts for the selected period.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Method
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Percentage
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Transactions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {paymentMethods.map((method) => (
                <tr key={method.method} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="size-5 text-gray-400" />

                      <span className="font-medium text-gray-900">
                        {method.method}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {formatPeso(method.amount)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${method.percentage}%`,
                          }}
                        />
                      </div>

                      <span className="text-sm text-gray-600">
                        {method.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {method.transactions}
                  </td>
                </tr>
              ))}

              {paymentMethods.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Financial Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Generate Financial Report
              </h2>

              <AsyncButton
                onClick={() => setShowReportModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="size-5" />
              </AsyncButton>
            </div>

            <div className="p-6">
              {!reportReady ? (
                <AsyncForm onSubmit={handleGenerate} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Configure the reporting period. The report uses your actual
                    Firebase booking records.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Type
                    </label>

                    <div className="flex gap-2">
                      {(["monthly", "quarterly", "annual"] as const).map(
                        (type) => (
                          <AsyncButton
                            key={type}
                            type="button"
                            onClick={() => setReportPeriod(type)}
                            className={`flex-1 py-2 text-sm rounded-lg border capitalize ${
                              reportPeriod === type
                                ? "bg-blue-700 text-white border-blue-700"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {type}
                          </AsyncButton>
                        ),
                      )}
                    </div>
                  </div>

                  {reportPeriod === "monthly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Month
                        </label>

                        <select
                          value={reportMonth}
                          onChange={(e) =>
                            setReportMonth(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          {months.map((month, index) => (
                            <option key={month} value={index}>
                              {month}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Year
                        </label>

                        <select
                          value={reportYear}
                          onChange={(e) =>
                            setReportYear(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          {reportYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {reportPeriod === "quarterly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quarter
                        </label>

                        <select
                          value={Math.floor(reportMonth / 3) + 1}
                          onChange={(e) =>
                            setReportMonth((Number(e.target.value) - 1) * 3)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value={1}>Q1 (Jan–Mar)</option>

                          <option value={2}>Q2 (Apr–Jun)</option>

                          <option value={3}>Q3 (Jul–Sep)</option>

                          <option value={4}>Q4 (Oct–Dec)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Year
                        </label>

                        <select
                          value={reportYear}
                          onChange={(e) =>
                            setReportYear(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          {reportYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {reportPeriod === "annual" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>

                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {reportYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <AsyncButton
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                    >
                      Cancel
                    </AsyncButton>

                    <AsyncButton
                      type="submit"
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-60"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="size-4" />
                          Generate Report
                        </>
                      )}
                    </AsyncButton>
                  </div>
                </AsyncForm>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                    <Check className="size-5 text-green-600" />

                    <span>Financial report is ready.</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Report Period</span>

                      <span className="font-medium">{reportLabel}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Collected Revenue</span>

                      <span className="font-medium text-green-600">
                        {formatPeso(totalRevenue)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses</span>

                      <span className="font-medium text-gray-600">
                        {"Not recorded"}
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Net Profit</span>

                      <span className="font-bold text-gray-600">
                        {"Unavailable"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Bookings</span>

                      <span className="font-medium">
                        {reportBookings.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <AsyncButton
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                    >
                      Close
                    </AsyncButton>

                    <AsyncButton
                      onClick={handleDownloadReport}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg"
                    >
                      <Download className="size-4" />
                      Download Excel
                    </AsyncButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
