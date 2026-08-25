import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Waves,
  Trees,
  Anchor,
  Loader2,
} from "lucide-react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { customerDb } from "../app/firebase";
// If your firebase.ts is one folder higher instead, use:
// import { customerDb } from "../firebase";

type RoomStatus =
  | "available"
  | "occupied"
  | "checkout-today"
  | "maintenance"
  | "reserved";

interface Room {
  id: string;
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
  React.ComponentType<{ className?: string }>
> = {
  "Beachfront Suite": Waves,
  "Ocean View": Waves,
  "Garden Room": Trees,
  "Dive Cabin": Anchor,
};

function getRoomIcon(
  type: string,
) {
  return (
    TYPE_ICON[type] ||
    BedDouble
  );
}

function normalizeDate(
  value: unknown,
): Date | null {
  if (!value) return null;

  // Firestore Timestamp
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

    return isNaN(date.getTime())
      ? null
      : date;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? null
      : value;
  }

  const stringValue =
    String(value);

  let date = new Date(
    `${stringValue}T00:00:00`,
  );

  if (isNaN(date.getTime())) {
    date = new Date(stringValue);
  }

  return isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(
  value: string,
) {
  const date =
    normalizeDate(value);

  if (!date) {
    return value || "—";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function startOfDay(
  date: Date,
) {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

function isDateToday(
  value: string,
  today: Date,
) {
  const date =
    normalizeDate(value);

  if (!date) {
    return false;
  }

  return (
    startOfDay(date).getTime() ===
    today.getTime()
  );
}

function isBookingActive(
  booking: BookingRecord,
) {
  const status =
    booking.status.toLowerCase();

  return (
    status !== "cancelled" &&
    status !== "checked-out"
  );
}

function getBookingForRoom(
  roomId: string,
  bookings: BookingRecord[],
  today: Date,
) {
  return bookings.find(
    (booking) => {
      if (
        booking.room !== roomId
      ) {
        return false;
      }

      if (
        !isBookingActive(booking)
      ) {
        return false;
      }

      const checkIn =
        normalizeDate(
          booking.checkIn,
        );

      const checkOut =
        normalizeDate(
          booking.checkOut,
        );

      if (
        !checkIn ||
        !checkOut
      ) {
        return false;
      }

      const todayTime =
        today.getTime();

      const checkInTime =
        startOfDay(
          checkIn,
        ).getTime();

      const checkOutTime =
        startOfDay(
          checkOut,
        ).getTime();

      return (
        todayTime >=
          checkInTime &&
        todayTime <=
          checkOutTime
      );
    },
  );
}

function getFutureBookingForRoom(
  roomId: string,
  bookings: BookingRecord[],
  today: Date,
) {
  return [...bookings]
    .filter(
      (booking) => {
        if (
          booking.room !== roomId
        ) {
          return false;
        }

        if (
          !isBookingActive(booking)
        ) {
          return false;
        }

        const checkIn =
          normalizeDate(
            booking.checkIn,
          );

        if (!checkIn) {
          return false;
        }

        return (
          startOfDay(checkIn).getTime() >
          today.getTime()
        );
      },
    )
    .sort((a, b) => {
      const aDate =
        normalizeDate(
          a.checkIn,
        );

      const bDate =
        normalizeDate(
          b.checkIn,
        );

      return (
        (aDate?.getTime() || 0) -
        (bDate?.getTime() || 0)
      );
    })[0];
}

export default function RoomAvailability() {
  const [rooms, setRooms] =
    useState<Room[]>([]);

  const [bookings, setBookings] =
    useState<BookingRecord[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<RoomStatus | "all">(
      "all",
    );

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<string>("all");

  const [
    selected,
    setSelected,
  ] =
    useState<Room | null>(null);

  useEffect(() => {
    loadRoomData();
  }, []);

  const loadRoomData =
    async () => {
      try {
        setLoading(true);
        setError("");

        const [
          roomSnapshot,
          bookingSnapshot,
        ] =
          await Promise.all([
            getDocs(
              collection(
                customerDb,
                "Rooms",
              ),
            ),
            getDocs(
              collection(
                customerDb,
                "Bookings",
              ),
            ),
          ]);

        const bookingData: BookingRecord[] =
          bookingSnapshot.docs.map(
            (docSnap) => {
              const data =
                docSnap.data();

              return {
                id: docSnap.id,

                room: String(
                  data.room ??
                    data.roomName ??
                    data.roomNumber ??
                    "",
                ).trim(),

                guest:
                  data.guest ??
                  data.customerName ??
                  "Unknown Guest",

                checkIn:
                  data.checkIn ??
                  "",

                checkOut:
                  data.checkOut ??
                  "",

                status:
                  data.status ??
                  "pending",
              };
            },
          );

        setBookings(
          bookingData,
        );

        const today =
          startOfDay(
            new Date(),
          );

        let roomData: Room[] =
          roomSnapshot.docs.map(
            (docSnap) => {
              const data =
                docSnap.data();

              const id = String(
                data.roomNumber ??
                  data.room ??
                  data.roomName ??
                  data.number ??
                  docSnap.id,
              ).trim();

              const roomType =
                String(
                  data.type ??
                    data.roomType ??
                    data.category ??
                    "Room",
                );

              const capacity =
                Number(
                  data.capacity ??
                    data.maxGuests ??
                    data.guests ??
                    0,
                );

              const floor =
                Number(
                  data.floor ??
                    data.floorNumber ??
                    0,
                );

              const rate =
                Number(
                  data.rate ??
                    data.roomRate ??
                    data.price ??
                    data.pricePerNight ??
                    0,
                );

              let features: string[] =
                [];

              if (
                Array.isArray(
                  data.features,
                )
              ) {
                features =
                  data.features.map(
                    (feature: unknown) =>
                      String(
                        feature,
                      ),
                  );
              } else if (
                typeof data.features ===
                "string"
              ) {
                features =
                  data.features
                    .split(",")
                    .map(
                      (item: string) =>
                        item.trim(),
                    )
                    .filter(Boolean);
              }

              const databaseStatus =
                String(
                  data.status ??
                    "",
                ).toLowerCase();

              const currentBooking =
                getBookingForRoom(
                  id,
                  bookingData,
                  today,
                );

              const futureBooking =
                getFutureBookingForRoom(
                  id,
                  bookingData,
                  today,
                );

              let status: RoomStatus =
                "available";

              /*
               * Maintenance from the Rooms collection
               * has highest priority.
               */
              if (
                databaseStatus ===
                  "maintenance" ||
                databaseStatus ===
                  "under-maintenance"
              ) {
                status =
                  "maintenance";
              } else if (
                currentBooking
              ) {
                const checkoutToday =
                  isDateToday(
                    currentBooking.checkOut,
                    today,
                  );

                status =
                  checkoutToday
                    ? "checkout-today"
                    : "occupied";
              } else if (
                futureBooking
              ) {
                status =
                  "reserved";
              } else if (
                databaseStatus ===
                  "reserved"
              ) {
                status =
                  "reserved";
              } else {
                status =
                  "available";
              }

              const guest =
                currentBooking?.guest;

              const checkOut =
                currentBooking?.checkOut;

              return {
                id,
                type: roomType,
                capacity,
                floor,
                rate,
                status,
                guest,
                checkOut,
                features,
              };
            },
          );

        /*
         * Fallback:
         * If you do not have a Rooms collection yet,
         * create room records from the rooms appearing
         * in Bookings.
         */
        if (
          roomData.length === 0
        ) {
          const roomMap =
            new Map<
              string,
              Room
            >();

          bookingData.forEach(
            (booking) => {
              if (
                !booking.room
              ) {
                return;
              }

              if (
                roomMap.has(
                  booking.room,
                )
              ) {
                return;
              }

              roomMap.set(
                booking.room,
                {
                  id: booking.room,
                  type: "Room",
                  capacity: 0,
                  floor: 0,
                  rate: 0,
                  status: "available",
                  features: [],
                },
              );
            },
          );

          roomData =
            Array.from(
              roomMap.values(),
            );
        }

        setRooms(
          roomData.sort(
            (a, b) =>
              a.id.localeCompare(
                b.id,
                undefined,
                {
                  numeric: true,
                },
              ),
          ),
        );
      } catch (err) {
        console.error(
          "Error loading rooms:",
          err,
        );

        setError(
          "Unable to load rooms from Firebase.",
        );
      } finally {
        setLoading(false);
      }
    };

  const roomTypes =
    useMemo(() => {
      return [
        "all",
        ...Array.from(
          new Set(
            rooms.map(
              (room) =>
                room.type,
            ),
          ),
        ),
      ];
    }, [rooms]);

  const filtered =
    useMemo(() => {
      return rooms.filter(
        (room) => {
          const matchStatus =
            filter === "all" ||
            room.status ===
              filter;

          const matchType =
            typeFilter ===
              "all" ||
            room.type ===
              typeFilter;

          return (
            matchStatus &&
            matchType
          );
        },
      );
    }, [
      rooms,
      filter,
      typeFilter,
    ]);

  const counts = {
    available:
      rooms.filter(
        (room) =>
          room.status ===
          "available",
      ).length,

    occupied:
      rooms.filter(
        (room) =>
          room.status ===
          "occupied",
      ).length,

    checkout:
      rooms.filter(
        (room) =>
          room.status ===
          "checkout-today",
      ).length,

    maintenance:
      rooms.filter(
        (room) =>
          room.status ===
          "maintenance",
      ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading room availability...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Available",
            count:
              counts.available,
            status:
              "available" as RoomStatus,
            color:
              "#0d7377",
            bg:
              "#e2f3f2",
          },
          {
            label: "Occupied",
            count:
              counts.occupied,
            status:
              "occupied" as RoomStatus,
            color:
              "#d4183d",
            bg:
              "#fef2f2",
          },
          {
            label: "Checkout Today",
            count:
              counts.checkout,
            status:
              "checkout-today" as RoomStatus,
            color:
              "#f97316",
            bg:
              "#fff7ed",
          },
          {
            label: "Maintenance",
            count:
              counts.maintenance,
            status:
              "maintenance" as RoomStatus,
            color:
              "#4a7a7a",
            bg:
              "#f0f9f8",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() =>
              setFilter(
                filter === s.status
                  ? "all"
                  : s.status,
              )
            }
            className="p-4 rounded-xl border text-left transition-all"
            style={{
              background:
                filter ===
                s.status
                  ? s.bg
                  : "white",

              borderColor:
                filter ===
                s.status
                  ? s.color
                  : "rgba(13,115,119,0.1)",
            }}
          >
            <div
              className="text-3xl mb-1"
              style={{
                color:
                  s.color,
                fontFamily:
                  "Georgia, serif",
              }}
            >
              {s.count}
            </div>

            <div
              className="text-sm"
              style={{
                color:
                  "#4a7a7a",
              }}
            >
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* Type filters */}
      <div className="flex gap-3 flex-wrap">
        <span
          className="text-sm self-center"
          style={{
            color:
              "#4a7a7a",
          }}
        >
          Type:
        </span>

        {roomTypes.map(
          (type) => (
            <button
              key={type}
              onClick={() =>
                setTypeFilter(
                  type,
                )
              }
              className="px-3 py-1.5 rounded-lg text-xs border transition-all"
              style={{
                background:
                  typeFilter ===
                  type
                    ? "#0d7377"
                    : "white",

                color:
                  typeFilter ===
                  type
                    ? "white"
                    : "#4a7a7a",

                borderColor:
                  typeFilter ===
                  type
                    ? "#0d7377"
                    : "rgba(13,115,119,0.2)",
              }}
            >
              {type ===
              "all"
                ? "All Types"
                : type}
            </button>
          ),
        )}
      </div>

      {/* Room grid */}
      <div className="flex gap-6">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {filtered.map(
            (room) => {
              const status =
                STATUS_CONFIG[
                  room.status
                ];

              const Icon =
                getRoomIcon(
                  room.type,
                );

              return (
                <button
                  key={room.id}
                  onClick={() =>
                    setSelected(
                      room ===
                        selected
                        ? null
                        : room,
                    )
                  }
                  className="p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor:
                      selected?.id ===
                      room.id
                        ? status.border
                        : "transparent",

                    background:
                      status.bg,

                    boxShadow:
                      selected?.id ===
                      room.id
                        ? `0 0 0 2px ${status.border}30`
                        : undefined,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="text-2xl font-medium"
                      style={{
                        color:
                          status.color,

                        fontFamily:
                          "Georgia, serif",
                      }}
                    >
                      {room.id}
                    </span>

                    <Icon
                      className="w-4 h-4 mt-1"
                      style={{
                        color:
                          status.color,
                      }}
                    />
                  </div>

                  <p
                    className="text-xs font-medium mb-0.5 truncate"
                    style={{
                      color:
                        "#0a2e2e",
                    }}
                  >
                    {room.type}
                  </p>

                  <p
                    className="text-xs"
                    style={{
                      color:
                        "#4a7a7a",
                    }}
                  >
                    {room.capacity > 0
                      ? `${room.capacity} pax`
                      : "Capacity not set"}
                  </p>

                  <div className="mt-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: `${status.color}20`,
                        color:
                          status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                </button>
              );
            },
          )}

          {filtered.length ===
            0 && (
            <div className="col-span-full py-12 text-center text-sm text-gray-500">
              No rooms match the selected filters.
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div
            className="w-72 flex-shrink-0 bg-white rounded-xl border self-start"
            style={{
              borderColor:
                "rgba(13,115,119,0.1)",
            }}
          >
            <div
              className="p-5 border-b"
              style={{
                background:
                  STATUS_CONFIG[
                    selected.status
                  ].bg,

                borderColor:
                  "rgba(13,115,119,0.1)",

                borderRadius:
                  "0.75rem 0.75rem 0 0",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-3xl font-medium"
                  style={{
                    color:
                      STATUS_CONFIG[
                        selected.status
                      ].color,

                    fontFamily:
                      "Georgia, serif",
                  }}
                >
                  Room {selected.id}
                </span>

                <button
                  onClick={() =>
                    setSelected(
                      null,
                    )
                  }
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    color:
                      "#4a7a7a",
                  }}
                >
                  ✕
                </button>
              </div>

              <p
                className="text-sm mt-1"
                style={{
                  color:
                    "#0a2e2e",
                }}
              >
                {selected.type}
              </p>

              <span
                className="text-xs px-2 py-0.5 rounded-full inline-block mt-2"
                style={{
                  background:
                    STATUS_CONFIG[
                      selected.status
                    ].color,

                  color: "#fff",
                }}
              >
                {
                  STATUS_CONFIG[
                    selected.status
                  ].label
                }
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label:
                      "Capacity",
                    value:
                      selected.capacity >
                      0
                        ? `${selected.capacity} guests`
                        : "Not set",
                  },

                  {
                    label:
                      "Floor",
                    value:
                      selected.floor >
                      0
                        ? `Floor ${selected.floor}`
                        : "Not set",
                  },

                  {
                    label:
                      "Rate",
                    value:
                      selected.rate >
                      0
                        ? `₱${selected.rate.toLocaleString()}/night`
                        : "Not set",
                  },

                  {
                    label:
                      "Type",
                    value:
                      selected.type,
                  },
                ].map(
                  (field) => (
                    <div
                      key={
                        field.label
                      }
                      className="p-2 rounded-lg"
                      style={{
                        background:
                          "#f0f9f8",
                      }}
                    >
                      <p
                        className="text-xs"
                        style={{
                          color:
                            "#4a7a7a",
                        }}
                      >
                        {
                          field.label
                        }
                      </p>

                      <p
                        className="text-sm"
                        style={{
                          color:
                            "#0a2e2e",
                        }}
                      >
                        {
                          field.value
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>

              {selected.guest && (
                <div
                  className="p-3 rounded-lg"
                  style={{
                    background:
                      "#fef2f2",
                  }}
                >
                  <p
                    className="text-xs mb-0.5"
                    style={{
                      color:
                        "#4a7a7a",
                    }}
                  >
                    Current Guest
                  </p>

                  <p
                    className="text-sm font-medium"
                    style={{
                      color:
                        "#0a2e2e",
                    }}
                  >
                    {selected.guest}
                  </p>

                  {selected.checkOut && (
                    <p
                      className="text-xs mt-0.5"
                      style={{
                        color:
                          "#d4183d",
                      }}
                    >
                      Checkout:{" "}
                      {formatDate(
                        selected.checkOut,
                      )}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p
                  className="text-xs mb-2"
                  style={{
                    color:
                      "#4a7a7a",
                  }}
                >
                  Features
                </p>

                {selected.features.length >
                0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.features.map(
                      (feature) => (
                        <span
                          key={
                            feature
                          }
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{
                            background:
                              "#e2f3f2",
                            color:
                              "#0d7377",
                          }}
                        >
                          {
                            feature
                          }
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p
                    className="text-xs"
                    style={{
                      color:
                        "#4a7a7a",
                    }}
                  >
                    No features recorded.
                  </p>
                )}
              </div>

              {selected.status ===
                "available" && (
                <button
                  className="w-full py-2.5 rounded-lg text-sm text-white"
                  style={{
                    background:
                      "#0d7377",
                  }}
                  onClick={() =>
                    console.log(
                      "Book room:",
                      selected.id,
                    )
                  }
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
