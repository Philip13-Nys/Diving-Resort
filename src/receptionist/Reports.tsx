import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";

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

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
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

const getYearStart = (date: Date) =>
  new Date(date.getFullYear(), 0, 1);

export default function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const [bookingSnapshot, paymentSnapshot] = await Promise.all([
        getDocs(collection(customerDb, "Bookings")),
        getDocs(collection(customerDb, "Payments")),
      ]);

      const bookingData: Booking[] = bookingSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,

          guest:
            data.customerName ??
            data.guest ??
            "Unknown Guest",

          email:
            data.customerEmail ??
            data.email ??
            "",

          room:
            data.roomName ??
            data.room ??
            "",

          roomType:
            data.roomType ??
            "",

          checkIn:
            data.checkIn ??
            "",

          checkOut:
            data.checkOut ??
            "",

          guests: Number(
            data.guests ??
            data.pax ??
            0,
          ),

          total: Number(
            data.totalPrice ??
            data.totalAmount ??
            data.amount ??
            data.total ??
            0,
          ),

          status:
            data.status ??
            "pending",

          paymentStatus:
            data.paymentStatus ??
            "unpaid",

          amountPaid: Number(
            data.amountPaid ??
            data.paid ??
            0,
          ),
        };
      });

      const paymentData: Payment[] = paymentSnapshot.docs.map(
        (docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,

            bookingId:
              data.bookingId ??
              "",

            guest:
              data.guest ??
              data.customerName ??
              "",

            room:
              data.room ??
              data.roomName ??
              "",

            amount: Number(
              data.amount ??
              0,
            ),

            method:
              data.method ??
              "cash",

            type:
              data.type ??
              "full",

            date:
              data.date ??
              "",

            time:
              data.time ??
              "",

            status:
              data.status ??
              "completed",
          };
        },
      );

      setBookings(bookingData);
      setPayments(paymentData);
    } catch (error) {
      console.error(
        "Error loading report data:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(
    () => startOfDay(new Date()),
    [],
  );

  /*
   * Only non-cancelled bookings are counted.
   */
  const validBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status.toLowerCase() !==
          "cancelled",
      ),
    [bookings],
  );

  /*
   * BOOKING FILTER FOR CURRENT PERIOD
   */
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
      const nextYear = new Date(
        today.getFullYear() + 1,
        0,
        1,
      );

      return validBookings.filter((booking) => {
        const date = parseDate(booking.checkIn);

        if (!date) return false;

        return date >= yearStart && date < nextYear;
      });
    }

    const monthStart = getMonthStart(today);
    const nextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1,
    );

    return validBookings.filter((booking) => {
      const date = parseDate(booking.checkIn);

      if (!date) return false;

      return date >= monthStart && date < nextMonth;
    });
  }, [period, validBookings, today]);

  /*
   * TOTAL REVENUE
   */
  const totalRevenue = useMemo(
    () =>
      periodBookings.reduce(
        (sum, booking) =>
          sum + Number(booking.total || 0),
        0,
      ),
    [periodBookings],
  );

  /*
   * TOTAL BOOKINGS
   */
  const totalBookings = periodBookings.length;

  /*
   * AVERAGE REVENUE
   */
  const averageRevenue =
    totalBookings > 0
      ? totalRevenue / totalBookings
      : 0;

  /*
   * ROOM TYPE DISTRIBUTION
   */
  const roomTypeData = useMemo(() => {
    const map = new Map<string, number>();

    periodBookings.forEach((booking) => {
      const type =
        booking.roomType?.trim() ||
        "Unknown";

      map.set(
        type,
        (map.get(type) || 0) + 1,
      );
    });

    const total = periodBookings.length;

    return Array.from(map.entries())
      .map(([name, value], index) => ({
        name,
        value,
        percentage:
          total > 0
            ? Number(
                ((value / total) * 100).toFixed(1),
              )
            : 0,
        color:
          COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodBookings]);

  /*
   * PAYMENT METHOD DISTRIBUTION
   */
  const paymentMethodData = useMemo(() => {
    const map = new Map<
      string,
      {
        amount: number;
        count: number;
      }
    >();

    payments.forEach((payment) => {
      const method =
        payment.method?.toLowerCase() ||
        "unknown";

      const current =
        map.get(method) || {
          amount: 0,
          count: 0,
        };

      current.amount += Number(
        payment.amount || 0,
      );

      current.count += 1;

      map.set(method, current);
    });

    return Array.from(map.entries())
      .map(([method, data]) => ({
        method:
          method === "gcash"
            ? "GCash"
            : method.charAt(0).toUpperCase() +
              method.slice(1),

        amount: data.amount,

        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [payments]);

  /*
   * TOP GUESTS
   */
  const topGuests = useMemo(() => {
    const map = new Map<
      string,
      {
        visits: number;
        spent: number;
      }
    >();

    validBookings.forEach((booking) => {
      const name =
        booking.guest?.trim() ||
        "Unknown Guest";

      const current =
        map.get(name) || {
          visits: 0,
          spent: 0,
        };

      current.visits += 1;

      current.spent += Number(
        booking.total || 0,
      );

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
  }, [validBookings]);

  /*
   * MONTHLY REVENUE
   */
  const monthlyRevenue = useMemo(() => {
    const now = new Date();

    return Array.from(
      { length: 6 },
      (_, index) => {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - (5 - index),
          1,
        );

        const month = date.getMonth();
        const year = date.getFullYear();

        const monthBookings =
          validBookings.filter((booking) => {
            const checkIn =
              parseDate(booking.checkIn);

            if (!checkIn) return false;

            return (
              checkIn.getMonth() === month &&
              checkIn.getFullYear() === year
            );
          });

        return {
          month: date.toLocaleDateString(
            "en-US",
            {
              month: "short",
            },
          ),

          revenue:
            monthBookings.reduce(
              (sum, booking) =>
                sum +
                Number(booking.total || 0),
              0,
            ),

          bookings:
            monthBookings.length,
        };
      },
    );
  }, [validBookings]);

  /*
   * OCCUPANCY / BOOKING RATE
   *
   * Since there is currently no Rooms collection in
   * the database code you provided, this uses the number
   * of unique rooms appearing in Bookings as the available
   * room reference.
   */
  const uniqueRooms = useMemo(() => {
    return new Set(
      validBookings
        .map((booking) => booking.room?.trim())
        .filter(Boolean),
    ).size;
  }, [validBookings]);

  const occupancyData = useMemo(() => {
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);

      date.setDate(
        date.getDate() - i,
      );

      const dateKey =
        date.toISOString().split("T")[0];

      const dayBookings =
        validBookings.filter(
          (booking) => {
            const checkIn =
              parseDate(
                booking.checkIn,
              );

            return (
              checkIn &&
              checkIn
                .toISOString()
                .split("T")[0] ===
                dateKey
            );
          },
        );

      const bookedRooms = new Set(
        dayBookings
          .map((booking) => booking.room)
          .filter(Boolean),
      ).size;

      const rate =
        uniqueRooms > 0
          ? Math.min(
              100,
              Math.round(
                (bookedRooms /
                  uniqueRooms) *
                  100,
              ),
            )
          : 0;

      result.push({
        day: date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          },
        ),

        rate,
      });
    }

    return result;
  }, [today, validBookings, uniqueRooms]);

  /*
   * EXPORT
   */
  const exportReport = () => {
    const lines = [
      "Resort Management System Report",
      `Generated: ${new Date().toLocaleString()}`,
      `Period: ${period}`,
      "",

      "Summary",
      `Total Revenue,${formatPeso(
        totalRevenue,
      )}`,
      `Total Bookings,${totalBookings}`,
      `Average Revenue per Booking,${formatPeso(
        averageRevenue,
      )}`,

      "",

      "Monthly Revenue",
      "Month,Revenue,Bookings",

      ...monthlyRevenue.map(
        (item) =>
          `${item.month},${formatPeso(
            item.revenue,
          )},${item.bookings}`,
      ),

      "",

      "Room Types",
      "Room Type,Bookings,Percentage",

      ...roomTypeData.map(
        (item) =>
          `"${item.name}",${item.value},${item.percentage}%`,
      ),

      "",

      "Payment Methods",
      "Method,Amount,Transactions",

      ...paymentMethodData.map(
        (item) =>
          `"${item.method}",${formatPeso(
            item.amount,
          )},${item.count}`,
      ),

      "",

      "Top Guests",
      "Guest,Visits,Total Spent",

      ...topGuests.map(
        (guest) =>
          `"${guest.name}",${guest.visits},${formatPeso(
            guest.spent,
          )}`,
      ),
    ];

    const blob = new Blob(
      [lines.join("\n")],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `resort-report-${period}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setSuccess(
      "Report exported successfully.",
    );

    setTimeout(
      () => setSuccess(""),
      3000,
    );
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
          {(
            [
              "daily",
              "weekly",
              "monthly",
              "yearly",
            ] as ReportPeriod[]
          ).map((p) => (
            <button
              key={p}
              onClick={() =>
                setPeriod(p)
              }
              className="px-4 py-2 rounded-lg text-sm capitalize border transition-all"
              style={{
                background:
                  period === p
                    ? "#0d7377"
                    : "white",

                color:
                  period === p
                    ? "white"
                    : "#4a7a7a",

                borderColor:
                  period === p
                    ? "#0d7377"
                    : "rgba(13,115,119,0.2)",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={exportReport}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
          style={{
            borderColor:
              "rgba(13,115,119,0.2)",
            color: "#0d7377",
          }}
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#0d7377",
              fontFamily:
                "Georgia, serif",
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
            Total Revenue
          </p>
        </div>

        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#14b8a6",
              fontFamily:
                "Georgia, serif",
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
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#06b6d4",
              fontFamily:
                "Georgia, serif",
            }}
          >
            {uniqueRooms > 0
              ? `${Math.round(
                  occupancyData.reduce(
                    (sum, item) =>
                      sum + item.rate,
                    0,
                  ) /
                    occupancyData.length,
                )}%`
              : "0%"}
          </p>

          <p
            className="text-xs"
            style={{
              color: "#4a7a7a",
            }}
          >
            Avg. Booking Occupancy
          </p>
        </div>

        <div
          className="bg-white rounded-xl border p-5"
          style={{
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <p
            className="text-3xl mb-1"
            style={{
              color: "#f97316",
              fontFamily:
                "Georgia, serif",
            }}
          >
            {formatPeso(
              averageRevenue,
            )}
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
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-5"
            style={{
              color: "#0a2e2e",
              fontFamily:
                "Georgia, serif",
            }}
          >
            Revenue & Bookings
          </h3>

          <ResponsiveContainer
            width="100%"
            height={250}
          >
            <BarChart
              data={monthlyRevenue}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(13,115,119,0.08)"
              />

              <XAxis
                dataKey="month"
              />

              <YAxis
                yAxisId="left"
                tickFormatter={(value) =>
                  `₱${(
                    Number(value) /
                    1000
                  ).toFixed(0)}K`
                }
              />

              <YAxis
                yAxisId="right"
                orientation="right"
              />

              <Tooltip
                formatter={(
                  value: number,
                  name: string,
                ) => [
                  name ===
                  "revenue"
                    ? formatPeso(
                        Number(
                          value,
                        ),
                      )
                    : value,

                  name ===
                  "revenue"
                    ? "Revenue"
                    : "Bookings",
                ]}
              />

              <Legend />

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
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-5"
            style={{
              color: "#0a2e2e",
              fontFamily:
                "Georgia, serif",
            }}
          >
            Bookings by Room Type
          </h3>

          {roomTypeData.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No room type data found.
            </div>
          ) : (
            <>
              <ResponsiveContainer
                width="100%"
                height={180}
              >
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
                    {roomTypeData.map(
                      (
                        entry,
                        index,
                      ) => (
                        <Cell
                          key={
                            entry.name
                          }
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />
                      ),
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(
                      value: number,
                    ) => [
                      `${value} bookings`,
                      "Bookings",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2">
                {roomTypeData.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.name
                      }
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          background:
                            COLORS[
                              index %
                                COLORS.length
                            ],
                        }}
                      />

                      <span
                        className="flex-1"
                        style={{
                          color:
                            "#4a7a7a",
                        }}
                      >
                        {item.name}
                      </span>

                      <span
                        style={{
                          color:
                            "#0a2e2e",
                        }}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Occupancy + Payments + Top Guests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div
          className="lg:col-span-2 bg-white rounded-xl border p-5"
          style={{
            borderColor:
              "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            className="font-medium mb-5"
            style={{
              color: "#0a2e2e",
              fontFamily:
                "Georgia, serif",
            }}
          >
            Booking Occupancy Rate
          </h3>

          <ResponsiveContainer
            width="100%"
            height={220}
          >
            <LineChart
              data={occupancyData}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(13,115,119,0.08)"
              />

              <XAxis
                dataKey="day"
              />

              <YAxis
                domain={[0, 100]}
                tickFormatter={(
                  value,
                ) => `${value}%`}
              />

              <Tooltip
                formatter={(
                  value: number,
                ) => [
                  `${value}%`,
                  "Occupancy",
                ]}
              />

              <Line
                type="monotone"
                dataKey="rate"
                stroke="#0d7377"
                strokeWidth={2.5}
                dot={{
                  fill: "#0d7377",
                  r: 4,
                }}
              />
            </LineChart>
          </ResponsiveContainer>

          <p className="text-xs text-gray-500 mt-2">
            Based on unique rooms appearing in the Bookings collection.
          </p>
        </div>

        <div className="space-y-4">

          {/* Payments */}
          <div
            className="bg-white rounded-xl border p-5"
            style={{
              borderColor:
                "rgba(13,115,119,0.1)",
            }}
          >
            <h3
              className="font-medium mb-4"
              style={{
                color: "#0a2e2e",
                fontFamily:
                  "Georgia, serif",
              }}
            >
              Payment Methods
            </h3>

            {paymentMethodData.length === 0 ? (
              <p className="text-sm text-gray-500">
                No payment records found.
              </p>
            ) : (
              <div className="space-y-3">
                {paymentMethodData.map(
                  (payment) => {
                    const total =
                      paymentMethodData.reduce(
                        (
                          sum,
                          item,
                        ) =>
                          sum +
                          item.amount,
                        0,
                      );

                    const percentage =
                      total > 0
                        ? Math.round(
                            (payment.amount /
                              total) *
                              100,
                          )
                        : 0;

                    return (
                      <div
                        key={
                          payment.method
                        }
                      >
                        <div className="flex justify-between text-sm mb-1">
                          <span
                            style={{
                              color:
                                "#0a2e2e",
                            }}
                          >
                            {
                              payment.method
                            }
                          </span>

                          <span
                            style={{
                              color:
                                "#4a7a7a",
                            }}
                          >
                            {formatPeso(
                              payment.amount,
                            )}{" "}
                            ({payment.count} txns)
                          </span>
                        </div>

                        <div
                          className="h-2 rounded-full"
                          style={{
                            background:
                              "#e2f3f2",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background:
                                "#0d7377",
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Top Guests */}
          <div
            className="bg-white rounded-xl border p-5"
            style={{
              borderColor:
                "rgba(13,115,119,0.1)",
            }}
          >
            <h3
              className="font-medium mb-4"
              style={{
                color: "#0a2e2e",
                fontFamily:
                  "Georgia, serif",
              }}
            >
              Top Guests
            </h3>

            {topGuests.length === 0 ? (
              <p className="text-sm text-gray-500">
                No guest records found.
              </p>
            ) : (
              <div className="space-y-2">
                {topGuests.map(
                  (
                    guest,
                    index,
                  ) => (
                    <div
                      key={
                        guest.name
                      }
                      className="flex items-center gap-3"
                    >
                      <span
                        className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                        style={{
                          background:
                            index === 0
                              ? "#f97316"
                              : "#e2f3f2",
                          color:
                            index === 0
                              ? "#fff"
                              : "#0d7377",
                        }}
                      >
                        {index + 1}
                      </span>

                      <span
                        className="flex-1 text-sm"
                        style={{
                          color:
                            "#0a2e2e",
                        }}
                      >
                        {guest.name}
                      </span>

                      <span
                        className="text-xs"
                        style={{
                          color:
                            "#0d7377",
                        }}
                      >
                        {formatPeso(
                          guest.spent,
                        )}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
