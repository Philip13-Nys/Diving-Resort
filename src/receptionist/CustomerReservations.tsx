import BookingActivityEditor from "../app/components/BookingActivityEditor";
import {
  activityTimeLabel,
  type ActivityRecord,
} from "../app/activityAvailability";
import { displayRecordId } from "../app/bookingAvailability";
import { customerNotifier } from "../app/activitylogss";
import { useRecordRevision } from "../app/useBookingInventory";
import { changeBooking, checkInDateError } from "../app/bookingOperations";
import { useSearchParams } from "react-router-dom";

import { getLiveBookingSnapshot as getBookingSnapshot } from "../app/bookingStore";
import { bookingRoomLabel } from "../app/bookingAvailability";
import { AsyncButton } from "../app/components/ui/async-action";
import { Search, Edit2, X, Check, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, customerDb } from "../app/firebase";
import { createActivityLog } from "../app/activitylogss";

type BookingStatus =
  | "confirmed"
  | "checked-in"
  | "checked-out"
  | "cancelled"
  | "pending"
  | "pending-payment-verification";

interface Booking extends ActivityRecord {
  bookingType?: string;
  itemType?: string;
  bookingDate?: string;
  serviceName?: string;
  packageName?: string;
  activityName?: string;
  itemName?: string;
  bookingStore?: string;
  id: string;
  bookingId: string;
  userId?: string;
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
  acceptedBy?: string;
  acceptedByUid?: string;
  checkedInBy?: string;
  checkedInByUid?: string;
  checkedOutBy?: string;
  checkedOutByUid?: string;
  cancelledBy?: string;
  cancelledByUid?: string;
  modificationRequest?: { checkIn: string; checkOut: string };
  cancellationReason?: string;
  assignedRoomIds?: string[];
  assignedRoomNumbers?: string[];
}

const STATUS: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  confirmed: { label: "Confirmed", color: "#06b6d4", bg: "#ecfeff" },
  "checked-in": { label: "Checked In", color: "#0d7377", bg: "#e2f3f2" },
  "checked-out": { label: "Checked Out", color: "#4a7a7a", bg: "#f0f9f8" },
  cancelled: { label: "Cancelled", color: "#d4183d", bg: "#fef2f2" },
  "pending-payment-verification": {
    label: "Pending Payment Verification",
    color: "#f97316",
    bg: "#fff7ed",
  },
  pending: { label: "Pending", color: "#f97316", bg: "#fff7ed" },
};

function bookingSubject(booking: Booking) {
  const kinds = [booking.bookingType, booking.itemType].map((value) =>
    String(value || "")
      .trim()
      .toLowerCase(),
  );
  const kind = ["package", "service", "activity"].find((value) =>
    kinds.includes(value),
  );
  if (kind) {
    const label =
      kind === "activity"
        ? "Service"
        : kind.charAt(0).toUpperCase() + kind.slice(1);
    return {
      label,
      name:
        booking.packageName ||
        booking.serviceName ||
        booking.activityName ||
        booking.itemName ||
        label,
    };
  }
  return {
    label: "Room",
    name:
      booking.roomType ||
      (booking.room && booking.room !== "0" ? booking.room : "Room stay"),
  };
}

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
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3
            className="font-medium"
            style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
          >
            {booking.id
              ? `Edit Booking ${booking.bookingId || ""}`
              : "New Booking"}
          </h3>
          <AsyncButton
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "#4a7a7a" }}
          >
            <X className="w-5 h-5" />
          </AsyncButton>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Guest Name", key: "guest" as const, type: "text" },
              { label: "Email", key: "email" as const, type: "email" },
              { label: "Phone", key: "phone" as const, type: "tel" },
              ...(bookingSubject(form as Booking).label === "Room"
                ? [{ label: "Room Number", key: "room" as const, type: "text" }]
                : []),
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

          <BookingActivityEditor
            booking={form}
            onChange={(value) => setForm(value as Partial<Booking>)}
          />
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
          <AsyncButton
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Cancel
          </AsyncButton>
          <AsyncButton
            type="button"
            onClick={() => onSave(form as Booking)}
            className="px-5 py-2 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Save Booking
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}

