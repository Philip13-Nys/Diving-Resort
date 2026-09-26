import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  DoorOpen,
  PhilippinePeso,
  Users,
  Clock,
  ArrowRight,
  LogIn,
  LogOut,
} from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router";
import { customerDb, db } from "../app/firebase";

interface Booking {
  id: string;
  bookingId?: string;
  bookingRef?: string;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  guestName?: string;
  guest?: string;

  roomId?: string;
  roomName?: string;
  roomType?: string;
  room?: string;

  packageName?: string;
  name?: string;

  checkIn?: any;
  checkOut?: any;

  price?: number;
  totalPrice?: number;
  total?: number;
  totalAmount?: number;
  amount?: number;
  roomRate?: number;

  amountPaid?: number;
  paid?: number;

  guests?: number;
  nights?: number;

  status?: string;
  paymentStatus?: string;

  createdAt?: any;
  checkedOutAt?: any;

  type?: string;
  services?: any[];
}

interface Room {
  id: string;
  roomNumber?: string;
  roomName?: string;
  name?: string;
  roomType?: string;
  status?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  "checked-in": {
    label: "Checked In",
    className: "bg-green-100 text-green-700",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-700",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700",
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-orange-100 text-orange-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
  },
  completed: {
    label: "Completed",
    className: "bg-gray-100 text-gray-700",
  },
  "checked-out": {
    label: "Checked Out",
    className: "bg-purple-100 text-purple-700",
  },
};

const QUICK_ACTIONS = [
  {
    title: "New Walk-in",
    description: "Create a walk-in booking",
    icon: ClipboardList,
    path: "/receptionist/walkin",
  },
  {
    title: "Check Room Availability",
    description: "View available rooms",
    icon: DoorOpen,
    path: "/receptionist/availability",
  },
  {
    title: "Process Payment",
    description: "Manage guest payments",
    icon: PhilippinePeso,
    path: "/receptionist/payments",
  },
  {
    title: "View Reports",
    description: "View booking reports",
    icon: CalendarDays,
    path: "/receptionist/reports",
  },
];

const convertToDate = (value: any): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (value?.seconds) {
    return new Date(value.seconds * 1000);
  }

  return null;
};

const getCustomerName = (booking: Booking) => {
  return booking.guestName || booking.guest || booking.customerName || "Guest";
};

const getBookingPrice = (booking: Booking) => {
  return Number(
    booking.totalAmount ??
      booking.totalPrice ??
      booking.total ??
      booking.price ??
      booking.amount ??
      0,
  );
};

const getAmountPaid = (booking: Booking) => {
  return Number(booking.amountPaid ?? booking.paid ?? 0);
};

const isPaidBooking = (booking: Booking) => {
  const paymentStatus = booking.paymentStatus?.toLowerCase();

  if (paymentStatus === "paid" || paymentStatus === "completed") {
    return true;
  }

  const total = getBookingPrice(booking);
  const paid = getAmountPaid(booking);

  return total > 0 && paid >= total;
};

const getBookingStatus = (booking: Booking) => {
  return booking.status?.toLowerCase() || "pending";
};

