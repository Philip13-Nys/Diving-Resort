import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Search, Eye, Mail, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../app/firebase";

type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  totalStays: number;
  totalSpent: number;
  lastVisit: string;
  status: "vip" | "regular" | "new";
};

type BookingRecord = {
  date: string;
  room: string;
  nights: number;
  amount: number;
};

type GuestWithHistory = Guest & {
  history: BookingRecord[];
};

export default function GuestRecords() {
  const [search, setSearch] = useState("");
  const [viewingGuest, setViewingGuest] = useState<GuestWithHistory | null>(
    null,
  );

  const [guests, setGuests] = useState<GuestWithHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // LOAD GUESTS FROM FIREBASE

  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, "bookings"));

        const guestMap = new Map<string, GuestWithHistory>();

        snapshot.docs.forEach((bookingDoc) => {
          const data = bookingDoc.data();

          // Get customer information

          const name =
            data.guestName ||
            data.customerName ||
            data.guest ||
            data.name ||
            "Unknown Guest";

          const email =
            data.email || data.guestEmail || data.customerEmail || "";

          const phone =
            data.phone ||
            data.phoneNumber ||
            data.contactNumber ||
            data.guestPhone ||
            "";

          const nationality =
            data.nationality || data.country || "Not specified";

          // Room
          const room =
            data.room || data.roomName || data.roomType || "Unknown Room";

          // Dates
          const checkIn =
            data.checkIn || data.checkInDate || data.startDate || "";

          const checkOut =
            data.checkOut || data.checkOutDate || data.endDate || "";

          // Total amount
          const total = Number(
            data.total || data.totalAmount || data.amount || data.price || 0,
          );

          // Calculate number of nights
          let nights = Number(
            data.nights || data.numberOfNights || data.stayDuration || 0,
          );

          if (!nights && checkIn && checkOut) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const difference = end.getTime() - start.getTime();

              nights = Math.max(
                1,
                Math.round(difference / (1000 * 60 * 60 * 24)),
              );
            }
          }

          if (!nights) {
            nights = 1;
          }

          // Use email as primary guest identifier.
          // If email doesn't exist, use name.

          const guestKey =
            email.toLowerCase().trim() || name.toLowerCase().trim();

          const bookingDate =
            checkIn || data.bookingDate || data.createdAt || "";

          const bookingRecord: BookingRecord = {
            date: formatDate(bookingDate),
            room,
            nights,
            amount: total,
          };

          // Existing guest?
          if (guestMap.has(guestKey)) {
            const existingGuest = guestMap.get(guestKey)!;

            existingGuest.totalStays += 1;
            existingGuest.totalSpent += total;

            existingGuest.history.push(bookingRecord);

            // Update last visit if this booking is newer
            if (
              getDateValue(bookingDate) > getDateValue(existingGuest.lastVisit)
            ) {
              existingGuest.lastVisit = formatDate(bookingDate);
            }

            // Keep missing information updated
            if (existingGuest.phone === "" && phone) {
              existingGuest.phone = phone;
            }

            if (
              existingGuest.nationality === "Not specified" &&
              nationality !== "Not specified"
            ) {
              existingGuest.nationality = nationality;
            }
          } else {
            // Create new guest

            guestMap.set(guestKey, {
              id: `G-${String(guestMap.size + 1).padStart(3, "0")}`,
              name,
              email,
              phone,
              nationality,
              totalStays: 1,
              totalSpent: total,
              lastVisit: formatDate(bookingDate),
              status: "new",
              history: [bookingRecord],
            });
          }
        });

        // Calculate guest status

        const guestList = Array.from(guestMap.values()).map((guest) => {
          let status: Guest["status"];

          if (guest.totalStays >= 5) {
            status = "vip";
          } else if (guest.totalStays >= 2) {
            status = "regular";
          } else {
            status = "new";
          }

          return {
            ...guest,
            status,
          };
        });

        // Sort newest visitors first
        guestList.sort(
          (a, b) => getDateValue(b.lastVisit) - getDateValue(a.lastVisit),
        );

        setGuests(guestList);
      } catch (error) {
        console.error("Error loading guest records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuests();
  }, []);

  // HELPER FUNCTIONS

  function getDateValue(value: string): number {
    if (!value) return 0;

    const date = new Date(value);

    if (!isNaN(date.getTime())) {
      return date.getTime();
    }

    return 0;
  }

  function formatDate(value: unknown): string {
    if (!value) return "Not available";

    // Firebase Timestamp
    if (typeof value === "object" && value !== null && "toDate" in value) {
      const timestamp = value as {
        toDate: () => Date;
      };

      return timestamp.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    const date = new Date(String(value));

    if (isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // SEARCH

  const filtered = guests.filter((guest) => {
    const q = search.toLowerCase().trim();

    return (
      !q ||
      guest.name.toLowerCase().includes(q) ||
      guest.email.toLowerCase().includes(q) ||
      guest.phone.toLowerCase().includes(q) ||
      guest.nationality.toLowerCase().includes(q)
    );
  });

  // STATUS BADGE

  const statusBadge = (status: Guest["status"]) => {
    const map = {
      vip: "bg-purple-100 text-purple-800",
      regular: "bg-gray-100 text-gray-800",
      new: "bg-blue-100 text-blue-800",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${map[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // LOADING

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Loading guest records...</p>
        </div>
      </div>
    );
  }

  // STATISTICS

  const totalGuests = guests.length;

  const vipGuests = guests.filter((guest) => guest.status === "vip").length;

  const newGuests = guests.filter((guest) => guest.status === "new").length;

  const averageLifetimeValue =
    totalGuests > 0
      ? Math.round(
          guests.reduce((sum, guest) => sum + guest.totalSpent, 0) /
            totalGuests,
        )
      : 0;

  return (
    <div className="p-8">
      {/* Header */}

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Guest / Customer Records
          </h1>

          <p className="text-gray-500 mt-2">
            Access customer information and booking histories
          </p>
        </div>
      </div>

      {/* Search */}

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests by name, email, phone, or nationality..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {search && (
          <p className="text-xs text-gray-500 mt-2">
            {filtered.length} result
            {filtered.length !== 1 ? "s" : ""} for "{search}"
          </p>
        )}
      </Card>

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-gray-500">Total Guests</p>

          <p className="text-2xl font-bold text-gray-900 mt-1">{totalGuests}</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-500">VIP Guests</p>

          <p className="text-2xl font-bold text-gray-900 mt-1">{vipGuests}</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-500">New Guests</p>

          <p className="text-2xl font-bold text-gray-900 mt-1">{newGuests}</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-500">Avg. Lifetime Value</p>

          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${averageLifetimeValue.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Guest List */}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Guest Directory
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  "Guest ID",
                  "Name",
                  "Contact",
                  "Nationality",
                  "Total Stays",
                  "Total Spent",
                  "Last Visit",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="text-left py-3 px-4 text-sm font-medium text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {guest.id}
                  </td>

                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {guest.name}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Mail className="w-3 h-3" />
                        {guest.email || "No email"}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="w-3 h-3" />
                        {guest.phone || "No phone"}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-sm text-gray-700">
                    {guest.nationality}
                  </td>

                  <td className="py-3 px-4 text-sm text-gray-700">
                    {guest.totalStays}
                  </td>

                  <td className="py-3 px-4 font-medium text-gray-900">
                    ${guest.totalSpent.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-sm text-gray-700">
                    {guest.lastVisit}
                  </td>

                  <td className="py-3 px-4">{statusBadge(guest.status)}</td>

                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="View booking history"
                      onClick={() =>
                        setViewingGuest(
                          viewingGuest?.id === guest.id ? null : guest,
                        )
                      }
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    {guests.length === 0
                      ? "No guest records found in Firebase."
                      : `No guests found matching "${search}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Guest Detail Modal */}

      {viewingGuest && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setViewingGuest(null)}
        >
          <Card
            className="w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}

            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewingGuest.name}
                </h2>

                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500">{viewingGuest.id}</p>

                  {statusBadge(viewingGuest.status)}
                </div>
              </div>

              <button
                onClick={() => setViewingGuest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guest Information */}

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                ["Email", viewingGuest.email || "Not available"],
                ["Phone", viewingGuest.phone || "Not available"],
                ["Nationality", viewingGuest.nationality],
                ["Last Visit", viewingGuest.lastVisit],
                ["Total Stays", String(viewingGuest.totalStays)],
                ["Total Spent", `$${viewingGuest.totalSpent.toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>

                  <p className="text-sm font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Booking History */}

            <h3 className="font-semibold text-gray-900 mb-3">
              Booking History
            </h3>

            {viewingGuest.history.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">
                No booking history found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Date", "Room", "Nights", "Amount"].map((heading) => (
                        <th
                          key={heading}
                          className="text-left py-2 px-3 text-sm font-medium text-gray-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {viewingGuest.history.map((booking, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-sm text-gray-700">
                          {booking.date}
                        </td>

                        <td className="py-2 px-3 text-sm text-gray-700">
                          {booking.room}
                        </td>

                        <td className="py-2 px-3 text-sm text-gray-700">
                          {booking.nights}
                        </td>

                        <td className="py-2 px-3 font-medium text-gray-900">
                          ${booking.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Close */}

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setViewingGuest(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
