import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, customerDb } from "../firebase";
import {
  BedDouble,
  DoorOpen,
  Waves,
  Package,
  Users,
  Wrench,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  MonitorCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";

type RecordData = {
  id: string;
  [key: string]: any;
};

type ResourceGroup = {
  title: string;
  description: string;
  icon: typeof BedDouble;
  color: string;
  bg: string;
  records: RecordData[];
  getName: (item: RecordData) => string;
  getStatus: (item: RecordData) => string;
};

const todayString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const tomorrowString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const text = (value: unknown) => String(value ?? "").trim();

const normalized = (value: unknown) =>
  text(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const isMaintenance = (status: string) => {
  const value = normalized(status);
  return (
    value.includes("maintenance") ||
    value.includes("out-of-service") ||
    value.includes("out-of-order") ||
    value.includes("repair")
  );
};

const isInactive = (status: string) => {
  const value = normalized(status);
  return (
    value.includes("inactive") ||
    value.includes("disabled") ||
    value.includes("archived") ||
    value.includes("unavailable") ||
    value.includes("not-available")
  );
};

const isCancelled = (status: string) =>
  ["cancelled", "canceled", "rejected"].includes(normalized(status));

const isCompletedTask = (status: string) =>
  [
    "completed",
    "complete",
    "done",
    "resolved",
    "closed",
    "cancelled",
    "canceled",
    "rejected",
  ].includes(normalized(status));

const getRecordStatuses = (item: RecordData): string[] =>
  [
    item.status,
    item.roomStatus,
    item.availabilityStatus,
    item.currentStatus,
    item.taskStatus,
    item.maintenanceStatus,
    item.workStatus,
  ]
    .filter(
      (value) => value !== undefined && value !== null && text(value) !== "",
    )
    .map(normalized);

const recordStatus = (item: RecordData): string => {
  const taskStatuses = [
    item.taskStatus,
    item.maintenanceStatus,
    item.workStatus,
  ]
    .filter(
      (value) => value !== undefined && value !== null && text(value) !== "",
    )
    .map(normalized);

  const taskStatus = taskStatuses.find(
    (status) =>
      isCompletedTask(status) ||
      status.includes("pending") ||
      status.includes("requested") ||
      status.includes("scheduled") ||
      status.includes("in-progress") ||
      status.includes("ongoing") ||
      isMaintenance(status),
  );

  if (taskStatus) return taskStatus;

  const statuses = getRecordStatuses(item);
  const maintenanceStatus = statuses.find(isMaintenance);

  if (maintenanceStatus) return maintenanceStatus;

  if (statuses.length) return statuses[0];

  if (item.isAvailable === false || item.available === false) {
    return "unavailable";
  }

  if (item.isAvailable === true || item.available === true) {
    return "available";
  }

  return "unknown";
};

const isPendingMaintenanceTask = (item: RecordData) => {
  const statuses = getRecordStatuses(item);

  if (statuses.some(isCompletedTask)) return false;

  return statuses.some(
    (status) =>
      status.includes("pending") ||
      status.includes("requested") ||
      status.includes("scheduled") ||
      status.includes("in-progress") ||
      status.includes("ongoing") ||
      status === "maintenance",
  );
};

const isAvailableStatus = (status: string) =>
  !isMaintenance(status) &&
  !isInactive(status) &&
  !status.includes("occupied") &&
  !status.includes("checked-in") &&
  !status.includes("reserved") &&
  !status.includes("booked") &&
  !status.includes("pending") &&
  !status.includes("unknown");

const recordName = (item: RecordData) =>
  text(
    item.name ??
      item.taskName ??
      item.title ??
      item.description ??
      item.equipmentName ??
      item.serviceName ??
      item.packageName,
  ) || "Unnamed Record";

/**
 * Your room document uses roomId such as R-006.
 * A numeric roomNumber of 0 is treated as unset.
 */
const getRoomNumber = (room: RecordData) => {
  const number = room.roomNumber;

  if (
    number !== undefined &&
    number !== null &&
    text(number) !== "" &&
    Number(number) !== 0
  ) {
    return String(number).trim();
  }

  return text(
    room.roomId ?? room.roomNo ?? room.roomCode ?? room.roomIdNumber ?? room.id,
  );
};

const getRoomTypeName = (room: RecordData, roomTypes: RecordData[]): string => {
  // Your room documents use type: "Suite Room".
  const directName = text(
    room.roomTypeName ?? room.typeName ?? room.roomType ?? room.type,
  );

  if (directName) {
    const matchingType = roomTypes.find(
      (type) =>
        normalized(type.name ?? type.roomTypeName ?? type.type) ===
        normalized(directName),
    );

    if (matchingType) {
      return text(
        matchingType.name ?? matchingType.roomTypeName ?? matchingType.type,
      );
    }

    // The room already has a readable room type.
    return directName;
  }

  // Support rooms that reference a room type by document ID.
  const typeId = text(
    room.roomTypeId ??
      room.typeId ??
      (typeof room.roomType === "object" ? room.roomType?.id : ""),
  );

  const matchingType = roomTypes.find(
    (type) => normalized(type.id) === normalized(typeId),
  );

  if (matchingType) {
    return text(
      matchingType.name ?? matchingType.roomTypeName ?? matchingType.type,
    );
  }

  return "Unassigned Room Type";
};

const getMaintenanceRoomLabel = (
  item: RecordData,
  rooms: RecordData[],
  roomTypes: RecordData[],
): string => {
  const roomReference = text(
    item.roomId ??
      item.roomID ??
      item.roomDocumentId ??
      item.roomRef ??
      item.roomCode ??
      item.roomNo ??
      item.roomNumber ??
      item.assignedRoomId ??
      item.selectedRoomId,
  );

  const typeReference = text(
    item.roomType ??
      item.roomTypeName ??
      item.roomTypeId ??
      item.type ??
      item.typeId,
  );

  const matchedRoom = rooms.find((room) => {
    const roomIdentifiers = [
      room.id,
      room.roomId,
      room.roomNumber,
      room.roomNo,
      room.roomCode,
    ]
      .map(normalized)
      .filter(Boolean);

    return (
      roomReference !== "" &&
      roomIdentifiers.includes(normalized(roomReference))
    );
  });

  if (matchedRoom) {
    const roomTypeName = getRoomTypeName(matchedRoom, roomTypes);
    const roomNumber = getRoomNumber(matchedRoom);

    return `${roomTypeName} — ${roomNumber || "Room number not set"}`;
  }

  // If the maintenance record stores the room type but not the room ID.
  if (typeReference) {
    const matchingType = roomTypes.find(
      (type) =>
        normalized(type.id) === normalized(typeReference) ||
        normalized(type.name ?? type.roomTypeName ?? type.type) ===
          normalized(typeReference),
    );

    const typeName = matchingType
      ? text(
          matchingType.name ?? matchingType.roomTypeName ?? matchingType.type,
        )
      : typeReference;

    return roomReference
      ? `${typeName} — ${roomReference}`
      : `${typeName} — Room not specified`;
  }

  if (roomReference) {
    return `Room ${roomReference}`;
  }

  return "No room linked";
};

const toDateString = (value: unknown): string => {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";

    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return toDateString((value as { toDate: () => Date }).toDate());
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return toDateString(
      new Date((value as { seconds: number }).seconds * 1000),
    );
  }

  const raw = text(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const overlaps = (booking: RecordData, checkIn: string, checkOut: string) => {
  const start = toDateString(booking.checkIn ?? booking.bookingDate);
  const end = toDateString(booking.checkOut ?? booking.bookingDate);

  if (!start || !end) return false;

  return start < checkOut && end > checkIn;
};

const isRoomBooking = (booking: RecordData) => {
  const type = normalized(
    booking.bookingType ?? booking.itemType ?? booking.type,
  );

  return (
    !type.includes("activity") &&
    !type.includes("service") &&
    !type.includes("package")
  );
};

const isCheckedInBooking = (booking: RecordData) =>
  ["checked-in", "checked-in-occupied"].includes(normalized(booking.status));

const StatusBadge = ({ status }: { status: string }) => {
  const value = normalized(status);

  let classes = "bg-gray-100 text-gray-700";
  let label = value.replace(/-/g, " ") || "Unknown";

  if (isCompletedTask(value)) {
    classes = "bg-green-100 text-green-700";
    label = "Completed";
  } else if (isMaintenance(value)) {
    classes = "bg-orange-100 text-orange-700";
    label = "Maintenance";
  } else if (isCancelled(value)) {
    classes = "bg-gray-100 text-gray-500";
    label = "Cancelled";
  } else if (
    value.includes("occupied") ||
    value.includes("checked-in") ||
    value.includes("booked")
  ) {
    classes = "bg-blue-100 text-blue-700";
    label = "Occupied";
  } else if (isInactive(value)) {
    classes = "bg-red-100 text-red-700";
    label = "Unavailable";
  } else if (
    value.includes("pending") ||
    value.includes("reserved") ||
    value.includes("scheduled") ||
    value.includes("ongoing") ||
    value.includes("in-progress") ||
    value.includes("requested")
  ) {
    classes = "bg-amber-100 text-amber-700";
    label = "Pending";
  } else if (value === "available") {
    classes = "bg-green-100 text-green-700";
    label = "Available";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${classes}`}
    >
      {label}
    </span>
  );
};

export default function ManagerDashboard() {
  const [roomTypes, setRoomTypes] = useState<RecordData[]>([]);
  const [rooms, setRooms] = useState<RecordData[]>([]);
  const [services, setServices] = useState<RecordData[]>([]);
  const [packages, setPackages] = useState<RecordData[]>([]);
  const [staff, setStaff] = useState<RecordData[]>([]);
  const [maintenance, setMaintenance] = useState<RecordData[]>([]);
  const [bookings, setBookings] = useState<RecordData[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [checkIn, setCheckIn] = useState(todayString);
  const [checkOut, setCheckOut] = useState(tomorrowString);

  const loadDashboardData = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const results = await Promise.allSettled([
        getDocs(collection(db, "roomTypes")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "Staff")),
        getDocs(collection(db, "maintenanceRequests")),
        getDocs(collection(customerDb, "Bookings")),
      ]);

      const convert = (
        result: PromiseSettledResult<any>,
        collectionName: string,
      ): RecordData[] => {
        if (result.status === "fulfilled") {
          return result.value.docs.map((document: any) => ({
            ...document.data(),
            id: document.id,
          }));
        }

        console.error(`Could not load ${collectionName}:`, result.reason);
        return [];
      };

      const [
        roomTypesResult,
        roomsResult,
        servicesResult,
        packagesResult,
        staffResult,
        maintenanceResult,
        bookingsResult,
      ] = results;

      setRoomTypes(convert(roomTypesResult, "roomTypes"));
      setRooms(convert(roomsResult, "rooms"));
      setServices(convert(servicesResult, "services"));
      setPackages(convert(packagesResult, "packages"));
      setStaff(convert(staffResult, "Staff"));
      setMaintenance(convert(maintenanceResult, "maintenanceRequests"));
      setBookings(convert(bookingsResult, "Bookings"));

      if (results.some((result) => result.status === "rejected")) {
        setError(
          "Some collections could not be loaded. Check the collection names and Firebase permissions.",
        );
      }
    } catch (err) {
      console.error("Error loading availability dashboard:", err);
      setError("Unable to load resort availability data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => !isCancelled(booking.status)),
    [bookings],
  );

  const roomAvailability = useMemo(() => {
    return roomTypes.map((type) => {
      const typeId = normalized(type.id);
      const typeName = normalized(type.name ?? type.roomTypeName ?? type.type);

      const matchingRooms = rooms.filter((room) => {
        const roomTypeId = normalized(
          room.roomTypeId ??
            room.typeId ??
            (typeof room.roomType === "object" ? room.roomType?.id : ""),
        );

        const roomTypeName = normalized(getRoomTypeName(room, roomTypes));

        return (
          (typeId !== "" && roomTypeId === typeId) ||
          (typeName !== "" && roomTypeName === typeName)
        );
      });

      const inventory = matchingRooms.length
        ? matchingRooms.length
        : Math.max(
            0,
            Number(
              type.count ??
                type.quantity ??
                type.totalRooms ??
                type.numberOfRooms ??
                type.availableRooms ??
                0,
            ) || 0,
          );

      const maintainedRooms = matchingRooms.filter((room) =>
        getRecordStatuses(room).some(isMaintenance),
      ).length;

      const reservedBookings = activeBookings.filter((booking) => {
        if (!overlaps(booking, checkIn, checkOut)) return false;
        if (!isRoomBooking(booking)) return false;

        const bookingTypeId = normalized(booking.roomTypeId ?? booking.typeId);

        const bookingTypeName = normalized(
          booking.roomTypeName ?? booking.roomType ?? booking.roomName,
        );

        return (
          (typeId !== "" && bookingTypeId === typeId) ||
          (typeName !== "" && bookingTypeName === typeName)
        );
      });

      const reserved = reservedBookings.reduce(
        (sum, booking) =>
          sum +
          Math.max(
            1,
            Number(
              booking.roomQuantity ??
                booking.numberOfRooms ??
                booking.quantity ??
                1,
            ) || 1,
          ),
        0,
      );

      return {
        id: type.id,
        name: recordName(type),
        inventory,
        maintained: maintainedRooms,
        reserved,
        available: Math.max(0, inventory - maintainedRooms - reserved),
      };
    });
  }, [roomTypes, rooms, activeBookings, checkIn, checkOut]);

  const roomCounts = useMemo(() => {
    const maintainedRoomIds = new Set(
      rooms
        .filter((room) => getRecordStatuses(room).some(isMaintenance))
        .map((room) => room.id),
    );

    maintenance.filter(isPendingMaintenanceTask).forEach((task) => {
      const roomReference = text(
        task.roomId ??
          task.roomID ??
          task.roomDocumentId ??
          task.roomRef ??
          task.roomCode ??
          task.roomNo ??
          task.roomNumber ??
          task.assignedRoomId ??
          task.selectedRoomId,
      );

      const matchedRoom = rooms.find((room) =>
        [room.id, room.roomId, room.roomNumber, room.roomNo, room.roomCode]
          .map(normalized)
          .includes(normalized(roomReference)),
      );

      if (matchedRoom) {
        maintainedRoomIds.add(matchedRoom.id);
      }
    });

    const occupied = bookings.filter(
      (booking) => isRoomBooking(booking) && isCheckedInBooking(booking),
    ).length;

    const inactive = rooms.filter((room) =>
      getRecordStatuses(room).some(isInactive),
    ).length;

    return {
      total: rooms.length,
      maintained: maintainedRoomIds.size,
      occupied,
      inactive,
      available: Math.max(
        0,
        rooms.length - maintainedRoomIds.size - occupied - inactive,
      ),
    };
  }, [rooms, bookings, maintenance]);

  const resourceGroups: ResourceGroup[] = [
    {
      title: "Maintenance",
      description: "Maintenance tasks and service issues",
      icon: Wrench,
      color: "text-orange-700",
      bg: "bg-orange-100",
      records: maintenance,
      getName: (item) =>
        text(
          item.taskName ??
            item.title ??
            item.name ??
            item.description ??
            item.issue ??
            item.problem ??
            item.maintenanceType,
        ) || "Unnamed Record",
      getStatus: recordStatus,
    },
  ];

  const serviceAvailable = services.filter((item) =>
    isAvailableStatus(recordStatus(item)),
  ).length;

  const packageAvailable = packages.filter((item) =>
    isAvailableStatus(recordStatus(item)),
  ).length;

  const staffAvailable = staff.filter((item) =>
    getRecordStatuses(item).some((status) =>
      ["active", "available", "on-duty"].includes(status),
    ),
  ).length;

  const maintenancePending = maintenance.filter(
    isPendingMaintenanceTask,
  ).length;

  const filteredGroups = resourceGroups.map((group) => ({
    ...group,
    records: group.records.filter((item) => {
      const name = group.getName(item).toLowerCase();
      const status = group.getStatus(item);
      const query = search.trim().toLowerCase();

      const roomNumber = text(
        item.displayRoomNumber ?? item.roomNumber ?? item.roomNo ?? item.roomId,
      ).toLowerCase();

      return (
        !query ||
        name.includes(query) ||
        status.includes(query) ||
        roomNumber.includes(query) ||
        group.title.toLowerCase().includes(query)
      );
    }),
  }));

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          Loading resort availability...
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Room Types",
      value: String(roomTypes.length),
      detail: `${roomAvailability.filter((room) => room.available > 0).length} types with availability`,
      icon: BedDouble,
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
    {
      label: "Rooms",
      value: String(roomCounts.total),
      detail: `${roomCounts.occupied} currently occupied`,
      icon: DoorOpen,
      color: "text-green-700",
      bg: "bg-green-100",
    },
    {
      label: "Services",
      value: String(services.length),
      detail: `${serviceAvailable} available`,
      icon: Waves,
      color: "text-cyan-700",
      bg: "bg-cyan-100",
    },
    {
      label: "Packages",
      value: String(packages.length),
      detail: `${packageAvailable} available`,
      icon: Package,
      color: "text-purple-700",
      bg: "bg-purple-100",
    },
    {
      label: "Staff",
      value: String(staff.length),
      detail: `${staffAvailable} active or available`,
      icon: Users,
      color: "text-amber-700",
      bg: "bg-amber-100",
    },
    {
      label: "Maintenance Tasks",
      value: String(maintenancePending),
      detail: `${maintenance.length} total records`,
      icon: Wrench,
      color: "text-orange-700",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Resort Availability
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor rooms, activities, packages, staff, and maintenance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboardData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh data
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <Icon className={`size-6 ${card.color}`} />
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">{card.detail}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2.5">
            <CalendarDays className="size-5 text-blue-700" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Room Availability by Type
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select dates to check room reservations.
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="manager-checkin"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Check-in date
            </label>

            <input
              id="manager-checkin"
              type="date"
              min={todayString()}
              value={checkIn}
              onChange={(event) => {
                const next = event.target.value;
                setCheckIn(next);

                if (next >= checkOut) {
                  const date = new Date(`${next}T00:00:00`);
                  date.setDate(date.getDate() + 1);

                  setCheckOut(
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
                  );
                }
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div>
            <label
              htmlFor="manager-checkout"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Check-out date
            </label>

            <input
              id="manager-checkout"
              type="date"
              min={checkIn}
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
        </div>

        {checkOut <= checkIn ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            Check-out must be after check-in.
          </p>
        ) : roomAvailability.length > 0 ? (
          <div className="space-y-5">
            {roomAvailability.map((room) => {
              const percentage =
                room.inventory > 0
                  ? Math.min(100, (room.available / room.inventory) * 100)
                  : 0;

              return (
                <div key={room.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{room.name}</p>
                      <p className="text-xs text-gray-500">
                        {room.reserved} reserved · {room.maintained} under
                        maintenance
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-gray-700">
                      <span
                        className={
                          room.available > 0 ? "text-green-700" : "text-red-700"
                        }
                      >
                        {room.available} available
                      </span>
                      {" / "}
                      {room.inventory}
                    </p>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage > 50
                          ? "bg-green-500"
                          : percentage > 0
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <BedDouble className="mx-auto mb-3 size-9 text-gray-300" />
            <p className="font-medium text-gray-700">No room types found</p>
            <p className="mt-1 text-sm text-gray-500">
              Check the roomTypes collection in your admin database.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-6">
          {filteredGroups.map((group) => {
            const Icon = group.icon;

            return (
              <div key={group.title}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-lg p-2 ${group.bg}`}>
                      <Icon className={`size-5 ${group.color}`} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {group.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {group.records.length}
                  </span>
                </div>

                {group.records.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full min-w-[500px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Resource</th>
                          <th className="px-4 py-3 font-medium">
                            Room Number / Details
                          </th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {group.records.map((item) => {
                          const isRoomGroup = group.title === "Rooms";

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {isRoomGroup
                                  ? getRoomTypeName(item, roomTypes)
                                  : group.getName(item)}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {isRoomGroup
                                  ? getRoomNumber(item) || "Room number not set"
                                  : getMaintenanceRoomLabel(
                                      item,
                                      rooms,
                                      roomTypes,
                                    ) || "No room linked"}
                              </td>

                              <td className="px-4 py-3">
                                <StatusBadge status={group.getStatus(item)} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-500">
                    {search
                      ? "No matching records."
                      : `No ${group.title.toLowerCase()} records found.`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700" />

          <div>
            <p className="font-semibold text-green-900">Available Resources</p>
            <p className="mt-1 text-sm text-green-800">
              {roomCounts.available} rooms, {serviceAvailable} services, and{" "}
              {packageAvailable} packages are currently marked available.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <Wrench className="mt-0.5 size-5 shrink-0 text-orange-700" />

          <div>
            <p className="font-semibold text-orange-900">Maintenance</p>
            <p className="mt-1 text-sm text-orange-800">
              {roomCounts.maintained} rooms have a maintenance status and{" "}
              {maintenancePending} maintenance tasks are pending or ongoing.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <MonitorCheck className="mt-0.5 size-5 shrink-0 text-blue-700" />

          <div>
            <p className="font-semibold text-blue-900">Data Summary</p>
            <p className="mt-1 text-sm text-blue-800">
              Monitoring {rooms.length} rooms, {staff.length} staff,{" "}
              {services.length + packages.length} activities and packages, and{" "}
              {bookings.length} booking records.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
