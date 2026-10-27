import { useEffect, useMemo, useState } from "react";
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
  Search,
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

const recordName = (item: RecordData) =>
  text(
    item.name ??
      item.roomName ??
      item.roomTypeName ??
      item.packageName ??
      item.serviceName ??
      item.title ??
      item.equipmentName ??
      item.taskName,
  ) || "Unnamed Record";

const recordStatus = (item: RecordData) =>
  normalized(
    item.status ??
      item.availabilityStatus ??
      (item.isAvailable === false || item.available === false
        ? "unavailable"
        : item.isAvailable === true || item.available === true
          ? "available"
          : "active"),
  );

const isMaintenance = (status: string) =>
  status.includes("maintenance") ||
  status.includes("out-of-service") ||
  status.includes("out-of-order") ||
  status.includes("repair");

const isInactive = (status: string) =>
  status.includes("inactive") ||
  status.includes("disabled") ||
  status.includes("archived") ||
  status.includes("unavailable") ||
  status.includes("not-available");

const isCancelled = (status: string) =>
  status === "cancelled" || status === "canceled";

const isAvailableStatus = (status: string) =>
  !isMaintenance(status) &&
  !isInactive(status) &&
  !status.includes("occupied") &&
  !status.includes("checked-in") &&
  !status.includes("reserved") &&
  !status.includes("booked") &&
  !status.includes("pending");

const overlaps = (booking: RecordData, checkIn: string, checkOut: string) => {
  const start = text(booking.checkIn ?? booking.bookingDate);
  const end = text(booking.checkOut ?? booking.bookingDate);

  if (!start || !end) return false;

  return start < checkOut && end > checkIn;
};

