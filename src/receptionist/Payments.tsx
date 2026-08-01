import { useState } from "react";
import {
  Search,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  Plus,
  Receipt,
  X,
} from "lucide-react";

interface Payment {
  id: string;
  bookingId: string;
  guest: string;
  room: string;
  amount: number;
  method: "cash" | "card" | "gcash";
  type: "full" | "partial" | "balance";
  date: string;
  time: string;
  status: "completed" | "pending";
  receiptNo: string;
}

const PAYMENTS: Payment[] = [
  {
    id: "PAY-001",
    bookingId: "BK-2401",
    guest: "James Villanueva",
    room: "Suite 12",
    amount: 15000,
    method: "cash",
    type: "full",
    date: "Jun 7, 2026",
    time: "08:20",
    status: "completed",
    receiptNo: "RCP-2401",
  },
  {
    id: "PAY-002",
    bookingId: "BK-2402",
    guest: "Linda Tan",
    room: "Ocean View 8",
    amount: 4200,
    method: "card",
    type: "partial",
    date: "Jun 7, 2026",
    time: "09:45",
    status: "completed",
    receiptNo: "RCP-2402",
  },
  {
    id: "PAY-003",
    bookingId: "BK-2404",
    guest: "Sofia Cruz",
    room: "Dive Cabin 5",
    amount: 7600,
    method: "gcash",
    type: "full",
    date: "Jun 7, 2026",
    time: "10:15",
    status: "completed",
    receiptNo: "RCP-2403",
  },
  {
    id: "PAY-004",
    bookingId: "BK-2405",
    guest: "Ryan Lim",
    room: "Suite 14",
    amount: 10000,
    method: "cash",
    type: "partial",
    date: "Jun 6, 2026",
    time: "16:30",
    status: "completed",
    receiptNo: "RCP-2404",
  },
];

const PENDING_BALANCES = [
  {
    bookingId: "BK-2402",
    guest: "Linda Tan",
    room: "Ocean View 8",
    balance: 4200,
    checkOut: "Jun 9",
  },
  {
    bookingId: "BK-2403",
    guest: "Mark Reyes",
    room: "Garden Room 3",
    balance: 12000,
    checkOut: "Jun 12",
  },
  {
    bookingId: "BK-2405",
    guest: "Ryan Lim",
    room: "Suite 14",
    balance: 10000,
    checkOut: "Jun 14",
  },
  {
    bookingId: "BK-2407",
    guest: "Paolo Santos",
    room: "Dive Cabin 1",
    balance: 15200,
    checkOut: "Jun 18",
  },
];

const METHOD_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  card: CreditCard,
  gcash: Smartphone,
};

const METHOD_COLOR: Record<string, { color: string; bg: string }> = {
  cash: { color: "#0d7377", bg: "#e2f3f2" },
  card: { color: "#06b6d4", bg: "#ecfeff" },
  gcash: { color: "#14b8a6", bg: "#f0fdfa" },
};

interface PaymentModalProps {
  booking: (typeof PENDING_BALANCES)[0];
  onClose: () => void;
  onPay: (method: string, amount: number) => void;
}

