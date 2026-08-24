import { Plus, Search, Edit2, X, Check, ChevronDown, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

import { customerDb } from "../app/firebase"; // change the path if necessary

type BookingStatus =
  | "confirmed"
  | "checked-in"
  | "checked-out"
  | "cancelled"
  | "pending";

interface Booking {
  id: string;
  guest: string;
  email: string;
  phone: string;
  room: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pax: number;
  status: BookingStatus;
  amount: number;
  paid: number;
  notes: string;
}

const STATUS: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  confirmed: { label: "Confirmed", color: "#06b6d4", bg: "#ecfeff" },
  "checked-in": { label: "Checked In", color: "#0d7377", bg: "#e2f3f2" },
  "checked-out": { label: "Checked Out", color: "#4a7a7a", bg: "#f0f9f8" },
  cancelled: { label: "Cancelled", color: "#d4183d", bg: "#fef2f2" },
  pending: { label: "Pending", color: "#f97316", bg: "#fff7ed" },
};

function BookingModal({
  booking,
  onClose,
  onSave,
}: {
  booking: Partial<Booking>;
  onClose: () => void;
  onSave: (b: Booking) => void;
}) {
  const [form, setForm] = useState<Partial<Booking>>(booking);
  const update = (k: keyof Booking, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3
            className="font-medium"
            style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
          >
            {booking.id ? `Edit Booking ${booking.id}` : "New Booking"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "#4a7a7a" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Guest Name", key: "guest" as const, type: "text" },
              { label: "Email", key: "email" as const, type: "email" },
              { label: "Phone", key: "phone" as const, type: "tel" },
              { label: "Room Number", key: "room" as const, type: "text" },
              { label: "Check-in Date", key: "checkIn" as const, type: "date" },
              {
                label: "Check-out Date",
                key: "checkOut" as const,
                type: "date",
              },
              { label: "No. of Guests", key: "pax" as const, type: "number" },
              {
                label: "Total Amount (₱)",
                key: "amount" as const,
                type: "number",
              },
            ].map((f) => (
              <div key={f.key}>
                <label
                  className="block text-xs mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={(form[f.key] as string | number) ?? ""}
                  onChange={(e) =>
                    update(
                      f.key,
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#4a7a7a" }}>
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
              style={{
                borderColor: "rgba(13,115,119,0.2)",
                background: "#f0f9f8",
                color: "#0a2e2e",
              }}
            />
          </div>
        </div>
        <div
          className="flex justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form as Booking)}
            className="px-5 py-2 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Save Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reservations() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all",
  );
  const [modal, setModal] = useState<Partial<Booking> | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      (b.guest ?? "").toLowerCase().includes(q) ||
      (b.id ?? "").toLowerCase().includes(q) ||
      String(b.room ?? "").includes(q);

    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const snapshot = await getDocs(collection(customerDb, "Bookings"));

      const bookingData: Booking[] = snapshot.docs.map((bookingDoc) => {
        const data = bookingDoc.data();

        return {
          id: bookingDoc.id,

          guest: data.customerName || "Unknown Guest",

          email: data.customerEmail || "",

          phone: data.customerPhone || "",

          room: data.roomName || "",

          roomType: data.roomType || "",

          checkIn: data.checkIn || "",

          checkOut: data.checkOut || "",

          nights: Number(data.nights || 0),

          pax: Number(data.guests || 0),

          status:
            data.status === "confirmed"
              ? "confirmed"
              : data.status === "checked-in"
                ? "checked-in"
                : data.status === "checked-out"
                  ? "checked-out"
                  : data.status === "cancelled"
                    ? "cancelled"
                    : "pending",

          amount: Number(
            data.totalPrice ??
              data.totalAmount ??
              data.total ??
              Number(data.roomRate || 0) * Number(data.nights || 0),
          ),

          paid: Number(data.amountPaid ?? data.paid ?? 0),

          notes: data.notes || "",
        };
      });

      setBookings(bookingData);
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };
  const saveBooking = async (booking: Booking) => {
    try {
      if (booking.id) {
        await updateDoc(doc(customerDb, "Bookings", booking.id), {
          customerName: booking.guest,
          customerEmail: booking.email,
          customerPhone: booking.phone,
          roomName: booking.room,
          roomType: booking.roomType,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          guests: booking.pax,
          totalPrice: booking.amount,
          amountPaid: booking.paid,
          status: booking.status,
          notes: booking.notes,
        });
      } else {
        await addDoc(collection(customerDb, "Bookings"), {
          customerName: booking.guest,
          customerEmail: booking.email,
          customerPhone: booking.phone,
          roomName: booking.room,
          roomType: booking.roomType,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          guests: booking.pax,
          totalPrice: booking.amount,
          amountPaid: booking.paid,
          status: "pending",
          notes: booking.notes,
        });
      }

      loadBookings();
      setModal(null);
    } catch (error) {
      console.error(error);
    }
  };

  const cancel = async (id: string) => {
    try {
      await updateDoc(doc(customerDb, "Bookings", id), {
        status: "cancelled",
      });

      loadBookings();
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <div className="space-y-4">
      {modal && (
        <BookingModal
          booking={modal}
          onClose={() => setModal(null)}
          onSave={saveBooking}
        />
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#4a7a7a" }}
          />
          <input
            type="text"
            placeholder="Search by guest, ID, room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              background: "white",
              color: "#0a2e2e",
            }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              "all",
              "pending",
              "confirmed",
              "checked-in",
              "checked-out",
              "cancelled",
            ] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all border"
              style={{
                background: statusFilter === s ? "#0d7377" : "white",
                color: statusFilter === s ? "white" : "#4a7a7a",
                borderColor:
                  statusFilter === s ? "#0d7377" : "rgba(13,115,119,0.2)",
              }}
            >
              {s === "all" ? "All" : STATUS[s]?.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal({ status: "pending", pax: 2, paid: 0 })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white ml-auto"
          style={{ background: "#0d7377" }}
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f0f9f8" }}>
                {[
                  "Booking ID",
                  "Guest",
                  "Room",
                  "Check-in",
                  "Check-out",
                  "Pax",
                  "Status",
                  "Amount",
                  "Balance",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: "#4a7a7a", fontWeight: 500 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const s = STATUS[b.status];
                const balance = b.amount - b.paid;
                return (
                  <tr
                    key={b.id}
                    style={{
                      borderTop:
                        i > 0 ? "1px solid rgba(13,115,119,0.08)" : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3 text-sm font-mono"
                      style={{ color: "#0d7377" }}
                    >
                      {b.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: "#0a2e2e" }}>
                        {b.guest}
                      </p>
                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        {b.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: "#0a2e2e" }}>
                        Rm {b.room}
                      </p>
                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        {b.roomType}
                      </p>
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "#0a2e2e" }}
                    >
                      {b.checkIn}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "#0a2e2e" }}
                    >
                      {b.checkOut}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-center"
                      style={{ color: "#0a2e2e" }}
                    >
                      {b.pax}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-1 rounded-full text-xs"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "#0a2e2e" }}
                    >
                      ₱{b.amount.toLocaleString()}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: balance > 0 ? "#d4183d" : "#0d7377" }}
                    >
                      {balance > 0 ? `₱${balance.toLocaleString()}` : "Paid"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDetail(b)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "#0d7377" }}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModal(b)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "#06b6d4" }}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {b.status !== "cancelled" &&
                          b.status !== "checked-out" && (
                            <button
                              onClick={() => cancel(b.id)}
                              className="p-1.5 rounded-lg"
                              style={{ color: "#d4183d" }}
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "rgba(13,115,119,0.1)" }}
            >
              <div>
                <h3
                  className="font-medium"
                  style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
                >
                  {detail.id}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: STATUS[detail.status].bg,
                    color: STATUS[detail.status].color,
                  }}
                >
                  {STATUS[detail.status].label}
                </span>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-lg"
                style={{ color: "#4a7a7a" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: "Guest", value: detail.guest },
                { label: "Contact", value: detail.phone },
                { label: "Email", value: detail.email },
                {
                  label: "Room",
                  value: `${detail.roomType} (Rm ${detail.room})`,
                },
                { label: "Check-in", value: detail.checkIn },
                { label: "Check-out", value: detail.checkOut },
                { label: "Nights", value: `${detail.nights}` },
                { label: "Guests", value: `${detail.pax} pax` },
                { label: "Total", value: `₱${detail.amount.toLocaleString()}` },
                { label: "Paid", value: `₱${detail.paid.toLocaleString()}` },
                {
                  label: "Balance",
                  value: `₱${(detail.amount - detail.paid).toLocaleString()}`,
                },
                { label: "Notes", value: detail.notes || "—" },
              ].map((f) => (
                <div
                  key={f.label}
                  className={
                    f.label === "Notes" || f.label === "Room"
                      ? "col-span-2"
                      : ""
                  }
                >
                  <p className="text-xs mb-0.5" style={{ color: "#4a7a7a" }}>
                    {f.label}
                  </p>
                  <p className="text-sm" style={{ color: "#0a2e2e" }}>
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
