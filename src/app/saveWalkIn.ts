import { requireAccess } from "./auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, customerDb } from "./firebase";
import {
  allocateRooms,
  localDate,
  mergeReservations,
  moneyCents,
  normalizeInventory,
  stayDates,
  type BookingRecord,
} from "./bookingAvailability";

export type WalkInInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  selectedRoomType: string;
  roomQuantity: number;
  selectedAddOns: string[];
  commissionerName: string;
  commissionAmount: string;
  paymentMethod: string;
  downPayment: string;
  specialRequests: string;
};
export function walkInTotals(
  rate: number,
  quantity: number,
  nights: number,
  addOns: BookingRecord[],
  feePercent: number,
) {
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100)
    throw new Error("The reservation fee setting is invalid.");
  const roomCents = moneyCents(rate) * quantity * nights;
  const addOnCents = addOns.reduce(
    (sum, item) => sum + moneyCents(item.price),
    0,
  );
  const subtotal = (roomCents + addOnCents) / 100;
  // Match the customer module's configured fee and whole-peso rounding.
  const reservationFee = Math.round((subtotal * feePercent) / 100);
  return {
    roomTotal: roomCents / 100,
    addOnTotal: addOnCents / 100,
    subtotal,
    reservationFeePercent: feePercent,
    reservationFee,
    total: (roomCents + addOnCents + moneyCents(reservationFee)) / 100,
  };
}
export function buildWalkInBooking(
  input: WalkInInput,
  type: BookingRecord,
  assigned: BookingRecord[],
  addOns: BookingRecord[],
  feePercent: number,
  bookingId: string,
  staff: BookingRecord,
  today = localDate(),
) {
  const nights = stayDates(input.checkIn, input.checkOut).length;
  if (input.checkIn < today) throw new Error("Check-in cannot be in the past.");
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`;
  if (!input.firstName.trim() || !input.lastName.trim() || !input.phone.trim())
    throw new Error("Enter the guest's full name and phone number.");
  if (
    input.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  )
    throw new Error("Enter a valid email address.");
  if (
    !Number.isInteger(input.pax) ||
    input.pax < 1 ||
    !Number.isInteger(input.roomQuantity) ||
    input.roomQuantity < 1 ||
    assigned.length !== input.roomQuantity
  )
    throw new Error("Select valid room and guest counts.");
  if (
    assigned.reduce((sum, room) => sum + Number(room.capacity || 0), 0) <
    input.pax
  )
    throw new Error("The selected rooms cannot accommodate this many guests.");
  const totals = walkInTotals(
    Number(
      type.basePrice ?? type.rate ?? type.price ?? type.pricePerNight ?? 0,
    ),
    input.roomQuantity,
    nights,
    addOns,
    feePercent,
  );
  const paidCents = moneyCents(input.downPayment || 0),
    totalCents = moneyCents(totals.total);
  const commissionCents = moneyCents(input.commissionAmount || 0);
  if (paidCents > totalCents)
    throw new Error("The amount received cannot exceed the booking total.");
  if (commissionCents > totalCents)
    throw new Error("The commission cannot exceed the booking total.");
  if (commissionCents > 0 && !input.commissionerName.trim())
    throw new Error("Enter the commissioner's name for this commission.");
  if (!["cash", "card", "gcash"].includes(input.paymentMethod))
    throw new Error("Select a valid payment method.");
  const checkedIn = input.checkIn === today;
  const numbers = assigned.map((room) => String(room.roomNumber));
  return {
    bookingRef: `CBR-${bookingId}`,
    bookingId: `BK-${bookingId}`,
    customerName: name,
    guestName: name,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    customerEmail: input.email.trim(),
    email: input.email.trim(),
    customerPhone: input.phone.trim(),
    phone: input.phone.trim(),
    // The online app's roomId/roomName identify the TYPE, not a physical room.
    roomId: type.id,
    roomTypeId: type.id,
    roomName: String(type.name),
    roomType: String(type.name),
    roomTypeName: String(type.name),
    roomCount: input.roomQuantity,
    roomsBooked: input.roomQuantity,
    roomQuantity: input.roomQuantity,
    numberOfRooms: input.roomQuantity,
    assignedRoomIds: assigned.map((room) => room.id),
    assignedRoomNumbers: numbers,
    roomNumber: numbers.length === 1 ? numbers[0] : "",
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.pax,
    nights,
    roomRate: Number(
      type.basePrice ?? type.rate ?? type.price ?? type.pricePerNight ?? 0,
    ),
    addOns: addOns.map((item) => ({
      id: item.sourceId,
      type: item.category === "Package" ? "package" : "service",
      name: item.name,
      price: item.price,
      services: item.services || [],
    })),
    ...totals,
    totalPrice: totals.total,
    totalAmount: totals.total,
    amountPaid: paidCents / 100,
    balance: (totalCents - paidCents) / 100,
    remainingBalance: (totalCents - paidCents) / 100,
    paymentMethod: input.paymentMethod,
    paymentStatus:
      paidCents === totalCents ? "paid" : paidCents > 0 ? "partial" : "unpaid",
    commissionerName: input.commissionerName.trim(),
    commissionAmount: commissionCents / 100,
    bookingType: "Walk-in",
    bookingSource: "walk-in",
    status: checkedIn ? "checked-in" : "confirmed",
    specialRequests: input.specialRequests.trim(),
    notes: input.specialRequests.trim(),
    createdByUid: staff.uid || "",
    createdBy: staff.name || "Receptionist",
    acceptedByUid: staff.uid || "",
    acceptedBy: staff.name || "Receptionist",
    ...(checkedIn
      ? {
          checkedInByUid: staff.uid || "",
          checkedInBy: staff.name || "Receptionist",
        }
      : {}),
  };
}

export async function saveWalkIn(
  input: WalkInInput,
  expectedTotal: number,
  bookingId: string,
) {
  await requireAccess("receptionist");
  const user = auth.currentUser;
  if (!user)
    throw new Error("Please log in again before registering a walk-in.");
  const profile = await getDoc(doc(db, "Users", user.uid));
  const staff = {
    uid: user.uid,
    name: profile.data()?.name || user.displayName || "Receptionist",
  };
  const bookingRef = doc(db, "reservations", bookingId);
  const paymentRef = doc(db, "Payments", `walkin-${bookingId}`);
  const lockRef = doc(db, "BookingLocks", input.selectedRoomType);
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(bookingRef);
    if (existing.exists())
      return {
        reference: String(existing.data().bookingRef),
        roomNumbers: existing.data().assignedRoomNumbers || [],
      };
    const lock = await transaction.get(lockRef);
    // Queries are repeated on each retry of the shared Walk-in lock. Staff
    // reservation documents are also transaction reads, so edits force a retry.
    // The separate customer app does not yet participate in this lock protocol.
    const [rooms, types, bookings, legacy, services, packages, fee] =
      await Promise.all([
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "roomTypes")),
        getDocs(collection(customerDb, "Bookings")),
        getDocs(collection(db, "reservations")),
        getDocs(collection(db, "services")),
        getDocs(collection(db, "packages")),
        getDoc(doc(db, "settings", "reservationFee")),
      ]);
    const currentStaffReservations = await Promise.all(
      legacy.docs.map((document) => transaction.get(document.ref)),
    );
    const customerRecords = bookings.docs.map((document) => ({
      ...document.data(),
      id: document.id,
    }));
    const staffRecords = currentStaffReservations
      .filter((document) => document.exists())
      .map((document) => ({ ...document.data(), id: document.id }));
    const type = types.docs.find(
      (document) => document.id === input.selectedRoomType,
    );
    if (!type)
      throw new Error("This room type no longer exists. Refresh the form.");
    const selectedType = { ...type.data(), id: type.id };
    const inventory = normalizeInventory(
      rooms.docs.map((document) => ({ ...document.data(), id: document.id })),
      types.docs.map((document) => ({ ...document.data(), id: document.id })),
    );
    const reservations = mergeReservations(customerRecords, staffRecords);
    const assigned = allocateRooms(
      inventory,
      reservations,
      selectedType,
      input.checkIn,
      input.checkOut,
      input.roomQuantity,
      input.pax,
    );
    const options: BookingRecord[] = [
      ...services.docs.map((document) => ({
        ...document.data(),
        sourceId: document.id,
        id: `service-${document.id}`,
        category: "Service",
      })),
      ...packages.docs.map((document) => ({
        ...document.data(),
        sourceId: document.id,
        id: `package-${document.id}`,
        category: "Package",
      })),
    ];
    const addOns = input.selectedAddOns.map((id) => {
      const item = options.find((option) => option.id === id);
      if (!item)
        throw new Error(
          "A selected add-on no longer exists. Refresh the form.",
        );
      return {
        ...item,
        name: String(item.name || item.title || item.category),
        price: Number(
          item.category === "Package"
            ? (item.packagePrice ?? item.price ?? item.rate ?? 0)
            : (item.price ?? item.rate ?? item.amount ?? 0),
        ),
      };
    });
    const booking = buildWalkInBooking(
      input,
      selectedType,
      assigned,
      addOns,
      Number(fee.data()?.percent ?? 5),
      bookingId,
      staff,
    );
    if (moneyCents(booking.totalPrice) !== moneyCents(expectedTotal))
      throw new Error(
        "Prices have changed. Refresh the form and review the new total before confirming.",
      );
    transaction.set(bookingRef, {
      ...booking,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(booking.status === "checked-in"
        ? { checkedInAt: serverTimestamp() }
        : {}),
    });
    if (booking.amountPaid > 0)
      transaction.set(paymentRef, {
        bookingId,
        bookingRef: booking.bookingRef,
        guest: booking.customerName,
        customerName: booking.customerName,
        room: booking.assignedRoomNumbers.join(", "),
        roomName: booking.roomName,
        amount: booking.amountPaid,
        method: input.paymentMethod,
        type: booking.remainingBalance === 0 ? "full" : "partial",
        status: "completed",
        verificationStatus: "verified",
        receiptNo: `RCP-${bookingId}`,
        referenceNumber: "",
        bookingType: "Walk-in",
        receivedByUid: user.uid,
        createdAt: serverTimestamp(),
        verifiedAt: serverTimestamp(),
      });
    transaction.set(lockRef, {
      revision: Number(lock.data()?.revision || 0) + 1,
      updatedAt: serverTimestamp(),
    });
    return {
      reference: booking.bookingRef,
      roomNumbers: booking.assignedRoomNumbers,
    };
  });
}
