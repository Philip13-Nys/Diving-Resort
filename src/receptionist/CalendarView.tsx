import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Plus,
  X,
} from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  differenceInDays,
} from "date-fns";

const ROOMS = [
  { id: "101", type: "Standard" },
  { id: "102", type: "Standard" },
  { id: "103", type: "Deluxe" },
  { id: "201", type: "Deluxe" },
  { id: "202", type: "Suite" },
  { id: "203", type: "Suite" },
  { id: "301", type: "Ocean View" },
  { id: "302", type: "Ocean View" },
  { id: "401", type: "Beachfront Suite" },
  { id: "402", type: "Beachfront Suite" },
];

interface Booking {
  id: string;
  room: string;
  guest: string;
  checkIn: Date;
  checkOut: Date;
  color: string;
}

const BOOKINGS: Booking[] = [
  {
    id: "BK-2401",
    room: "101",
    guest: "James Villanueva",
    checkIn: new Date(2026, 5, 7),
    checkOut: new Date(2026, 5, 10),
    color: "#22c55e",
  },
  {
    id: "BK-2402",
    room: "201",
    guest: "Linda Tan",
    checkIn: new Date(2026, 5, 7),
    checkOut: new Date(2026, 5, 9),
    color: "#3b82f6",
  },
  {
    id: "BK-2403",
    room: "103",
    guest: "Mark Reyes",
    checkIn: new Date(2026, 5, 8),
    checkOut: new Date(2026, 5, 12),
    color: "#f97316",
  },
  {
    id: "BK-2404",
    room: "102",
    guest: "Sofia Cruz",
    checkIn: new Date(2026, 5, 9),
    checkOut: new Date(2026, 5, 11),
    color: "#3b82f6",
  },
  {
    id: "BK-2405",
    room: "202",
    guest: "Ryan Lim",
    checkIn: new Date(2026, 5, 10),
    checkOut: new Date(2026, 5, 14),
    color: "#a855f7",
  },
  {
    id: "BK-2406",
    room: "301",
    guest: "Ana Gomez",
    checkIn: new Date(2026, 5, 12),
    checkOut: new Date(2026, 5, 15),
    color: "#14b8a6",
  },
  {
    id: "BK-2407",
    room: "401",
    guest: "Paolo Santos",
    checkIn: new Date(2026, 5, 14),
    checkOut: new Date(2026, 5, 18),
    color: "#22c55e",
  },
  {
    id: "BK-2408",
    room: "302",
    guest: "Karen Wu",
    checkIn: new Date(2026, 5, 5),
    checkOut: new Date(2026, 5, 8),
    color: "#ec4899",
  },
  {
    id: "BK-2409",
    room: "203",
    guest: "Aisha Reyes",
    checkIn: new Date(2026, 5, 3),
    checkOut: new Date(2026, 5, 6),
    color: "#ef4444",
  },
  {
    id: "BK-2410",
    room: "103",
    guest: "Thomas Lee",
    checkIn: new Date(2026, 5, 4),
    checkOut: new Date(2026, 5, 6),
    color: "#f59e0b",
  },
  {
    id: "BK-2411",
    room: "301",
    guest: "Elena Cruz",
    checkIn: new Date(2026, 5, 4),
    checkOut: new Date(2026, 5, 6),
    color: "#14b8a6",
  },
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

interface BookingBar {
  booking: Booking;
  colStart: number; // 0-indexed within the week
  colSpan: number;
  startsBeforeWeek: boolean;
  endsAfterWeek: boolean;
}

function getBookingBars(
  bookings: Booking[],
  room: string,
  weekDays: Date[],
): BookingBar[] {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  return bookings
    .filter(
      (b) =>
        b.room === room &&
        b.checkIn < addDays(weekEnd, 1) &&
        b.checkOut > weekStart,
    )
    .map((b) => {
      const startsBeforeWeek = b.checkIn < weekStart;
      const endsAfterWeek = b.checkOut > addDays(weekEnd, 1);
      const visibleStart = startsBeforeWeek ? weekStart : b.checkIn;
      const visibleEnd = endsAfterWeek ? addDays(weekEnd, 1) : b.checkOut;
      const colStart = clamp(differenceInDays(visibleStart, weekStart), 0, 6);
      const colSpan = clamp(
        differenceInDays(visibleEnd, visibleStart),
        1,
        7 - colStart,
      );
      return { booking: b, colStart, colSpan, startsBeforeWeek, endsAfterWeek };
    });
}

function NewBookingModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (b: Booking) => void;
}) {
  const [form, setForm] = useState({
    room: "101",
    guest: "",
    checkIn: "",
    checkOut: "",
    color: "#22c55e",
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f97316",
    "#a855f7",
    "#14b8a6",
    "#ec4899",
    "#ef4444",
    "#f59e0b",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3 style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}>
            New Booking
          </h3>
          <button onClick={onClose} style={{ color: "#4a7a7a" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Room
              </label>
              <select
                value={form.room}
                onChange={(e) => update("room", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              >
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} {r.type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Guest Name
              </label>
              <input
                type="text"
                value={form.guest}
                onChange={(e) => update("guest", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Check-in
              </label>
              <input
                type="date"
                value={form.checkIn}
                onChange={(e) => update("checkIn", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Check-out
              </label>
              <input
                type="date"
                value={form.checkOut}
                onChange={(e) => update("checkOut", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: "#4a7a7a" }}>
              Color
            </label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update("color", c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: form.color === c ? "#0a2e2e" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div
          className="flex justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.guest || !form.checkIn || !form.checkOut) return;
              onSave({
                id: `BK-${Date.now()}`,
                room: form.room,
                guest: form.guest,
                checkIn: new Date(form.checkIn),
                checkOut: new Date(form.checkOut),
                color: form.color,
              });
            }}
            className="px-5 py-2 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Save Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const today = new Date(2026, 5, 5);
  const [anchor, setAnchor] = useState(today);
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);
  const [hovered, setHovered] = useState<string | null>(null);
  const [newModal, setNewModal] = useState(false);

  const weekDays = getWeekDays(anchor);
  const rangeLabel = `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d")}`;
  const monthLabel = format(anchor, "MMMM yyyy");

  const ROOM_COL_W = 140;
  const DAY_COL_W = 110;

  return (
    <div className="flex flex-col h-full space-y-0">
      {newModal && (
        <NewBookingModal
          onClose={() => setNewModal(false)}
          onSave={(b) => {
            setBookings((prev) => [...prev, b]);
            setNewModal(false);
          }}
        />
      )}

      {/* Top bar */}
      <div
        className="bg-white rounded-xl border mb-4 px-5 py-3 flex items-center gap-4 flex-wrap"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <h2
            className="text-base font-medium"
            style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
          >
            Booking Calendar
          </h2>
          <span className="text-sm" style={{ color: "#4a7a7a" }}>
            {monthLabel}
          </span>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#f0f9f8")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm px-2" style={{ color: "#0a2e2e" }}>
            {rangeLabel}
          </span>
          <button
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#f0f9f8")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            <Filter className="w-3.5 h-3.5" /> All
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm text-white transition-colors"
            style={{ background: "#0d7377" }}
          >
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className="bg-white rounded-xl border overflow-hidden flex-1"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        >
          <div style={{ minWidth: ROOM_COL_W + DAY_COL_W * 7 }}>
            {/* Header row */}
            <div
              className="flex sticky top-0 z-10 bg-white border-b"
              style={{ borderColor: "rgba(13,115,119,0.1)" }}
            >
              {/* Room label col */}
              <div
                className="flex-shrink-0 px-4 py-3 text-xs font-medium border-r"
                style={{
                  width: ROOM_COL_W,
                  color: "#4a7a7a",
                  borderColor: "rgba(13,115,119,0.1)",
                }}
              >
                Room
              </div>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-shrink-0 text-center py-2 border-r"
                    style={{
                      width: DAY_COL_W,
                      borderColor: "rgba(13,115,119,0.08)",
                      background: isToday ? "#f0fffe" : undefined,
                    }}
                  >
                    <div className="text-xs" style={{ color: "#4a7a7a" }}>
                      {DAYS_SHORT[day.getDay()]}
                    </div>
                    <div
                      className="w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-sm"
                      style={{
                        background: isToday ? "#0d7377" : "transparent",
                        color: isToday ? "#fff" : "#0a2e2e",
                        fontWeight: isToday ? 600 : 400,
                      }}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room rows */}
            {ROOMS.map((room, ri) => {
              const bars = getBookingBars(bookings, room.id, weekDays);
              return (
                <div
                  key={room.id}
                  className="flex border-b"
                  style={{
                    borderColor: "rgba(13,115,119,0.08)",
                    background: ri % 2 === 0 ? "#fff" : "#fafefe",
                  }}
                >
                  {/* Room label */}
                  <div
                    className="flex-shrink-0 px-4 py-3 border-r flex flex-col justify-center"
                    style={{
                      width: ROOM_COL_W,
                      borderColor: "rgba(13,115,119,0.1)",
                      minHeight: 56,
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#0a2e2e" }}
                    >
                      #{room.id}
                    </span>
                    <span className="text-xs" style={{ color: "#4a7a7a" }}>
                      {room.type}
                    </span>
                  </div>

                  {/* Day cells with booking bars */}
                  <div
                    className="relative flex-1 flex"
                    style={{ minHeight: 56 }}
                  >
                    {/* Day column borders */}
                    {weekDays.map((day, di) => {
                      const isToday = isSameDay(day, today);
                      return (
                        <div
                          key={day.toISOString()}
                          className="flex-shrink-0 border-r"
                          style={{
                            width: DAY_COL_W,
                            borderColor: "rgba(13,115,119,0.08)",
                            background: isToday
                              ? "rgba(13,115,119,0.03)"
                              : "transparent",
                          }}
                        />
                      );
                    })}

                    {/* Booking bars overlaid */}
                    <div
                      className="absolute inset-0 flex items-center"
                      style={{ pointerEvents: "none" }}
                    >
                      {bars.map(
                        ({
                          booking,
                          colStart,
                          colSpan,
                          startsBeforeWeek,
                          endsAfterWeek,
                        }) => {
                          const left =
                            colStart * DAY_COL_W + (startsBeforeWeek ? 0 : 6);
                          const width =
                            colSpan * DAY_COL_W -
                            (startsBeforeWeek ? 0 : 6) -
                            (endsAfterWeek ? 0 : 6);
                          const isHov = hovered === booking.id;
                          return (
                            <div
                              key={booking.id}
                              style={{
                                position: "absolute",
                                left,
                                width,
                                top: "50%",
                                transform: "translateY(-50%)",
                                height: 32,
                                background: booking.color,
                                borderRadius: startsBeforeWeek
                                  ? "0 6px 6px 0"
                                  : endsAfterWeek
                                    ? "6px 0 0 6px"
                                    : 6,
                                display: "flex",
                                alignItems: "center",
                                paddingLeft: 10,
                                overflow: "hidden",
                                cursor: "pointer",
                                opacity: isHov ? 0.85 : 1,
                                boxShadow: isHov
                                  ? "0 2px 8px rgba(0,0,0,0.18)"
                                  : "0 1px 3px rgba(0,0,0,0.12)",
                                transition: "opacity 0.15s, box-shadow 0.15s",
                                pointerEvents: "auto",
                                zIndex: 1,
                              }}
                              onMouseEnter={() => setHovered(booking.id)}
                              onMouseLeave={() => setHovered(null)}
                              title={`${booking.guest} | ${format(booking.checkIn, "MMM d")} – ${format(booking.checkOut, "MMM d")}`}
                            >
                              <span
                                className="text-xs font-medium text-white truncate"
                                style={{ userSelect: "none" }}
                              >
                                {booking.guest.split(" ")[0]}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
