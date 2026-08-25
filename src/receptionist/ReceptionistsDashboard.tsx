import { useState, useEffect } from "react";

import {
  BedDouble,
  Users,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Check,
  Clock,
  X,
  Waves,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

import { useNavigate } from "react-router";

import { collection, getDocs, getDoc, doc } from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { customerDb, db, auth } from "../app/firebase";

/* =========================================================
   TYPES
========================================================= */

type Booking = {
  id: string;

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

  guests?: number;
  nights?: number;

  status?: string;
  paymentStatus?: string;

  createdAt?: any;

  type?: string;

  services?: string[];
};

type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
};

/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_CONFIG: Record<string, StatusConfig> = {
  "checked-in": {
    label: "Checked In",
    color: "#0d7377",
    bg: "#e2f3f2",
    icon: Check,
  },

  confirmed: {
    label: "Confirmed",
    color: "#06b6d4",
    bg: "#ecfeff",
    icon: Clock,
  },

  unpaid: {
    label: "Unpaid",
    color: "#f97316",
    bg: "#fff7ed",
    icon: Clock,
  },

  pending: {
    label: "Pending",
    color: "#f97316",
    bg: "#fff7ed",
    icon: Clock,
  },

  cancelled: {
    label: "Cancelled",
    color: "#d4183d",
    bg: "#fef2f2",
    icon: X,
  },

  completed: {
    label: "Completed",
    color: "#0d7377",
    bg: "#e2f3f2",
    icon: Check,
  },
};

/* =========================================================
   QUICK ACTIONS
========================================================= */

const QUICK_ACTIONS = [
  {
    label: "New Walk-in",
    path: "/receptionist/walkin",
    color: "#0d7377",
  },

  {
    label: "Check Room Availability",
    path: "/receptionist/availability",
    color: "#14b8a6",
  },

  {
    label: "Process Payment",
    path: "/receptionist/payments",
    color: "#f97316",
  },

  {
    label: "View Reports",
    path: "/receptionist/reports",
    color: "#06b6d4",
  },
];

/* =========================================================
   CALENDAR
========================================================= */

const CAL_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

/* =========================================================
   DATE HELPER
========================================================= */