const StatusBadge = ({ status }: { status: string }) => {
  let classes = "bg-gray-100 text-gray-700";
  let label = status.replace(/-/g, " ") || "Unknown";

  if (isMaintenance(status)) {
    classes = "bg-orange-100 text-orange-700";
    label = "Maintenance";
  } else if (isCancelled(status)) {
    classes = "bg-gray-100 text-gray-500";
    label = "Cancelled";
  } else if (
    status.includes("occupied") ||
    status.includes("checked-in") ||
    status.includes("booked")
  ) {
    classes = "bg-blue-100 text-blue-700";
    label = status.replace(/-/g, " ");
  } else if (isInactive(status)) {
    classes = "bg-red-100 text-red-700";
    label = status.replace(/-/g, " ");
  } else if (status.includes("pending") || status.includes("reserved")) {
    classes = "bg-amber-100 text-amber-700";
    label = status.replace(/-/g, " ");
  } else if (isAvailableStatus(status)) {
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
  const [category, setCategory] = useState("All");
  const [checkIn, setCheckIn] = useState(todayString);
  const [checkOut, setCheckOut] = useState(tomorrowString);

  const loadDashboardData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [
        roomTypesResult,
        roomsResult,
        servicesResult,
        packagesResult,
        staffResult,
        maintenanceResult,
        equipmentResult,
        bookingsResult,
      ] = await Promise.allSettled([
        getDocs(collection(db, "roomTypes")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "Staff")),
        getDocs(collection(db, "maintenance")),
        getDocs(collection(db, "equipment")),
        getDocs(collection(customerDb, "Bookings")),
      ]);

      const convert = (
        result: PromiseSettledResult<any>,
        collectionName: string,
      ): RecordData[] => {
        if (result.status === "fulfilled") {
          return result.value.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }

        console.error(`Could not load ${collectionName}:`, result.reason);
        return [];
      };

      setRoomTypes(convert(roomTypesResult, "roomTypes"));
      setRooms(convert(roomsResult, "rooms"));
      setServices(convert(servicesResult, "services"));
      setPackages(convert(packagesResult, "packages"));
      setStaff(convert(staffResult, "Staff"));
      setMaintenance(convert(maintenanceResult, "maintenance"));

      setBookings(convert(bookingsResult, "Bookings"));

      const failed = [
        roomTypesResult,
        roomsResult,
        servicesResult,
        packagesResult,
        staffResult,
        maintenanceResult,
        equipmentResult,
        bookingsResult,
      ].some((result) => result.status === "rejected");

      if (failed) {
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
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const activeBookings = useMemo(
    () =>
      bookings.filter((booking) => !isCancelled(normalized(booking.status))),
    [bookings],
  );

  const roomAvailability = useMemo(() => {
    return roomTypes.map((type) => {
      const typeName = normalized(type.name ?? type.roomTypeName ?? type.type);

      const typeId = normalized(type.id);

      const matchingRooms = rooms.filter((room) => {
        const roomTypeId = normalized(room.roomTypeId ?? room.typeId);
        const roomTypeName = normalized(
          room.roomTypeName ?? room.roomType ?? room.typeName,
        );

        return (
          (typeId && roomTypeId === typeId) ||
          (typeName && roomTypeName === typeName)
        );
      });

      const inventory = matchingRooms.length
        ? matchingRooms.length
        : Number(
            type.count ??
              type.quantity ??
              type.totalRooms ??
              type.numberOfRooms ??
              type.availableRooms ??
              0,
          );

      const maintainedRooms = matchingRooms.filter((room) =>
        isMaintenance(recordStatus(room)),
      ).length;

      const reservedBookings = activeBookings.filter((booking) => {
        if (!overlaps(booking, checkIn, checkOut)) return false;

        const bookingTypeId = normalized(booking.roomTypeId ?? booking.typeId);

        const bookingTypeName = normalized(
          booking.roomTypeName ?? booking.roomType ?? booking.roomName,
        );

        const bookingType = normalized(
          booking.bookingType ?? booking.itemType ?? booking.type,
        );

        if (
          bookingType.includes("activity") ||
          bookingType.includes("service") ||
          bookingType.includes("package")
        ) {
          return false;
        }

        return (
          (typeId && bookingTypeId === typeId) ||
          (typeName && bookingTypeName === typeName)
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
            ),
          ),
        0,
      );

      const available = Math.max(0, inventory - maintainedRooms - reserved);

      return {
        id: type.id,
        name: recordName(type),
        inventory,
        maintained: maintainedRooms,
        reserved,
        available,
      };
    });
  }, [roomTypes, rooms, activeBookings, checkIn, checkOut]);

  const roomCounts = useMemo(() => {
    const maintained = rooms.filter((room) =>
      isMaintenance(recordStatus(room)),
    ).length;

    const occupied = rooms.filter((room) => {
      const status = recordStatus(room);
      return status.includes("occupied") || status.includes("checked-in");
    }).length;

    const inactive = rooms.filter((room) =>
      isInactive(recordStatus(room)),
    ).length;

    const total = rooms.length;

    return {
      total,
      maintained,
      occupied,
      inactive,
      available: Math.max(0, total - maintained - occupied - inactive),
    };
  }, [rooms]);

  const resourceGroups: ResourceGroup[] = [
    {
      title: "Maintenance",
      description: "Maintenance tasks and service issues",
      icon: Wrench,
      color: "text-orange-700",
      bg: "bg-orange-100",
      records: maintenance,
      getName: recordName,
      getStatus: recordStatus,
    },
  ];

  const serviceAvailable = services.filter((item) =>
    isAvailableStatus(recordStatus(item)),
  ).length;

  const packageAvailable = packages.filter((item) =>
    isAvailableStatus(recordStatus(item)),
  ).length;

  const staffAvailable = staff.filter((item) => {
    const status = recordStatus(item);
    return (
      status === "active" || status === "available" || status === "on-duty"
    );
  }).length;

  const maintenancePending = maintenance.filter((item) => {
    const status = recordStatus(item);
    return (
      status.includes("pending") ||
      status.includes("requested") ||
      status.includes("in-progress") ||
      status.includes("ongoing")
    );
  }).length;

  const totalRoomTypes = roomTypes.length;
  const availableRoomTypes = roomAvailability.filter(
    (type) => type.available > 0,
  ).length;

  const filteredGroups = resourceGroups
    .filter((group) => category === "All" || group.title === category)
    .map((group) => ({
      ...group,
      records: group.records.filter((item) => {
        const name = group.getName(item).toLowerCase();
        const status = group.getStatus(item);
        const query = search.trim().toLowerCase();

        return (
          !query ||
          name.includes(query) ||
          status.includes(query) ||
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
      value: `${availableRoomTypes}/${totalRoomTypes}`,
      detail: "Types with rooms available",
      icon: BedDouble,
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
    {
      label: "Available Rooms",
      value: String(roomCounts.available),
      detail: `${roomCounts.occupied} currently occupied`,
      icon: DoorOpen,
      color: "text-green-700",
      bg: "bg-green-100",
    },
    {
      label: "Available Services",
      value: `${serviceAvailable}/${services.length}`,
      detail: "Based on record status",
      icon: Waves,
      color: "text-cyan-700",
      bg: "bg-cyan-100",
    },
    {
      label: "Available Packages",
      value: `${packageAvailable}/${packages.length}`,
      detail: "Based on record status",
      icon: Package,
      color: "text-purple-700",
      bg: "bg-purple-100",
    },
    {
      label: "Active Staff",
      value: `${staffAvailable}/${staff.length}`,
      detail: "Active or available staff",
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

  const categories = [
    "All",
    "Room Types",
    "Rooms",
    "Services & Activities",
    "Packages",
    "Staff",
    "Maintenance",
    "Equipment",
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* Page Header */}
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

      {/* Summary Cards */}
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

      {/* Room Availability by Type */}
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

      {/* Resource Directory */}
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
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Resource</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {group.records.map((item) => {
                          const status = group.getStatus(item);

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {group.getName(item)}
                              </td>

                              <td className="px-4 py-3">
                                <StatusBadge status={status} />
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

      {/* Operational Summary */}
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
