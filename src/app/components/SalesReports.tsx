import { toCsv } from "../reportData";
import { completedPayment, cancelled } from "../bookingAvailability";
import { useRecordRevision } from "../useBookingInventory";
import {
  getLiveBookingSnapshot as getBookingSnapshot,
  getLivePaymentSnapshot as getPaymentSnapshot,
} from "../bookingStore";
import { AsyncButton, AsyncForm } from "./ui/async-action";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CreditCard,
  Calendar,
  X,
  Check,
  Download,
  FileText,
  Loader2,
} from "lucide-react";

import {
  AreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";

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
  paymentMethod: string;
};

const COLORS = ["#0891b2", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

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

          checkIn: value.checkIn || "",

          checkOut: value.checkOut || "",

          guests: Number(value.guests || 0),

          total: Number(
            value.totalPrice ?? value.totalAmount ?? value.total ?? 0,
          ),

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
  const totalRevenue =
    reportPayments.reduce(
      (sum, receipt) => sum + Math.round(Number(receipt.amount || 0) * 100),
      0,
    ) / 100;

  const paidBookings = reportBookings.filter(
    (booking) => booking.paymentStatus === "paid",
  ).length;

  const pendingPayments = reportBookings.filter(
    (booking) =>
      booking.paymentStatus === "unpaid" || booking.paymentStatus === "partial",
  ).length;

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
        (sum, booking) => sum + booking.total,
        0,
      );

      result.push({
        month: date.toLocaleDateString(undefined, {
          month: "short",
        }),

        revenue,
      });
    }

    return result;
  }, [validBookings, reportMonth, reportYear]);

  const revenueByCategory = useMemo(() => {
    if (reportBookings.length === 0) {
      return [];
    }

    return [
      {
        id: 1,
        name: "Accommodations",
        value: reportBookings.reduce((sum, booking) => sum + booking.total, 0),
        percentage: 100,
      },
    ];
  }, [reportBookings, totalRevenue]);

  const paymentMethods = Object.values(
    reportPayments.reduce((map: Record<string, any>, receipt) => {
      const method = String(
        receipt.method || receipt.paymentMethod || "Unspecified",
      ).toLowerCase();
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
    percentage: totalRevenue ? (row.amount / totalRevenue) * 100 : 0,
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

  const createCsv = () =>
    toCsv([
      ["Financial Report", reportLabel],
      ["Collections", totalRevenue],
      ["Expenses", "Not recorded"],
      ["Profit", "Unavailable: expenses are not tracked"],
      ["Payment method", "Collected", "Transactions"],
      ...paymentMethods.map((row) => [
        row.method,
        row.amount,
        row.transactions,
      ]),
      [],
      [
        "Booking",
        "Guest",
        "Room",
        "Arrival",
        "Departure",
        "Booking value",
        "Status",
      ],
      ...reportBookings.map((booking) => [
        booking.id,
        booking.guest,
        booking.room,
        booking.checkIn,
        booking.checkOut,
        booking.total,
        booking.status,
      ]),
    ]);

  const downloadCsv = (filename: string) => {
    const blob = new Blob([createCsv()], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    downloadCsv(
      `financial-report-${reportLabel.toLowerCase().replace(/\s+/g, "-")}.csv`,
    );

    setShowReportModal(false);

    setSuccessMsg(
      `Financial report for ${reportLabel} downloaded successfully.`,
    );

    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleExportData = () => {
    downloadCsv("sales-financial-data.csv");

    setSuccessMsg("Financial data exported to CSV.");

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

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm text-gray-600">Collections</p>
          </div>

          <p className="text-3xl font-bold text-gray-900">
            {formatPeso(totalRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Expenses</p>

          <p className="text-3xl font-bold text-gray-600">{"Not recorded"}</p>

          <p className="text-xs text-gray-500 mt-1">
            No expense records in database
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Net Profit</p>

          <p className="text-3xl font-bold ">{"Unavailable"}</p>

          <p className="text-xs text-gray-500 mt-1">
            Revenue minus recorded expenses
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Profit Margin</p>

          <p className="text-3xl font-bold text-gray-900">{"Unavailable"}</p>

          <p className="text-xs text-gray-500 mt-1">
            Based on available records
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h3>

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

              <Legend />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0891b2"
                fill="#06b6d4"
                fillOpacity={0.4}
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Value by Category
          </h3>

          {revenueByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
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
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
              No revenue records found.
            </div>
          )}
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Revenue Breakdown
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Based on available booking categories.
          </p>
        </div>

        <div className="p-6">
          {revenueByCategory.length > 0 ? (
            <div className="space-y-4">
              {revenueByCategory.map((category, index) => (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />

                      <span className="font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {category.percentage.toFixed(1)}%
                      </span>

                      <span className="font-semibold text-gray-900">
                        {formatPeso(category.value)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">
              No revenue records found.
            </p>
          )}
        </div>
      </div>

      {/* Payment Distribution */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Payment Method Distribution
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Based on the payment method stored in your booking records.
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
                          className="bg-cyan-500 h-2 rounded-full"
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

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <AsyncButton
          onClick={openReportModal}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700"
        >
          <span className="font-bold">₱</span>
          Generate Financial Report
        </AsyncButton>

        <AsyncButton
          onClick={handleExportData}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          <Download className="size-4" />
          Export Data
        </AsyncButton>
      </div>

      {/* Generate Financial Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
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
                                ? "bg-cyan-600 text-white border-cyan-600"
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
                          {[currentYear - 1, currentYear].map((year) => (
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
                          {[currentYear - 1, currentYear].map((year) => (
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
                        {[currentYear - 1, currentYear].map((year) => (
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
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg disabled:opacity-60"
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
                      <span className="text-gray-600">Total Revenue</span>

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
                      <span className="text-gray-600">Total Transactions</span>

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
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg"
                    >
                      <Download className="size-4" />
                      Download CSV
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