export default function ReceptionistsDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const today = startOfDay(new Date());

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const bookingsSnapshot = await getDocs(
        collection(customerDb, "Bookings"),
      );

      const bookingData: Booking[] = bookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];

      const roomsSnapshot = await getDocs(collection(db, "rooms"));

      const roomData: Room[] = roomsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      setBookings(bookingData);
      setRooms(roomData);
    } catch (error) {
      console.error("Error loading receptionist dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const occupiedRoomIds = useMemo(() => {
    const occupied = new Set<string>();

    bookings.forEach((booking) => {
      const status = getBookingStatus(booking);

      if (status !== "checked-in") return;

      const checkIn = convertToDate(booking.checkIn);
      const checkOut = convertToDate(booking.checkOut);

      if (!checkIn) return;

      const checkInDay = startOfDay(checkIn);

      if (today >= checkInDay && (!checkOut || today < startOfDay(checkOut))) {
        const roomIdentifier =
          booking.roomId ||
          booking.roomName ||
          booking.roomType ||
          booking.room;

        if (roomIdentifier) {
          occupied.add(String(roomIdentifier));
        }
      }
    });

    return occupied;
  }, [bookings, today]);

  const occupiedRooms = useMemo(() => {
    if (rooms.length === 0) {
      return occupiedRoomIds.size;
    }

    const matchedRooms = rooms.filter((room) => {
      const identifiers = [room.id, room.roomNumber, room.roomName, room.name]
        .filter(Boolean)
        .map(String);

      return identifiers.some((id) => occupiedRoomIds.has(id));
    });

    return matchedRooms.length || occupiedRoomIds.size;
  }, [rooms, occupiedRoomIds]);

  const todaysCheckIns = useMemo(() => {
    return bookings.filter((booking) => {
      const status = getBookingStatus(booking);

      if (status === "cancelled" || status === "checked-out") {
        return false;
      }

      const checkIn = convertToDate(booking.checkIn);

      return checkIn ? isSameDay(checkIn, today) : false;
    });
  }, [bookings, today]);

  const todaysCheckOuts = useMemo(() => {
    return bookings.filter((booking) => {
      const status = getBookingStatus(booking);

      if (status === "cancelled") {
        return false;
      }

      const checkOut = convertToDate(booking.checkOut);

      return checkOut ? isSameDay(checkOut, today) : false;
    });
  }, [bookings, today]);

  const revenueToday = useMemo(() => {
    return bookings.reduce((total, booking) => {
      if (!isPaidBooking(booking)) return total;

      const checkIn = convertToDate(booking.checkIn);

      if (!checkIn || !isSameDay(checkIn, today)) {
        return total;
      }

      return total + getBookingPrice(booking);
    }, 0);
  }, [bookings, today]);

  const monthlyRevenue = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return bookings.reduce((total, booking) => {
      if (!isPaidBooking(booking)) return total;

      const date =
        convertToDate(booking.createdAt) || convertToDate(booking.checkIn);

      if (!date) return total;

      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        return total + getBookingPrice(booking);
      }

      return total;
    }, 0);
  }, [bookings, today]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .filter((booking) => getBookingStatus(booking) !== "cancelled")
      .sort((a, b) => {
        const dateA = convertToDate(a.createdAt) || convertToDate(a.checkIn);

        const dateB = convertToDate(b.createdAt) || convertToDate(b.checkIn);

        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      })
      .slice(0, 10);
  }, [bookings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (value: any) => {
    const date = convertToDate(value);

    if (!date) return "—";

    return format(date, "MMM d, yyyy");
  };

  const formatTime = (value: any) => {
    const date = convertToDate(value);

    if (!date) return "—";

    return format(date, "h:mm a");
  };

  const getStatusStyle = (status?: string) => {
    const normalized = status?.toLowerCase() || "pending";

    return (
      STATUS_CONFIG[normalized] || {
        label: status || "Pending",
        className: "bg-gray-100 text-gray-700",
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Receptionist Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage today's resort operations and guest activities.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Occupied Rooms</p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? "—" : occupiedRooms}
                </p>
              </div>

              <div className="rounded-lg bg-blue-100 p-3">
                <DoorOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Check-ins</p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? "—" : todaysCheckIns.length}
                </p>
              </div>

              <div className="rounded-lg bg-green-100 p-3">
                <LogIn className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue Today</p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? "—" : formatCurrency(revenueToday)}
                </p>
              </div>

              <div className="rounded-lg bg-purple-100 p-3">
                <PhilippinePeso className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Revenue</p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? "—" : formatCurrency(monthlyRevenue)}
                </p>
              </div>

              <div className="rounded-lg bg-orange-100 p-3">
                <PhilippinePeso className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-gray-100 p-3">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>

                    <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1" />
                  </div>

                  <h3 className="mt-4 font-semibold text-gray-900">
                    {action.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Today's Schedule
                </h2>

                <p className="text-sm text-gray-500">
                  {format(today, "MMMM d, yyyy")}
                </p>
              </div>

              <Clock className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {todaysCheckIns.length === 0 && todaysCheckOuts.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-gray-300" />

                  <p className="mt-2 text-sm text-gray-500">
                    No scheduled activities today.
                  </p>
                </div>
              ) : (
                <>
                  {todaysCheckIns.map((booking) => (
                    <div
                      key={`checkin-${booking.id}`}
                      className="flex items-center gap-4 rounded-lg border border-gray-100 p-4"
                    >
                      <div className="rounded-lg bg-green-100 p-2">
                        <LogIn className="h-5 w-5 text-green-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {getCustomerName(booking)}
                        </p>

                        <p className="text-sm text-gray-500">
                          Check-in · {formatTime(booking.checkIn)}
                        </p>

                        <p className="text-xs text-gray-400">
                          Room:{" "}
                          {booking.room ||
                            booking.roomName ||
                            booking.roomType ||
                            "—"}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-green-600">
                        Check-in
                      </span>
                    </div>
                  ))}

                  {todaysCheckOuts.map((booking) => (
                    <div
                      key={`checkout-${booking.id}`}
                      className="flex items-center gap-4 rounded-lg border border-gray-100 p-4"
                    >
                      <div className="rounded-lg bg-purple-100 p-2">
                        <LogOut className="h-5 w-5 text-purple-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {getCustomerName(booking)}
                        </p>

                        <p className="text-sm text-gray-500">
                          Check-out · {formatTime(booking.checkOut)}
                        </p>

                        <p className="text-xs text-gray-400">
                          Room:{" "}
                          {booking.room ||
                            booking.roomName ||
                            booking.roomType ||
                            "—"}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-purple-600">
                        Check-out
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Guest Overview
                </h2>

                <p className="text-sm text-gray-500">Current guest activity</p>
              </div>

              <Users className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span className="text-sm text-gray-600">Total Bookings</span>

                <span className="font-semibold text-gray-900">
                  {bookings.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span className="text-sm text-gray-600">Today's Check-ins</span>

                <span className="font-semibold text-gray-900">
                  {todaysCheckIns.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span className="text-sm text-gray-600">
                  Today's Check-outs
                </span>

                <span className="font-semibold text-gray-900">
                  {todaysCheckOuts.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span className="text-sm text-gray-600">
                  Currently Checked In
                </span>

                <span className="font-semibold text-green-600">
                  {
                    bookings.filter(
                      (booking) => getBookingStatus(booking) === "checked-in",
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Bookings
              </h2>

              <p className="text-sm text-gray-500">
                Latest resort reservations
              </p>
            </div>

            <button
              onClick={() => navigate("/receptionist/reservations")}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Check-in</th>
                  <th className="px-6 py-4">Check-out</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      Loading bookings...
                    </td>
                  </tr>
                ) : recentBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((booking) => {
                    const status = getStatusStyle(booking.status);

                    return (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {booking.bookingId ||
                            booking.bookingRef ||
                            booking.id}
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {getCustomerName(booking)}
                            </p>

                            {booking.customerEmail && (
                              <p className="text-xs text-gray-500">
                                {booking.customerEmail}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {booking.room ||
                            booking.roomName ||
                            booking.roomType ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {formatDate(booking.checkIn)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {formatDate(booking.checkOut)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(getBookingPrice(booking))}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
