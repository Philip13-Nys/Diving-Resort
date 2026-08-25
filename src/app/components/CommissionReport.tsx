import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  X,
  Check,
  FileText,
  Download,
  Loader2,
  Users,
  Clock,
} from "lucide-react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { customerDb } from "../firebase";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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
};

type StaffMember = {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  status: string;
};

type ReportRow = {
  name: string;
  role: string;
  bookings: number;
  revenue: number;
};

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
 const formatPeso = (value: number) =>
  `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const currentYear = new Date().getFullYear();

export default function CommissionReport() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showReportModal, setShowReportModal] = useState(false);

  const [reportMonth, setReportMonth] = useState(
    new Date().getMonth(),
  );

  const [reportYear, setReportYear] = useState(currentYear);

  const [reportGenerated, setReportGenerated] = useState(false);

  const [generating, setGenerating] = useState(false);

  const [detailEarner, setDetailEarner] =
    useState<ReportRow | null>(null);

  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const [bookingSnapshot, staffSnapshot] =
        await Promise.all([
          getDocs(collection(customerDb, "Bookings")),
          getDocs(collection(customerDb, "Staff")),
        ]);

      const bookingData: Booking[] =
        bookingSnapshot.docs.map((bookingDoc) => {
          const data = bookingDoc.data();

          return {
            id: bookingDoc.id,

            guest: data.customerName || "Unknown Guest",

            room: data.roomName || "",

            checkIn: data.checkIn || "",

            checkOut: data.checkOut || "",

            guests: Number(data.guests || 0),

            total: Number(
              data.totalPrice ??
                data.totalAmount ??
                data.total ??
                0,
            ),

            status: data.status || "pending",

            paymentStatus:
              data.paymentStatus || "unpaid",
          };
        });

      const staffData: StaffMember[] =
        staffSnapshot.docs.map((staffDoc) => {
          const data = staffDoc.data();

          return {
            id: staffDoc.id,
            name: data.name || "Unknown Staff",
            position: data.position || "",
            department: data.department || "",
            email: data.email || "",
            status: data.status || "Inactive",
          };
        });

      setBookings(bookingData);
      setStaff(staffData);
    } catch (error) {
      console.error(
        "Error loading commission report data:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedMonthBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (!booking.checkIn) return false;

      const date = new Date(`${booking.checkIn}T00:00:00`);

      if (isNaN(date.getTime())) return false;

      return (
        date.getMonth() === reportMonth &&
        date.getFullYear() === reportYear &&
        booking.status !== "cancelled"
      );
    });
  }, [bookings, reportMonth, reportYear]);

  const totalRevenue = useMemo(() => {
    return selectedMonthBookings.reduce(
      (sum, booking) => sum + booking.total,
      0,
    );
  }, [selectedMonthBookings]);

  const totalBookings = selectedMonthBookings.length;

  const paidBookings = selectedMonthBookings.filter(
    (booking) => booking.paymentStatus === "paid",
  ).length;

  const pendingBookings = selectedMonthBookings.filter(
    (booking) =>
      booking.paymentStatus === "unpaid" ||
      booking.paymentStatus === "partial",
  ).length;

  const activeStaff = staff.filter(
    (member) =>
      (member.status || "").toLowerCase() === "active",
  ).length;

  /*
   * We cannot calculate actual employee commissions because
   * your Firebase structure shown so far does not contain
   * commission amount/rate or employee assignment fields.
   *
   * Therefore, this report uses real booking revenue instead
   * of fake commission values.
   */
  const staffReport: ReportRow[] = useMemo(() => {
    return staff.map((member) => ({
      name: member.name,
      role: member.position || member.department || "Staff",
      bookings: 0,
      revenue: 0,
    }));
  }, [staff]);

  const monthlyData = useMemo(() => {
    const data = [];

    for (let i = 0; i < 6; i++) {
      const monthIndex =
        reportMonth - (5 - i);

      let year = reportYear;
      let month = monthIndex;

      if (month < 0) {
        month += 12;
        year -= 1;
      }

      const monthBookings = bookings.filter((booking) => {
        if (!booking.checkIn) return false;

        const date = new Date(
          `${booking.checkIn}T00:00:00`,
        );

        if (isNaN(date.getTime())) return false;

        return (
          date.getMonth() === month &&
          date.getFullYear() === year &&
          booking.status !== "cancelled"
        );
      });

      data.push({
        month: months[month].slice(0, 3),

        total: monthBookings.reduce(
          (sum, booking) => sum + booking.total,
          0,
        ),

        bookings: monthBookings.length,
      });
    }

    return data;
  }, [bookings, reportMonth, reportYear]);

  const departmentData = useMemo(() => {
    const departments = new Map<
      string,
      { department: string; revenue: number; bookings: number }
    >();

    selectedMonthBookings.forEach((booking) => {
      /*
       * Bookings currently do not contain a department.
       * So these records cannot honestly be assigned to
       * Restaurant, Diving, Spa, etc.
       */
    });

    staff.forEach((member) => {
      if (!departments.has(member.department || "Unassigned")) {
        departments.set(member.department || "Unassigned", {
          department:
            member.department || "Unassigned",
          revenue: 0,
          bookings: 0,
        });
      }
    });

    return Array.from(departments.values());
  }, [selectedMonthBookings, staff]);

  const openReportModal = () => {
    setReportGenerated(false);
    setShowReportModal(true);
  };

  const handleGenerateReport = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setGenerating(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 500),
    );

    setGenerating(false);
    setReportGenerated(true);
  };

  const createCsv = () => {
    const lines = [
      `Financial Report — ${months[reportMonth]} ${reportYear}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Summary",
      `Total Revenue,${formatPeso(totalRevenue)}`,
      `Total Bookings,${totalBookings}`,
      `Paid Bookings,${paidBookings}`,
      `Pending/Partial Payments,${pendingBookings}`,
      `Active Staff,${activeStaff}`,
      "",
      "Monthly Revenue",
      "Month,Revenue,Bookings",
      ...monthlyData.map(
        (item) =>
          `${item.month},${formatPeso(item.total)},${item.bookings}`,
      ),
      "",
      "Staff",
      "Name,Position,Department,Status",
      ...staff.map(
        (member) =>
          `"${member.name}","${member.position}","${member.department}","${member.status}"`,
      ),
      "",
      "Bookings",
      "Guest,Room,Check In,Check Out,Guests,Total,Status,Payment Status",
      ...selectedMonthBookings.map(
        (booking) =>
          `"${booking.guest}","${booking.room}","${booking.checkIn}","${booking.checkOut}",${booking.guests},"${formatPeso(booking.total)}","${booking.status}","${booking.paymentStatus}"`,
      ),
    ];

    return lines.join("\n");
  };

  const downloadReport = (filename: string) => {
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
    downloadReport(
      `financial-report-${months[
        reportMonth
      ].toLowerCase()}-${reportYear}.csv`,
    );

    setShowReportModal(false);

    setSuccessMsg(
      `Report for ${months[reportMonth]} ${reportYear} downloaded.`,
    );

    setTimeout(() => {
      setSuccessMsg("");
    }, 3500);
  };

  const handleExport = () => {
    downloadReport("financial-report.csv");

    setSuccessMsg(
      "Financial data exported to CSV.",
    );

    setTimeout(() => {
      setSuccessMsg("");
    }, 3500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          Loading report data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <Check className="size-5 text-green-600 shrink-0" />

          {successMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Financial & Commission Report
        </h1>

        <p className="text-gray-600 mt-1">
          Review real booking revenue, payment activity,
          staff records, and monthly financial data.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
  <span className="text-3xl font-semibold text-white leading-none">
    ₱
  </span>

  <p className="text-sm text-white/80">
    Total Revenue
  </p>
</div>

          <p className="text-3xl font-bold">
            {formatPeso(totalRevenue)}
          </p>

          <p className="text-sm text-white/80 mt-1">
            {months[reportMonth]} {reportYear}
          </p>
        </div>

      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
  <div className="flex items-center gap-3 mb-3">
    <CalendarDays className="size-7" />

    <p className="text-sm text-white/80">
      Total Bookings
    </p>
  </div>

  <p className="text-3xl font-bold">
    {totalBookings}
  </p>

  <p className="text-sm text-white/80 mt-1">
    Active booking records
  </p>
</div>

        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="size-7" />
            <p className="text-sm text-white/80">
              Pending Payments
            </p>
          </div>

          <p className="text-3xl font-bold">
            {pendingBookings}
          </p>

          <p className="text-sm text-white/80 mt-1">
            Unpaid or partial
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Users className="size-7" />
            <p className="text-sm text-white/80">
              Active Staff
            </p>
          </div>

          <p className="text-3xl font-bold">
            {activeStaff}
          </p>

          <p className="text-sm text-white/80 mt-1">
            From Staff collection
          </p>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trends
          </h3>

          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

          
              <YAxis
              tickFormatter={(value) => `₱${Number(value).toLocaleString("en-PH")}`}
            />

             <Tooltip
            />
              

              <Legend />

              <Line
                type="monotone"
                dataKey="total"
                stroke="#0891b2"
                strokeWidth={2}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bookings by Month
          </h3>

          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip
                formatter={(value: number) => formatPeso(Number(value))}
              />

              <Legend />

              <Bar
                dataKey="bookings"
                fill="#06b6d4"
                name="Bookings"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Staff Records
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Staff currently stored in your database.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Position
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Department
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {staff.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">
                          {member.name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.position || "—"}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.department || "—"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        member.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() =>
                        setDetailEarner({
                          name: member.name,
                          role:
                            member.position ||
                            member.department ||
                            "Staff",
                          bookings: 0,
                          revenue: 0,
                        })
                      }
                      className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

              {staff.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No staff records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={openReportModal}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <CalendarDays className="size-4" />
          Generate Monthly Report
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="size-4" />
          Export to CSV
        </button>
      </div>

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Generate Monthly Report
              </h2>

              <button
                onClick={() =>
                  setShowReportModal(false)
                }
                className="text-white/80 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              {!reportGenerated ? (
                <form
                  onSubmit={handleGenerateReport}
                  className="space-y-4"
                >
                  <p className="text-sm text-gray-600">
                    Select the month and year. The generated
                    report uses the booking and staff records
                    stored in Firebase.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>

                      <select
                        value={reportMonth}
                        onChange={(e) =>
                          setReportMonth(
                            Number(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {months.map((month, index) => (
                          <option
                            key={month}
                            value={index}
                          >
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
                          setReportYear(
                            Number(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {[currentYear - 1, currentYear].map(
                          (year) => (
                            <option
                              key={year}
                              value={year}
                            >
                              {year}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setShowReportModal(false)
                      }
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

                    <span>
                      Report for{" "}
                      <strong>
                        {months[reportMonth]}{" "}
                        {reportYear}
                      </strong>{" "}
                      is ready.
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Report Period
                      </span>

                      <span className="font-medium">
                        {months[reportMonth]}{" "}
                        {reportYear}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Total Revenue
                      </span>

                      <span className="font-medium text-green-600">
                        {formatPeso(totalRevenue)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Total Bookings
                      </span>

                      <span className="font-medium">
                        {totalBookings}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Paid Bookings
                      </span>

                      <span className="font-medium">
                        {paidBookings}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Pending / Partial
                      </span>

                      <span className="font-medium text-orange-600">
                        {pendingBookings}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Employees Included
                      </span>

                      <span className="font-medium">
                        {staff.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() =>
                        setShowReportModal(false)
                      }
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

      {/* Staff Details */}
      {detailEarner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Staff Details
              </h2>

              <button
                onClick={() =>
                  setDetailEarner(null)
                }
                className="text-white/80 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
                  {detailEarner.name.charAt(0)}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {detailEarner.name}
                  </h3>

                  <p className="text-gray-600">
                    {detailEarner.role}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">
                  Commission Data
                </p>

                <p className="text-sm text-gray-700 mt-2">
                  No commission amount or commission rate is
                  currently stored for this staff member in
                  your Firestore database.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() =>
                    setDetailEarner(null)
                  }
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