const convertToDate = (value: any): Date | null => {
  if (!value) return null;

  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/* =========================================================
   CUSTOMER NAME
========================================================= */

const getCustomerName = (booking: Booking) => {
  return (
    booking.customerName ||
    booking.guestName ||
    booking.guest ||
    booking.customerEmail ||
    "Guest"
  );
};

/* =========================================================
   ROOM / PACKAGE NAME
========================================================= */

const getBookingName = (booking: Booking) => {
  return (
    booking.roomName ||
    booking.roomType ||
    booking.room ||
    booking.packageName ||
    booking.name ||
    "Reservation"
  );
};

/* =========================================================
   BOOKING PRICE
========================================================= */

const getBookingPrice = (booking: Booking) => {
  const possiblePrices = [
    booking.totalPrice,
    booking.totalAmount,
    booking.total,
    booking.price,
    booking.amount,
  ];

  for (const value of possiblePrices) {
    const number = Number(value);

    if (!isNaN(number) && number > 0) {
      return number;
    }
  }

  return 0;
};

/* =========================================================
   PAID BOOKING
========================================================= */

const isPaidBooking = (booking: Booking) => {
  const paymentStatus = booking.paymentStatus?.toLowerCase();

  return paymentStatus === "paid" || paymentStatus === "completed";
};

/* =========================================================
   MINI CALENDAR
========================================================= */

function MiniCal({ bookings }: { bookings: Booking[] }) {
  const navigate = useNavigate();

  const [month, setMonth] = useState(new Date());

  const [selected, setSelected] = useState(new Date());

  const today = new Date();

  const bookingDates = bookings
    .filter(
      (booking) =>
        booking.checkIn && booking.status?.toLowerCase() !== "cancelled",
    )
    .map((booking) => convertToDate(booking.checkIn))
    .filter((date): date is Date => date !== null);

  const checkoutDates = bookings
    .filter(
      (booking) =>
        booking.checkOut && booking.status?.toLowerCase() !== "cancelled",
    )
    .map((booking) => convertToDate(booking.checkOut))
    .filter((date): date is Date => date !== null);

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  const pad = getDay(startOfMonth(month));

  const hasCheckin = (date: Date) =>
    bookingDates.some((bookingDate) => isSameDay(bookingDate, date));

  const hasCheckout = (date: Date) =>
    checkoutDates.some((checkoutDate) => isSameDay(checkoutDate, date));

  const selectedCheckins = bookingDates.filter((date) =>
    isSameDay(date, selected),
  ).length;

  const selectedCheckouts = checkoutDates.filter((date) =>
    isSameDay(date, selected),
  ).length;

  return (
    <div
      className="bg-white rounded-xl border p-4"
      style={{
        borderColor: "rgba(13,115,119,0.1)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-medium"
          style={{
            color: "#0a2e2e",
            fontFamily: "Georgia, serif",
          }}
        >
          {format(month, "MMMM yyyy")}
        </h3>

        <div className="flex gap-0.5">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="w-6 h-6 flex items-center justify-center rounded"
            style={{
              color: "#4a7a7a",
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="w-6 h-6 flex items-center justify-center rounded"
            style={{
              color: "#4a7a7a",
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {CAL_DAYS.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs"
            style={{
              color: "#a0c4c4",
              fontWeight: 600,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: pad }).map((_, index) => (
          <div key={`pad-${index}`} />
        ))}

        {days.map((day) => {
          const isToday = isSameDay(day, today);

          const isSelected = isSameDay(day, selected);

          const checkin = hasCheckin(day);

          const checkout = hasCheckout(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelected(day)}
              className="relative flex flex-col items-center justify-center w-full aspect-square rounded-lg text-xs"
              style={{
                background: isSelected
                  ? "#0d7377"
                  : isToday
                    ? "#e2f3f2"
                    : "transparent",

                color: isSelected ? "#ffffff" : isToday ? "#0d7377" : "#0a2e2e",

                fontWeight: isToday || isSelected ? 600 : 400,
              }}
            >
              {format(day, "d")}

              {(checkin || checkout) && !isSelected && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {checkin && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: "#0d7377",
                      }}
                    />
                  )}

                  {checkout && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: "#f97316",
                      }}
                    />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className="mt-3 pt-3 border-t"
        style={{
          borderColor: "rgba(13,115,119,0.1)",
        }}
      >
        <p
          className="text-xs font-medium mb-1.5"
          style={{
            color: "#0a2e2e",
          }}
        >
          {format(selected, "MMM d")}
        </p>

        {selectedCheckins === 0 && selectedCheckouts === 0 ? (
          <p
            className="text-xs"
            style={{
              color: "#a0c4c4",
            }}
          >
            No arrivals or departures
          </p>
        ) : (
          <div className="space-y-1">
            {selectedCheckins > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs"
                style={{
                  color: "#0d7377",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#0d7377",
                  }}
                />
                {selectedCheckins} arrival
                {selectedCheckins > 1 ? "s" : ""}
              </div>
            )}

            {selectedCheckouts > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs"
                style={{
                  color: "#f97316",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#f97316",
                  }}
                />
                {selectedCheckouts} departure
                {selectedCheckouts > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate("/receptionist/calendar")}
          className="mt-2 text-xs w-full py-1.5 rounded-lg"
          style={{
            color: "#0d7377",
            background: "#e2f3f2",
          }}
        >
          Full Calendar →
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function ReceptionistsDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [totalRooms, setTotalRooms] = useState(0);

  const [userName, setUserName] = useState("Receptionist");

  const [loading, setLoading] = useState(true);

  /* =====================================================
     CURRENT USER
  ===================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("Receptionist");
        return;
      }

      try {
        const userRef = doc(db, "Users", user.uid);

        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();

          setUserName(
            userData.name ||
              userData.displayName ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Receptionist",
          );
        } else {
          setUserName(
            user.displayName || user.email?.split("@")[0] || "Receptionist",
          );
        }
      } catch (error) {
        console.error("Error loading user profile:", error);

        setUserName(
          user.displayName || user.email?.split("@")[0] || "Receptionist",
        );
      }
    });

    return () => unsubscribe();
  }, []);

  /* =====================================================
     LOAD FIREBASE DATA
  ===================================================== */

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        /* ---------------------------------------------
           CUSTOMER BOOKINGS
        --------------------------------------------- */

        const bookingSnapshot = await getDocs(
          collection(customerDb, "Bookings"),
        );

        const bookingData: Booking[] = bookingSnapshot.docs.map(
          (bookingDoc) =>
            ({
              id: bookingDoc.id,
              ...bookingDoc.data(),
            }) as Booking,
        );

        setBookings(bookingData);

        /* ---------------------------------------------
           ADMIN ROOMS
        --------------------------------------------- */

        const roomSnapshot = await getDocs(collection(db, "rooms"));

        setTotalRooms(roomSnapshot.size);

        console.log("Bookings:", bookingData.length);

        console.log("Rooms:", roomSnapshot.size);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* =====================================================
     CURRENT DATE
  ===================================================== */

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  /* =====================================================
     TODAY'S CHECK-INS
  ===================================================== */

  const todayCheckins = bookings.filter((booking) => {
    if (booking.status?.toLowerCase() === "cancelled") {
      return false;
    }

    const checkIn = convertToDate(booking.checkIn);

    if (!checkIn) return false;

    return isSameDay(checkIn, today);
  });

  /* =====================================================
     TODAY'S CHECK-OUTS
  ===================================================== */

  const todayCheckouts = bookings.filter((booking) => {
    if (booking.status?.toLowerCase() === "cancelled") {
      return false;
    }

    const checkOut = convertToDate(booking.checkOut);

    if (!checkOut) return false;

    return isSameDay(checkOut, today);
  });

  /* =====================================================
     CURRENTLY OCCUPIED ROOMS
     
     A room is occupied when:
     - check-in date has arrived
     - check-out date has not passed
     - booking is not cancelled
     - booking is actually checked-in
  ===================================================== */

  const currentlyOccupied = bookings.filter((booking) => {
    const status = booking.status?.toLowerCase();

    if (status !== "checked-in") {
      return false;
    }

    const checkIn = convertToDate(booking.checkIn);

    const checkOut = convertToDate(booking.checkOut);

    if (!checkIn || !checkOut) {
      return false;
    }

    return today >= checkIn && today < checkOut;
  });

  /* =====================================================
     PREVENT DOUBLE COUNTING SAME ROOM
  ===================================================== */

  const occupiedRoomIds = new Set(
    currentlyOccupied.map(
      (booking) => booking.roomId || booking.roomName || booking.roomType,
    ),
  );

  const occupiedRooms = occupiedRoomIds.size;

  const occupancyRate =
    totalRooms > 0
      ? Math.min(100, Math.round((occupiedRooms / totalRooms) * 100))
      : 0;

  /* =====================================================
     TODAY'S REVENUE

     Only count actual PAID bookings.
  ===================================================== */

  const revenueToday = bookings
    .filter((booking) => {
      const checkIn = convertToDate(booking.checkIn);

      if (!checkIn) return false;

      return isSameDay(checkIn, today) && isPaidBooking(booking);
    })
    .reduce((sum, booking) => sum + getBookingPrice(booking), 0);

  /* =====================================================
     MONTHLY REVENUE

     Only count actual PAID bookings.
  ===================================================== */

  const currentMonth = today.getMonth();

  const currentYear = today.getFullYear();

  const monthlyRevenue = bookings
    .filter((booking) => {
      if (!isPaidBooking(booking)) {
        return false;
      }

      const date =
        convertToDate(booking.createdAt) || convertToDate(booking.checkIn);

      if (!date) return false;

      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    })
    .reduce((sum, booking) => sum + getBookingPrice(booking), 0);

  /* =====================================================
     RECENT BOOKINGS
  ===================================================== */

  const recentBookings = [...bookings]
    .sort((a, b) => {
      const dateA = convertToDate(a.createdAt)?.getTime() || 0;

      const dateB = convertToDate(b.createdAt)?.getTime() || 0;

      return dateB - dateA;
    })
    .slice(0, 10);

  /* =====================================================
     GREETING
  ===================================================== */

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  /* =====================================================
     STATS
  ===================================================== */

  const stats = [
    {
      label: "Occupied Rooms",
      value: occupiedRooms.toString(),
      total: totalRooms.toString(),
      icon: BedDouble,
      color: "#0d7377",
      bg: "#e2f3f2",
      pct: occupancyRate,
    },

    {
      label: "Today's Check-ins",
      value: todayCheckins.length.toString(),
      icon: Users,
      color: "#f97316",
      bg: "#fff7ed",
      pct: null,
    },

    {
      label: "Revenue Today",
      value: `₱${revenueToday.toLocaleString()}`,
      icon: CreditCard,
      color: "#14b8a6",
      bg: "#f0fdfa",
      pct: null,
    },

    {
      label: "Monthly Revenue",
      value: `₱${monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "#06b6d4",
      bg: "#ecfeff",
      pct: null,
    },
  ];

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="space-y-6">
      {/* =================================================
          WELCOME
      ================================================= */}

      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a2e2e 0%, #0d7377 100%)",
        }}
      >
        <div className="absolute right-0 top-0 opacity-10">
          <Waves className="w-48 h-48 -mr-8 -mt-8" />
        </div>

        <div className="relative z-10">
          <p className="text-teal-300 text-sm mb-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>

          <h2
            className="text-2xl mb-1"
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 400,
            }}
          >
            {greeting}, {userName}!
          </h2>

          <p className="text-teal-200 text-sm">
            You have {todayCheckins.length} check-in
            {todayCheckins.length !== 1 ? "s" : ""} and {todayCheckouts.length}{" "}
            check-out
            {todayCheckouts.length !== 1 ? "s" : ""} scheduled today.
          </p>
        </div>
      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 border"
              style={{
                borderColor: "rgba(13,115,119,0.1)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: stat.bg,
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: stat.color,
                    }}
                  />
                </div>

                {stat.pct !== null && (
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: stat.bg,
                      color: stat.color,
                    }}
                  >
                    {loading ? "..." : `${stat.pct}%`}
                  </span>
                )}
              </div>

              <div
                className="text-2xl mb-0.5"
                style={{
                  color: "#0a2e2e",
                  fontFamily: "Georgia, serif",
                  fontWeight: 400,
                }}
              >
                {loading ? "..." : stat.value}

                {stat.total && (
                  <span
                    className="text-base"
                    style={{
                      color: "#4a7a7a",
                    }}
                  >
                    {" "}
                    / {loading ? "..." : stat.total}
                  </span>
                )}
              </div>

              <div
                className="text-sm"
                style={{
                  color: "#4a7a7a",
                }}
              >
                {stat.label}
              </div>

              {stat.pct !== null && (
                <div
                  className="mt-3 h-1.5 rounded-full"
                  style={{
                    background: "#e2f3f2",
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: loading ? "0%" : `${stat.pct}%`,
                      background: stat.color,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* =================================================
            RECENT BOOKINGS
        ================================================= */}

        <div
          className="lg:col-span-2 bg-white rounded-xl border overflow-hidden"
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{
              borderColor: "rgba(13,115,119,0.1)",
            }}
          >
            <h3
              className="font-medium"
              style={{
                color: "#0a2e2e",
                fontFamily: "Georgia, serif",
              }}
            >
              Recent Bookings
            </h3>

            <button
              onClick={() => navigate("/receptionist/reservations")}
              className="text-sm flex items-center gap-1"
              style={{
                color: "#0d7377",
              }}
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-10 text-center text-gray-500">
                Loading bookings...
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="py-10 text-center">
                <p
                  className="text-sm"
                  style={{
                    color: "#4a7a7a",
                  }}
                >
                  No bookings found.
                </p>

                <p
                  className="text-xs mt-1"
                  style={{
                    color: "#a0c4c4",
                  }}
                >
                  Customer bookings will appear here.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      background: "#f0f9f8",
                    }}
                  >
                    {[
                      "ID",
                      "Guest",
                      "Room / Package",
                      "Dates",
                      "Status",
                      "Amount",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-left px-4 py-3 text-xs whitespace-nowrap"
                        style={{
                          color: "#4a7a7a",
                          fontWeight: 500,
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {recentBookings.map((booking, index) => {
                    const statusKey =
                      booking.status?.toLowerCase() || "pending";

                    const status =
                      STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;

                    const StatusIcon = status.icon;

                    const customerName = getCustomerName(booking);

                    const bookingName = getBookingName(booking);

                    const price = getBookingPrice(booking);

                    const checkIn = convertToDate(booking.checkIn);

                    const checkOut = convertToDate(booking.checkOut);

                    return (
                      <tr
                        key={booking.id}
                        style={{
                          borderTop:
                            index > 0
                              ? "1px solid rgba(13,115,119,0.08)"
                              : undefined,
                        }}
                      >
                        {/* ID */}

                        <td
                          className="px-4 py-3 text-sm font-mono whitespace-nowrap"
                          style={{
                            color: "#0d7377",
                          }}
                        >
                          {booking.bookingRef || booking.id}
                        </td>

                        {/* GUEST */}

                        <td
                          className="px-4 py-3 text-sm whitespace-nowrap"
                          style={{
                            color: "#0a2e2e",
                          }}
                        >
                          {customerName}
                        </td>

                        {/* ROOM */}

                        <td
                          className="px-4 py-3 text-sm"
                          style={{
                            color: "#4a7a7a",
                          }}
                        >
                          {bookingName}

                          {booking.type && (
                            <div className="text-xs text-gray-400 capitalize">
                              {booking.type}
                            </div>
                          )}
                        </td>

                        {/* DATES */}

                        <td
                          className="px-4 py-3 text-sm whitespace-nowrap"
                          style={{
                            color: "#4a7a7a",
                          }}
                        >
                          {checkIn ? format(checkIn, "yyyy-MM-dd") : "N/A"}

                          {" – "}

                          {checkOut ? format(checkOut, "yyyy-MM-dd") : "N/A"}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap"
                            style={{
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            <StatusIcon className="w-3 h-3" />

                            {status.label}
                          </span>
                        </td>

                        {/* AMOUNT */}

                        <td
                          className="px-4 py-3 text-sm font-medium whitespace-nowrap"
                          style={{
                            color: "#0a2e2e",
                          }}
                        >
                          ₱{price.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <MiniCal bookings={bookings} />

          <div
            className="bg-white rounded-xl border p-5"
            style={{
              borderColor: "rgba(13,115,119,0.1)",
            }}
          >
            <h3
              className="font-medium mb-4"
              style={{
                color: "#0a2e2e",
                fontFamily: "Georgia, serif",
              }}
            >
              Quick Actions
            </h3>

            <div className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all"
                  style={{
                    borderColor: "rgba(13,115,119,0.15)",
                    color: "#0a2e2e",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "#f0f9f8";

                    event.currentTarget.style.borderColor = action.color;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "";

                    event.currentTarget.style.borderColor =
                      "rgba(13,115,119,0.15)";
                  }}
                >
                  <span>{action.label}</span>

                  <ArrowRight
                    className="w-4 h-4"
                    style={{
                      color: action.color,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* TODAY'S SCHEDULE */}

          <div
            className="bg-white rounded-xl border p-5"
            style={{
              borderColor: "rgba(13,115,119,0.1)",
            }}
          >
            <h3
              className="font-medium mb-4"
              style={{
                color: "#0a2e2e",
                fontFamily: "Georgia, serif",
              }}
            >
              Today's Schedule
            </h3>

            {todayCheckins.length === 0 && todayCheckouts.length === 0 ? (
              <p
                className="text-sm"
                style={{
                  color: "#a0c4c4",
                }}
              >
                No check-ins or check-outs today.
              </p>
            ) : (
              <div className="space-y-3">
                {/* CHECK-INS */}

                {todayCheckins.map((booking) => (
                  <div
                    key={`in-${booking.id}`}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: "#14b8a6",
                      }}
                    />

                    <div>
                      <div
                        className="text-sm"
                        style={{
                          color: "#0a2e2e",
                        }}
                      >
                        Check-in: {getCustomerName(booking)}
                      </div>

                      <div
                        className="text-xs"
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
                        {getBookingName(booking)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* CHECK-OUTS */}

                {todayCheckouts.map((booking) => (
                  <div
                    key={`out-${booking.id}`}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: "#f97316",
                      }}
                    />

                    <div>
                      <div
                        className="text-sm"
                        style={{
                          color: "#0a2e2e",
                        }}
                      >
                        Check-out: {getCustomerName(booking)}
                      </div>

                      <div
                        className="text-xs"
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
                        {getBookingName(booking)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
