import {
  normalizeInventory,
  roomBookingsOnDate,
  roomStatusOnDate,
  localDate,
  roomQuantity,
  collectedBookingAmount,
} from "../app/bookingAvailability";
import { useRecordRevision } from "../app/useBookingInventory";
import { getLiveBookingSnapshot as getBookingSnapshot } from "../app/bookingStore";
import { AsyncButton } from "../app/components/ui/async-action";
import { Card } from "../app/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Hotel,
  TrendingUp,
  Activity,
  Plus,
  Waves,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useCallback, useEffect, useState } from "react";
import { customerDb, db } from "../app/firebase";
import { collection, getDocs } from "firebase/firestore";

type Booking = {
  id: string;
  bookingRef?: string;
  guestName?: string;
  guest?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  room?: string;
  roomName?: string;
  roomType?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomQuantity?: number;
  numberOfRooms?: number;
  quantity?: number;
  bookingType?: string;
  itemType?: string;
  type?: string;
  checkIn?: unknown;
  checkOut?: unknown;
  bookingDate?: unknown;
  reservationDate?: unknown;
  date?: unknown;
  createdAt?: unknown;
  total?: number | string;
  totalAmount?: number | string;
  totalPrice?: number | string;
  grandTotal?: number | string;
  finalAmount?: number | string;
  bookingTotal?: number | string;
  amount?: number | string;
  price?: number | string;
  serviceTotal?: number | string;
  paymentAmount?: number | string;
  status?: string;
  paymentStatus?: string;
  [key: string]: unknown;
};

type RevenueData = {
  month: string;
  revenue: number;
  bookings: number;
};

type OccupancyData = {
  day: string;
  occupied: number;
  available: number;
};

const quickActions = [
  {
    label: "Add New Room Type",
    description: "Create a new category of rooms",
    icon: Plus,
    color: "bg-blue-100 text-blue-600",
    href: "/manager/rooms?tab=types&action=add",
  },
  {
    label: "Add New Room",
    description: "Register an individual room",
    icon: Hotel,
    color: "bg-cyan-100 text-cyan-600",
    href: "/manager/rooms?tab=rooms&action=add",
  },
  {
    label: "Add New Service",
    description: "Create a resort service",
    icon: Waves,
    color: "bg-teal-100 text-teal-600",
    href: "/manager/services?action=add",
  },
];

const convertToDate = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === "object") {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
    };

    if (typeof timestamp.toDate === "function") {
      try {
        const result = timestamp.toDate();

        return result instanceof Date && !Number.isNaN(result.getTime())
          ? result
          : null;
      } catch {
        return null;
      }
    }

    if (typeof timestamp.seconds === "number") {
      const result = new Date(timestamp.seconds * 1000);

      return Number.isNaN(result.getTime()) ? null : result;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const result = new Date(value);

    return Number.isNaN(result.getTime()) ? null : result;
  }

  return null;
};

const getBookingDate = (booking: Booking): Date | null => {
  return (
    convertToDate(booking.createdAt) ??
    convertToDate(booking.bookingDate) ??
    convertToDate(booking.reservationDate) ??
    convertToDate(booking.date) ??
    convertToDate(booking.checkIn)
  );
};

const normalizeStatus = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const isCancelled = (booking: Booking): boolean => {
  const status = normalizeStatus(booking.status);

  return ["cancelled", "canceled", "rejected", "declined"].includes(status);
};

const isRoomBooking = (booking: Booking): boolean => {
  const type = normalizeStatus(
    booking.bookingType ?? booking.itemType ?? booking.type,
  );

  // Explicitly exclude activities, services, and packages.
  if (
    type.includes("activity") ||
    type.includes("service") ||
    type.includes("package") ||
    type.includes("diving") ||
    type.includes("snorkeling") ||
    type.includes("water-sport") ||
    type.includes("island-hopping")
  ) {
    return false;
  }

  return true;
};

