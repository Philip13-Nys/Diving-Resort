import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Loader2,
} from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  startOfDay,
  isSameDay,
  differenceInDays,
} from "date-fns";

import { collection, getDocs } from "firebase/firestore";
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
  services: string[];
  packages: string[];
  addOns: string[];
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

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return isNaN(date.getTime()) ? null : startOfDay(date);
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : startOfDay(value);
  }

  const stringValue = String(value);
  let date = new Date(`${stringValue}T00:00:00`);

  if (isNaN(date.getTime())) {
    date = new Date(stringValue);
  }

  return isNaN(date.getTime()) ? null : startOfDay(date);
}

function getItemNames(value: unknown): string[] {
  if (!value) return [];

  const items = Array.isArray(value) ? value : [value];

  return items
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "number") return String(item);

      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;

        const name =
          obj.name ??
          obj.serviceName ??
          obj.packageName ??
          obj.title ??
          obj.label;

        if (name) return String(name).trim();
      }

      return "";
    })
    .filter(Boolean);
}

function getAddOnDetails(value: unknown): {
  services: string[];
  packages: string[];
  other: string[];
} {
  const items = Array.isArray(value) ? value : value ? [value] : [];

  const services: string[] = [];
  const packages: string[] = [];
  const other: string[] = [];

  items.forEach((item) => {
    if (typeof item === "string") {
      other.push(item.trim());
      return;
    }

    if (typeof item !== "object" || item === null) return;

    const obj = item as Record<string, unknown>;

    const name = String(
      obj.name ??
        obj.serviceName ??
        obj.packageName ??
        obj.title ??
        obj.label ??
        "",
    ).trim();

    if (!name) return;

    const category = String(
      obj.type ?? obj.category ?? obj.itemType ?? "",
    ).toLowerCase();

    if (category.includes("package")) {
      packages.push(name);
    } else if (category.includes("service")) {
      services.push(name);
    } else {
      other.push(name);
    }
  });

  return { services, packages, other };
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
  const weekEndExclusive = addDays(weekDays[6], 1);

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

export default function CalendarView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [anchor, setAnchor] = useState(new Date());
  const [hovered, setHovered] = useState<string | null>(null);

  const [filterRoom, setFilterRoom] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

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

        if (!checkIn || !checkOut || checkOut <= checkIn) {
          return;
        }

        const room = String(data.room ?? data.roomName ?? "").trim();

        if (!room) return;

        const roomType = String(data.roomType ?? "").trim();
        roomMap.set(room, roomType);
        const status = String(data.status ?? "pending");
        const addOnDetails = getAddOnDetails(data.addOns);

        const services = [
          ...getItemNames(data.services),
          ...getItemNames(data.selectedServices),
          ...getItemNames(data.selectedService),
          ...addOnDetails.services,
        ];

        const packages = [
          ...getItemNames(data.packages),
          ...getItemNames(data.selectedPackages),
          ...getItemNames(data.selectedPackage),
          ...getItemNames(data.packageName),
          ...addOnDetails.packages,
        ];

        bookingData.push({
          id: docSnap.id,
          room,
          guest: String(data.guest ?? data.customerName ?? "Unknown Guest"),
          roomType,
          checkIn,
          checkOut,
          color:
            typeof data.calendarColor === "string"
              ? data.calendarColor
              : BOOKING_COLORS[index % BOOKING_COLORS.length],
          status,
          services: [...new Set(services)],
          packages: [...new Set(packages)],
          addOns: [...new Set(addOnDetails.other)],
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

  const filteredBookings = useMemo(() => {
    if (filterRoom === "All") {
      return bookings;
    }

    return bookings.filter((booking) => booking.room === filterRoom);
  }, [bookings, filterRoom]);

  const weekDays = getWeekDays(anchor);
  const rangeLabel = `${format(
    weekDays[0],
    "MMM d",
  )} – ${format(weekDays[6], "MMM d")}`;

  const monthLabel = format(anchor, "MMMM yyyy");
  const ROOM_COL_W = 140;

  const exportCalendar = () => {
    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const lines = [
      "Booking Calendar",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      [
        "Booking ID",
        "Guest",
        "Room",
        "Room Type",
        "Check In",
        "Check Out",
        "Status",
        "Services",
        "Packages",
        "Other Add-ons",
      ]
        .map(escapeCSV)
        .join(","),
      ...filteredBookings.map((booking) =>
        [
          booking.id,
          booking.guest,
          booking.room,
          booking.roomType,
          format(booking.checkIn, "yyyy-MM-dd"),
          format(booking.checkOut, "yyyy-MM-dd"),
          booking.status,
          booking.services.join("; "),
          booking.packages.join("; "),
          booking.addOns.join("; "),
        ]
          .map(escapeCSV)
          .join(","),
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
    <div className="flex flex-col h-full min-h-0 w-full">
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div
        className="bg-white rounded-xl border mb-4 px-5 py-3 flex items-center gap-4 flex-wrap shrink-0"
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

          <span className="text-sm" style={{ color: "#4a7a7a" }}>
            {monthLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm px-2" style={{ color: "#0a2e2e" }}>
            {rangeLabel}
          </span>

          <button
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
            aria-label="Next week"
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
          <div className="relative">
            <button
              onClick={() => setFilterOpen((open) => !open)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div
        className="bg-white rounded-xl border flex-1 min-h-0 overflow-hidden"
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
            className="w-full h-full overflow-auto"
            style={{
              maxHeight: "calc(100vh - 220px)",
            }}
          >
            <div
              style={{
                width: "100%",
                minWidth: ROOM_COL_W + 700,
              }}
            >
              <div
                className="flex sticky top-0 z-20 bg-white border-b"
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

                <div className="flex-1 grid grid-cols-7 min-w-0">
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, today);

                    return (
                      <div
                        key={day.toISOString()}
                        className="text-center py-2 border-r"
                        style={{
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
              </div>

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
                      <div
                        className="flex-shrink-0 px-4 py-3 border-r flex flex-col justify-center"
                        style={{
                          width: ROOM_COL_W,
                          borderColor: "rgba(13,115,119,0.1)",
                          minHeight: 74,
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

                      <div
                        className="relative flex-1 grid grid-cols-7 min-w-0"
                        style={{ minHeight: 74 }}
                      >
                        {weekDays.map((day) => {
                          const isToday = isSameDay(day, today);

                          return (
                            <div
                              key={day.toISOString()}
                              className="border-r"
                              style={{
                                borderColor: "rgba(13,115,119,0.08)",
                                background: isToday
                                  ? "rgba(13,115,119,0.03)"
                                  : "transparent",
                              }}
                            />
                          );
                        })}

                        <div
                          className="absolute inset-0"
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
                              const left = `${(colStart / 7) * 100}%`;
                              const width = `${(colSpan / 7) * 100}%`;
                              const isHovered = hovered === booking.id;
                              const isCancelled =
                                booking.status.toLowerCase() === "cancelled";

                              const hoverText = [
                                booking.guest,
                                `Room: #${booking.room} ${booking.roomType}`,
                                `Check-in: ${format(
                                  booking.checkIn,
                                  "MMM d, yyyy",
                                )}`,
                                `Check-out: ${format(
                                  booking.checkOut,
                                  "MMM d, yyyy",
                                )}`,
                                `Status: ${booking.status}`,
                                `Services: ${
                                  booking.services.join(", ") || "None"
                                }`,
                                `Packages: ${
                                  booking.packages.join(", ") || "None"
                                }`,
                                ...(booking.addOns.length
                                  ? [
                                      `Other add-ons: ${booking.addOns.join(
                                        ", ",
                                      )}`,
                                    ]
                                  : []),
                              ].join("\n");

                              return (
                                <div
                                  key={booking.id}
                                  style={{
                                    position: "absolute",
                                    left,
                                    width,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    height: 36,
                                    boxSizing: "border-box",
                                    background: booking.color,
                                    borderRadius: startsBeforeWeek
                                      ? "0 6px 6px 0"
                                      : endsAfterWeek
                                        ? "6px 0 0 6px"
                                        : 6,
                                    display: "flex",
                                    alignItems: "center",
                                    paddingLeft: 10,
                                    paddingRight: 8,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    opacity: isCancelled
                                      ? 0.35
                                      : isHovered
                                        ? 0.88
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
                                    zIndex: isHovered ? 50 : 1,
                                  }}
                                  onMouseEnter={() => setHovered(booking.id)}
                                  onMouseLeave={() => setHovered(null)}
                                  title={hoverText}
                                >
                                  <span
                                    className="text-xs font-medium text-white"
                                    style={{
                                      userSelect: "none",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "100%",
                                    }}
                                  >
                                    {booking.guest}
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
