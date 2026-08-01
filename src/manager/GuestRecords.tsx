import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Search, Eye, Mail, Phone, X } from "lucide-react";
import { useState } from "react";

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

const guests: Guest[] = [
  {
    id: "G-001",
    name: "John Martinez",
    email: "john.m@email.com",
    phone: "+1 234-567-8901",
    nationality: "USA",
    totalStays: 5,
    totalSpent: 8500,
    lastVisit: "Jun 8, 2026",
    status: "vip",
  },
  {
    id: "G-002",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    phone: "+86 138-1234-5678",
    nationality: "China",
    totalStays: 2,
    totalSpent: 3200,
    lastVisit: "Jun 10, 2026",
    status: "regular",
  },
  {
    id: "G-003",
    name: "Michael Johnson",
    email: "mike.j@email.com",
    phone: "+44 20-1234-5678",
    nationality: "UK",
    totalStays: 8,
    totalSpent: 15400,
    lastVisit: "Jun 9, 2026",
    status: "vip",
  },
  {
    id: "G-004",
    name: "Emma Wilson",
    email: "emma.w@email.com",
    phone: "+61 2-1234-5678",
    nationality: "Australia",
    totalStays: 1,
    totalSpent: 720,
    lastVisit: "Jun 12, 2026",
    status: "new",
  },
  {
    id: "G-005",
    name: "Carlos Rodriguez",
    email: "carlos.r@email.com",
    phone: "+34 91-123-4567",
    nationality: "Spain",
    totalStays: 3,
    totalSpent: 4200,
    lastVisit: "May 20, 2026",
    status: "regular",
  },
];

const bookingHistories: Record<string, BookingRecord[]> = {
  "G-001": [
    {
      date: "Jun 8, 2026",
      room: "Ocean View Suite 101",
      nights: 4,
      amount: 1800,
    },
    { date: "Mar 15, 2026", room: "Deluxe Room 205", nights: 3, amount: 900 },
    {
      date: "Dec 20, 2025",
      room: "Beach Front Villa 3",
      nights: 7,
      amount: 5600,
    },
  ],
  "G-002": [
    { date: "Jun 10, 2026", room: "Deluxe Room 205", nights: 5, amount: 1500 },
    { date: "Jan 5, 2026", room: "Standard Room 102", nights: 4, amount: 720 },
  ],
  "G-003": [
    {
      date: "Jun 9, 2026",
      room: "Beach Front Villa 3",
      nights: 7,
      amount: 4900,
    },
    {
      date: "Apr 2, 2026",
      room: "Ocean View Suite 301",
      nights: 5,
      amount: 2400,
    },
    {
      date: "Feb 14, 2026",
      room: "Beach Front Villa 2",
      nights: 3,
      amount: 2400,
    },
    {
      date: "Dec 25, 2025",
      room: "Beach Front Villa 3",
      nights: 10,
      amount: 8000,
    },
  ],
  "G-004": [
    { date: "Jun 12, 2026", room: "Standard Room 102", nights: 2, amount: 360 },
  ],
  "G-005": [
    { date: "May 20, 2026", room: "Deluxe Room 204", nights: 4, amount: 1200 },
    {
      date: "Feb 8, 2026",
      room: "Ocean View Suite 302",
      nights: 3,
      amount: 1400,
    },
    { date: "Oct 15, 2025", room: "Standard Room 101", nights: 5, amount: 875 },
  ],
};

export default function GuestRecords() {
  const [search, setSearch] = useState("");
  const [viewingGuest, setViewingGuest] = useState<Guest | null>(null);

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return (
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.nationality.toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="p-8">
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

      {/* Search Bar */}
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
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "
            {search}"
          </p>
        )}
      </Card>

      {/* Guest Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-gray-500">Total Guests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {guests.length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">VIP Guests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {guests.filter((g) => g.status === "vip").length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">New Guests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {guests.filter((g) => g.status === "new").length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Avg. Lifetime Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            $
            {Math.round(
              guests.reduce((s, g) => s + g.totalSpent, 0) / guests.length,
            ).toLocaleString()}
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
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-sm font-medium text-gray-500"
                  >
                    {h}
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
                        {guest.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="w-3 h-3" />
                        {guest.phone}
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
                    No guests found matching "{search}".
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewingGuest.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {viewingGuest.id} · {statusBadge(viewingGuest.status)}
                </p>
              </div>
              <button
                onClick={() => setViewingGuest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                ["Email", viewingGuest.email],
                ["Phone", viewingGuest.phone],
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
            <h3 className="font-semibold text-gray-900 mb-3">
              Booking History
            </h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Date", "Room", "Nights", "Amount"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-sm font-medium text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(bookingHistories[viewingGuest.id] ?? []).map((b, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-sm text-gray-700">
                      {b.date}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700">
                      {b.room}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700">
                      {b.nights}
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-900">
                      ${b.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
