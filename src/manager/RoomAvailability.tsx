import { Card } from "../app/components/ui/card";
import { Calendar, CheckCircle, XCircle, Clock, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../app/firebase";

const getWeekDates = () => {
  const today = new Date();

  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      day: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
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
  maintenance: "bg-red-100 border-red-300 text-red-700",
};

const statusIcons = {
  available: CheckCircle,
  occupied: XCircle,
  reserved: Clock,
  maintenance: Wrench,
};

interface RoomAvailabilityData {
  id: string;
  room: string;
  type: string;
  status: string;
}

export default function RoomAvailability() {
  const [rooms, setRooms] = useState<RoomAvailabilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const weekDates = getWeekDates();
  const availableCount = rooms.filter(
    (room) => room.status === "available",
  ).length;

  const occupiedCount = rooms.filter(
    (room) => room.status === "occupied",
  ).length;

  const reservedCount = rooms.filter(
    (room) => room.status === "reserved",
  ).length;

  const maintenanceCount = rooms.filter(
    (room) => room.status === "maintenance",
  ).length;

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);

        const roomsSnapshot = await getDocs(collection(db, "Rooms"));

        const roomData: RoomAvailabilityData[] = roomsSnapshot.docs.map(
          (doc) => {
            const data = doc.data();

            return {
              id: doc.id,
              room: data.roomNumber || data.room || doc.id,
              type: data.roomType || data.type || "Unknown",
              status: data.status || "available",
            };
          },
        );

        setRooms(roomData);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Room Availability & Status
        </h1>
        <p className="text-gray-500 mt-2">
          Monitor room occupancy and maintenance status
        </p>
      </div>

      {/* Legend */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-gray-700">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-700">Maintenance</span>
          </div>
        </div>
      </Card>

      {/* Availability Calendar */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Weekly Availability - June 2026
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
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
                    className="text-center py-3 px-4 text-sm font-medium text-gray-500"
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
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    No rooms found.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                      #{room.room}
                    </td>

                    <td className="py-3 px-4 text-sm text-gray-700">
                      {room.type}
                    </td>

                    {weekDates.map((item, index) => {
                      const status = room.status || "available";

                      const Icon =
                        statusIcons[status as keyof typeof statusIcons] ||
                        CheckCircle;

                      return (
                        <td key={index} className="py-3 px-4">
                          <div
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
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
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Maintenance</p>
              <p className="text-xl font-bold text-gray-900">
                {maintenanceCount} rooms
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
