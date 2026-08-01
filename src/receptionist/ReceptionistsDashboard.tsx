import { useState, useEffect } from "react";
import {
  BedDouble,
  Users,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Check,
  Clock,
  X,
  Waves,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { useNavigate } from "react-router";
import { collection, getDocs } from "firebase/firestore";
import { customerDb } from "../app/firebase";

// dates that have bookings (check-in days)

const CAL_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniCal({ bookings }: { bookings: any[] }) {
  const navigate = useNavigate();
  const bookingDates = bookings
    .filter((b) => b.checkIn)
    .map((b) => new Date(b.checkIn));

  const checkoutDates = bookings
    .filter((b) => b.checkOut)
    .map((b) => new Date(b.checkOut));

  const [month, setMonth] = useState(new Date(2026, 5, 1));
  const today = new Date(2026, 5, 7);
  const [selected, setSelected] = useState<Date>(today);

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });
  const pad = getDay(startOfMonth(month));

  const hasCheckin = (d: Date) => bookingDates.some((b) => isSameDay(b, d));

  const hasCheckout = (d: Date) => checkoutDates.some((b) => isSameDay(b, d));
  const selectedCheckins = bookingDates.filter((d) =>
    isSameDay(d, selected),
  ).length;

  const selectedCheckouts = checkoutDates.filter((d) =>
    isSameDay(d, selected),
  ).length;

  return (
    <div
      className="bg-white rounded-xl border p-4"
      style={{ borderColor: "rgba(13,115,119,0.1)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-medium"
          style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
        >
          {format(month, "MMMM yyyy")}
        </h3>
        <div className="flex gap-0.5">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "#4a7a7a" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#f0f9f8")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "#4a7a7a" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#f0f9f8")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {CAL_DAYS.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs"
            style={{ color: "#a0c4c4", fontWeight: 600 }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: pad }).map((_, i) => (
          <div key={`p-${i}`} />
        ))}
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isSel = isSameDay(day, selected);
          const cin = hasCheckin(day);
          const cout = hasCheckout(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelected(day)}
              className="relative flex flex-col items-center justify-center w-full aspect-square rounded-lg text-xs transition-all"
              style={{
                background: isSel
                  ? "#0d7377"
                  : isToday
                    ? "#e2f3f2"
                    : "transparent",
                color: isSel ? "#fff" : isToday ? "#0d7377" : "#0a2e2e",
                fontWeight: isToday || isSel ? 600 : 400,
              }}
            >
              {format(day, "d")}
              {(cin || cout) && !isSel && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {cin && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ background: "#0d7377" }}
                    />
                  )}
                  {cout && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ background: "#f97316" }}
                    />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className="mt-3 pt-3 border-t"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        <p className="text-xs font-medium mb-1.5" style={{ color: "#0a2e2e" }}>
          {format(selected, "MMM d")}
        </p>
        {selectedCheckins === 0 && selectedCheckouts === 0 ? (
          <p className="text-xs" style={{ color: "#a0c4c4" }}>
            No arrivals or departures
          </p>
        ) : (
          <div className="space-y-1">
            {selectedCheckins > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs"
                style={{ color: "#0d7377" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#0d7377" }}
                />
                {selectedCheckins} arrival{selectedCheckins > 1 ? "s" : ""}
              </div>
            )}
            {selectedCheckouts > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs"
                style={{ color: "#f97316" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#f97316" }}
                />
                {selectedCheckouts} departure{selectedCheckouts > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => navigate("/receptionist/calendar")}
          className="mt-2 text-xs w-full py-1.5 rounded-lg transition-colors"
          style={{ color: "#0d7377", background: "#e2f3f2" }}
        >
          Full Calendar →
        </button>
      </div>
    </div>
  );
}

const STATS = [
  {
    label: "Occupied Rooms",
    value: "32",
    total: "48",
    icon: BedDouble,
    color: "#0d7377",
    bg: "#e2f3f2",
    pct: 67,
  },
  {
    label: "Today's Check-ins",
    value: "8",
    icon: Users,
    color: "#f97316",
    bg: "#fff7ed",
    pct: null,
  },
  {
    label: "Revenue Today",
    value: "₱48,500",
    icon: CreditCard,
    color: "#14b8a6",
    bg: "#f0fdfa",
    pct: null,
  },
  {
    label: "Monthly Revenue",
    value: "₱1.2M",
    icon: TrendingUp,
    color: "#06b6d4",
    bg: "#ecfeff",
    pct: null,
  },
];

const QUICK_ACTIONS = [
  {
    label: "New Walk-in",
    path: "/receptionist/walkin",
    color: "#0d7377",
  },
  {
    label: "Check Room Availability",
    path: "/receptionist/availability",
    color: "#14b8a6",
  },
  {
    label: "Process Payment",
    path: "/receptionist/payments",
    color: "#f97316",
  },
  {
    label: "View Reports",
    path: "/receptionist/reports",
    color: "#06b6d4",
  },
];

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  "checked-in": {
    label: "Checked In",
    color: "#0d7377",
    bg: "#e2f3f2",
    icon: Check,
  },
  confirmed: {
    label: "Confirmed",
    color: "#06b6d4",
    bg: "#ecfeff",
    icon: Clock,
  },
  unpaid: {
    label: "Unpaid",
    color: "#f97316",
    bg: "#fff7ed",
    icon: Clock,
  },
  pending: { label: "Pending", color: "#f97316", bg: "#fff7ed", icon: Clock },
  cancelled: { label: "Cancelled", color: "#d4183d", bg: "#fef2f2", icon: X },
};

export default function ReceptionistsDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const snapshot = await getDocs(collection(customerDb, "Bookings"));

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBookings(data);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a2e2e 0%, #0d7377 100%)",
        }}
      >
        <div className="absolute right-0 top-0 opacity-10">
          <Waves className="w-48 h-48 -mr-8 -mt-8" />
        </div>
        <div className="relative z-10">
          <p className="text-teal-300 text-sm mb-1">Sunday, June 7, 2026</p>
          <h2
            className="text-2xl mb-1"
            style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}
          >
            Good morning, Maria!
          </h2>
          <p className="text-teal-200 text-sm">
            You have 8 check-ins and 3 check-outs scheduled today.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 border"
              style={{ borderColor: "rgba(13,115,119,0.1)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: stat.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                {stat.pct !== null && (
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: stat.bg, color: stat.color }}
                  >
                    {stat.pct}%
                  </span>
                )}
              </div>
              <div
                className="text-2xl mb-0.5"
                style={{
                  color: "#0a2e2e",
                  fontFamily: "Georgia, serif",
                  fontWeight: 400,
                }}
              >
                {stat.value}
                {stat.total && (
                  <span className="text-base" style={{ color: "#4a7a7a" }}>
                    {" "}
                    / {stat.total}
                  </span>
                )}
              </div>
              <div className="text-sm" style={{ color: "#4a7a7a" }}>
                {stat.label}
              </div>
              {stat.pct !== null && (
                <div
                  className="mt-3 h-1.5 rounded-full"
                  style={{ background: "#e2f3f2" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${stat.pct}%`, background: stat.color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div
          className="lg:col-span-2 bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Recent Bookings
            </h3>
            <button
              onClick={() => navigate("/receptionist/reservations")}
              className="text-sm flex items-center gap-1 transition-colors"
              style={{ color: "#0d7377" }}
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#f0f9f8" }}>
                  {["ID", "Guest", "Room", "Dates", "Status", "Amount"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs"
                        style={{ color: "#4a7a7a", fontWeight: 500 }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any, i) => {
                  const s = STATUS_CONFIG[b.status];
                  const Icon = s.icon;
                  return (
                    <tr
                      key={b.bookingRef}
                      style={{
                        borderTop:
                          i > 0 ? "1px solid rgba(13,115,119,0.08)" : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 text-sm font-mono"
                        style={{ color: "#0d7377" }}
                      >
                        {b.bookingRef}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "#0a2e2e" }}
                      >
                        {b.customerName}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "#4a7a7a" }}
                      >
                        {b.roomName}
                      </td>
                      <td
                        className="px-4 py-3 text-sm whitespace-nowrap"
                        style={{ color: "#4a7a7a" }}
                      >
                        {b.checkIn} – {b.checkOut}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                          style={{ background: s.bg, color: s.color }}
                        >
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: "#0a2e2e" }}
                      >
                        ₱{b.totalPrice?.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions + mini cal + today's schedule */}
        <div className="space-y-4">
          <MiniCal bookings={bookings} />

          <div
            className="bg-white rounded-xl border p-5"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium mb-4"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Quick Actions
            </h3>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all"
                  style={{
                    borderColor: "rgba(13,115,119,0.15)",
                    color: "#0a2e2e",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#f0f9f8";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      a.color;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(13,115,119,0.15)";
                  }}
                >
                  <span>{a.label}</span>
                  <ArrowRight className="w-4 h-4" style={{ color: a.color }} />
                </button>
              ))}
            </div>
          </div>

          <div
            className="bg-white rounded-xl border p-5"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium mb-4"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Today's Schedule
            </h3>
            <div className="space-y-3">
              {[
                {
                  time: "08:00",
                  event: "Check-in: Villanueva (Suite 12)",
                  type: "in",
                },
                { time: "09:30", event: "Check-in: Tan (Room 8)", type: "in" },
                {
                  time: "11:00",
                  event: "Check-out: Garcia (Cabin 2)",
                  type: "out",
                },
                {
                  time: "14:00",
                  event: "Walk-in inquiry: 3 pax",
                  type: "info",
                },
                {
                  time: "16:00",
                  event: "Check-in: Reyes (Room 3)",
                  type: "in",
                },
              ].map((s) => (
                <div key={s.time} className="flex items-start gap-3">
                  <span
                    className="text-xs font-mono mt-0.5 flex-shrink-0"
                    style={{ color: "#4a7a7a" }}
                  >
                    {s.time}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      background:
                        s.type === "in"
                          ? "#14b8a6"
                          : s.type === "out"
                            ? "#f97316"
                            : "#06b6d4",
                    }}
                  />
                  <span className="text-sm" style={{ color: "#0a2e2e" }}>
                    {s.event}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
