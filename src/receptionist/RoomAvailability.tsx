import { useBookingInventory } from "../app/useBookingInventory";
import {
  activeBooking,
  assignedRoomIds,
  blockedRoom,
  dateOnly,
  localDate,
  normalizeBookingValue,
  roomBookingsOnDate,
} from "../app/bookingAvailability";
import { AsyncButton } from "../app/components/ui/async-action";
import { useEffect, useMemo, useState } from "react";
import { BedDouble, Waves, Trees, Anchor, Loader2 } from "lucide-react";

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
    style?: React.CSSProperties;
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

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00");
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : value;
}

export default function RoomAvailability() {
  const {
    rooms: inventory,
    reservations,
    loading,
    error,
  } = useBookingInventory();
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Room | null>(null);
  const today = localDate();
  const rooms: Room[] = useMemo(() => {
    const current = roomBookingsOnDate(inventory, reservations, today);
    const futureDates = [
      ...new Set(
        reservations
          .filter(activeBooking)
          .map((b) => dateOnly(b.checkIn))
          .filter((date) => date > today),
      ),
    ].sort();
    const futureMaps = futureDates.map((date) =>
      roomBookingsOnDate(inventory, reservations, date),
    );
    return inventory
      .map((room) => {
        const booking = current.get(room.id);
        const future = futureMaps.map((map) => map.get(room.id)).find(Boolean);
        const departing = reservations.find(
          (b) =>
            normalizeBookingValue(b.status) === "checked-in" &&
            dateOnly(b.checkOut) === today &&
            assignedRoomIds(b, inventory).includes(room.id),
        );
        let status: RoomStatus = "available";
        if (blockedRoom(room)) status = "maintenance";
        else if (departing) status = "checkout-today";
        else if (booking)
          status = ["checked-in", "checkedin", "occupied"].includes(
            normalizeBookingValue(booking.status),
          )
            ? "occupied"
            : "reserved";
        else if (["occupied", "checked-in"].includes(room.status))
          status = "occupied";
        else if (future) status = "reserved";
        const guestBooking = departing || booking || future;
        return {
          id: room.roomNumber,
          firestoreId: room.id,
          type: room.type,
          capacity: room.capacity,
          floor: Number(room.floor || 0),
          rate: Number(room.rate ?? room.basePrice ?? room.price ?? 0),
          status,
          features: Array.isArray(room.features ?? room.amenities)
            ? (room.features ?? room.amenities).map(String)
            : [],
          guest: guestBooking
            ? String(
                guestBooking.customerName ||
                  guestBooking.guestName ||
                  guestBooking.guest ||
                  "Guest",
              )
            : undefined,
          checkOut: guestBooking ? dateOnly(guestBooking.checkOut) : undefined,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [inventory, reservations, today]);
  useEffect(() => {
    setSelected((previous) =>
      previous
        ? rooms.find((room) => room.firestoreId === previous.firestoreId) ||
          null
        : null,
    );
  }, [rooms]);

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
          <AsyncButton
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
          </AsyncButton>
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
          <AsyncButton
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
          </AsyncButton>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="grid flex-1 content-start grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((room) => {
            const status = STATUS_CONFIG[room.status];

            const Icon = getRoomIcon(room.type);

            return (
              <AsyncButton
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
              </AsyncButton>
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

                <AsyncButton
                  onClick={() => setSelected(null)}
                  className="rounded px-2 py-1 text-xs"
                  style={{
                    color: "#4a7a7a",
                  }}
                >
                  ✕
                </AsyncButton>
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
                <AsyncButton
                  className="w-full rounded-lg py-2.5 text-sm text-white"
                  style={{
                    background: "#0d7377",
                  }}
                  onClick={() => console.log("Book room:", selected.id)}
                >
                  Book This Room
                </AsyncButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
