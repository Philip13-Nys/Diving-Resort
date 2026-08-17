import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { CheckCircle, XCircle, Clock, Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

import { customerDb } from "../app/firebase";

type Booking = {
  id: string;
  guest: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: "confirmed" | "pending" | "cancelled";
  paymentStatus: "paid" | "partial" | "unpaid";
};

export default function BookingOverview() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled"
  >("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);

        console.log("Loading bookings from customerDb...");

        const snapshot = await getDocs(collection(customerDb, "Bookings"));

        console.log("Number of bookings:", snapshot.size);

        const bookingData: Booking[] = snapshot.docs.map((bookingDoc) => {
          const data = bookingDoc.data();

          console.log("Booking:", bookingDoc.id, data);

          return {
            id: bookingDoc.id,
            guest: data.customerName || "Unknown Guest",
            email: data.customerEmail || "",
            room: data.roomName || "Unknown Room",
            checkIn: data.checkIn || "",
            checkOut: data.checkOut || "",
            guests: Number(data.guests || 0),
            total: Number(
              data.totalPrice ??
                data.totalAmount ??
                data.total ??
                Number(data.roomRate || 0) * Number(data.nights || 0),
            ),

            status:
              data.status === "confirmed"
                ? "confirmed"
                : data.status === "cancelled"
                  ? "cancelled"
                  : "pending",

            paymentStatus:
              data.paymentStatus === "paid"
                ? "paid"
                : data.paymentStatus === "partial"
                  ? "partial"
                  : "unpaid",
          };
        });

        console.log("Final bookings:", bookingData);

        setBookings(bookingData);
      } catch (error) {
        console.error("Error loading customer bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);
  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Loading bookings...</p>
        </div>
      </div>
    );
  }
  const filteredBookings = bookings.filter(
    (b) => filter === "all" || b.status === filter,
  );

  const approve = async (id: string) => {
    try {
      const booking = bookings.find((b) => b.id === id);

      if (!booking) return;

      const newPaymentStatus =
        booking.paymentStatus === "unpaid" ? "partial" : booking.paymentStatus;

      await updateDoc(doc(customerDb, "Bookings", id), {
        status: "confirmed",
        paymentStatus: newPaymentStatus,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: "confirmed",
                paymentStatus: newPaymentStatus,
              }
            : b,
        ),
      );
    } catch (error) {
      console.error("Error approving booking:", error);
      alert("Failed to approve booking.");
    }
  };
  const cancel = async (id: string) => {
    if (!window.confirm("Cancel this booking? This action cannot be undone.")) {
      return;
    }

    try {
      await updateDoc(doc(customerDb, "Bookings", id), {
        status: "cancelled",
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: "cancelled",
              }
            : b,
        ),
      );
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking.");
    }
  };

  const statusBadge = (status: Booking["status"]) => {
    const map = {
      confirmed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${map[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const paymentBadge = (ps: Booking["paymentStatus"]) => {
    const map = {
      paid: "bg-green-100 text-green-800",
      partial: "bg-yellow-100 text-yellow-800",
      unpaid: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${map[ps]}`}>
        {ps.charAt(0).toUpperCase() + ps.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Booking / Reservation Overview
          </h1>
          <p className="text-gray-500 mt-2">
            Review and approve reservation activities
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.length}
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
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter((b) => b.status === "pending").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter((b) => b.status === "confirmed").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookings.filter((b) => b.status === "cancelled").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? f === "pending"
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                  : f === "confirmed"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : f === "cancelled"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                : ""
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            {f !== "all" &&
              `(${bookings.filter((b) => b.status === f).length})`}
          </Button>
        ))}
      </div>

      {/* Bookings Table */}
      <Card className="p-6">
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
                  Room
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Check-in
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Check-out
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Guests
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Payment
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {booking.id}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {booking.guest}
                      </p>
                      <p className="text-xs text-gray-500">{booking.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {booking.room}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {booking.checkIn}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {booking.checkOut}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {booking.guests}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    ₱{booking.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{statusBadge(booking.status)}</td>
                  <td className="py-3 px-4">
                    {paymentBadge(booking.paymentStatus)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View details"
                        onClick={() => setViewingBooking(booking)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {booking.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Approve"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => approve(booking.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Cancel"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => cancel(booking.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {booking.status === "confirmed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Cancel booking"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => cancel(booking.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    No bookings match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Booking Modal */}
      {viewingBooking && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setViewingBooking(null)}
        >
          <Card
            className="w-full max-w-lg p-6 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Booking Details
              </h2>
              <button
                onClick={() => setViewingBooking(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                ["Booking ID", viewingBooking.id],
                ["Guest Name", viewingBooking.guest],
                ["Email", viewingBooking.email],
                ["Room", viewingBooking.room],
                ["Check-in", viewingBooking.checkIn],
                ["Check-out", viewingBooking.checkOut],
                ["Number of Guests", String(viewingBooking.guests)],
                ["Total Amount", `₱${viewingBooking.total.toLocaleString()}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Status</span>
                {statusBadge(viewingBooking.status)}
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Payment</span>
                {paymentBadge(viewingBooking.paymentStatus)}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {viewingBooking.status === "pending" && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    approve(viewingBooking.id);
                    setViewingBooking(null);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </Button>
              )}
              {viewingBooking.status !== "cancelled" && (
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    cancel(viewingBooking.id);
                    setViewingBooking(null);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Booking
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setViewingBooking(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
