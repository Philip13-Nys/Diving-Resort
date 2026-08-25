import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  differenceInDays,
} from "date-fns";

import { collection, getDocs, addDoc } from "firebase/firestore";

import { customerDb } from "../app/firebase";

type Room = {
  id: string;
  type: string;
};

type Booking = {
  id: string;
  room: string;
  guest: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  color: string;
  status: string;
};

const BOOKING_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;

  // Firestore Timestamp
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();

    return isNaN(date.getTime()) ? null : date;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const stringValue = String(value);

  let date = new Date(`${stringValue}T00:00:00`);

  if (isNaN(date.getTime())) {
    date = new Date(stringValue);
  }

  return isNaN(date.getTime()) ? null : date;
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, {
    weekStartsOn: 0,
  });

  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

interface BookingBar {
  booking: Booking;
  colStart: number;
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
  const weekEndExclusive = addDays(weekEnd, 1);

  return bookings
    .filter(
      (b) =>
        b.room === room &&
        b.checkIn < weekEndExclusive &&
        b.checkOut > weekStart,
    )
    .map((b) => {
      const startsBeforeWeek = b.checkIn < weekStart;

      const endsAfterWeek = b.checkOut > weekEndExclusive;

      const visibleStart = startsBeforeWeek ? weekStart : b.checkIn;

      const visibleEnd = endsAfterWeek ? weekEndExclusive : b.checkOut;

      const colStart = clamp(differenceInDays(visibleStart, weekStart), 0, 6);

      const colSpan = clamp(
        differenceInDays(visibleEnd, visibleStart),
        1,
        7 - colStart,
      );

      return {
        booking: b,
        colStart,
        colSpan,
        startsBeforeWeek,
        endsAfterWeek,
      };
    });
}