function PaymentModal({ booking, onClose, onPay }: PaymentModalProps) {
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(booking.balance.toString());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <div>
            <h3 style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}>
              Process Payment
            </h3>
            <p className="text-sm" style={{ color: "#4a7a7a" }}>
              {booking.bookingId} · {booking.guest}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "#4a7a7a" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl" style={{ background: "#f0f9f8" }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#4a7a7a" }}>Room</span>
              <span style={{ color: "#0a2e2e" }}>{booking.room}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span style={{ color: "#4a7a7a" }}>Checkout</span>
              <span style={{ color: "#0a2e2e" }}>{booking.checkOut}</span>
            </div>
            <div
              className="flex justify-between font-medium border-t pt-2 mt-2"
              style={{ borderColor: "rgba(13,115,119,0.1)" }}
            >
              <span style={{ color: "#0a2e2e" }}>Balance Due</span>
              <span style={{ color: "#d4183d" }}>
                ₱{booking.balance.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: "#4a7a7a" }}>
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {["cash", "card", "gcash"].map((m) => {
                const Icon = METHOD_ICON[m];
                const c = METHOD_COLOR[m];
                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor:
                        method === m ? c.color : "rgba(13,115,119,0.15)",
                      background: method === m ? c.bg : "transparent",
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: c.color }} />
                    <span className="text-xs" style={{ color: "#0a2e2e" }}>
                      {m === "gcash"
                        ? "GCash"
                        : m.charAt(0).toUpperCase() + m.slice(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "#4a7a7a" }}>
              Amount (₱)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border text-lg outline-none"
              style={{
                borderColor: "rgba(13,115,119,0.2)",
                background: "#f0f9f8",
                color: "#0a2e2e",
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setAmount(booking.balance.toString())}
                className="text-xs px-3 py-1.5 rounded-lg border"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  color: "#0d7377",
                }}
              >
                Full Balance
              </button>
              <button
                onClick={() => setAmount((booking.balance / 2).toString())}
                className="text-xs px-3 py-1.5 rounded-lg border"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  color: "#0d7377",
                }}
              >
                Half
              </button>
            </div>
          </div>

          {Number(amount) < booking.balance && Number(amount) > 0 && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: "#fff7ed", color: "#f97316" }}
            >
              Partial payment. Remaining balance: ₱
              {(booking.balance - Number(amount)).toLocaleString()}
            </div>
          )}
        </div>

        <div
          className="flex gap-3 px-6 py-4 border-t"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onPay(method, Number(amount))}
            className="flex-1 py-2.5 rounded-lg text-sm text-white flex items-center justify-center gap-2"
            style={{ background: "#0d7377" }}
          >
            <Check className="w-4 h-4" /> Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>(PAYMENTS);
  const [pendingBalances, setPendingBalances] = useState(PENDING_BALANCES);
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState<(typeof PENDING_BALANCES)[0] | null>(
    null,
  );
  const [successMsg, setSuccessMsg] = useState("");

  const handlePay = (method: string, amount: number) => {
    if (!payModal) return;
    const newPay: Payment = {
      id: `PAY-${Date.now()}`,
      bookingId: payModal.bookingId,
      guest: payModal.guest,
      room: payModal.room,
      amount,
      method: method as "cash" | "card" | "gcash",
      type: amount >= payModal.balance ? "balance" : "partial",
      date: "Jun 7, 2026",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "completed",
      receiptNo: `RCP-${Date.now().toString().slice(-4)}`,
    };
    setPayments((prev) => [newPay, ...prev]);
    if (amount >= payModal.balance) {
      setPendingBalances((prev) =>
        prev.filter((p) => p.bookingId !== payModal.bookingId),
      );
    } else {
      setPendingBalances((prev) =>
        prev.map((p) =>
          p.bookingId === payModal.bookingId
            ? { ...p, balance: p.balance - amount }
            : p,
        ),
      );
    }
    setPayModal(null);
    setSuccessMsg(
      `Payment of ₱${amount.toLocaleString()} via ${method} processed successfully!`,
    );
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const filtered = payments.filter(
    (p) =>
      p.guest.toLowerCase().includes(search.toLowerCase()) ||
      p.bookingId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {payModal && (
        <PaymentModal
          booking={payModal}
          onClose={() => setPayModal(null)}
          onPay={handlePay}
        />
      )}

      {successMsg && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "#e2f3f2", border: "1px solid #0d7377" }}
        >
          <Check
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "#0d7377" }}
          />
          <p className="text-sm" style={{ color: "#0d7377" }}>
            {successMsg}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Collection",
            value: "₱26,800",
            color: "#0d7377",
            bg: "#e2f3f2",
          },
          {
            label: "Cash Payments",
            value: "₱15,000",
            color: "#14b8a6",
            bg: "#f0fdfa",
          },
          {
            label: "Card Payments",
            value: "₱4,200",
            color: "#06b6d4",
            bg: "#ecfeff",
          },
          {
            label: "Pending Balances",
            value: `₱${pendingBalances.reduce((a, b) => a + b.balance, 0).toLocaleString()}`,
            color: "#f97316",
            bg: "#fff7ed",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-xl border bg-white"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <p
              className="text-2xl mb-1"
              style={{ color: s.color, fontFamily: "Georgia, serif" }}
            >
              {s.value}
            </p>
            <p className="text-xs" style={{ color: "#4a7a7a" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending balances */}
        <div
          className="bg-white rounded-xl border"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Pending Balances
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {pendingBalances.length === 0 && (
              <p
                className="text-sm text-center py-4"
                style={{ color: "#4a7a7a" }}
              >
                All balances cleared!
              </p>
            )}
            {pendingBalances.map((b) => (
              <div
                key={b.bookingId}
                className="p-4 rounded-xl border"
                style={{ borderColor: "rgba(13,115,119,0.1)" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#0a2e2e" }}
                    >
                      {b.guest}
                    </p>
                    <p className="text-xs" style={{ color: "#4a7a7a" }}>
                      {b.room} · Out: {b.checkOut}
                    </p>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#d4183d" }}
                  >
                    ₱{b.balance.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setPayModal(b)}
                  className="w-full py-2 rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
                  style={{ background: "#0d7377" }}
                >
                  <CreditCard className="w-4 h-4" /> Process Payment
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div
          className="lg:col-span-2 bg-white rounded-xl border"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <div
            className="flex items-center gap-4 px-5 py-4 border-b"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Transaction History
            </h3>
            <div className="relative ml-auto">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#4a7a7a" }}
              />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#f0f9f8" }}>
                  {[
                    "Receipt",
                    "Guest",
                    "Booking",
                    "Method",
                    "Type",
                    "Amount",
                    "Date",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs"
                      style={{ color: "#4a7a7a", fontWeight: 500 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const Icon = METHOD_ICON[p.method];
                  const c = METHOD_COLOR[p.method];
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderTop:
                          i > 0 ? "1px solid rgba(13,115,119,0.08)" : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 text-xs font-mono"
                        style={{ color: "#4a7a7a" }}
                      >
                        {p.receiptNo}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "#0a2e2e" }}
                      >
                        {p.guest}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-mono"
                        style={{ color: "#0d7377" }}
                      >
                        {p.bookingId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                          style={{ background: c.bg, color: c.color }}
                        >
                          <Icon className="w-3 h-3" />
                          {p.method === "gcash"
                            ? "GCash"
                            : p.method.charAt(0).toUpperCase() +
                              p.method.slice(1)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs capitalize"
                        style={{ color: "#4a7a7a" }}
                      >
                        {p.type}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: "#0a2e2e" }}
                      >
                        ₱{p.amount.toLocaleString()}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: "#4a7a7a" }}
                      >
                        {p.date} {p.time}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
