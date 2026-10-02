import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  runTransaction,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { customerDb } from "../app/firebase";
import {
  Search,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  X,
} from "lucide-react";

interface Payment {
  id: string;
  bookingId: string;
  guest: string;
  room: string;
  amount: number;
  method: "cash" | "gcash";
  type: "full" | "partial" | "balance";
  date: string;
  time: string;
  status: "completed" | "pending";
  receiptNo: string;
  referenceNumber: string;
  verificationStatus: "pending" | "verified" | "rejected";
}

interface PendingBalance {
  bookingId: string;
  userId: string;
  guest: string;
  room: string;
  total: number;
  balance: number;
  checkOut: string;
  amountPaid: number;
}

const METHOD_ICON: Record<string, LucideIcon> = {
  cash: Banknote,
  gcash: Smartphone,
};

const METHOD_COLOR: Record<string, { color: string; bg: string }> = {
  cash: { color: "#0d7377", bg: "#e2f3f2" },
  gcash: { color: "#14b8a6", bg: "#f0fdfa" },
};

/**
 * Writes a notification for the customer who owns the booking.
 * The deterministic ID helps prevent duplicate notifications.
 *
 * Firestore rules must explicitly authorize the receptionist to
 * create notifications for customers, or this write should be
 * performed by a trusted backend.
 */
