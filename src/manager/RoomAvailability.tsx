import { useBookingInventory } from "../app/useBookingInventory";
import {
  blockedRoom,
  normalizeBookingValue,
  roomBookingsOnDate,
  roomStatusOnDate,
  type BookingRecord,
} from "../app/bookingAvailability";
import { Card } from "../app/components/ui/card";
import { Calendar, CheckCircle, ChevronDown, ChevronRight, XCircle, Clock, CircleOff } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getWeekDates = (selectedDate: Date) => {
  const day = selectedDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(selectedDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(selectedDate.getDate() + diff);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date,
    };
  });
};

const statusColors = {
  available: "bg-green-100 border-green-300 text-green-700",
  occupied: "bg-blue-100 border-blue-300 text-blue-700",
  reserved: "bg-yellow-100 border-yellow-300 text-yellow-700",
  unavailable: "bg-red-100 border-red-300 text-red-700",
};

const statusIcons = {
  available: CheckCircle,
  occupied: XCircle,
  reserved: Clock,
  unavailable: CircleOff,
};

interface RoomAvailabilityData {
  id: string;
  roomId: string;
  roomTypeId: string;
  room: string;
  type: string;
  status: string;
}

interface BookingData {
  id: string;
  roomId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
}

export default function RoomAvailability() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedType, setSelectedType] = useState("all");
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(() => new Set());
  const {
    rooms: inventory,
    reservations,
    loading,
    error,
  } = useBookingInventory();
  const rooms = useMemo<BookingRecord[]>(
    () =>
      inventory.map((room) => ({
        ...room,
        room: room.roomNumber,
        roomId: String(room.roomId || room.id),
      })),
    [inventory],
  );
  const roomTypes = useMemo(
    () => [...new Set(rooms.map((room) => room.type).filter(Boolean))].sort(),
    [rooms],
  );
  const visibleRooms = useMemo(
    () =>
      rooms
        .filter((room) => selectedType === "all" || room.type === selectedType)
        .sort(
          (a, b) =>
            String(a.type).localeCompare(String(b.type)) ||
            String(a.roomId).localeCompare(String(b.roomId), undefined, {
              numeric: true,
            }),
        ),
    [rooms, selectedType],
  );
  const visibleTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of visibleRooms) {
      const type = room.type || "Other rooms";
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return counts;
  }, [visibleRooms]);
  const allVisibleTypesCollapsed =
    visibleTypeCounts.size > 0 &&
    [...visibleTypeCounts.keys()].every((type) => collapsedTypes.has(type));
  const toggleType = (type: string) => {
    setCollapsedTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };
  const selectedDateKey = formatLocalDate(selectedDate);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDateKey]);
  const today = new Date();
  const todayKey = formatLocalDate(today);
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0,
  ).getDate();
  const years = Array.from(
    { length: Math.max(today.getFullYear(), selectedDate.getFullYear()) + 11 - 2020 },
    (_, index) => 2020 + index,
  );
  const changeSelectedDate = (year: number, month: number, day: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    setSelectedDate(new Date(year, month, Math.min(day, lastDay)));
  };
  const dayMaps = useMemo(
    () =>
      new Map(
        [
          ...weekDates.map((item) => formatLocalDate(item.fullDate)),
          selectedDateKey,
        ].map((date) => [
          date,
          roomBookingsOnDate(inventory, reservations, date),
        ]),
      ),
    [inventory, reservations, weekDates, selectedDateKey],
  );
  const getRoomStatusForDate = (room: (typeof rooms)[number], date: Date) => {
    const day = formatLocalDate(date);
    return roomStatusOnDate(room, dayMaps.get(day)?.get(room.id), day, todayKey);
  };
  const availableCount = rooms.filter(
    (room) => getRoomStatusForDate(room, selectedDate) === "available",
  ).length;
  const occupiedCount = rooms.filter(
    (room) => getRoomStatusForDate(room, selectedDate) === "occupied",
  ).length;
  const reservedCount = rooms.filter(
    (room) => getRoomStatusForDate(room, selectedDate) === "reserved",
  ).length;

  return (
    <div className="p-8">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Room Availability & Status
        </h1>
        <p className="text-gray-500 mt-2">
          Monitor room occupancy and availability
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-xl font-bold text-gray-900">
                {availableCount} rooms
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Occupied</p>
              <p className="text-xl font-bold text-gray-900">
                {occupiedCount} rooms
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reserved</p>
              <p className="text-xl font-bold text-gray-900">
                {reservedCount} rooms
              </p>
            </div>
          </div>
        </Card>

      </div>

      <Card className="p-4 sm:p-5 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">View availability for</p>
            <p className="text-sm text-gray-500">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <select
            id="availability-month"
            aria-label="Availability month"
            value={selectedDate.getMonth()}
            onChange={(event) =>
              changeSelectedDate(
                selectedDate.getFullYear(),
                Number(event.target.value),
                selectedDate.getDate(),
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {Array.from({ length: 12 }, (_, month) => (
              <option key={month} value={month}>
                {new Date(2000, month, 1).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            aria-label="Availability day"
            value={selectedDate.getDate()}
            onChange={(event) =>
              changeSelectedDate(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                Number(event.target.value),
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {Array.from({ length: daysInMonth }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
          <select
            aria-label="Availability year"
            value={selectedDate.getFullYear()}
            onChange={(event) =>
              changeSelectedDate(
                Number(event.target.value),
                selectedDate.getMonth(),
                selectedDate.getDate(),
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Weekly Availability
              </h2>
              <p className="text-sm text-gray-500">
                {weekDates[0].date} - {weekDates[6].date} · {visibleRooms.length} rooms
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter rooms by type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="all">All room types</option>
              {roomTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={visibleTypeCounts.size === 0}
              onClick={() =>
                setCollapsedTypes(
                  allVisibleTypesCollapsed
                    ? new Set()
                    : new Set(visibleTypeCounts.keys()),
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allVisibleTypesCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600" aria-label="Availability status legend">
          <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-700" /> Available</span>
          <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-blue-700" /> Occupied</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-700" /> Reserved</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 sticky left-0 bg-white">
                  Room
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Type
                </th>
                {weekDates.map((item) => (
                  <th
                    key={item.fullDate.toISOString()}
                    className={`text-center py-3 px-4 text-sm font-medium ${formatLocalDate(item.fullDate) === selectedDateKey ? "bg-blue-50 text-blue-700" : "text-gray-500"}`}
                  >
                    <div>{item.day}</div>
                    <div className="text-xs text-gray-400">{item.date}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    Loading rooms...
                  </td>
                </tr>
              ) : visibleRooms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    {rooms.length === 0 ? "No rooms found." : "No rooms match this type."}
                  </td>
                </tr>
              ) : (
                visibleRooms.map((room, roomIndex) => (
                  <Fragment key={room.id}>
                  {(roomIndex === 0 || visibleRooms[roomIndex - 1].type !== room.type) && (
                    <tr className="bg-gray-50">
                      <th colSpan={9} scope="rowgroup" className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        <button
                          type="button"
                          aria-expanded={!collapsedTypes.has(room.type || "Other rooms")}
                          aria-label={`${collapsedTypes.has(room.type || "Other rooms") ? "Expand" : "Collapse"} ${room.type || "Other rooms"} rooms`}
                          onClick={() => toggleType(room.type || "Other rooms")}
                          className="flex w-full items-center gap-2 rounded py-1 text-left hover:text-blue-700"
                        >
                          {collapsedTypes.has(room.type || "Other rooms") ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>{room.type || "Other rooms"}</span>
                          <span className="text-xs font-normal text-gray-500">
                            ({visibleTypeCounts.get(room.type || "Other rooms")} rooms)
                          </span>
                        </button>
                      </th>
                    </tr>
                  )}
                  {!collapsedTypes.has(room.type || "Other rooms") && (
                  <tr
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white">
                      <div className="font-medium text-gray-900">
                        {room.roomId}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {room.type}
                    </td>
                    {weekDates.map((item) => {
                      const status = getRoomStatusForDate(room, item.fullDate);
                      const Icon =
                        statusIcons[status as keyof typeof statusIcons] ||
                        CheckCircle;

                      return (
                        <td key={formatLocalDate(item.fullDate)} className="py-3 px-4">
                          <div
                            title={status.charAt(0).toUpperCase() + status.slice(1)}
                            aria-label={`${room.roomId}: ${status} on ${item.day}, ${item.date}`}
                            className={`flex items-center justify-center p-2 rounded border ${
                              statusColors[
                                status as keyof typeof statusColors
                              ] || statusColors.available
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
