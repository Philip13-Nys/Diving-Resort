import { dateOnly, displayRecordId, localDate } from "../app/bookingAvailability";
import { useRecordRevision } from "../app/useBookingInventory";
import { getLiveBookingSnapshot as getBookingSnapshot } from "../app/bookingStore";
import { Card } from "../app/components/ui/card";

import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  CalendarCheck,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { customerDb } from "../app/firebase";

interface Booking {
  id: string;
  guest: string;
  email?: string;
  phone?: string;
  room?: string;
  roomType?: string;
  bookingType?: string;
  itemType?: string;
  serviceName?: string;
  packageName?: string;
  activityName?: string;
  itemName?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  pax?: number;
  status?: string;
  amount?: number | string;
  paid?: number | string;
  notes?: string;

  acceptedBy?: string;
  acceptedByUid?: string;

  cancelledBy?: string;
  cancelledByUid?: string;
  cancelledAt?: any;

  receptionist?: string;
  createdBy?: string;
}

function bookingSubject(booking: Booking) {
  const kinds = [booking.bookingType, booking.itemType].map((value) =>
    String(value || "")
      .trim()
      .toLowerCase(),
  );
  if (kinds.includes("package")) {
    return {
      label: "Package",
      name: booking.packageName || booking.itemName || "Package booking",
    };
  }
  if (kinds.includes("service") || kinds.includes("activity")) {
    return {
      label: "Service",
      name:
        booking.serviceName ||
        booking.activityName ||
        booking.itemName ||
        "Service booking",
    };
  }
  const room = String(booking.room || "").trim();
  return {
    label: "Room",
    name:
      booking.roomType ||
      (room && room !== "0" ? room : "Room assignment pending"),
  };
}