async function notifyCustomer({
  customerId,
  eventId,
  title,
  message,
  targetPath,
}: {
  customerId: string;
  eventId: string;
  title: string;
  message: string;
  targetPath: string;
}) {
  if (!customerId) {
    console.warn("Notification skipped: booking has no customer userId.");
    return;
  }

  const safeEventId = eventId.replace(/\./g, "%2E");
  const notificationId = `${customerId}_${safeEventId}`;

  await setDoc(
    doc(customerDb, "Notifications", notificationId),
    {
      userId: customerId,
      role: "customer",
      eventId,
      type: "payment",
      title,
      message,
      targetPath,
      read: false,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

interface PaymentModalProps {
  booking: PendingBalance;
  onClose: () => void;
  onPay: (method: string, amount: number) => void;
}

function PaymentModal({ booking, onClose, onPay }: PaymentModalProps) {
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(booking.balance.toString());

  const numericAmount = Number(amount);
  const invalidAmount =
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > booking.balance;

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
            <div className="grid grid-cols-2 gap-3">
              {(["cash", "gcash"] as const).map((m) => {
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
                      {m === "gcash" ? "GCash" : "Cash"}
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
              min="0.01"
              max={booking.balance}
              step="0.01"
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
                onClick={() => setAmount((booking.balance / 2).toFixed(2))}
                className="text-xs px-3 py-1.5 rounded-lg border"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  color: "#0d7377",
                }}
              >
                Half
              </button>
            </div>
            {invalidAmount && (
              <p className="text-xs mt-2" style={{ color: "#d4183d" }}>
                Enter an amount greater than ₱0 and no more than the balance.
              </p>
            )}
          </div>

          {numericAmount < booking.balance && numericAmount > 0 && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: "#fff7ed", color: "#f97316" }}
            >
              Partial payment. Remaining balance: ₱
              {(booking.balance - numericAmount).toLocaleString()}
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
            disabled={invalidAmount}
            onClick={() => onPay(method, numericAmount)}
            className="flex-1 py-2.5 rounded-lg text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingBalances, setPendingBalances] = useState<PendingBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState<PendingBalance | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const paymentSnap = await getDocs(collection(customerDb, "Payments"));

      const paymentData: Payment[] = paymentSnap.docs.map((docSnap) => {
        const d = docSnap.data();

        const rawMethod = String(
          d.method ?? d.paymentMethod ?? "cash",
        ).toLowerCase();

        const rawStatus = String(d.status ?? "completed").toLowerCase();

        const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : null;

        const date =
          d.date || (createdAt ? createdAt.toLocaleDateString() : "");

        const time =
          d.time ||
          (createdAt
            ? createdAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "");

        const rawVerification = String(
          d.verificationStatus ??
            (rawStatus === "pending_verification" ? "pending" : "verified"),
        ).toLowerCase();

        return {
          id: docSnap.id,
          bookingId: d.bookingId || "",
          guest: d.guest || d.customerName || "",
          room: d.room || d.roomName || "",
          amount: Number(d.amount || 0),
          method: rawMethod.includes("gcash") ? "gcash" : "cash",
          type: d.type || "partial",
          date,
          time,
          status:
            rawStatus === "pending" || rawStatus === "pending_verification"
              ? "pending"
              : "completed",
          receiptNo: d.receiptNo || "",
          referenceNumber: d.referenceNumber || "",
          verificationStatus:
            rawVerification === "rejected"
              ? "rejected"
              : rawVerification === "verified"
                ? "verified"
                : "pending",
        };
      });

      setPayments(paymentData);

      const bookingSnap = await getDocs(collection(customerDb, "Bookings"));

      const balances: PendingBalance[] = bookingSnap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const total = Number(d.totalPrice ?? d.totalAmount ?? d.total ?? 0);

          const paid = Number(d.amountPaid ?? 0);
          const balance = Math.max(0, total - paid);

          return {
            bookingId: docSnap.id,
            userId: String(d.userId ?? ""),
            guest: d.customerName || "",
            room: d.roomName || "",
            total,
            balance,
            amountPaid: paid,
            checkOut: d.checkOut || "",
          };
        })
        .filter((b) => b.balance > 0);

      setPendingBalances(balances);
    } catch (err) {
      console.error("Error loading payments:", err);
      setSuccessMsg("Could not load payment data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // Receptionist-entered payment, such as cash or an in-person GCash payment.
  const handlePay = async (method: string, amount: number) => {
    if (!payModal) return;

    if (!Number.isFinite(amount) || amount <= 0 || amount > payModal.balance) {
      setSuccessMsg("Invalid payment amount.");
      return;
    }

    try {
      const bookingRef = doc(customerDb, "Bookings", payModal.bookingId);
      const paymentRef = doc(collection(customerDb, "Payments"));
      const now = new Date();

      const paymentResult = await runTransaction(
        customerDb,
        async (transaction) => {
          const bookingSnap = await transaction.get(bookingRef);

          if (!bookingSnap.exists()) {
            throw new Error("Booking not found.");
          }

          const booking = bookingSnap.data();

          const total = Number(
            booking.totalPrice ?? booking.totalAmount ?? booking.total ?? 0,
          );

          const paid = Number(booking.amountPaid ?? 0);
          const currentBalance = Math.max(0, total - paid);

          if (currentBalance <= 0) {
            throw new Error("This booking is already fully paid.");
          }

          if (amount > currentBalance) {
            throw new Error("Payment exceeds the current remaining balance.");
          }

          const newAmountPaid = paid + amount;
          const remainingBalance = Math.max(0, total - newAmountPaid);

          const newPay: Omit<Payment, "id"> = {
            bookingId: payModal.bookingId,
            guest: booking.customerName || payModal.guest,
            room: booking.roomName || payModal.room,
            amount,
            method: method as Payment["method"],
            type: remainingBalance === 0 ? "balance" : "partial",
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "completed",
            receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
            referenceNumber: "",
            verificationStatus: "verified",
          };

          transaction.set(paymentRef, {
            ...newPay,
            userId: booking.userId || "",
            createdAt: serverTimestamp(),
          });

          transaction.update(bookingRef, {
            amountPaid: newAmountPaid,
            remainingBalance,
            paymentStatus:
              remainingBalance === 0
                ? "paid"
                : newAmountPaid > 0
                  ? "partial"
                  : "unpaid",
          });

          return {
            userId: String(booking.userId ?? ""),
            guest: String(booking.customerName || payModal.guest),
            room: String(booking.roomName || payModal.room),
            remainingBalance,
          };
        },
      );

      // Payment transaction has succeeded. Notification failure must not
      // make the receptionist think the payment itself failed.
      try {
        await notifyCustomer({
          customerId: paymentResult.userId,
          eventId: `payment-received-${paymentRef.id}`,
          title: "Payment Received",
          message:
            `We received your ₱${amount.toLocaleString()} ` +
            `${method === "gcash" ? "GCash" : "cash"} payment for ` +
            `${paymentResult.room || "your booking"}. ` +
            (paymentResult.remainingBalance === 0
              ? "Your booking is now fully paid."
              : `Remaining balance: ₱${paymentResult.remainingBalance.toLocaleString()}.`),
          targetPath: "/booking-history",
        });
      } catch (notificationError) {
        console.error(
          "Payment saved, but notification failed:",
          notificationError,
        );
      }

      setPayModal(null);
      setSuccessMsg(
        `Payment of ₱${amount.toLocaleString()} via ${method} processed successfully!`,
      );

      await loadData();
      window.setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error processing payment:", err);

      setSuccessMsg(
        err instanceof Error
          ? err.message
          : "Could not process payment. Please try again.",
      );
    }
  };

  // Verify the existing customer-submitted GCash record.
  const verifyGcashPayment = async (payment: Payment) => {
    try {
      const paymentRef = doc(customerDb, "Payments", payment.id);
      const bookingRef = doc(customerDb, "Bookings", payment.bookingId);

      const verifiedBooking = await runTransaction(
        customerDb,
        async (transaction) => {
          const paymentSnap = await transaction.get(paymentRef);

          if (!paymentSnap.exists()) {
            throw new Error("Payment record not found.");
          }

          const bookingSnap = await transaction.get(bookingRef);

          if (!bookingSnap.exists()) {
            throw new Error("Booking not found.");
          }

          const existingPayment = paymentSnap.data();

          if (
            existingPayment.verificationStatus === "verified" ||
            existingPayment.status === "completed"
          ) {
            throw new Error("This payment has already been verified.");
          }

          if (existingPayment.verificationStatus === "rejected") {
            throw new Error("This payment was already rejected.");
          }

          const booking = bookingSnap.data();
          const amount = Number(existingPayment.amount ?? 0);
          const total = Number(
            booking.totalPrice ?? booking.totalAmount ?? booking.total ?? 0,
          );
          const paid = Number(booking.amountPaid ?? 0);
          const balance = Math.max(0, total - paid);

          if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid payment amount.");
          }

          if (amount > balance) {
            throw new Error(
              "Payment amount exceeds the booking's remaining balance.",
            );
          }

          const newAmountPaid = paid + amount;
          const remainingBalance = Math.max(0, total - newAmountPaid);

          transaction.update(paymentRef, {
            status: "completed",
            verificationStatus: "verified",
            type: remainingBalance === 0 ? "balance" : "partial",
            verifiedAt: serverTimestamp(),
          });

          transaction.update(bookingRef, {
            amountPaid: newAmountPaid,
            remainingBalance,
            paymentStatus:
              remainingBalance === 0
                ? "paid"
                : newAmountPaid > 0
                  ? "partial"
                  : "unpaid",
          });

          return {
            userId: String(booking.userId ?? existingPayment.userId ?? ""),
            guest: String(booking.customerName ?? payment.guest),
            room: String(booking.roomName ?? payment.room),
            amount,
            remainingBalance,
          };
        },
      );

      try {
        await notifyCustomer({
          customerId: verifiedBooking.userId,
          eventId: `payment-verified-${payment.id}`,
          title: "GCash Payment Verified",
          message:
            `Your GCash payment of ₱${verifiedBooking.amount.toLocaleString()} ` +
            `for ${verifiedBooking.room || "your booking"} has been verified. ` +
            (verifiedBooking.remainingBalance === 0
              ? "Your booking is now fully paid."
              : `Remaining balance: ₱${verifiedBooking.remainingBalance.toLocaleString()}.`),
          targetPath: "/booking-history",
        });
      } catch (notificationError) {
        console.error(
          "GCash verified, but notification failed:",
          notificationError,
        );
      }

      setSuccessMsg("GCash payment verified successfully!");
      await loadData();
      window.setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error verifying GCash payment:", err);
      setSuccessMsg(
        err instanceof Error ? err.message : "Could not verify GCash payment.",
      );
    }
  };

  // Reject the existing customer-submitted payment.
  const rejectGcashPayment = async (payment: Payment) => {
    try {
      const paymentRef = doc(customerDb, "Payments", payment.id);
      const bookingRef = doc(customerDb, "Bookings", payment.bookingId);

      const bookingSnap = await getDocs(
        collection(customerDb, "Bookings"),
      ).then((snapshot) =>
        snapshot.docs.find((item) => item.id === payment.bookingId),
      );

      if (!bookingSnap) {
        throw new Error("Booking not found.");
      }

      const booking = bookingSnap.data();

      await updateDoc(paymentRef, {
        verificationStatus: "rejected",
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });

      try {
        await notifyCustomer({
          customerId: String(booking.userId ?? ""),
          eventId: `payment-rejected-${payment.id}`,
          title: "GCash Payment Rejected",
          message:
            `Your GCash payment submission of ₱${payment.amount.toLocaleString()} ` +
            `for ${booking.roomName || payment.room || "your booking"} was rejected. ` +
            "Please review your payment details and submit again.",
          targetPath: "/booking-history",
        });
      } catch (notificationError) {
        console.error(
          "GCash rejected, but notification failed:",
          notificationError,
        );
      }

      setSuccessMsg("GCash submission rejected.");
      await loadData();
      window.setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error rejecting GCash payment:", err);
      setSuccessMsg(
        err instanceof Error ? err.message : "Could not reject GCash payment.",
      );
    }
  };

  const gcashSubmissions = payments.filter(
    (p) =>
      p.method === "gcash" &&
      p.status === "pending" &&
      p.verificationStatus === "pending",
  );

  const filtered = payments.filter(
    (p) =>
      p.guest.toLowerCase().includes(search.toLowerCase()) ||
      p.bookingId.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const today = new Date().toLocaleDateString();

  const todayCollection = payments
    .filter((p) => p.status === "completed" && p.date === today)
    .reduce((a, b) => a + b.amount, 0);

  const cashTotal = payments
    .filter((p) => p.method === "cash" && p.status === "completed")
    .reduce((a, b) => a + b.amount, 0);

  const gcashTotal = payments
    .filter((p) => p.method === "gcash" && p.status === "completed")
    .reduce((a, b) => a + b.amount, 0);

  const pendingTotal = pendingBalances.reduce((a, b) => a + b.balance, 0);

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: "#4a7a7a" }}>
        Loading payment records...
      </div>
    );
  }

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
          style={{
            background: "#e2f3f2",
            border: "1px solid #0d7377",
          }}
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
            value: `₱${todayCollection.toLocaleString()}`,
            color: "#0d7377",
          },
          {
            label: "Cash Payments",
            value: `₱${cashTotal.toLocaleString()}`,
            color: "#14b8a6",
          },
          {
            label: "GCash Payments",
            value: `₱${gcashTotal.toLocaleString()}`,
            color: "#0891b2",
          },
          {
            label: "Pending Balances",
            value: `₱${pendingTotal.toLocaleString()}`,
            color: "#f97316",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-xl border bg-white"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <p
              className="text-2xl mb-1"
              style={{
                color: s.color,
                fontFamily: "Georgia, serif",
              }}
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
              style={{
                color: "#0a2e2e",
                fontFamily: "Georgia, serif",
              }}
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
                <div className="mb-3">
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

                <div
                  className="space-y-2 p-3 rounded-lg mb-3"
                  style={{ background: "#f0f9f8" }}
                >
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#4a7a7a" }}>
                      Total Booking Price
                    </span>
                    <span style={{ color: "#0a2e2e" }}>
                      ₱{b.total.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#4a7a7a" }}>Amount Paid</span>
                    <span style={{ color: "#0d7377" }}>
                      ₱{b.amountPaid.toLocaleString()}
                    </span>
                  </div>

                  <div
                    className="flex justify-between font-semibold border-t pt-2"
                    style={{ borderColor: "rgba(13,115,119,0.15)" }}
                  >
                    <span style={{ color: "#0a2e2e" }}>Remaining Balance</span>
                    <span style={{ color: "#d4183d" }}>
                      ₱{b.balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setPayModal(b)}
                  className="w-full py-2 rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
                  style={{ background: "#0d7377" }}
                >
                  <CreditCard className="w-4 h-4" />
                  Process Payment
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* GCash verification */}
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
                style={{
                  color: "#0a2e2e",
                  fontFamily: "Georgia, serif",
                }}
              >
                GCash Payment Verification
              </h3>
              <p className="text-xs mt-1" style={{ color: "#4a7a7a" }}>
                Review customer-submitted payments and verify the reference.
              </p>
            </div>

            <div className="p-4 space-y-3">
              {gcashSubmissions.length === 0 ? (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: "#4a7a7a" }}
                >
                  No pending GCash submissions.
                </p>
              ) : (
                gcashSubmissions.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border"
                    style={{ borderColor: "rgba(13,115,119,0.15)" }}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-medium" style={{ color: "#0a2e2e" }}>
                          {p.guest}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "#4a7a7a" }}
                        >
                          Booking: {p.bookingId}
                        </p>
                        <p className="text-xs" style={{ color: "#4a7a7a" }}>
                          Room: {p.room}
                        </p>
                        <p className="text-xs" style={{ color: "#4a7a7a" }}>
                          Submitted: {p.date} {p.time}
                        </p>
                      </div>

                      <p className="font-semibold" style={{ color: "#0d7377" }}>
                        ₱{p.amount.toLocaleString()}
                      </p>
                    </div>

                    <div
                      className="mt-3 p-3 rounded-lg"
                      style={{ background: "#f0f9f8" }}
                    >
                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        Reference Number
                      </p>
                      <p
                        className="font-mono font-semibold break-all"
                        style={{ color: "#0a2e2e" }}
                      >
                        {p.referenceNumber || "Not provided"}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => verifyGcashPayment(p)}
                        className="flex-1 py-2 rounded-lg text-sm text-white flex items-center justify-center gap-1"
                        style={{ background: "#0d7377" }}
                      >
                        <Check className="w-4 h-4" />
                        Verify Payment
                      </button>
                      <button
                        onClick={() => rejectGcashPayment(p)}
                        className="flex-1 py-2 rounded-lg text-sm border flex items-center justify-center gap-1"
                        style={{
                          borderColor: "#d4183d",
                          color: "#d4183d",
                        }}
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transaction history */}
          <div
            className="bg-white rounded-xl border"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <div
              className="flex items-center gap-4 px-5 py-4 border-b"
              style={{ borderColor: "rgba(13,115,119,0.1)" }}
            >
              <h3
                className="font-medium"
                style={{
                  color: "#0a2e2e",
                  fontFamily: "Georgia, serif",
                }}
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
                  placeholder="Search..."
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
                      "Reference No.",
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm"
                        style={{ color: "#4a7a7a" }}
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, i) => {
                      const Icon = METHOD_ICON[p.method] || Banknote;
                      const c = METHOD_COLOR[p.method] || METHOD_COLOR.cash;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderTop:
                              i > 0
                                ? "1px solid rgba(13,115,119,0.08)"
                                : undefined,
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
                              style={{
                                background: c.bg,
                                color: c.color,
                              }}
                            >
                              <Icon className="w-3 h-3" />
                              {p.method === "gcash" ? "GCash" : "Cash"}
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
                            className="px-4 py-3 text-xs font-mono"
                            style={{ color: "#4a7a7a" }}
                          >
                            {p.referenceNumber || "—"}
                          </td>

                          <td
                            className="px-4 py-3 text-xs"
                            style={{ color: "#4a7a7a" }}
                          >
                            {p.date} {p.time}
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
    </div>
  );
}