function NewBookingModal({
  rooms,
  onClose,
  onSave,
}: {
  rooms: Room[];
  onClose: () => void;
  onSave: (booking: {
    room: string;
    guest: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    color: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    room: rooms[0]?.id || "",
    guest: "",
    checkIn: "",
    checkOut: "",
    color: BOOKING_COLORS[0],
  });

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const update = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const selectedRoom = rooms.find((room) => room.id === form.room);

  const COLORS = BOOKING_COLORS;

  const handleSave = async () => {
    setError("");

    if (!form.room || !form.guest.trim() || !form.checkIn || !form.checkOut) {
      setError("Please complete all required fields.");
      return;
    }

    const checkInDate = new Date(`${form.checkIn}T00:00:00`);

    const checkOutDate = new Date(`${form.checkOut}T00:00:00`);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      setError("Invalid check-in or check-out date.");
      return;
    }

    if (checkOutDate <= checkInDate) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    try {
      setSaving(true);

      await onSave({
        room: form.room,
        guest: form.guest.trim(),
        roomType: selectedRoom?.type || "",
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        color: form.color,
      });
    } catch (err) {
      console.error(err);
      setError("Unable to save the booking.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <h3
            style={{
              fontFamily: "Georgia, serif",
              color: "#0a2e2e",
            }}
          >
            New Booking
          </h3>

          <button
            onClick={onClose}
            disabled={saving}
            style={{ color: "#4a7a7a" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Room */}
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Room *
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
                disabled={saving}
              >
                {rooms.length === 0 ? (
                  <option value="">No rooms found</option>
                ) : (
                  rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      #{room.id} {room.type ? `- ${room.type}` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Guest */}
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Guest Name *
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
                disabled={saving}
              />
            </div>

            {/* Check-in */}
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Check-in *
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
                disabled={saving}
              />
            </div>

            {/* Check-out */}
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Check-out *
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
                disabled={saving}
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs mb-2" style={{ color: "#4a7a7a" }}>
              Calendar Color
            </label>

            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update("color", color)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    background: color,
                    borderColor:
                      form.color === color ? "#0a2e2e" : "transparent",
                  }}
                  disabled={saving}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex justify-end gap-3 px-6 py-4 border-t"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || rooms.length === 0}
            className="px-5 py-2 rounded-lg text-sm text-white flex items-center gap-2"
            style={{
              background: "#0d7377",
            }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}

            {saving ? "Saving..." : "Save Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [anchor, setAnchor] = useState(new Date());

  const [hovered, setHovered] = useState<string | null>(null);

  const [newModal, setNewModal] = useState(false);

  const [filterRoom, setFilterRoom] = useState("All");

  const [filterOpen, setFilterOpen] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(collection(customerDb, "Bookings"));

      const bookingData: Booking[] = [];

      const roomMap = new Map<string, string>();

      snapshot.docs.forEach((docSnap, index) => {
        const data = docSnap.data();

        const checkIn = normalizeDate(data.checkIn);

        const checkOut = normalizeDate(data.checkOut);

        if (!checkIn || !checkOut) {
          return;
        }

        const room = String(data.room ?? data.roomName ?? "").trim();

        if (!room) {
          return;
        }

        const roomType = String(data.roomType ?? "").trim();

        roomMap.set(room, roomType);

        const status = String(data.status ?? "pending");

        bookingData.push({
          id: docSnap.id,

          room,

          guest: data.guest ?? data.customerName ?? "Unknown Guest",

          roomType,

          checkIn,
          checkOut,

          color: BOOKING_COLORS[index % BOOKING_COLORS.length],

          status,
        });
      });

      const roomData = Array.from(roomMap.entries())
        .map(([id, type]) => ({
          id,
          type: type || "Room",
        }))
        .sort((a, b) =>
          a.id.localeCompare(b.id, undefined, {
            numeric: true,
          }),
        );

      setBookings(bookingData);

      setRooms(roomData);
    } catch (err) {
      console.error("Error loading calendar:", err);

      setError("Unable to load booking data from Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBooking = async (form: {
    room: string;
    guest: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    color: string;
  }) => {
    const start = new Date(`${form.checkIn}T00:00:00`);

    const end = new Date(`${form.checkOut}T00:00:00`);

    const nights = Math.max(1, differenceInDays(end, start));

    /*
     * The document is written using the same
     * field names used by your other Booking pages.
     */
    await addDoc(collection(customerDb, "Bookings"), {
      guest: form.guest,

      customerName: form.guest,

      room: form.room,

      roomName: form.room,

      roomType: form.roomType,

      email: "",

      phone: "",

      checkIn: form.checkIn,

      checkOut: form.checkOut,

      nights,

      pax: 1,

      guests: 1,

      status: "pending",

      amount: 0,

      total: 0,

      totalAmount: 0,

      totalPrice: 0,

      paid: 0,

      amountPaid: 0,

      notes: "",

      calendarColor: form.color,
    });

    await loadCalendarData();

    setNewModal(false);
  };

  const filteredBookings = useMemo(() => {
    if (filterRoom === "All") {
      return bookings;
    }

    return bookings.filter((booking) => booking.room === filterRoom);
  }, [bookings, filterRoom]);

  const weekDays = getWeekDays(anchor);

  const rangeLabel = `${format(weekDays[0], "MMM d")} – ${format(
    weekDays[6],
    "MMM d",
  )}`;

  const monthLabel = format(anchor, "MMMM yyyy");

  const ROOM_COL_W = 140;
  const DAY_COL_W = 110;

  const exportCalendar = () => {
    const lines = [
      "Booking Calendar",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Booking ID,Guest,Room,Room Type,Check In,Check Out,Status",
      ...filteredBookings.map(
        (booking) =>
          `"${booking.id}","${booking.guest}","${booking.room}","${booking.roomType}","${format(
            booking.checkIn,
            "yyyy-MM-dd",
          )}","${format(booking.checkOut, "yyyy-MM-dd")}","${booking.status}"`,
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "booking-calendar.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading booking calendar...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-0">
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {newModal && (
        <NewBookingModal
          rooms={rooms}
          onClose={() => setNewModal(false)}
          onSave={handleSaveBooking}
        />
      )}

      {/* Top bar */}
      <div
        className="bg-white rounded-xl border mb-4 px-5 py-3 flex items-center gap-4 flex-wrap"
        style={{
          borderColor: "rgba(13,115,119,0.1)",
        }}
      >
        <div className="flex items-center gap-2">
          <h2
            className="text-base font-medium"
            style={{
              color: "#0a2e2e",
              fontFamily: "Georgia, serif",
            }}
          >
            Booking Calendar
          </h2>

          <span
            className="text-sm"
            style={{
              color: "#4a7a7a",
            }}
          >
            {monthLabel}
          </span>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span
            className="text-sm px-2"
            style={{
              color: "#0a2e2e",
            }}
          >
            {rangeLabel}
          </span>

          <button
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAnchor(today)}
            className="px-2 py-1 rounded-lg text-xs border"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#0d7377",
            }}
          >
            Today
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Room filter */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm"
              style={{
                borderColor: "rgba(13,115,119,0.2)",
                color: "#4a7a7a",
              }}
            >
              <Filter className="w-3.5 h-3.5" />

              {filterRoom === "All" ? "All" : `Room ${filterRoom}`}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-30 min-w-36">
                <button
                  onClick={() => {
                    setFilterRoom("All");
                    setFilterOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  All Rooms
                </button>

                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      setFilterRoom(room.id);
                      setFilterOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    #{room.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={exportCalendar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            onClick={() => setNewModal(true)}
            disabled={rooms.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm text-white disabled:opacity-50"
            style={{
              background: "#0d7377",
            }}
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className="bg-white rounded-xl border overflow-hidden flex-1"
        style={{
          borderColor: "rgba(13,115,119,0.1)",
        }}
      >
        {rooms.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-500">
            No room records were found in your Bookings collection.
          </div>
        ) : (
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{
              maxHeight: "calc(100vh - 220px)",
            }}
          >
            <div
              style={{
                minWidth: ROOM_COL_W + DAY_COL_W * 7,
              }}
            >
              {/* Header */}
              <div
                className="flex sticky top-0 z-10 bg-white border-b"
                style={{
                  borderColor: "rgba(13,115,119,0.1)",
                }}
              >
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
                      <div
                        className="text-xs"
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
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

              {/* Rooms */}
              {rooms
                .filter(
                  (room) => filterRoom === "All" || room.id === filterRoom,
                )
                .map((room, roomIndex) => {
                  const bars = getBookingBars(
                    filteredBookings,
                    room.id,
                    weekDays,
                  );

                  return (
                    <div
                      key={room.id}
                      className="flex border-b"
                      style={{
                        borderColor: "rgba(13,115,119,0.08)",

                        background: roomIndex % 2 === 0 ? "#fff" : "#fafefe",
                      }}
                    >
                      {/* Room */}
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
                          style={{
                            color: "#0a2e2e",
                          }}
                        >
                          #{room.id}
                        </span>

                        <span
                          className="text-xs"
                          style={{
                            color: "#4a7a7a",
                          }}
                        >
                          {room.type}
                        </span>
                      </div>

                      {/* Days */}
                      <div
                        className="relative flex-1 flex"
                        style={{
                          minHeight: 56,
                        }}
                      >
                        {weekDays.map((day) => {
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

                        {/* Booking bars */}
                        <div
                          className="absolute inset-0 flex items-center"
                          style={{
                            pointerEvents: "none",
                          }}
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
                                colStart * DAY_COL_W +
                                (startsBeforeWeek ? 0 : 6);

                              const width =
                                colSpan * DAY_COL_W -
                                (startsBeforeWeek ? 0 : 6) -
                                (endsAfterWeek ? 0 : 6);

                              const isHovered = hovered === booking.id;

                              const isCancelled =
                                booking.status.toLowerCase() === "cancelled";

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

                                    paddingRight: 6,

                                    overflow: "hidden",

                                    cursor: "pointer",

                                    opacity: isCancelled
                                      ? 0.35
                                      : isHovered
                                        ? 0.85
                                        : 1,

                                    textDecoration: isCancelled
                                      ? "line-through"
                                      : "none",

                                    boxShadow: isHovered
                                      ? "0 2px 8px rgba(0,0,0,0.18)"
                                      : "0 1px 3px rgba(0,0,0,0.12)",

                                    transition:
                                      "opacity 0.15s, box-shadow 0.15s",

                                    pointerEvents: "auto",

                                    zIndex: 1,
                                  }}
                                  onMouseEnter={() => setHovered(booking.id)}
                                  onMouseLeave={() => setHovered(null)}
                                  title={`${booking.guest} | ${format(
                                    booking.checkIn,
                                    "MMM d",
                                  )} – ${format(
                                    booking.checkOut,
                                    "MMM d",
                                  )} | ${booking.status}`}
                                >
                                  <span
                                    className="text-xs font-medium text-white truncate"
                                    style={{
                                      userSelect: "none",
                                    }}
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
        )}
      </div>
    </div>
  );
}
