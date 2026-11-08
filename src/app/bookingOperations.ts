import {
  holdActivityPlaces,
  finishActivityHold,
  reconcileActivityHold,
  releaseClosedActivityPlaces,
} from "./activityInventory";
import {
  activityBookingKey,
  activityKind,
  activityOccupies,
  activitySelections,
  bookingActivityReservations,
} from "./activityAvailability";
import { requireAccess } from "./auth";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db, customerDb } from "./firebase";
import { getBookingRef, getBookingSnapshot } from "./bookingStore";
import {
  allocateRooms,
  activeBooking,
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

export function checkInDateError(
  record: BookingRecord,
  today = localDate(),
): string {
  if (activityBooking(record)) return "";
  return dateOnly(record.checkIn) > today || dateOnly(record.checkOut) <= today
    ? "Check-in must be within the reserved stay dates. Edit the dates first."
    : "";
}

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
    const dateError = checkInDateError(record, today);
    if (dateError) throw new Error(dateError);
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
  if (
    action === "cancelled" &&
    !["pending", "pending-payment-verification", "confirmed"].includes(status)
  )
    throw new Error("Only pending or confirmed bookings can be cancelled.");
}

export function assertVerifiedDownPayment(
  record: BookingRecord,
  percentage: unknown,
) {
  const percent = Number(percentage);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
    throw new Error(
      "The resort down payment policy is unavailable. Ask the administrator to check payment settings.",
    );
  const total = bookingTotal(record),
    required = Math.min(total, Math.ceil((total * percent) / 100));
  if (
    required <= 0 ||
    moneyCents(bookingPaid(record)) < moneyCents(required) ||
    !["partial", "paid"].includes(normalizeBookingValue(record.paymentStatus))
  )
    throw new Error(
      "Verify the required down payment in Payments before accepting this reservation.",
    );
  return required;
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
  await requireAccess("receptionist");
  if (!auth.currentUser || auth.currentUser.uid !== actor.uid)
    throw new Error("Please sign in again.");
  const reference = await getBookingRef(id, storeName);
  const store = reference.firestore;
  const initialSnapshot = await getDoc(reference);
  if (!initialSnapshot.exists()) throw new Error("Booking not found.");
  const initial = initialSnapshot.data();
  const bookingStore = store === customerDb ? "customer" : "staff";
  const proposal =
    action === "edit"
      ? {
          ...initial,
          checkIn: edit?.checkIn,
          checkOut: edit?.checkOut,
          guests: edit?.pax,
          ...(activityBooking(initial)
            ? {
                bookingDate: edit?.bookingDate || edit?.checkIn,
                bookingTime:
                  activityKind(initial) === "package"
                    ? ""
                    : edit?.bookingTime || initial.bookingTime,
                participants: edit?.pax,
                ...(edit?.quantity !== undefined
                  ? { quantity: edit.quantity }
                  : {}),
              }
            : {}),
          addOns: edit?.addOns || initial.addOns || [],
        }
      : initial;
  let preparedActivities: ReturnType<typeof bookingActivityReservations> = [];
  if (action === "edit" && activitySelections(proposal).length) {
    const [services, packages] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "packages")),
    ]);
    preparedActivities = bookingActivityReservations(proposal, [
      ...services.docs.map((document) => ({
        ...document.data(),
        id: document.id,
        itemType: "service",
      })),
      ...packages.docs.map((document) => ({
        ...document.data(),
        id: document.id,
        itemType: "package",
      })),
    ]);
  }
  const hold =
    action === "confirmed" || (action === "edit" && activityOccupies(initial))
      ? await holdActivityPlaces(
          { ...proposal, id, _bookingStore: bookingStore },
          action === "edit" &&
            (activitySelections(initial).some(
              (selection) => selection.itemType !== "package",
            ) ||
              (!activitySelections(initial).length &&
                initial.activityReservations?.length > 0)),
        )
      : null;
  let outcome;
  try {
    outcome = await runTransaction(store, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("Booking not found.");
      const original = snapshot.data();
      if (
        (hold || action === "edit") &&
        JSON.stringify(activitySelections(original)) !==
          JSON.stringify(activitySelections(initial))
      )
        throw new Error(
          "Activity details changed while you were editing. Refresh the booking and try again.",
        );
      if (action !== "edit") validateTransition(original, action);
      let allocationLock: { ref: any; revision: number } | undefined;
      if (
        !activityBooking(original) &&
        (["confirmed", "checked-in"].includes(action) || action === "edit")
      ) {
        const typeId = String(
          original.roomTypeId ||
            original.roomId ||
            original.roomName ||
            "unknown",
        );
        const lockRef = doc(store, "BookingLocks", typeId);
        const lock = await transaction.get(lockRef);
        allocationLock = {
          ref: lockRef,
          revision: Number(lock.data()?.revision || 0) + 1,
        };
      }
      if (
        action === "confirmed" &&
        (store === customerDb || original.requestVersion === 2)
      ) {
        const settings = await getDoc(doc(db, "paymentSettings", "gcash"));
        assertVerifiedDownPayment(
          original,
          settings.data()?.downPaymentPercent,
        );
      }
      let customerLock: { ref: any; revision: number } | undefined;
      if (
        store === customerDb &&
        original.userId &&
        ["confirmed", "edit"].includes(action)
      ) {
        const ref = doc(
          customerDb,
          "Users",
          original.userId,
          "bookingState",
          "requests",
        );
        const lock = await transaction.get(ref);
        customerLock = {
          ref,
          revision: Number(lock.data()?.revision || 0) + 1,
        };
      }
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
      const reservations: BookingRecord[] = all.docs
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
      if (action === "confirmed" && original.requestVersion === 2) {
        const [services, packages, fee] = await Promise.all([
          getDocs(collection(db, "services")),
          getDocs(collection(db, "packages")),
          getDoc(doc(db, "settings", "reservationFee")),
        ]);
        const priceOf = (item: BookingRecord, kind = "service") => {
          const raw =
            kind === "room"
              ? (item.basePrice ?? item.price ?? item.rate)
              : kind === "package"
                ? (item.packagePrice ??
                  item.price ??
                  item.basePrice ??
                  item.totalPrice)
                : (item.price ?? item.basePrice ?? item.amount ?? item.rate);
          return Number(String(raw).replace(/[₱,\s]/g, ""));
        };
        let expected = 0;
        if (activityBooking(original)) {
          const catalog =
            original.itemType === "package" ||
            original.bookingType === "package"
              ? packages
              : services;
          const item = catalog.docs.find(
            (item) =>
              item.id ===
              (original.itemId || original.serviceId || original.packageId),
          );
          if (!item)
            throw new Error(
              "The booked activity no longer exists. Review this request before accepting.",
            );
          expected =
            priceOf(item.data(), original.itemType || original.bookingType) *
            Number(original.participants || original.guests);
        } else {
          const type = types.find((type) =>
            matchesRoomType(original, type, inventory),
          );
          if (!type)
            throw new Error(
              "The room type no longer exists. Review this request before accepting.",
            );
          expected =
            priceOf(type, "room") *
            stayDates(dateOnly(original.checkIn), dateOnly(original.checkOut))
              .length;
          for (const addon of original.addOns || []) {
            const catalog = addon.type === "package" ? packages : services;
            const item = catalog.docs.find((item) => item.id === addon.id);
            if (!item)
              throw new Error(
                "A selected add-on no longer exists. Review this request before accepting.",
              );
            expected +=
              priceOf(item.data(), addon.type) *
              Number(addon.participants || 1);
          }
          const percentage = Number(
            fee.data()?.percent ??
              fee.data()?.percentage ??
              fee.data()?.reservationFeePercent ??
              5,
          );
          if (
            !Number.isFinite(percentage) ||
            percentage < 0 ||
            percentage > 100
          )
            throw new Error(
              "Check the reservation fee settings before accepting this request.",
            );
          expected += Math.round((expected * percentage) / 100);
        }
        if (moneyCents(expected) !== moneyCents(bookingTotal(original)))
          throw new Error(
            "The quoted total differs from the resort catalog. Review the prices and payment before accepting this request.",
          );
      }
      let roomIds = assignedRoomIds(original, inventory);
      const oldRoomIds = [...roomIds];
      let patch: BookingRecord = {
        updatedAt: serverTimestamp(),
        ...(hold ? { activityReservations: hold.requests } : {}),
      };
      let proposed = { ...original };
      if (action === "edit") {
        if (!edit?.guest?.trim()) throw new Error("Enter the guest's name.");
        if (edit.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email))
          throw new Error("Enter a valid email.");
        const nights = activityBooking(original)
          ? 0
          : stayDates(edit.checkIn, edit.checkOut).length;
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
          throw new Error(
            "Closed booking dates and charges cannot be changed.",
          );
        patch = {
          ...patch,
          customerName: edit.guest.trim(),
          guestName: edit.guest.trim(),
          customerEmail: edit.email || "",
          email: edit.email || "",
          customerPhone: edit.phone || "",
          phone: edit.phone || "",
          notes: edit.notes || "",
          ...(activityBooking(original)
            ? {
                bookingDate: edit.bookingDate || edit.checkIn,
                bookingTime:
                  activityKind(original) === "package"
                    ? ""
                    : edit.bookingTime || original.bookingTime,
                participants: edit.pax,
                ...(edit.quantity !== undefined
                  ? { quantity: edit.quantity }
                  : {}),
              }
            : {}),
          addOns: proposal.addOns || [],
          ...(activitySelections(proposal).length
            ? { activityReservations: hold?.requests || preparedActivities }
            : {}),
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
        if (
          original.modificationRequest &&
          edit.checkIn === original.modificationRequest.checkIn &&
          edit.checkOut === original.modificationRequest.checkOut
        ) {
          patch.modificationRequest = deleteField();
          patch.modificationReviewedAt = serverTimestamp();
          patch.modificationReviewedByUid = actor.uid;
        }
      }
      if (original.userId && ["confirmed", "edit"].includes(action)) {
        const start = Date.parse(dateOnly(proposed.checkIn) + "T00:00:00Z");
        const end = Math.max(
          start + 86400000,
          Date.parse(dateOnly(proposed.checkOut) + "T00:00:00Z"),
        );
        if (
          reservations.some((record) => {
            if (record.userId !== original.userId || !activeBooking(record))
              return false;
            const first = Date.parse(
              dateOnly(record.checkIn || record.bookingDate) + "T00:00:00Z",
            );
            const last = Math.max(
              first + 86400000,
              Date.parse(
                dateOnly(record.checkOut || record.bookingDate) + "T00:00:00Z",
              ),
            );
            return first < end && last > start;
          })
        )
          throw new Error(
            "This customer already has an overlapping reservation or pending request. Review the duplicate before accepting or changing dates.",
          );
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
        // Both online and staff reservations serialize confirmations within their own project.
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
                requestedNumbers.includes(b.roomNumber) ||
                  roomIds.includes(b.id),
              ) -
              Number(
                requestedNumbers.includes(a.roomNumber) ||
                  roomIds.includes(a.id),
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
        patch.roomNumber =
          allocated.length === 1 ? allocated[0].roomNumber : "";
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
      if (customerLock)
        transaction.set(customerLock.ref, {
          revision: customerLock.revision,
          bookingId: id,
          updatedAt: serverTimestamp(),
        });
      transaction.update(reference, patch);
      return { roomIds, roomStatus, mirror: store !== db };
    });
  } catch (error) {
    try {
      await reconcileActivityHold(hold, reference);
    } catch (reconcileError) {
      console.error(
        "Activity allocation needs reconciliation:",
        reconcileError,
      );
    }
    throw error;
  }
  try {
    await finishActivityHold(hold, true);
  } catch (error) {
    console.error("Activity allocation remains safely held:", error);
  }
  if (
    action === "cancelled" ||
    (action === "checked-out" && activityBooking(initial))
  ) {
    try {
      await releaseClosedActivityPlaces(
        activityBookingKey({ id, _bookingStore: bookingStore }),
      );
    } catch (error) {
      console.error(
        "Closed activity allocation will be cleaned on the next confirmation:",
        error,
      );
    }
  }
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
        ...(record.status === "pending-payment-verification"
          ? { status: "pending" }
          : {}),
        updatedAt: serverTimestamp(),
      });
    if (!accept)
      transaction.update(bookingRef, {
        paymentStatus: "rejected",
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
