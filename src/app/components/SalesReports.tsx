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
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "Bookings"));

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

  /*
   * Only non-cancelled bookings are included.
   */
  const validBookings = useMemo(() => {
    return bookings.filter((booking) => booking.status !== "cancelled");
  }, [bookings]);

  /*
   * Filter bookings according to the selected
   * monthly / quarterly / annual report.
   */
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

  const totalRevenue = useMemo(() => {
    return reportBookings.reduce((sum, booking) => sum + booking.total, 0);
  }, [reportBookings]);

  /*
   * There is currently no Expenses collection
   * in the Firebase structure you provided.
   */
  const totalExpenses = 0;

  const netProfit = totalRevenue - totalExpenses;

  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const paidBookings = reportBookings.filter(
    (booking) => booking.paymentStatus === "paid",
  ).length;

  const pendingPayments = reportBookings.filter(
    (booking) =>
      booking.paymentStatus === "unpaid" || booking.paymentStatus === "partial",
  ).length;

  /*
   * Revenue trend for the last 6 months
   * relative to the selected report month.
   */
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

  /*
   * Category distribution.
   * Your current Bookings data does not contain
   * service/category fields, so bookings are
   * honestly grouped as Accommodations.
   */
  const revenueByCategory = useMemo(() => {
    if (reportBookings.length === 0) {
      return [];
    }

    return [
      {
        id: 1,
        name: "Accommodations",
        value: totalRevenue,
        percentage: 100,
      },
    ];
  }, [reportBookings, totalRevenue]);

  /*
   * Payment methods.
   *
   * If paymentMethod exists in your database,
   * it will be used. Otherwise, records appear
   * under "Not specified".
   */
  const paymentMethods = useMemo(() => {
    const map = new Map<
      string,
      {
        method: string;
        amount: number;
        transactions: number;
      }
    >();

    reportBookings.forEach((booking) => {
      const method = booking.paymentMethod || "Not specified";

      const existing = map.get(method);

      if (existing) {
        existing.amount += booking.total;
        existing.transactions += 1;
      } else {
        map.set(method, {
          method,
          amount: booking.total,
          transactions: 1,
        });
      }
    });

    const total = reportBookings.reduce(
      (sum, booking) => sum + booking.total,
      0,
    );

    return Array.from(map.values()).map((item) => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  }, [reportBookings]);

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

    await new Promise((resolve) => setTimeout(resolve, 500));

    setGenerating(false);
    setReportReady(true);
  };

  const createCsv = () => {
    const lines = [
      `Financial Report — ${reportLabel}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Financial Summary",
      `Total Revenue,${formatPeso(totalRevenue)}`,
      `Total Expenses,${formatPeso(totalExpenses)}`,
      `Net Profit,${formatPeso(netProfit)}`,
      `Profit Margin,${profitMargin.toFixed(2)}%`,
      `Total Bookings,${reportBookings.length}`,
      `Paid Bookings,${paidBookings}`,
      `Pending Payments,${pendingPayments}`,
      "",
      "Monthly Revenue",
      "Month,Revenue",
      ...revenueData.map((item) => `${item.month},${formatPeso(item.revenue)}`),
      "",
      "Revenue by Category",
      "Category,Revenue,Percentage",
      ...revenueByCategory.map(
        (item) =>
          `"${item.name}",${formatPeso(item.value)},${item.percentage.toFixed(2)}%`,
      ),
      "",
      "Payment Methods",
      "Method,Amount,Percentage,Transactions",
      ...paymentMethods.map(
        (item) =>
          `"${item.method}",${formatPeso(item.amount)},${item.percentage.toFixed(2)}%,${item.transactions}`,
      ),
      "",
      "Bookings",
      "Guest,Room,Check In,Check Out,Guests,Total,Status,Payment Status",
      ...reportBookings.map(
        (booking) =>
          `"${booking.guest}","${booking.room}","${booking.checkIn}","${booking.checkOut}",${booking.guests},"${formatPeso(booking.total)}","${booking.status}","${booking.paymentStatus}"`,
      ),
    ];

    return lines.join("\n");
  };

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
            <span className="text-2xl font-bold text-green-600">₱</span>

            <p className="text-sm text-gray-600">Total Revenue</p>
          </div>

          <p className="text-3xl font-bold text-gray-900">
            {formatPeso(totalRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Expenses</p>

          <p className="text-3xl font-bold text-red-600">
            {formatPeso(totalExpenses)}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            No expense records in database
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Net Profit</p>

          <p className="text-3xl font-bold text-green-600">
            {formatPeso(netProfit)}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Revenue minus recorded expenses
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Profit Margin</p>

          <p className="text-3xl font-bold text-gray-900">
            {profitMargin.toFixed(1)}%
          </p>

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
            Revenue by Category
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
        <button
          onClick={openReportModal}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700"
        >
          <span className="font-bold">₱</span>
          Generate Financial Report
        </button>

        <button
          onClick={handleExportData}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          <Download className="size-4" />
          Export Data
        </button>
      </div>

      {/* Generate Financial Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Generate Financial Report
              </h2>

              <button
                onClick={() => setShowReportModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              {!reportReady ? (
                <form onSubmit={handleGenerate} className="space-y-4">
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
                          <button
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
                          </button>
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
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                    >
                      Cancel
                    </button>

                    <button
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
                    </button>
                  </div>
                </form>
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

                      <span className="font-medium text-red-600">
                        {formatPeso(totalExpenses)}
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Net Profit</span>

                      <span className="font-bold text-green-600">
                        {formatPeso(netProfit)}
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
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                    >
                      Close
                    </button>

                    <button
                      onClick={handleDownloadReport}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg"
                    >
                      <Download className="size-4" />
                      Download CSV
                    </button>
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
