import { activityTimeLabel } from "../app/activityAvailability";
import {
  assignedRoomIds,
  dateOnly,
  displayRecordId,
  normalizeInventory,
} from "../app/bookingAvailability";
import { useRecordRevision } from "../app/useBookingInventory";
import { getLiveBookingSnapshot as getBookingSnapshot, watchRecords } from "../app/bookingStore";
import { AsyncButton } from "../app/components/ui/async-action";
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
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { collection, doc, getDocs, onSnapshot, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router";
import { customerDb, db } from "../app/firebase";

interface Booking {
  id: string;
  bookingId?: string;
  bookingRef?: string;

  customerName?: string;
  customerEmail?: string;
  email?: string;
  fullName?: string;
  customerPhone?: string;

  guestName?: string;
  guest?: string;

  roomId?: string;
  roomName?: string;
  roomType?: string;
  roomTypeName?: string;
  room?: string;

  packageName?: string;
  serviceName?: string;
  activityName?: string;
  itemName?: string;
  bookingType?: string;
  itemType?: string;
  bookingDate?: string;
  reservationDate?: string;
  bookingTime?: string;
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

  checkedInAt?: any;
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
    title: "View Reservations",
    description: "Review guest bookings",
    icon: CalendarDays,
    path: "/receptionist/reservations",
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

const getActualCheckIn = (booking: Booking) => {
  return convertToDate(booking.checkedInAt) || convertToDate(booking.checkIn);
};

const getActualCheckOut = (booking: Booking) => {
  return convertToDate(booking.checkedOutAt) || convertToDate(booking.checkOut);
};

const getCustomerName = (booking: Booking) => {
  return booking.customerName || booking.guestName || booking.fullName || booking.guest || "Guest";
};

const getActivityKind = (booking: Booking) => {
  const kinds = [booking.itemType, booking.bookingType, booking.type].map((value) =>
    String(value || "").trim().toLowerCase(),
  );
  if (kinds.includes("package")) return "Package";
  if (kinds.includes("service") || kinds.includes("activity")) return "Service";
  if (!booking.roomTypeName && !booking.roomType) {
    if (booking.packageName) return "Package";
    if (booking.serviceName || booking.activityName) return "Service";
  }
  return null;
};

const getActivityName = (booking: Booking) =>
  booking.packageName ||
  booking.serviceName ||
  booking.activityName ||
  booking.itemName ||
  booking.name ||
  getActivityKind(booking);

const getBookingStatus = (booking: Booking) => {
  return booking.status?.trim().toLowerCase().replace(/[\s_]+/g, "-") || "pending";
};

const validStayTime = (value: unknown): value is string =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

const formatStayTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return format(new Date(2000, 0, 1, hour, minute), "h:mm a");
};

export default function ReceptionistsDashboard({ embedded = false }: { embedded?: boolean }) {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations,admin:rooms",
  );
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingInquiries, setPendingInquiries] = useState<number | null>(null);
  const [recentCheckInDate, setRecentCheckInDate] = useState("");
  const [stayTimes, setStayTimes] = useState({ checkInTime: "14:00", checkOutTime: "11:00" });

  const today = startOfDay(new Date());

  useEffect(() => {
    loadDashboard();
  }, [recordRevision]);

  useEffect(() => watchRecords(
    "customer:Inquiries",
    (snapshot) => {
      setPendingInquiries(snapshot.docs.filter((inquiry) => {
        const status = String(inquiry.data().status ?? "new")
          .trim().toLowerCase().replace(/\s+/g, "-");
        return status !== "resolved" && status !== "cancelled";
      }).length);
    },
    (error) => {
      console.error("Error loading pending inquiries:", error);
      setPendingInquiries(null);
    },
  ), []);

  useEffect(() => {
    const values: Record<string, Record<string, unknown>> = {};
    const ready = new Set<string>();
    const unsubscribes = ["publicSettings", "systemSettings"].map((name) =>
      onSnapshot(doc(db, name, "general"), (snapshot) => {
        values[name] = snapshot.exists() ? snapshot.data() : {};
        ready.add(name);
        if (ready.size !== 2) return;
        const published = values.publicSettings;
        const internal = values.systemSettings;
        setStayTimes({
          checkInTime: validStayTime(published.checkInTime)
            ? published.checkInTime
            : validStayTime(internal.checkInTime) ? internal.checkInTime : "14:00",
          checkOutTime: validStayTime(published.checkOutTime)
            ? published.checkOutTime
            : validStayTime(internal.checkOutTime) ? internal.checkOutTime : "11:00",
        });
      }, (error) => console.error("Unable to load stay times for schedule:", error)),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);

  const loadDashboard = async () => {
    try {
      const bookingsSnapshot = await getBookingSnapshot();

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
        assignedRoomIds(booking, normalizeInventory(rooms)).forEach((id) =>
          occupied.add(id),
        );
      }
    });

    return occupied;
  }, [bookings, rooms, today]);

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
      if (getActivityKind(booking)) return false;
      const status = getBookingStatus(booking);

      if (status !== "confirmed" && status !== "checked-in") {
        return false;
      }

      const checkIn = getActualCheckIn(booking);

      return checkIn ? isSameDay(checkIn, today) : false;
    });
  }, [bookings, today]);

  const todaysCheckOuts = useMemo(() => {
    return bookings.filter((booking) => {
      if (getActivityKind(booking)) return false;
      const status = getBookingStatus(booking);

      if (status !== "confirmed" && status !== "checked-in") {
        return false;
      }

      const checkOut = getActualCheckOut(booking);

      return checkOut ? isSameDay(checkOut, today) : false;
    });
  }, [bookings, today]);

  const todaysActivities = useMemo(() => {
    return bookings.filter((booking) => {
      if (!getActivityKind(booking)) return false;
      const status = getBookingStatus(booking);
      if (status !== "confirmed" && status !== "checked-in") return false;
      const date = convertToDate(booking.bookingDate || booking.checkIn);
      return date ? isSameDay(date, today) : false;
    });
  }, [bookings, today]);

  const reservationCounts = useMemo(() => bookings.reduce((counts, booking) => {
    const status = getBookingStatus(booking);
    counts.total += 1;
    if (status === "confirmed") counts.confirmed += 1;
    if (status === "pending" || status === "pending-payment-verification") counts.pending += 1;
    if (status === "cancelled" || status === "canceled") counts.cancelled += 1;
    return counts;
  }, { total: 0, confirmed: 0, pending: 0, cancelled: 0 }), [bookings]);

  const recentBookings = useMemo(() => {
    const matchingBookings = [...bookings]
      .filter((booking) => !["cancelled", "canceled", "rejected"].includes(getBookingStatus(booking)))
      .filter((booking) => !recentCheckInDate || dateOnly(booking.checkIn || booking.bookingDate) === recentCheckInDate)
      .sort((a, b) => {
        const aDate = convertToDate(a.createdAt || a.bookingDate || a.reservationDate || a.checkIn)?.getTime() ?? 0;
        const bDate = convertToDate(b.createdAt || b.bookingDate || b.reservationDate || b.checkIn)?.getTime() ?? 0;
        return bDate - aDate || b.id.localeCompare(a.id);
      });
    return recentCheckInDate ? matchingBookings : matchingBookings.slice(0, 5);
  }, [bookings, recentCheckInDate]);

  const formatBookingDate = (value: unknown) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return format(new Date(`${value}T12:00:00`), "MMM d, yyyy");
    }
    const date = convertToDate(value);
    return date ? format(date, "MMM d, yyyy") : "—";
  };

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatTime = (value: any) => {
    const date = convertToDate(value);

    if (!date) return "—";

    return format(date, "h:mm a");
  };

  return (
    <div className={embedded ? "w-full min-w-0" : "min-h-full bg-gray-50 p-3 sm:p-4"}>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Receptionist Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage today's resort operations and guest activities.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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

          <AsyncButton
            type="button"
            onClick={() => navigate("/receptionist/inquiries")}
            className="rounded-xl bg-white p-5 text-left shadow-sm transition hover:shadow-md"
            aria-label="Open pending inquiries"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Inquiries</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {pendingInquiries ?? "—"}
                </p>
              </div>
              <div className="rounded-lg bg-teal-100 p-3">
                <MessageSquare className="h-6 w-6 text-teal-700" />
              </div>
            </div>
          </AsyncButton>

          {[
            { label: "Total Reservations", count: reservationCounts.total, Icon: CalendarDays, iconBackground: "bg-blue-100", iconColor: "text-blue-600" },
            { label: "Confirmed", count: reservationCounts.confirmed, Icon: CheckCircle2, iconBackground: "bg-green-100", iconColor: "text-green-600" },
            { label: "Pending", count: reservationCounts.pending, Icon: Clock, iconBackground: "bg-amber-100", iconColor: "text-amber-600" },
            { label: "Cancelled", count: reservationCounts.cancelled, Icon: XCircle, iconBackground: "bg-red-100", iconColor: "text-red-600" },
          ].map(({ label, count, Icon, iconBackground, iconColor }) => (
            <div key={label} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? "—" : count}</p>
                </div>
                <div className={`rounded-lg p-3 ${iconBackground}`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!embedded && <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;

              return (
                <AsyncButton
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
                </AsyncButton>
              );
            })}
          </div>
        </div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 sm:p-6 shadow-sm min-h-[360px] max-h-[480px] flex flex-col">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Today's Schedule
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {format(today, "MMMM d, yyyy")}
                </p>
              </div>

              <Clock className="h-5 w-5 text-gray-400" />
            </div>

            {/* Schedule */}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-2 hide-scrollbar">
              {todaysCheckIns.length === 0 && todaysCheckOuts.length === 0 && todaysActivities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <CalendarDays className="h-10 w-10 text-gray-300" />

                  <p className="mt-2 text-sm text-gray-500">
                    No scheduled activities today.
                  </p>
                </div>
              ) : (
                <>
                  {/* Check-ins */}
                  {todaysCheckIns.map((booking) => {
                    const checkedIn = getBookingStatus(booking) === "checked-in";
                    return (
                    <div
                      key={`checkin-${booking.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-3 transition hover:bg-gray-50"
                    >
                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                        {checkedIn
                          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                          : <LogIn className="h-5 w-5 text-green-600" />}
                      </div>

                      {/* Information */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {getCustomerName(booking)}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {checkedIn ? "Checked in" : "Check-in"}
                          {checkedIn
                            ? booking.checkedInAt ? ` · ${formatTime(booking.checkedInAt)}` : ""
                            : ` · ${formatStayTime(stayTimes.checkInTime)}`}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          Room:{" "}
                          {booking.room ||
                            booking.roomName ||
                            booking.roomType ||
                            "—"}
                        </p>
                      </div>

                      {/* Status */}
                      <span className="hidden shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-600 sm:inline-block">
                        {checkedIn ? "Checked in" : "Check-in"}
                      </span>
                    </div>
                    );
                  })}

                  {/* Check-outs */}
                  {todaysCheckOuts.map((booking) => (
                    <div
                      key={`checkout-${booking.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-3 transition hover:bg-gray-50"
                    >
                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                        <LogOut className="h-5 w-5 text-purple-600" />
                      </div>

                      {/* Information */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {getCustomerName(booking)}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          Check-out ·{" "}
                          {booking.checkedOutAt
                            ? formatTime(booking.checkedOutAt)
                            : formatStayTime(stayTimes.checkOutTime)}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          Room:{" "}
                          {booking.room ||
                            booking.roomName ||
                            booking.roomType ||
                            "—"}
                        </p>
                      </div>

                      {/* Status */}
                      <span className="hidden shrink-0 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-600 sm:inline-block">
                        Check-out
                      </span>
                    </div>
                  ))}

                  {todaysActivities.map((booking) => (
                    <div
                      key={`activity-${booking.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-3 transition hover:bg-gray-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                        <CalendarDays className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {getCustomerName(booking)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {getActivityKind(booking)}
                          {booking.bookingTime ? ` · ${activityTimeLabel(booking.bookingTime)}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {getActivityKind(booking)}: {getActivityName(booking)}
                        </p>
                      </div>
                      <span className="hidden shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-600 sm:inline-block">
                        {getActivityKind(booking)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm flex flex-col">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Guest Overview
                </h2>

                <p className="text-sm text-gray-500">Current guest activity</p>
              </div>

              <Users className="h-5 w-5 text-gray-400" />
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="flex-1 flex items-center justify-between rounded-lg bg-gray-50 p-6">
                <span className="text-sm text-gray-600">Today's Check-ins</span>

                <span className="font-semibold text-gray-900">
                  {todaysCheckIns.length}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-between rounded-lg bg-gray-50 p-6">
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

        {embedded && (
          <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-4 py-5 sm:flex-row sm:items-center sm:px-5">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Recent Bookings</h2>
                <p className="mt-1 text-sm text-gray-500">{recentCheckInDate ? "Bookings checking in on the selected date" : "Newest reservations first"}</p>
              </div>
              <div className="flex flex-wrap items-end gap-2 self-start sm:self-center">
                <label className="text-xs font-medium text-gray-600">
                  Check-in date
                  <input
                    type="date"
                    value={recentCheckInDate}
                    onChange={(event) => setRecentCheckInDate(event.target.value)}
                    className="mt-1 block h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
                  />
                </label>
                {recentCheckInDate && (
                  <button
                    type="button"
                    onClick={() => setRecentCheckInDate("")}
                    className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {recentBookings.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {["Booking ID", "Guest", "Booking", "Check-in", "Check-out", "Amount", "Status"].map((heading) => (
                        <th key={heading} className="whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => {
                      const kind = getActivityKind(booking) || "Room";
                      const subject = kind === "Room"
                        ? (() => {
                          const roomType = String(booking.roomTypeName || booking.roomType || booking.roomName || booking.room || "").trim();
                          return roomType && !/^(?:room\s*)?\d+$/i.test(roomType) ? roomType : "Room booking";
                        })()
                        : getActivityName(booking) || `${kind} details pending`;
                      const status = getBookingStatus(booking);
                      const statusStyle = status === "checked-out"
                        ? "bg-purple-100 text-purple-700"
                        : status === "checked-in"
                          ? "bg-green-100 text-green-700"
                          : status === "confirmed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700";
                      const total = Number(booking.totalPrice ?? booking.totalAmount ?? booking.total ?? booking.amount ?? booking.price ?? 0);
                      return (
                        <tr key={booking.id} className="border-b border-gray-100 transition last:border-b-0 hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-gray-700">
                            {displayRecordId(booking.bookingRef || booking.bookingId || booking.id)}
                          </td>
                          <td className="max-w-[190px] px-4 py-4">
                            <p className="truncate text-xs font-semibold text-gray-900">{getCustomerName(booking)}</p>
                            <p className="mt-1 truncate text-[10px] text-gray-500">{booking.customerEmail || booking.email || "No email provided"}</p>
                          </td>
                          <td className="max-w-[160px] px-4 py-4 text-xs text-gray-600">
                            <span className="mr-1.5 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{kind}</span>
                            {subject}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">{formatBookingDate(booking.checkIn || booking.bookingDate)}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">{formatBookingDate(booking.checkOut || booking.bookingDate)}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-gray-900">{formatCurrency(Number.isFinite(total) ? total : 0)}</td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle}`}>
                              {status.replace(/-/g, " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                {loading ? "Loading recent bookings..." : recentCheckInDate ? "No bookings check in on this date" : "No bookings found"}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
