import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  CalendarCheck,
  DollarSign,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  pax?: number;
  status?: string;
  amount?: number | string;
  paid?: number | string;
  notes?: string;

  // Receptionist who accepted/accommodated the booking
  acceptedBy?: string;
  acceptedByUid?: string;

  // Other possible fields
  receptionist?: string;
  createdBy?: string;

  createdAt?: any;
}

export default function ReceptionistDashboards() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(
          collection(customerDb, "Bookings"),
        );

        console.log("Bookings found:", snapshot.size);

        const bookingData: Booking[] = snapshot.docs.map(
          (bookingDoc) => {
            const data = bookingDoc.data();

            console.log(
              "Booking:",
              bookingDoc.id,
              data,
            );

            return {
              id: bookingDoc.id,
              guest: String(
                data.guest ?? "Unknown Guest",
              ),

              email: data.email,
              phone: data.phone,
              room: data.room,
              roomType: data.roomType,
              checkIn: data.checkIn,
              checkOut: data.checkOut,

              nights: Number(
                data.nights ?? 0,
              ),

              pax: Number(
                data.pax ?? data.guests ?? 0,
              ),

              status: String(
                data.status ?? "pending",
              ).toLowerCase(),

              amount: Number(
                data.amount ??
                  data.total ??
                  data.totalAmount ??
                  0,
              ),

              paid: Number(
                data.paid ?? 0,
              ),

              notes: data.notes,

              // Receptionist information
              acceptedBy: data.acceptedBy,
              acceptedByUid: data.acceptedByUid,
              receptionist: data.receptionist,
              createdBy: data.createdBy,

              createdAt: data.createdAt,
            };
          },
        );

        setBookings(bookingData);
      } catch (error) {
        console.error(
          "Error loading receptionist bookings:",
          error,
        );

        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  /*
   * ==========================================
   * STATISTICS
   * ==========================================
   */

  const totalReservations = bookings.length;

  const pendingReservations = bookings.filter(
    (booking) =>
      booking.status === "pending",
  ).length;

  const confirmedReservations = bookings.filter(
    (booking) =>
      booking.status === "confirmed",
  ).length;

  const checkedInReservations = bookings.filter(
    (booking) =>
      booking.status === "checked-in" ||
      booking.status === "checkedin",
  ).length;

  const checkedOutReservations = bookings.filter(
    (booking) =>
      booking.status === "checked-out" ||
      booking.status === "checkedout",
  ).length;

  const cancelledReservations = bookings.filter(
    (booking) =>
      booking.status === "cancelled",
  ).length;

  const totalSales = bookings.reduce(
    (total, booking) =>
      total + Number(booking.amount ?? 0),
    0,
  );

  const totalPaid = bookings.reduce(
    (total, booking) =>
      total + Number(booking.paid ?? 0),
    0,
  );

  /*
   * ==========================================
   * SORT RECENT BOOKINGS
   * ==========================================
   */

  const recentBookings = [...bookings]
    .sort((a, b) => {
      const getTime = (booking: Booking) => {
        if (!booking.createdAt) {
          return 0;
        }

        if (booking.createdAt?.toDate) {
          return booking.createdAt
            .toDate()
            .getTime();
        }

        const parsed = new Date(
          booking.createdAt,
        ).getTime();

        return Number.isNaN(parsed)
          ? 0
          : parsed;
      };

      return getTime(b) - getTime(a);
    })
    .slice(0, 10);

  /*
   * ==========================================
   * GET RECEPTIONIST WHO ACCEPTED BOOKING
   * ==========================================
   */

  const getAcceptedBy = (booking: Booking) => {
    return (
      booking.acceptedBy ||
      booking.receptionist ||
      booking.createdBy ||
      "Not yet accepted"
    );
  };

  /*
   * ==========================================
   * FORMAT CURRENCY
   * ==========================================
   */

  const formatCurrency = (
    amount: number | string | undefined,
  ) => {
    return `₱${Number(
      amount ?? 0,
    ).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  /*
   * ==========================================
   * FORMAT STATUS
   * ==========================================
   */

  const formatStatus = (status?: string) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1),
      )
      .join(" ");
  };

  /*
   * ==========================================
   * STATUS COLOR
   * ==========================================
   */

  const getStatusClass = (
    status?: string,
  ) => {
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

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">

            <div className="p-2 bg-blue-50 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>

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

        <Button
          onClick={() =>
            navigate("/manager/bookings")
          }
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
        >
          View All Bookings
        </Button>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        <Card className="p-6">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Reservations
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading
                  ? "..."
                  : totalReservations}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <CalendarCheck className="w-6 h-6 text-blue-600" />
            </div>

          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Pending
              </p>

              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {loading
                  ? "..."
                  : pendingReservations}
              </p>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>

          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Confirmed
              </p>

              <p className="text-3xl font-bold text-green-600 mt-2">
                {loading
                  ? "..."
                  : confirmedReservations}
              </p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>

          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Sales
              </p>

              <p className="text-2xl font-bold text-blue-600 mt-2">
                {loading
                  ? "..."
                  : formatCurrency(totalSales)}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>

          </div>
        </Card>

      </div>

      {/* ADDITIONAL STATUS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

        <Card className="p-5">
          <div className="flex items-center gap-3">

            <Users className="w-5 h-5 text-blue-600" />

            <div>
              <p className="text-sm text-gray-500">
                Checked-in
              </p>

              <p className="text-xl font-bold text-gray-900">
                {loading
                  ? "..."
                  : checkedInReservations}
              </p>
            </div>

          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">

            <CheckCircle className="w-5 h-5 text-green-600" />

            <div>
              <p className="text-sm text-gray-500">
                Checked-out
              </p>

              <p className="text-xl font-bold text-gray-900">
                {loading
                  ? "..."
                  : checkedOutReservations}
              </p>
            </div>

          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">

            <XCircle className="w-5 h-5 text-red-600" />

            <div>
              <p className="text-sm text-gray-500">
                Cancelled
              </p>

              <p className="text-xl font-bold text-gray-900">
                {loading
                  ? "..."
                  : cancelledReservations}
              </p>
            </div>

          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">

            <DollarSign className="w-5 h-5 text-green-600" />

            <div>
              <p className="text-sm text-gray-500">
                Total Paid
              </p>

              <p className="text-xl font-bold text-gray-900">
                {loading
                  ? "..."
                  : formatCurrency(totalPaid)}
              </p>
            </div>

          </div>
        </Card>

      </div>

      {/* RECENT BOOKINGS */}

      <Card className="p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Receptionist Bookings
            </h2>

            <p className="text-sm text-gray-500">
              Shows which receptionist accepted or accommodated each booking
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {bookings.length} booking
            {bookings.length !== 1
              ? "s"
              : ""}
          </span>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

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
                  Room
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
                  <td
                    colSpan={8}
                    className="py-10 text-center text-gray-500"
                  >
                    Loading receptionist bookings...
                  </td>
                </tr>

              ) : recentBookings.length === 0 ? (

                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-gray-500"
                  >
                    No booking data found.
                  </td>
                </tr>

              ) : (

                recentBookings.map(
                  (booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >

                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {booking.id}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.guest}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">

                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-700">
                              {getAcceptedBy(
                                booking,
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {getAcceptedBy(
                                booking,
                              )}
                            </p>

                            {booking.acceptedBy ? (
                              <p className="text-xs text-green-600">
                                Accepted / Accommodated
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">
                                Not yet assigned
                              </p>
                            )}
                          </div>

                        </div>
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.room
                          ? `Room ${booking.room}`
                          : booking.roomType ||
                            "N/A"}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.checkIn ||
                          "N/A"}
                      </td>

                      <td className="py-3 px-4 text-sm text-gray-700">
                        {booking.checkOut ||
                          "N/A"}
                      </td>

                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(
                          booking.amount,
                        )}
                      </td>

                      <td className="py-3 px-4">

                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                            booking.status,
                          )}`}
                        >
                          {formatStatus(
                            booking.status,
                          )}
                        </span>

                      </td>

                    </tr>
                  ),
                )

              )}

            </tbody>

          </table>

        </div>

      </Card>

    </div>
  );
}
