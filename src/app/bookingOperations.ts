import { requireAccess } from "./auth";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db, customerDb } from "./firebase";
import { getBookingRef, getBookingSnapshot } from "./bookingStore";
import {
  allocateRooms,
  assignedRoomIds,
  dateOnly,
  localDate,
  matchesRoomType,
  moneyCents,
  normalizeBookingValue,
  normalizeInventory,
  roomQuantity,
  stayDates,
  type BookingRecord,
  bookingPaid,
  bookingTotal,
  paymentUpdate,
  pendingPayment,
} from "./bookingAvailability";
const activityBooking = (record: BookingRecord) =>
  ["service", "package", "activity"].includes(
    String(record.bookingType || record.itemType || "").toLowerCase(),
  );

export function validateTransition(
  record: BookingRecord,
  action: string,
  today = localDate(),
) {
  const status = normalizeBookingValue(record.status);
  if (action === "confirmed" && status !== "pending")
    throw new Error("Only pending bookings can be accepted.");
  if (action === "checked-in") {
    if (status !== "confirmed")
      throw new Error("Only confirmed bookings can be checked in.");
    if (
      activityBooking(record)
        ? dateOnly(record.bookingDate || record.checkIn) !== today
        : dateOnly(record.checkIn) > today || dateOnly(record.checkOut) <= today
    )
      throw new Error(
        "Check-in must be within the reserved stay dates. Edit the dates first.",
      );
  }
  if (action === "checked-out") {
    if (
      status !== "checked-in" &&
      !(activityBooking(record) && status === "confirmed")
    )
      throw new Error("Check in this booking before checking it out.");
    if (moneyCents(bookingPaid(record)) < moneyCents(bookingTotal(record)))
      throw new Error(
        "Collect the remaining balance in Payments before check-out.",
      );
  }
  if (action === "cancelled" && !["pending", "confirmed"].includes(status))
    throw new Error("Only pending or confirmed bookings can be cancelled.");
}