const getRoomQuantity = (booking: Booking): number => {
  return roomQuantity(booking);
};

const getBookingDateRange = (
  booking: Booking,
): { checkIn: Date; checkOut: Date } | null => {
  const checkIn = convertToDate(booking.checkIn);
  const checkOut = convertToDate(booking.checkOut);

  if (!checkIn || !checkOut) return null;

  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);

  if (checkOut <= checkIn) return null;

  return { checkIn, checkOut };
};

const getOccupiedRoomCount = (bookings: Booking[], date: Date): number => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return bookings.reduce((total, booking) => {
    if (
      isCancelled(booking) ||
      !isRoomBooking(booking) ||
      ![
        "checked-in",
        "checked-in-occupied",
        "checked-out",
        "completed",
        "occupied",
      ].includes(normalizeStatus(booking.status))
    ) {
      return total;
    }

    const range = getBookingDateRange(booking);

    if (!range) return total;

    const isWithinStay =
      targetDate >= range.checkIn && targetDate < range.checkOut;

    return isWithinStay ? total + getRoomQuantity(booking) : total;
  }, 0);
};

const getLatestMonths = (count: number): Date[] => {
  const now = new Date();
  const months: Date[] = [];

  for (let i = count - 1; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  return months;
};

const formatCurrency = (amount: number): string =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Dashboard() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,admin:rooms",
  );
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [averageDailyRate, setAverageDailyRate] = useState(0);

  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    setError("");

    try {
      const [bookingSnapshot, roomSnapshot] = await Promise.all([
        getBookingSnapshot(),
        getDocs(collection(db, "rooms")),
      ]);

      const bookings: Booking[] = bookingSnapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })) as Booking[];

      const inventory = normalizeInventory(
        roomSnapshot.docs.map((document) => ({
          ...document.data(),
          id: document.id,
        })),
      );
      const totalRooms = inventory.length;

      const activeBookings = bookings.filter(
        (booking) => !isCancelled(booking),
      );

      const activeRoomBookings = activeBookings.filter(isRoomBooking);

      // Count all booking records, including cancelled records.
      setTotalBookings(bookings.length);

      // Count only accepted payments, including partial payments.
      const revenue = activeBookings.reduce(
        (sum, booking) => sum + collectedBookingAmount(booking),
        0,
      );

      setTotalRevenue(revenue);

      // Average Daily Rate: room revenue per occupied room-night.
      const roomRevenue = activeRoomBookings.reduce(
        (sum, booking) => sum + collectedBookingAmount(booking),
        0,
      );

      const totalRoomNights = activeRoomBookings.reduce((sum, booking) => {
        const range = getBookingDateRange(booking);

        if (!range) return sum;

        const nights = Math.round(
          (range.checkOut.getTime() - range.checkIn.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return sum + nights * getRoomQuantity(booking);
      }, 0);

      setAverageDailyRate(
        totalRoomNights > 0 ? roomRevenue / totalRoomNights : 0,
      );

      // Prepare the latest 12 calendar months.
      const latestMonths = getLatestMonths(12);

      const monthlyData = new Map<
        string,
        { revenue: number; bookings: number }
      >();

      const getMonthKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      latestMonths.forEach((date) => {
        monthlyData.set(getMonthKey(date), {
          revenue: 0,
          bookings: 0,
        });
      });

      activeBookings.forEach((booking) => {
        const date = getBookingDate(booking);

        if (!date) return;

        const key = getMonthKey(date);
        const current = monthlyData.get(key);

        // Ignore bookings outside the displayed 12-month period.
        if (!current) return;

        current.bookings += 1;
        current.revenue += collectedBookingAmount(booking);
      });

      setRevenueData(
        latestMonths.map((date) => {
          const values = monthlyData.get(getMonthKey(date)) ?? {
            revenue: 0,
            bookings: 0,
          };

          return {
            month: date.toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            }),
            revenue: values.revenue,
            bookings: values.bookings,
          };
        }),
      );

      // Current occupancy and the last seven days.
      if (totalRooms > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const day = localDate(today);
        const assignments = roomBookingsOnDate(
          inventory,
          activeRoomBookings,
          day,
        );
        const occupiedToday = inventory.filter(
          (room) =>
            roomStatusOnDate(room, assignments.get(room.id), day) ===
            "occupied",
        ).length;

        setOccupancyRate(Math.round((occupiedToday / totalRooms) * 100));

        const weeklyData: OccupancyData[] = [];

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);

          const occupied = Math.min(
            totalRooms,
            i === 0
              ? occupiedToday
              : getOccupiedRoomCount(activeRoomBookings, date),
          );

          weeklyData.push({
            day: date.toLocaleDateString("en-US", {
              weekday: "short",
            }),
            occupied,
            available: Math.max(0, totalRooms - occupied),
          });
        }

        setOccupancyData(weeklyData);
      } else {
        setOccupancyRate(0);
        setOccupancyData([]);
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError(
        "Unable to load dashboard data. Please check your Firebase connection and permissions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, recordRevision]);

  return (
    <div className="min-w-0 space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Business operations overview
          </p>
        </div>

        <AsyncButton
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={loading || refreshing}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {refreshing ? "Refreshing..." : "Refresh Dashboard"}
        </AsyncButton>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <AsyncButton
            type="button"
            onClick={() => void loadDashboard(true)}
            className="ml-2 font-semibold underline underline-offset-2"
          >
            Try again
          </AsyncButton>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="mt-2 break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                From non-cancelled bookings
              </p>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-100 sm:size-12">
              <span className="text-2xl font-bold text-green-600">₱</span>
            </div>
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                {occupancyRate}%
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Current room occupancy
              </p>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 sm:size-12">
              <Hotel className="size-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                {totalBookings.toLocaleString("en-PH")}
              </p>
              <p className="mt-2 text-xs text-gray-500">All booking records</p>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-purple-100 sm:size-12">
              <Users className="size-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Average Daily Rate</p>
              <p className="mt-2 break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                {formatCurrency(averageDailyRate)}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Room revenue per room-night
              </p>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-100 sm:size-12">
              <TrendingUp className="size-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <AsyncButton
                key={action.label}
                type="button"
                title={action.description}
                onClick={() => navigate(action.href)}
                className="group flex min-h-32 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:min-h-36 sm:p-4"
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 sm:size-11 ${action.color}`}
                >
                  <Icon className="size-5" />
                </div>
                <span className="text-xs font-medium leading-snug text-gray-700 sm:text-sm">
                  {action.label}
                </span>
              </AsyncButton>
            );
          })}
        </div>
      </section>

      {/* Charts */}
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              Revenue &amp; Bookings
            </h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Monthly revenue and booking volume for the latest 12 months
            </p>
          </div>

          {loading ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading chart...
            </div>
          ) : (
            <div className="h-[280px] min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    minTickGap={8}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={65}
                    tickFormatter={(value: number) =>
                      value >= 1000
                        ? `₱${(value / 1000).toFixed(1)}k`
                        : `₱${value}`
                    }
                  />
                  <YAxis
                    yAxisId="bookings"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Revenue"
                        ? formatCurrency(Number(value))
                        : Number(value).toLocaleString("en-PH"),
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="bookings"
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              Weekly Occupancy
            </h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Occupied and available rooms over the last seven days
            </p>
          </div>

          {loading ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading chart...
            </div>
          ) : occupancyData.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center text-center">
              <Hotel className="mb-3 size-9 text-gray-300" />
              <p className="font-medium text-gray-700">
                No room data available
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Add rooms to your rooms collection to view occupancy.
              </p>
            </div>
          ) : (
            <div className="h-[280px] min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={occupancyData}
                  margin={{ top: 8, right: 8, left: -15, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    dataKey="occupied"
                    name="Occupied"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="available"
                    name="Available"
                    fill="#d1d5db"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