export default function ReceptionistDashboards() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations",
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => localDate());

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const snapshot = await getBookingSnapshot();

        const bookingData: Booking[] = snapshot.docs.map((bookingDoc) => {
          const data = bookingDoc.data();

          return {
            id: bookingDoc.id,
            guest: String(data.guest ?? data.customerName ?? "Unknown Guest"),
            email: data.email ?? data.customerEmail,
            phone: data.phone ?? data.customerPhone,
            room: data.room ?? data.roomName,
            roomType: data.roomTypeName ?? data.roomType,
            bookingType: data.bookingType,
            itemType: data.itemType,
            serviceName: data.serviceName,
            packageName: data.packageName,
            activityName: data.activityName,
            itemName: data.itemName,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            nights: Number(data.nights ?? 0),
            pax: Number(data.pax ?? data.guests ?? 0),
            status: String(data.status ?? "pending").toLowerCase(),
            amount: Number(
              data.amount ??
                data.totalPrice ??
                data.total ??
                data.totalAmount ??
                0,
            ),
            paid: Number(data.amountPaid ?? data.paid ?? 0),
            notes: data.notes,
            acceptedBy: String(
              data.acceptedBy ||
                ([data.bookingType, data.bookingSource].some(
                  (value) =>
                    String(value || "")
                      .trim()
                      .toLowerCase() === "walk-in",
                )
                  ? data.createdBy || ""
                  : ""),
            ),
            acceptedByUid: String(
              data.acceptedByUid ||
                ([data.bookingType, data.bookingSource].some(
                  (value) =>
                    String(value || "")
                      .trim()
                      .toLowerCase() === "walk-in",
                )
                  ? data.createdByUid || ""
                  : ""),
            ),
            cancelledBy: String(data.cancelledBy ?? ""),
            cancelledByUid: String(data.cancelledByUid ?? ""),
            cancelledAt: data.cancelledAt,
            receptionist: data.receptionist,
            createdBy: data.createdBy,
          };
        });

        setBookings(bookingData);
      } catch (error) {
        console.error("Error loading receptionist bookings:", error);

        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [recordRevision]);

  const bookingsForDate = bookings.filter((booking) => {
    const checkIn = dateOnly(booking.checkIn);
    const checkOut = dateOnly(booking.checkOut || booking.checkIn);
    return checkIn <= viewDate && viewDate <= checkOut;
  });

  const totalReservations = bookingsForDate.length;

  const pendingReservations = bookingsForDate.filter((booking) =>
    ["pending", "pending-payment-verification"].includes(booking.status || ""),
  ).length;

  const confirmedReservations = bookingsForDate.filter(
    (booking) => booking.status === "confirmed",
  ).length;

  const checkedInReservations = bookingsForDate.filter(
    (booking) =>
      booking.status === "checked-in" || booking.status === "checkedin",
  ).length;

  const checkedOutReservations = bookingsForDate.filter(
    (booking) =>
      booking.status === "checked-out" || booking.status === "checkedout",
  ).length;

  const cancelledReservations = bookingsForDate.filter(
    (booking) => booking.status === "cancelled",
  ).length;

  const sortedBookings = [...bookingsForDate].sort((a, b) =>
    displayRecordId(a.id).localeCompare(displayRecordId(b.id), undefined, {
      numeric: true,
    }),
  );

  const moveViewDate = (days: number) => {
    const next = new Date(`${viewDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setViewDate(localDate(next));
  };

  const getAcceptedBy = (booking: Booking) => {
    return (
      booking.acceptedBy ||
      booking.receptionist ||
      booking.createdBy ||
      "Not yet accepted"
    );
  };

  const getCancelledBy = (booking: Booking) => {
    return booking.cancelledBy || "Unknown receptionist";
  };

  const formatCurrency = (amount: number | string | undefined) => {
    return `₱${Number(amount ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatStatus = (status?: string) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";

      case "checked-in":
      case "checkedin":
        return "bg-blue-100 text-blue-700";

      case "checked-out":
      case "checkedout":
        return "bg-gray-100 text-gray-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      case "pending-payment-verification":
      case "pending":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Receptionist Dashboard
              </h1>

              <p className="text-gray-500 mt-1">
                Monitor receptionist booking activities
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <label htmlFor="receptionist-view-date" className="mb-2 block text-sm font-medium text-gray-700">
            View date
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="receptionist-view-date"
              type="date"
              value={viewDate}
              onChange={(event) => {
                if (event.target.value) setViewDate(event.target.value);
              }}
              className="h-11 min-w-[170px] rounded-xl border border-gray-300 bg-white px-3 text-gray-900"
            />
            <button type="button" aria-label="Previous day" onClick={() => moveViewDate(-1)} className="h-11 w-11 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
              <ChevronLeft className="mx-auto h-5 w-5" />
            </button>
            <button type="button" aria-label="Next day" onClick={() => moveViewDate(1)} className="h-11 w-11 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
              <ChevronRight className="mx-auto h-5 w-5" />
            </button>
            <button type="button" onClick={() => setViewDate(localDate())} className="h-11 rounded-xl bg-blue-600 px-4 font-medium text-white hover:bg-blue-700">
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="gap-0 p-6">
          <p className="text-sm text-gray-500">Bookings on selected date</p>

          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? "..." : totalReservations}
          </p>
        </Card>

        <Card className="gap-0 p-6">
          <p className="text-sm text-gray-500">Pending</p>

          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {loading ? "..." : pendingReservations}
          </p>
        </Card>

        <Card className="gap-0 p-6">
          <p className="text-sm text-gray-500">Confirmed</p>

          <p className="text-3xl font-bold text-green-600 mt-2">
            {loading ? "..." : confirmedReservations}
          </p>
        </Card>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="gap-0 p-6">
          <p className="text-sm text-gray-500">Checked-in</p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "..." : checkedInReservations}
          </p>
        </Card>

        <Card className="gap-0 p-6">
          <p className="text-sm text-gray-500">Checked-out</p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "..." : checkedOutReservations}
          </p>
        </Card>

        <Card className="gap-0 p-6">
          <p className="text-sm text-gray-500">Cancelled</p>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {loading ? "..." : cancelledReservations}
          </p>
        </Card>

      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Receptionist Bookings
            </h2>

            <p className="text-sm text-gray-500">
              Shows which receptionist accepted, accommodated, or cancelled each
              booking
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {bookingsForDate.length} booking
            {bookingsForDate.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Booking ID
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Guest
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Accepted / Accommodated By
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Booking
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Check-in
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Check-out
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Amount
                </th>

                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    Loading receptionist bookings...
                  </td>
                </tr>
              ) : sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    No bookings scheduled for this date.
                  </td>
                </tr>
              ) : (
                sortedBookings.map((booking) => {
                  const acceptedBy = getAcceptedBy(booking);

                  const cancelledBy = getCancelledBy(booking);

                  const isCancelled = booking.status === "cancelled";
                  const subject = bookingSubject(booking);

                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {displayRecordId(booking.id)}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.guest}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isCancelled ? "bg-red-100" : "bg-blue-100"
                            }`}
                          >
                            <span
                              className={`text-sm font-semibold ${
                                isCancelled ? "text-red-700" : "text-blue-700"
                              }`}
                            >
                              {isCancelled
                                ? cancelledBy.charAt(0).toUpperCase()
                                : acceptedBy.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          <div>
                            {isCancelled ? (
                              <>
                                <p className="text-sm font-medium text-gray-900">
                                  {booking.acceptedBy || "Not yet accepted"}
                                </p>

                                {booking.acceptedBy && (
                                  <p className="text-xs text-green-600">
                                    Accepted / Accommodated
                                  </p>
                                )}

                                <p className="text-xs font-medium text-red-600 mt-1">
                                  Cancelled by: {cancelledBy}
                                </p>
                              </>
                            ) : booking.acceptedBy ? (
                              <>
                                <p className="text-sm font-medium text-gray-900">
                                  {booking.acceptedBy}
                                </p>

                                <p className="text-xs text-green-600">
                                  Accepted / Accommodated
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900">
                                  Not yet accepted
                                </p>

                                <p className="text-xs text-gray-400">
                                  Not yet assigned
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        <span
                          className={`mr-2 rounded px-1.5 py-0.5 text-xs ${subject.label === "Room" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}
                        >
                          {subject.label}
                        </span>
                        {subject.name}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.checkIn || "N/A"}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.checkOut || "N/A"}
                      </td>

                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(booking.amount)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                            booking.status,
                          )}`}
                        >
                          {formatStatus(booking.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