// Firestore transactions are atomic within one project. Online booking room
// status is a secondary mirror in the staff project, never the booking authority.
export async function changeBooking(
  id: string,
  storeName: string | undefined,
  action: string,
  actor: { uid: string; name: string },
  edit?: BookingRecord,
) {
  if (!auth.currentUser || auth.currentUser.uid !== actor.uid)
    throw new Error("Please sign in again.");
  const reference = await getBookingRef(id, storeName);
  const store = reference.firestore;
  const outcome = await runTransaction(store, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("Booking not found.");
    const original = snapshot.data();
    if (action !== "edit") validateTransition(original, action);
    const [roomDocs, typeDocs, all] = await Promise.all([
      getDocs(collection(db, "rooms")),
      getDocs(collection(db, "roomTypes")),
      getBookingSnapshot(),
    ]);
    const own = all.docs.filter(
      (document) =>
        document.ref.firestore === store &&
        document.ref.path !== reference.path,
    );
    const tracked = await Promise.all(
      own.map((document) => transaction.get(document.ref)),
    );
    const reservations = all.docs
      .filter((document) => document.ref.firestore !== store)
      .map((document) => ({ ...document.data(), id: document.id }));
    reservations.push(
      ...tracked
        .filter((document) => document.exists())
        .map((document) => ({
          ...(document.data() as BookingRecord),
          id: document.id,
        })),
    );
    const types = typeDocs.docs.map((document) => ({
      ...document.data(),
      id: document.id,
    }));
    const inventory = normalizeInventory(
      roomDocs.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })),
      types,
    );
    let roomIds = assignedRoomIds(original, inventory);
    const oldRoomIds = [...roomIds];
    let allocationLock: { ref: any; revision: number } | undefined;
    let patch: BookingRecord = { updatedAt: serverTimestamp() };
    let proposed = { ...original };
    if (action === "edit") {
      if (!edit?.guest?.trim()) throw new Error("Enter the guest's name.");
      if (edit.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email))
        throw new Error("Enter a valid email.");
      const nights = stayDates(edit.checkIn, edit.checkOut).length;
      if (!Number.isInteger(edit.pax) || edit.pax < 1)
        throw new Error("Enter a valid guest count.");
      const total = moneyCents(edit.amount),
        paid = moneyCents(bookingPaid(original));
      if (total < paid)
        throw new Error(
          "The total cannot be less than payments already received.",
        );
      if (
        ["checked-out", "cancelled", "completed"].includes(
          normalizeBookingValue(original.status),
        ) &&
        (edit.checkIn !== dateOnly(original.checkIn) ||
          edit.checkOut !== dateOnly(original.checkOut) ||
          total !== moneyCents(bookingTotal(original)))
      )
        throw new Error("Closed booking dates and charges cannot be changed.");
      patch = {
        ...patch,
        customerName: edit.guest.trim(),
        guestName: edit.guest.trim(),
        customerEmail: edit.email || "",
        email: edit.email || "",
        customerPhone: edit.phone || "",
        phone: edit.phone || "",
        notes: edit.notes || "",
        checkIn: edit.checkIn,
        checkOut: edit.checkOut,
        nights,
        guests: edit.pax,
        pax: edit.pax,
        totalPrice: total / 100,
        totalAmount: total / 100,
        total: total / 100,
        remainingBalance: (total - paid) / 100,
        balance: (total - paid) / 100,
        paymentStatus:
          total === paid ? "paid" : paid > 0 ? "partial" : "unpaid",
      };
      proposed = { ...original, ...patch };
    }
    if (
      !activityBooking(original) &&
      (["confirmed", "checked-in"].includes(action) ||
        (action === "edit" &&
          ["pending", "confirmed", "checked-in"].includes(
            normalizeBookingValue(original.status),
          )))
    ) {
      const type = types.find((type) =>
        matchesRoomType(original, type, inventory),
      );
      if (!type)
        throw new Error(
          "Booking room type is missing. Correct the room type before continuing.",
        );
      if (store === db) {
        const lockRef = doc(db, "BookingLocks", type.id);
        const lock = await transaction.get(lockRef);
        allocationLock = {
          ref: lockRef,
          revision: Number(lock.data()?.revision || 0) + 1,
        };
      }
      const requestedNumbers =
        action === "edit"
          ? String(edit?.room || "")
              .split(",")
              .map((value) => value.trim())
          : [];
      // Own occupied flags must not be counted as another guest during an edit.
      const pool = inventory
        .map((room) =>
          roomIds.includes(room.id) && room.status === "occupied"
            ? { ...room, status: "available" }
            : room,
        )
        .sort(
          (a, b) =>
            Number(
              requestedNumbers.includes(b.roomNumber) || roomIds.includes(b.id),
            ) -
            Number(
              requestedNumbers.includes(a.roomNumber) || roomIds.includes(a.id),
            ),
        );
      const allocated = allocateRooms(
        pool,
        reservations,
        type,
        dateOnly(proposed.checkIn),
        dateOnly(proposed.checkOut),
        roomQuantity(proposed),
        Number(proposed.guests ?? proposed.pax ?? 1),
      );
      const requested =
        action === "edit"
          ? String(edit?.room || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : [];
      const oldLabel = (original.assignedRoomNumbers || []).join(", ");
      // Keep the editor's physical-room change meaningful, never overwrite the type name.
      if (
        requested.length &&
        String(edit?.room) !== oldLabel &&
        String(edit?.room) !== String(original.roomName)
      ) {
        const selected = requested.map((number) =>
          allocated.find((room) => String(room.roomNumber) === number),
        );
        if (
          selected.some((room) => !room) ||
          selected.length !== roomQuantity(proposed)
        )
          throw new Error(
            "Requested rooms are not available. Use the suggested available assignment or keep the current room label.",
          );
      }
      roomIds = allocated.map((room) => room.id);
      patch.assignedRoomIds = roomIds;
      patch.assignedRoomNumbers = allocated.map((room) => room.roomNumber);
      patch.roomNumber = allocated.length === 1 ? allocated[0].roomNumber : "";
    }
    if (action !== "edit") {
      const prefix = (
        {
          confirmed: "accepted",
          "checked-in": "checkedIn",
          "checked-out": "checkedOut",
          cancelled: "cancelled",
        } as Record<string, string>
      )[action];
      patch = {
        ...patch,
        status: action,
        [`${prefix}By`]: actor.name,
        [`${prefix}ByUid`]: actor.uid,
        [`${prefix}At`]: serverTimestamp(),
      };
    }
    const roomStatus =
      action === "checked-out"
        ? "Cleaning"
        : action === "checked-in"
          ? "Occupied"
          : "";
    if (roomStatus && store === db) {
      for (const roomId of roomIds)
        transaction.update(doc(db, "rooms", roomId), {
          status: roomStatus,
          updatedAt: serverTimestamp(),
        });
    }
    if (allocationLock)
      transaction.set(allocationLock.ref, {
        revision: allocationLock.revision,
        updatedAt: serverTimestamp(),
      });
    if (
      action === "edit" &&
      normalizeBookingValue(original.status) === "checked-in" &&
      oldRoomIds.some((id) => !roomIds.includes(id))
    )
      throw new Error(
        "Checked-in guests must keep their assigned rooms. Contact the manager for relocation.",
      );
    transaction.update(reference, patch);
    return { roomIds, roomStatus, mirror: store !== db };
  });
  if (outcome.mirror && outcome.roomStatus) {
    try {
      const batch = writeBatch(db);
      outcome.roomIds.forEach((roomId) =>
        batch.update(doc(db, "rooms", roomId), {
          status: outcome.roomStatus,
          updatedAt: serverTimestamp(),
        }),
      );
      await batch.commit();
    } catch {
      return (
        "Booking saved, but room status synchronization failed. Update these rooms in Room Management: " +
        outcome.roomIds.join(", ")
      );
    }
  }
  return "";
}

