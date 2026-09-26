import { useEffect, useMemo, useState } from "react";
import { BedDouble, Waves, Trees, Anchor, Loader2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db, customerDb } from "../app/firebase";

type RoomStatus =
  | "available"
  | "occupied"
  | "checkout-today"
  | "maintenance"
  | "reserved";

interface Room {
  id: string;
  firestoreId: string;
  type: string;
  capacity: number;
  floor: number;
  rate: number;
  status: RoomStatus;
  guest?: string;
  checkOut?: string;
  features: string[];
}

interface BookingRecord {
  id: string;
  room: string;
  roomId?: string;
  roomType?: string;
  guest: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

const STATUS_CONFIG: Record<
  RoomStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  available: {
    label: "Available",
    color: "#0d7377",
    bg: "#e2f3f2",
    border: "#0d7377",
  },

  occupied: {
    label: "Occupied",
    color: "#d4183d",
    bg: "#fef2f2",
    border: "#d4183d",
  },

  "checkout-today": {
    label: "Checkout Today",
    color: "#f97316",
    bg: "#fff7ed",
    border: "#f97316",
  },

  maintenance: {
    label: "Maintenance",
    color: "#4a7a7a",
    bg: "#f0f9f8",
    border: "#a0c4c4",
  },

  reserved: {
    label: "Reserved",
    color: "#06b6d4",
    bg: "#ecfeff",
    border: "#06b6d4",
  },
};

const TYPE_ICON: Record<
  string,
  React.ComponentType<{
    className?: string;
  }>
> = {
  "Beachfront Suite": Waves,
  "Ocean View": Waves,
  "Garden Room": Trees,
  "Dive Cabin": Anchor,
};

function getRoomIcon(type: string) {
  return TYPE_ICON[type] || BedDouble;
}

function normalizeDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    const date = (
      value as {
        toDate: () => Date;
      }
    ).toDate();

    return isNaN(date.getTime()) ? null : date;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = Number(
      (
        value as {
          seconds: number;
        }
      ).seconds,
    );

    if (!isNaN(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return null;
  }

  let date = new Date(`${stringValue}T00:00:00`);

  if (isNaN(date.getTime())) {
    date = new Date(stringValue);
  }

  return isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  const date = normalizeDate(value);

  if (!date) {
    return value || "—";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function startOfDay(date: Date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function isDateToday(value: string, today: Date) {
  const date = normalizeDate(value);

  if (!date) {
    return false;
  }

  return startOfDay(date).getTime() === today.getTime();
}

function normalizeRoomValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isBookingCancelledOrFinished(booking: BookingRecord) {
  const status = booking.status.toLowerCase().trim();

  return (
    status === "cancelled" || status === "checked-out" || status === "completed"
  );
}

function isBookingCurrentlyCheckedIn(booking: BookingRecord) {
  return booking.status.toLowerCase().trim() === "checked-in";
}

function isBookingConfirmed(booking: BookingRecord) {
  const status = booking.status.toLowerCase().trim();

  return status === "confirmed" || status === "pending";
}

function roomMatchesBooking(room: Room, booking: BookingRecord) {
  const roomIdentifiers = [room.id, room.firestoreId];

  const roomDataIdentifiers = [room.id];

  const bookingIdentifiers = [booking.room, booking.roomId];

  const normalizedRoomIdentifiers = [...roomIdentifiers, ...roomDataIdentifiers]
    .filter(Boolean)
    .map(normalizeRoomValue);

  const normalizedBookingIdentifiers = bookingIdentifiers
    .filter(Boolean)
    .map(normalizeRoomValue);

  return normalizedBookingIdentifiers.some((bookingIdentifier) =>
    normalizedRoomIdentifiers.includes(bookingIdentifier),
  );
}

function getBookingForRoom(room: Room, bookings: BookingRecord[], today: Date) {
  return bookings.find((booking) => {
    if (!roomMatchesBooking(room, booking)) {
      return false;
    }

    if (isBookingCancelledOrFinished(booking)) {
      return false;
    }

    const checkIn = normalizeDate(booking.checkIn);

    const checkOut = normalizeDate(booking.checkOut);

    if (!checkIn || !checkOut) {
      return false;
    }

    const todayTime = today.getTime();

    const checkInTime = startOfDay(checkIn).getTime();

    const checkOutTime = startOfDay(checkOut).getTime();

    if (isBookingCurrentlyCheckedIn(booking)) {
      return todayTime >= checkInTime && todayTime < checkOutTime;
    }

    if (isBookingConfirmed(booking)) {
      return todayTime >= checkInTime && todayTime < checkOutTime;
    }

    return false;
  });
}

function getFutureBookingForRoom(
  room: Room,
  bookings: BookingRecord[],
  today: Date,
) {
  return [...bookings]
    .filter((booking) => {
      if (!roomMatchesBooking(room, booking)) {
        return false;
      }

      if (isBookingCancelledOrFinished(booking)) {
        return false;
      }

      const checkIn = normalizeDate(booking.checkIn);

      if (!checkIn) {
        return false;
      }

      return startOfDay(checkIn).getTime() > today.getTime();
    })
    .sort((a, b) => {
      const aDate = normalizeDate(a.checkIn);

      const bDate = normalizeDate(b.checkIn);

      return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
    })[0];
}

export default function RoomAvailability() {
  const [rooms, setRooms] = useState<Room[]>([]);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [filter, setFilter] = useState<RoomStatus | "all">("all");

  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [selected, setSelected] = useState<Room | null>(null);

  useEffect(() => {
    loadRoomData();
  }, []);

  const loadRoomData = async () => {
    try {
      setLoading(true);
      setError("");

      const [roomSnapshot, bookingSnapshot] = await Promise.all([
        getDocs(collection(db, "rooms")),
        getDocs(collection(customerDb, "Bookings")),
      ]);

      const bookingData: BookingRecord[] = bookingSnapshot.docs.map(
        (docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,

            room: String(
              data.room ?? data.roomName ?? data.roomNumber ?? "",
            ).trim(),

            roomId: data.roomId ? String(data.roomId).trim() : undefined,

            roomType: data.roomType ? String(data.roomType) : undefined,

            guest:
              data.guest ??
              data.guestName ??
              data.customerName ??
              "Unknown Guest",

            checkIn: data.checkIn ?? "",

            checkOut: data.checkOut ?? "",

            status: String(data.status ?? "pending").toLowerCase(),
          };
        },
      );

      setBookings(bookingData);

      const today = startOfDay(new Date());

      let roomData: Room[] = roomSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        const roomNumber = String(
          data.roomNumber ?? data.room ?? data.number ?? docSnap.id,
        ).trim();

        const roomType = String(
          data.type ?? data.roomType ?? data.category ?? "Room",
        );

        const capacity = Number(
          data.capacity ?? data.maxGuests ?? data.guests ?? 0,
        );

        const floor = Number(data.floor ?? data.floorNumber ?? 0);

        const rate = Number(
          data.rate ??
            data.roomRate ??
            data.basePrice ??
            data.price ??
            data.pricePerNight ??
            0,
        );

        let features: string[] = [];

        if (Array.isArray(data.features)) {
          features = data.features.map((feature: unknown) => String(feature));
        } else if (Array.isArray(data.amenities)) {
          features = data.amenities.map((feature: unknown) => String(feature));
        } else if (typeof data.features === "string") {
          features = data.features
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean);
        }

        const databaseStatus = String(data.status ?? "")
          .toLowerCase()
          .trim();

        const room: Room = {
          id: roomNumber,

          firestoreId: docSnap.id,

          type: roomType,

          capacity,

          floor,

          rate,

          status: "available",

          features,
        };

        const currentBooking = getBookingForRoom(room, bookingData, today);

        const futureBooking = getFutureBookingForRoom(room, bookingData, today);

        let status: RoomStatus = "available";

        if (
          databaseStatus === "maintenance" ||
          databaseStatus === "under-maintenance"
        ) {
          status = "maintenance";
        } else if (currentBooking) {
          const checkoutToday = isDateToday(currentBooking.checkOut, today);

          status = checkoutToday ? "checkout-today" : "occupied";
        } else if (futureBooking) {
          status = "reserved";
        } else {
          status = "available";
        }

        return {
          ...room,

          status,

          guest: currentBooking?.guest,

          checkOut: currentBooking?.checkOut,
        };
      });

      if (roomData.length === 0) {
        const roomMap = new Map<string, Room>();

        bookingData.forEach((booking) => {
          if (!booking.room) {
            return;
          }

          const roomId = booking.room;

          if (roomMap.has(roomId)) {
            return;
          }

          roomMap.set(roomId, {
            id: roomId,

            firestoreId: roomId,

            type: booking.roomType || "Room",

            capacity: 0,

            floor: 0,

            rate: 0,

            status: "available",

            features: [],
          });
        });

        roomData = Array.from(roomMap.values()).map((room) => {
          const currentBooking = getBookingForRoom(room, bookingData, today);

          const futureBooking = getFutureBookingForRoom(
            room,
            bookingData,
            today,
          );

          let status: RoomStatus = "available";

          if (currentBooking) {
            status = isDateToday(currentBooking.checkOut, today)
              ? "checkout-today"
              : "occupied";
          } else if (futureBooking) {
            status = "reserved";
          }

          return {
            ...room,

            status,

            guest: currentBooking?.guest,

            checkOut: currentBooking?.checkOut,
          };
        });
      }

      roomData.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, {
          numeric: true,
        }),
      );

      setRooms(roomData);

      setSelected((previous) => {
        if (!previous) {
          return null;
        }

        return roomData.find((room) => room.id === previous.id) || null;
      });
    } catch (err) {
      console.error("Error loading rooms:", err);

      setError("Unable to load rooms from Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const roomTypes = useMemo(
    () => ["all", ...Array.from(new Set(rooms.map((room) => room.type)))],
    [rooms],
  );

  const filtered = useMemo(
    () =>
      rooms.filter((room) => {
        const matchStatus = filter === "all" || room.status === filter;

        const matchType = typeFilter === "all" || room.type === typeFilter;

        return matchStatus && matchType;
      }),
    [rooms, filter, typeFilter],
  );

  const counts = {
    available: rooms.filter((room) => room.status === "available").length,

    occupied: rooms.filter((room) => room.status === "occupied").length,

    checkout: rooms.filter((room) => room.status === "checkout-today").length,

    maintenance: rooms.filter((room) => room.status === "maintenance").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading room availability...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Available",
            count: counts.available,
            status: "available" as RoomStatus,
            color: "#0d7377",
            bg: "#e2f3f2",
          },
          {
            label: "Occupied",
            count: counts.occupied,
            status: "occupied" as RoomStatus,
            color: "#d4183d",
            bg: "#fef2f2",
          },
          {
            label: "Checkout Today",
            count: counts.checkout,
            status: "checkout-today" as RoomStatus,
            color: "#f97316",
            bg: "#fff7ed",
          },
          {
            label: "Maintenance",
            count: counts.maintenance,
            status: "maintenance" as RoomStatus,
            color: "#4a7a7a",
            bg: "#f0f9f8",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setFilter(filter === s.status ? "all" : s.status)}
            className="rounded-xl border p-4 text-left transition-all"
            style={{
              background: filter === s.status ? s.bg : "white",

              borderColor:
                filter === s.status ? s.color : "rgba(13,115,119,0.1)",
            }}
          >
            <div
              className="mb-1 text-3xl"
              style={{
                color: s.color,
                fontFamily: "Georgia, serif",
              }}
            >
              {s.count}
            </div>

            <div
              className="text-sm"
              style={{
                color: "#4a7a7a",
              }}
            >
              {s.label}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <span
          className="self-center text-sm"
          style={{
            color: "#4a7a7a",
          }}
        >
          Type:
        </span>

        {roomTypes.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className="rounded-lg border px-3 py-1.5 text-xs transition-all"
            style={{
              background: typeFilter === type ? "#0d7377" : "white",

              color: typeFilter === type ? "white" : "#4a7a7a",

              borderColor:
                typeFilter === type ? "#0d7377" : "rgba(13,115,119,0.2)",
            }}
          >
            {type === "all" ? "All Types" : type}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="grid flex-1 content-start grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((room) => {
            const status = STATUS_CONFIG[room.status];

            const Icon = getRoomIcon(room.type);

            return (
              <button
                key={room.firestoreId}
                onClick={() => setSelected(room === selected ? null : room)}
                className="rounded-xl border-2 p-4 text-left transition-all hover:shadow-md"
                style={{
                  borderColor:
                    selected?.id === room.id ? status.border : "transparent",

                  background: status.bg,

                  boxShadow:
                    selected?.id === room.id
                      ? `0 0 0 2px ${status.border}30`
                      : undefined,
                }}
              >
                <div className="mb-2 flex items-start justify-between">
                  <span
                    className="text-2xl font-medium"
                    style={{
                      color: status.color,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {room.id}
                  </span>

                  <Icon
                    className="mt-1 h-4 w-4"
                    style={{
                      color: status.color,
                    }}
                  />
                </div>

                <p
                  className="mb-0.5 truncate text-xs font-medium"
                  style={{
                    color: "#0a2e2e",
                  }}
                >
                  {room.type}
                </p>

                <p
                  className="text-xs"
                  style={{
                    color: "#4a7a7a",
                  }}
                >
                  {room.capacity > 0
                    ? `${room.capacity} pax`
                    : "Capacity not set"}
                </p>

                <div className="mt-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-xs"
                    style={{
                      background: `${status.color}20`,
                      color: status.color,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-gray-500">
              No rooms match the selected filters.
            </div>
          )}
        </div>

        {selected && (
          <div
            className="w-72 flex-shrink-0 self-start rounded-xl border bg-white"
            style={{
              borderColor: "rgba(13,115,119,0.1)",
            }}
          >
            <div
              className="rounded-t-xl border-b p-5"
              style={{
                background: STATUS_CONFIG[selected.status].bg,

                borderColor: "rgba(13,115,119,0.1)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-3xl font-medium"
                  style={{
                    color: STATUS_CONFIG[selected.status].color,

                    fontFamily: "Georgia, serif",
                  }}
                >
                  Room {selected.id}
                </span>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded px-2 py-1 text-xs"
                  style={{
                    color: "#4a7a7a",
                  }}
                >
                  ✕
                </button>
              </div>

              <p
                className="mt-1 text-sm"
                style={{
                  color: "#0a2e2e",
                }}
              >
                {selected.type}
              </p>

              <span
                className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: STATUS_CONFIG[selected.status].color,

                  color: "#fff",
                }}
              >
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Capacity",
                    value:
                      selected.capacity > 0
                        ? `${selected.capacity} guests`
                        : "Not set",
                  },

                  {
                    label: "Floor",
                    value:
                      selected.floor > 0
                        ? `Floor ${selected.floor}`
                        : "Not set",
                  },

                  {
                    label: "Rate",
                    value:
                      selected.rate > 0
                        ? `₱${selected.rate.toLocaleString()}/night`
                        : "Not set",
                  },

                  {
                    label: "Type",
                    value: selected.type,
                  },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="rounded-lg p-2"
                    style={{
                      background: "#f0f9f8",
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{
                        color: "#4a7a7a",
                      }}
                    >
                      {field.label}
                    </p>

                    <p
                      className="text-sm"
                      style={{
                        color: "#0a2e2e",
                      }}
                    >
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>

              {selected.guest && (
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "#fef2f2",
                  }}
                >
                  <p
                    className="mb-0.5 text-xs"
                    style={{
                      color: "#4a7a7a",
                    }}
                  >
                    Current Guest
                  </p>

                  <p
                    className="text-sm font-medium"
                    style={{
                      color: "#0a2e2e",
                    }}
                  >
                    {selected.guest}
                  </p>

                  {selected.checkOut && (
                    <p
                      className="mt-0.5 text-xs"
                      style={{
                        color: "#d4183d",
                      }}
                    >
                      Checkout: {formatDate(selected.checkOut)}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p
                  className="mb-2 text-xs"
                  style={{
                    color: "#4a7a7a",
                  }}
                >
                  Features
                </p>

                {selected.features.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-lg px-2 py-1 text-xs"
                        style={{
                          background: "#e2f3f2",
                          color: "#0d7377",
                        }}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-xs"
                    style={{
                      color: "#4a7a7a",
                    }}
                  >
                    No features recorded.
                  </p>
                )}
              </div>

              {selected.status === "checkout-today" && (
                <div
                  className="rounded-lg border p-3"
                  style={{
                    background: "#fff7ed",
                    borderColor: "#fed7aa",
                  }}
                >
                  <p
                    className="text-xs font-medium"
                    style={{
                      color: "#c2410c",
                    }}
                  >
                    Checkout Today
                  </p>

                  <p
                    className="mt-1 text-xs"
                    style={{
                      color: "#9a3412",
                    }}
                  >
                    This room is occupied until the guest completes checkout.
                  </p>
                </div>
              )}

              {selected.status === "available" && (
                <button
                  className="w-full rounded-lg py-2.5 text-sm text-white"
                  style={{
                    background: "#0d7377",
                  }}
                  onClick={() => console.log("Book room:", selected.id)}
                >
                  Book This Room
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
