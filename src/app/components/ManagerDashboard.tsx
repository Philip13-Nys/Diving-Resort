import { useActivityAvailability } from "../useActivityAvailability";
import {
  activityEnabled,
  hasAvailableActivitySession,
} from "../activityAvailability";
import ServiceAvailabilityPanel from "./ServiceAvailabilityPanel";
import { useRecordRevision } from "../useBookingInventory";
import { getLiveBookingSnapshot as getBookingSnapshot } from "../bookingStore";
import { useBookingInventory } from "../useBookingInventory";
import {
  typeAvailability,
  blockedRoom,
  normalizeBookingValue,
  roomBookingsOnDate,
  roomStatusOnDate,
  localDate,
} from "../bookingAvailability";
import { AsyncButton } from "./ui/async-action";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  BedDouble,
  DoorOpen,
  Waves,
  Package,
  Users,
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

const todayString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const tomorrowString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getRecordStatuses = (item: RecordData): string[] =>
  [item.status, item.availabilityStatus, item.currentStatus]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value).trim().toLowerCase().replace(/[_\s]+/g, "-"));

export default function ManagerDashboard() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,admin:Staff,admin:rooms,admin:roomTypes,admin:services,admin:packages",
  );
  const availability = useBookingInventory();
  const activities = useActivityAvailability();
  const [roomTypes, setRoomTypes] = useState<RecordData[]>([]);
  const [rooms, setRooms] = useState<RecordData[]>([]);
  const [services, setServices] = useState<RecordData[]>([]);
  const [packages, setPackages] = useState<RecordData[]>([]);
  const [staff, setStaff] = useState<RecordData[]>([]);
  const [bookings, setBookings] = useState<RecordData[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
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
        getBookingSnapshot(),
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
        bookingsResult,
      ] = results;

      setRoomTypes(convert(roomTypesResult, "roomTypes"));
      setRooms(convert(roomsResult, "rooms"));
      setServices(convert(servicesResult, "services"));
      setPackages(convert(packagesResult, "packages"));
      setStaff(convert(staffResult, "Staff"));
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
  }, [loadDashboardData, recordRevision]);

  const roomAvailability = useMemo(
    () =>
      availability.roomTypes.map((type) => {
        const inventoryRooms = availability.rooms.filter(
          (room) =>
            room.roomTypeId === type.id ||
            normalizeBookingValue(room.type) ===
              normalizeBookingValue(type.name),
        );
        const inventory = inventoryRooms.length;
        const unavailable = inventoryRooms.filter(blockedRoom).length;
        let available = 0;
        try {
          available = typeAvailability(
            availability.rooms,
            availability.reservations,
            type,
            checkIn,
            checkOut,
          ).available;
        } catch {
          /* Invalid dates leave no bookable availability. */
        }
        return {
          id: type.id,
          name: String(type.name),
          inventory,
          unavailable,
          reserved: Math.max(0, inventory - unavailable - available),
          available,
        };
      }),
    [
      availability.rooms,
      availability.roomTypes,
      availability.reservations,
      checkIn,
      checkOut,
    ],
  );

  const roomCounts = useMemo(() => {
    const unavailableRoomIds = new Set(
      availability.rooms.filter(blockedRoom).map((room) => room.id),
    );

    const today = localDate();
    const assignments = roomBookingsOnDate(
      availability.rooms,
      availability.reservations,
      today,
    );
    const occupied = availability.rooms.filter(
      (room) =>
        !unavailableRoomIds.has(room.id) &&
        roomStatusOnDate(room, assignments.get(room.id), today) === "occupied",
    ).length;

    return {
      total: rooms.length,
      unavailable: unavailableRoomIds.size,
      occupied,
      available: Math.max(
        0,
        rooms.length - unavailableRoomIds.size - occupied,
      ),
    };
  }, [
    rooms,
    availability.rooms,
    availability.reservations,
  ]);

  const availableActivities =
    activities.loading || activities.error
      ? []
      : activities.catalog.filter((item) =>
          hasAvailableActivitySession(
            item,
            localDate(),
            localDate(),
            activities.catalog,
            activities.occupied,
          ),
        );
  const serviceAvailable = availableActivities.filter(
    (item) => item.itemType === "service",
  ).length;
  const packageAvailable = activities.catalog.filter(
    (item) => item.itemType === "package" && activityEnabled(item),
  ).length;

  const staffAvailable = staff.filter((item) =>
    getRecordStatuses(item).some((status) =>
      ["active", "available", "on-duty"].includes(status),
    ),
  ).length;

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
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Resort Availability
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor rooms, activities, packages, and staff.
          </p>
        </div>

        <AsyncButton
          type="button"
          onClick={() => void loadDashboardData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh data
        </AsyncButton>
      </div>

      {(error || availability.error) && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                        {room.reserved} reserved · {room.unavailable} unavailable
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700" />

          <div>
            <p className="font-semibold text-green-900">Available Resources</p>
            <p className="mt-1 text-sm text-green-800">
              {roomCounts.available} rooms, {serviceAvailable} services, and{" "}
              {packageAvailable} active packages. See service quantities below.
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
      <ServiceAvailabilityPanel managePath="/manager/services" />
    </div>
  );
}