export default function Reservations() {
  const recordRevision = useRecordRevision(
    "customer:Bookings,admin:reservations",
  );
  const [params] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState(params.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all",
  );
  const [modal, setModal] = useState<Partial<Booking> | null>(null);
  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params]);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [cancellationAudit, setCancellationAudit] = useState({
    id: "",
    reason: "",
    error: "",
    loading: false,
  });
  useEffect(() => {
    const id = detail?.id || "",
      legacy = detail?.cancellationReason || "";
    const eligible =
      detail?.status === "cancelled" &&
      detail.bookingStore !== "staff" &&
      Boolean(detail.userId);
    setCancellationAudit({ id, reason: legacy, error: "", loading: eligible });
    if (!eligible || !detail?.userId) return;
    let active = true;
    const stop = onSnapshot(
      doc(customerDb, "Users", detail.userId, "bookingCancellations", id),
      (snapshot) => {
        if (active)
          setCancellationAudit({
            id,
            reason: snapshot.exists()
              ? String(snapshot.data().cancellationReason || "")
              : legacy,
            error: "",
            loading: false,
          });
      },
      () => {
        if (active)
          setCancellationAudit({
            id,
            reason: legacy,
            error:
              "Unable to load private cancellation remarks. Check staff access to the customer project.",
            loading: false,
          });
      },
    );
    return () => {
      active = false;
      stop();
    };
  }, [
    detail?.id,
    detail?.status,
    detail?.bookingStore,
    detail?.userId,
    detail?.cancellationReason,
  ]);
  const [receptionistName, setReceptionistName] = useState("Receptionist");
  const [receptionistUid, setReceptionistUid] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setReceptionistName("Receptionist");
        setReceptionistUid("");
        return;
      }

      setReceptionistUid(user.uid);

      try {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setReceptionistName(
            String(data.name || user.displayName || "Receptionist"),
          );
        } else {
          setReceptionistName(user.displayName || "Receptionist");
        }
      } catch (error) {
        console.error("Error loading receptionist:", error);
        setReceptionistName(user.displayName || "Receptionist");
      }
    });

    return () => unsubscribe();
  }, []);

  // Customer notifications must use the customer's Firebase UID as userId.
  const notifyCustomer = customerNotifier("booking");

  const loadBookings = async () => {
    try {
      const snapshot = await getBookingSnapshot();

      const bookingData: Booking[] = snapshot.docs.map((bookingDoc) => {
        const data = bookingDoc.data();
        const normalizedStatus = String(data.status || "")
          .toLowerCase()
          .replace(/\s+/g, "-");

        let status: BookingStatus = "pending";

        if (normalizedStatus === "confirmed") status = "confirmed";
        else if (normalizedStatus === "checked-in") status = "checked-in";
        else if (normalizedStatus === "checked-out") status = "checked-out";
        else if (normalizedStatus === "cancelled") status = "cancelled";
        else if (normalizedStatus === "pending") status = "pending";
        else if (normalizedStatus === "pending-payment-verification")
          status = "pending-payment-verification";

        return {
          ...data,
          id: bookingDoc.id,
          bookingStore: data._bookingStore,
          modificationRequest: data.modificationRequest,
          cancellationReason: data.cancellationReason,
          bookingId: displayRecordId(bookingDoc.id),
          userId: data.userId || "",
          guest: data.customerName || data.guestName || "Unknown Guest",
          email: data.customerEmail || data.email || "",
          phone: data.customerPhone || data.phone || "",
          room: bookingRoomLabel(data),
          serviceName: data.serviceName || "",
          packageName: data.packageName || "",
          activityName: data.activityName || "",
          itemName: data.itemName || "",
          assignedRoomIds: Array.isArray(data.assignedRoomIds)
            ? data.assignedRoomIds
            : [],
          assignedRoomNumbers: Array.isArray(data.assignedRoomNumbers)
            ? data.assignedRoomNumbers
            : [],
          roomType: data.roomTypeName || data.roomType || "",
          checkIn: data.checkIn || "",
          checkOut: data.checkOut || "",
          bookingDate: data.bookingDate || "",
          bookingType: data.bookingType || "",
          itemType: data.itemType || "",
          nights: Number(data.nights || 0),
          pax: Number(data.guests || data.pax || 0),
          status,
          amount: Number(
            data.totalPrice ??
              data.totalAmount ??
              data.total ??
              Number(data.roomRate || 0) * Number(data.nights || 0),
          ),
          paid: Number(data.amountPaid ?? data.paid ?? 0),
          notes: data.notes || data.specialRequests || "",
          acceptedBy:
            data.acceptedBy ||
            ([data.bookingType, data.bookingSource].some(
              (value: unknown) =>
                String(value || "")
                  .trim()
                  .toLowerCase() === "walk-in",
            )
              ? data.createdBy || ""
              : ""),
          acceptedByUid:
            data.acceptedByUid ||
            ([data.bookingType, data.bookingSource].some(
              (value: unknown) =>
                String(value || "")
                  .trim()
                  .toLowerCase() === "walk-in",
            )
              ? data.createdByUid || ""
              : ""),
          checkedInBy: data.checkedInBy || "",
          checkedInByUid: data.checkedInByUid || "",
          checkedOutBy: data.checkedOutBy || "",
          checkedOutByUid: data.checkedOutByUid || "",
          cancelledBy: data.cancelledBy || "",
          cancelledByUid: data.cancelledByUid || "",
        };
      });

      bookingData.sort((a, b) =>
        a.bookingId.localeCompare(b.bookingId, undefined, { numeric: true }),
      );

      setBookings(bookingData);
      setDetail((current) =>
        current
          ? bookingData.find((booking) => booking.id === current.id) || null
          : null,
      );
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [recordRevision]);

  const filtered = bookings.filter((b) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (b.guest ?? "").toLowerCase().includes(searchText) ||
      (b.bookingId ?? "").toLowerCase().includes(searchText) ||
      (b.id ?? "").toLowerCase().includes(searchText) ||
      String(b.room ?? "")
        .toLowerCase()
        .includes(searchText) ||
      bookingSubject(b).name.toLowerCase().includes(searchText) ||
      bookingSubject(b).label.toLowerCase().includes(searchText);

    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const saveBooking = async (booking: Booking) => {
    try {
      if (!booking.id) throw new Error("Create new bookings using Walk-in.");
      const warning = await changeBooking(
        booking.id,
        booking.bookingStore,
        "edit",
        { uid: receptionistUid, name: receptionistName },
        booking,
      );
      if (warning) alert(warning);
      await createActivityLog({
        action: "Updated Booking",
        details: "Updated booking " + booking.bookingId,
        status: "success",
      });
      await loadBookings();
      setModal(null);
    } catch (error) {
      console.error("Error saving booking:", error);
      alert(error instanceof Error ? error.message : "Failed to save booking.");
    }
  };

  const acceptBooking = async (id: string) => {
    try {
      if (
        !receptionistUid ||
        !receptionistName ||
        receptionistName === "Receptionist"
      ) {
        alert(
          "Receptionist information is not available. Please log in again.",
        );
        return;
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) {
        alert("Booking not found.");
        return;
      }
      if (booking.status !== "pending") {
        alert(
          "Verify payment first. Only reviewed pending bookings can be accepted.",
        );
        return;
      }

      const warning = await changeBooking(
        id,
        booking.bookingStore,
        "confirmed",
        { uid: receptionistUid, name: receptionistName },
      );
      if (warning) alert(warning);

      const notificationSent = await notifyCustomer({
        customerId: booking.userId,
        eventId: `booking-confirmed-${booking.id}`,
        title: "Booking Confirmed",
        message: `Your booking ${booking.bookingId} has been confirmed. ${bookingSubject(booking).label}: ${bookingSubject(booking).name}. Date: ${booking.checkIn}.`,
        targetPath: "/booking-history",
      });

      if (!notificationSent) {
        console.warn(
          `Booking ${booking.bookingId} was confirmed, but its customer notification was not sent.`,
        );
      }

      await createActivityLog({
        action: "Accepted Booking",
        details: `Accepted booking ${booking.bookingId} for ${booking.guest}. ${bookingSubject(booking).label}: ${bookingSubject(booking).name}, Date: ${booking.checkIn}.`,
        status: "success",
      });

      await loadBookings();
    } catch (error) {
      console.error("Error accepting booking:", error);
      alert(
        error instanceof Error ? error.message : "Failed to accept booking.",
      );
    }
  };

  const checkInGuest = async (id: string) => {
    try {
      if (
        !receptionistUid ||
        !receptionistName ||
        receptionistName === "Receptionist"
      ) {
        alert(
          "Receptionist information is not available. Please log in again.",
        );
        return;
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) {
        alert("Booking not found.");
        return;
      }
      if (booking.status !== "confirmed") {
        alert("Only confirmed bookings can be checked in.");
        return;
      }

      const confirmCheckIn = window.confirm(
        `Check in ${booking.guest} for ${bookingSubject(booking).label} ${bookingSubject(booking).name}?`,
      );
      if (!confirmCheckIn) return;

      const warning = await changeBooking(
        id,
        booking.bookingStore,
        "checked-in",
        { uid: receptionistUid, name: receptionistName },
      );
      if (warning) alert(warning);

      const notificationSent = await notifyCustomer({
        customerId: booking.userId,
        eventId: `booking-checked-in-${booking.id}`,
        title: "Check-in Completed",
        message: `You have been checked in for booking ${booking.bookingId}. ${bookingSubject(booking).label}: ${bookingSubject(booking).name}. Enjoy your visit!`,
        targetPath: "/booking-history",
      });

      if (!notificationSent) {
        console.warn(
          `Booking ${booking.bookingId} was checked in, but its customer notification was not sent.`,
        );
      }

      await createActivityLog({
        action: "Guest Checked In",
        details: `Guest ${booking.guest} checked in for ${bookingSubject(booking).label} ${bookingSubject(booking).name}. Booking: ${booking.bookingId}. Check-in date: ${booking.checkIn}.`,
        status: "success",
      });

      await loadBookings();
      setDetail(null);
      alert(
        `Guest ${booking.guest} has been checked in for ${bookingSubject(booking).label} ${bookingSubject(booking).name}.`,
      );
    } catch (error) {
      console.error("Error checking in guest:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to check in guest. Please try again.",
      );
    }
  };

  const checkOut = async (id: string) => {
    try {
      if (
        !receptionistUid ||
        !receptionistName ||
        receptionistName === "Receptionist"
      ) {
        alert(
          "Receptionist information is not available. Please log in again.",
        );
        return;
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) {
        alert("Booking not found.");
        return;
      }
      if (booking.status !== "confirmed" && booking.status !== "checked-in") {
        alert("Only confirmed or checked-in bookings can be checked out.");
        return;
      }

      const confirmCheckout = window.confirm(
        `Check out ${booking.guest} from ${bookingSubject(booking).label} ${bookingSubject(booking).name}?`,
      );
      if (!confirmCheckout) return;

      const warning = await changeBooking(
        id,
        booking.bookingStore,
        "checked-out",
        { uid: receptionistUid, name: receptionistName },
      );
      if (warning) alert(warning);

      const notificationSent = await notifyCustomer({
        customerId: booking.userId,
        eventId: `booking-checked-out-${booking.id}`,
        title: "Check-out Completed",
        message: `Your check-out for booking ${booking.bookingId} is complete. Thank you for staying with us!`,
        targetPath: "/booking-history",
      });

      if (!notificationSent) {
        console.warn(
          `Booking ${booking.bookingId} was checked out, but its customer notification was not sent.`,
        );
      }

      await createActivityLog({
        action: "Guest Checked Out",
        details: `Guest ${booking.guest} checked out from ${bookingSubject(booking).label} ${bookingSubject(booking).name}. Booking: ${booking.bookingId}. Check-in: ${booking.checkIn}, Check-out: ${booking.checkOut}. Total: ₱${booking.amount.toLocaleString()}, Paid: ₱${booking.paid.toLocaleString()}, Balance: ₱${(
          booking.amount - booking.paid
        ).toLocaleString()}.`,
        status: "success",
      });

      await loadBookings();
      setDetail(null);
      alert(
        bookingSubject(booking).label === "Room"
          ? `Guest ${booking.guest} has been checked out. Room ${booking.room} is now under Cleaning.`
          : `Guest ${booking.guest} has completed ${bookingSubject(booking).label} ${bookingSubject(booking).name}.`,
      );
    } catch (error) {
      console.error("Error checking out guest:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to check out guest. Please try again.",
      );
    }
  };

  const cancel = async (id: string) => {
    try {
      if (
        !receptionistUid ||
        !receptionistName ||
        receptionistName === "Receptionist"
      ) {
        alert(
          "Receptionist information is not available. Please log in again.",
        );
        return;
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) {
        alert("Booking not found.");
        return;
      }
      if (booking.status === "checked-out" || booking.status === "cancelled") {
        alert("This booking can no longer be cancelled.");
        return;
      }

      const warning = await changeBooking(
        id,
        booking.bookingStore,
        "cancelled",
        { uid: receptionistUid, name: receptionistName },
      );
      if (warning) alert(warning);

      const notificationSent = await notifyCustomer({
        customerId: booking.userId,
        eventId: `booking-cancelled-${booking.id}`,
        title: "Booking Cancelled",
        message: `Your booking ${booking.bookingId} for ${booking.room} has been cancelled.`,
        targetPath: "/booking-history",
      });

      if (!notificationSent) {
        console.warn(
          `Booking ${booking.bookingId} was cancelled, but its customer notification was not sent.`,
        );
      }

      await createActivityLog({
        action: "Cancelled Booking",
        details: `Cancelled booking ${booking.bookingId} for ${booking.guest}. Room: ${booking.room}, Check-in: ${booking.checkIn}, Check-out: ${booking.checkOut}.`,
        status: "success",
      });

      await loadBookings();
      setDetail((currentDetail) =>
        currentDetail?.id === id ? null : currentDetail,
      );
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert(
        error instanceof Error ? error.message : "Failed to cancel booking.",
      );
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
              "pending-payment-verification",
              "confirmed",
              "checked-in",
              "checked-out",
              "cancelled",
            ] as const
          ).map((s) => (
            <AsyncButton
              key={s}
              type="button"
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
            </AsyncButton>
          ))}
        </div>
      </div>

      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f0f9f8" }}>
                {[
                  "Booking ID",
                  "Guest",
                  "Receptionist",
                  "Booking",
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((b, i) => {
                  const s = STATUS[b.status];
                  const balance = b.amount - b.paid;
                  const subject = bookingSubject(b);
                  const roomNumber = b.room.trim();
                  const hasRoomNumber =
                    /^(?:[A-Za-z]+-)?\d+(?:\s*,\s*(?:[A-Za-z]+-)?\d+)*$/.test(
                      roomNumber,
                    );

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
                        {b.bookingId}
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
                        <p
                          className="text-sm"
                          style={{
                            color:
                              b.status === "cancelled" ? "#d4183d" : "#0a2e2e",
                          }}
                        >
                          {b.status === "cancelled"
                            ? b.cancelledBy || "Unknown Receptionist"
                            : b.status === "checked-in"
                              ? b.checkedInBy ||
                                b.acceptedBy ||
                                "Unknown Receptionist"
                              : b.acceptedBy || "Not yet accepted"}
                        </p>
                        <p className="text-xs" style={{ color: "#4a7a7a" }}>
                          {b.status === "cancelled"
                            ? "Cancelled"
                            : b.status === "checked-in"
                              ? "Checked In"
                              : b.acceptedBy
                                ? "Accepted / Accommodated"
                                : "Pending acceptance"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-xs"
                          style={{
                            background:
                              subject.label === "Room" ? "#e2f3f2" : "#fff7ed",
                            color:
                              subject.label === "Room" ? "#0d7377" : "#c2410c",
                          }}
                        >
                          {subject.label}
                        </span>
                        <p
                          className="mt-1 text-sm"
                          style={{ color: "#0a2e2e" }}
                        >
                          {subject.name}
                        </p>
                        {subject.label === "Room" &&
                          hasRoomNumber &&
                          subject.name !== roomNumber && (
                            <p className="text-xs" style={{ color: "#4a7a7a" }}>
                              Room {roomNumber}
                            </p>
                          )}
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
                          {b.status === "pending" && (
                            <AsyncButton
                              type="button"
                              onClick={() => acceptBooking(b.id)}
                              className="p-1.5 rounded-lg"
                              style={{ color: "#0d7377" }}
                              title="Accept Booking"
                            >
                              <Check className="w-4 h-4" />
                            </AsyncButton>
                          )}

                          {b.status === "confirmed" && (
                            <AsyncButton
                              type="button"
                              onClick={() => checkInGuest(b.id)}
                              className="p-1.5 rounded-lg"
                              style={{ color: "#0d7377" }}
                              title={checkInDateError(b) || "Check In"}
                            >
                              <Check className="w-4 h-4" />
                            </AsyncButton>
                          )}

                          {b.status === "checked-in" && (
                            <AsyncButton
                              type="button"
                              onClick={() => checkOut(b.id)}
                              className="p-1.5 rounded-lg"
                              style={{ color: "#0d7377" }}
                              title="Check Out"
                            >
                              <Check className="w-4 h-4" />
                            </AsyncButton>
                          )}

                          <AsyncButton
                            type="button"
                            onClick={() => setDetail(b)}
                            className="p-1.5 rounded-lg"
                            style={{ color: "#0d7377" }}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </AsyncButton>

                          <AsyncButton
                            type="button"
                            onClick={() => setModal(b)}
                            className="p-1.5 rounded-lg"
                            style={{ color: "#06b6d4" }}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </AsyncButton>

                          {b.status !== "cancelled" &&
                            b.status !== "checked-out" && (
                              <AsyncButton
                                type="button"
                                onClick={() => cancel(b.id)}
                                className="p-1.5 rounded-lg"
                                style={{ color: "#d4183d" }}
                                title="Cancel Booking"
                              >
                                <X className="w-4 h-4" />
                              </AsyncButton>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  {detail.bookingId}
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
                {(cancellationAudit.id === detail.id
                  ? cancellationAudit.reason
                  : detail.cancellationReason) && (
                  <p className="text-sm mt-2">
                    Cancellation reason:{" "}
                    {cancellationAudit.id === detail.id
                      ? cancellationAudit.reason
                      : detail.cancellationReason}
                  </p>
                )}
                {cancellationAudit.id === detail.id &&
                  cancellationAudit.loading && (
                    <p role="status" className="text-sm mt-2">
                      Loading cancellation remarks...
                    </p>
                  )}
                {cancellationAudit.id === detail.id &&
                  cancellationAudit.error && (
                    <p role="alert" className="text-sm mt-2 text-red-700">
                      {cancellationAudit.error}
                    </p>
                  )}
                {detail.modificationRequest && (
                  <p className="text-sm mt-2">
                    Requested date change: {detail.modificationRequest.checkIn}{" "}
                    to {detail.modificationRequest.checkOut}. Review
                    availability and use Edit to approve.
                  </p>
                )}
              </div>
              <AsyncButton
                type="button"
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-lg"
                style={{ color: "#4a7a7a" }}
              >
                <X className="w-5 h-5" />
              </AsyncButton>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: "Booking ID", value: detail.bookingId },
                { label: "Guest", value: detail.guest },
                { label: "Contact", value: detail.phone },
                { label: "Email", value: detail.email },
                {
                  label:
                    detail.status === "cancelled"
                      ? "Cancelled By"
                      : detail.status === "checked-in"
                        ? "Checked In By"
                        : "Accepted / Accommodated By",
                  value:
                    detail.status === "cancelled"
                      ? detail.cancelledBy || "Unknown Receptionist"
                      : detail.status === "checked-in"
                        ? detail.checkedInBy ||
                          detail.acceptedBy ||
                          "Unknown Receptionist"
                        : detail.acceptedBy || "Not yet accepted",
                },
                {
                  label: bookingSubject(detail).label,
                  value:
                    bookingSubject(detail).label === "Room"
                      ? `${bookingSubject(detail).name}${detail.room && detail.room !== "0" && detail.room !== bookingSubject(detail).name ? ` (Room ${detail.room})` : ""}`
                      : bookingSubject(detail).name,
                },
                {
                  label:
                    bookingSubject(detail).label === "Room"
                      ? "Check-in"
                      : "Date",
                  value:
                    bookingSubject(detail).label === "Room"
                      ? detail.checkIn
                      : detail.bookingDate || detail.checkIn,
                },
                ...(bookingSubject(detail).label === "Room"
                  ? [
                      { label: "Check-out", value: detail.checkOut },
                      { label: "Nights", value: `${detail.nights}` },
                    ]
                  : bookingSubject(detail).label === "Package"
                    ? []
                    : [
                        {
                          label: "Session",
                          value: detail.bookingTime
                            ? activityTimeLabel(detail.bookingTime)
                            : "Not scheduled",
                        },
                      ]),
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
                    f.label === "Notes" ||
                    ["Room", "Service", "Package"].includes(f.label)
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

            <div className="px-6 pb-6 space-y-3">
              {detail.status === "confirmed" && (
                <AsyncButton
                  type="button"
                  title={checkInDateError(detail) || "Check In"}
                  onClick={() => checkInGuest(detail.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white"
                  style={{ background: "#0d7377" }}
                >
                  <Check className="w-4 h-4" />
                  Check In Guest
                </AsyncButton>
              )}

              {(detail.status === "confirmed" ||
                detail.status === "checked-in") && (
                <AsyncButton
                  type="button"
                  onClick={() => checkOut(detail.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white"
                  style={{ background: "#0d7377" }}
                >
                  <Check className="w-4 h-4" />
                  Check Out Guest
                </AsyncButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