export async function reviewPayment(
  storeName: string | undefined,
  paymentId: string,
  bookingId: string,
  accept: boolean,
) {
  await requireAccess("receptionist");
  if (!auth.currentUser) throw new Error("Please sign in again.");
  const store = storeName === "staff" ? db : customerDb;
  const paymentRef = doc(store, "Payments", paymentId);
  const bookingRef = doc(
    store,
    storeName === "staff" ? "reservations" : "Bookings",
    bookingId,
  );
  return runTransaction(store, async (transaction) => {
    const payment = await transaction.get(paymentRef);
    const booking = await transaction.get(bookingRef);
    if (!payment.exists() || !booking.exists())
      throw new Error("Payment or booking not found.");
    const receipt = payment.data(),
      record = booking.data();
    if (receipt.bookingId !== bookingId)
      throw new Error("Payment belongs to a different booking.");
    if (!pendingPayment(receipt))
      throw new Error(
        "This payment has already been reviewed. Refresh the list.",
      );
    const result = accept ? paymentUpdate(record, receipt.amount) : null;
    transaction.update(paymentRef, {
      status: accept ? "completed" : "rejected",
      verificationStatus: accept ? "verified" : "rejected",
      reviewedByUid: auth.currentUser!.uid,
      [accept ? "verifiedAt" : "rejectedAt"]: serverTimestamp(),
    });
    if (result)
      transaction.update(bookingRef, {
        ...result,
        updatedAt: serverTimestamp(),
      });
    return {
      ...record,
      userId: String(record.userId ?? receipt.userId ?? ""),
      guest: String(record.customerName ?? receipt.guest ?? ""),
      room: String(record.roomName ?? receipt.room ?? ""),
      amount: Number(receipt.amount),
      remainingBalance: result?.remainingBalance ?? record.remainingBalance,
    };
  });
}
