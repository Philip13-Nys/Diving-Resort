import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
  onSnapshot,
  type QuerySnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, customerDb } from "./firebase";
import {
  normalizeBookingValue,
  type BookingRecord,
  bookingRoomLabel,
  dateOnly,
  bookingPaid,
  cancelled,
} from "./bookingAvailability";
import { requireAccess } from "./auth";
type SnapshotDocument = { id: string; ref: any; data: () => BookingRecord };
function bookingDocument(
  document: QueryDocumentSnapshot<DocumentData>,
  store: "staff" | "customer",
): SnapshotDocument {
  return {
    id: document.id,
    ref: document.ref,
    data: () => ({
      ...document.data(),
      status:
        (
          {
            canceled: "cancelled",
            rejected: "cancelled",
            completed: "checked-out",
            checkedin: "checked-in",
            checkedout: "checked-out",
            reserved: "confirmed",
          } as Record<string, string>
        )[normalizeBookingValue(document.data().status)] ||
        normalizeBookingValue(document.data().status || "pending"),
      paymentStatus: normalizeBookingValue(
        document.data().paymentStatus || "unpaid",
      ),
      _bookingStore: store,
    }),
  };
}
export function isStaffReservation(data: BookingRecord): boolean {
  return (
    normalizeBookingValue(data.bookingSource ?? data.bookingType) === "walk-in"
  );
}
export function mergeBookingDocuments(
  customer: QueryDocumentSnapshot<DocumentData>[],
  staff: QueryDocumentSnapshot<DocumentData>[],
): SnapshotDocument[] {
  const references = new Set(
    customer.flatMap((document) =>
      [document.id, document.data().bookingId, document.data().bookingRef]
        .filter(Boolean)
        .map(String),
    ),
  );
  return [
    ...customer.map((document) => bookingDocument(document, "customer")),
    ...staff
      .filter((document) => {
        const data = document.data();
        return (
          (isStaffReservation(data) ||
            Boolean(
              data.checkIn &&
              data.checkOut &&
              (data.roomTypeId || data.roomId || data.roomName || data.room),
            )) &&
          ![document.id, data.bookingId, data.bookingRef]
            .filter(Boolean)
            .some((value) => references.has(String(value)))
        );
      })
      .map((document) => bookingDocument(document, "staff")),
  ];
}
export async function getBookingSnapshot(display = false) {
  const [customer, staff] = await Promise.all([
    display
      ? readDisplayRecords("customer:Bookings")
      : getDocs(collection(customerDb, "Bookings")),
    display
      ? readDisplayRecords("admin:reservations")
      : getDocs(collection(db, "reservations")),
  ]);
  const docs = mergeBookingDocuments(customer.docs, staff.docs);
  return {
    docs,
    size: docs.length,
    empty: !docs.length,
    forEach: (callback: (document: SnapshotDocument) => void) =>
      docs.forEach(callback),
  };
}
export async function getPaymentSnapshot(display = false) {
  const [customer, staff] = await Promise.all([
    display
      ? readDisplayRecords("customer:Payments")
      : getDocs(collection(customerDb, "Payments")),
    display
      ? readDisplayRecords("admin:Payments")
      : getDocs(collection(db, "Payments")),
  ]);
  const docs: SnapshotDocument[] = [
    ...customer.docs.map((document) => ({
      id: document.id,
      ref: document.ref,
      data: () => ({ ...document.data(), _bookingStore: "customer" }),
    })),
    ...staff.docs.map((document) => ({
      id: document.id,
      ref: document.ref,
      data: () => ({ ...document.data(), _bookingStore: "staff" }),
    })),
  ];
  return {
    docs,
    size: docs.length,
    empty: !docs.length,
    forEach: (callback: (document: SnapshotDocument) => void) =>
      docs.forEach(callback),
  };
}
export async function getBookingRef(id: string, store?: string) {
  if (store === "staff") return doc(db, "reservations", id);
  const customer = doc(customerDb, "Bookings", id);
  if (store === "customer" || (await getDoc(customer)).exists())
    return customer;
  return doc(db, "reservations", id);
}

export const getLiveBookingSnapshot = () => getBookingSnapshot(true);
export const getLivePaymentSnapshot = () => getPaymentSnapshot(true);

const sources = new Map<
  string,
  {
    value?: QuerySnapshot<DocumentData>;
    error?: Error;
    listeners: Set<{
      next: (snapshot: QuerySnapshot<DocumentData>) => void;
      error: (error: Error) => void;
    }>;
    stop: () => void;
  }
>();
export function watchRecords(
  key: string,
  next: (snapshot: QuerySnapshot<DocumentData>) => void,
  error: (error: Error) => void,
) {
  let source = sources.get(key);
  const listener = { next, error };
  if (!source) {
    source = { listeners: new Set(), stop: () => {} };
    sources.set(key, source);
    const [project, path] = key.split(":");
    const current = source;
    current.stop = onSnapshot(
      collection(project === "customer" ? customerDb : db, path),
      (snapshot) => {
        current.value = snapshot;
        current.error = undefined;
        current.listeners.forEach((listener) => listener.next(snapshot));
      },
      (error) => {
        current.error = error;
        current.listeners.forEach((listener) => listener.error(error));
      },
    );
  }
  source.listeners.add(listener);
  if (source.value)
    queueMicrotask(() => {
      if (source!.listeners.has(listener)) next(source!.value!);
    });
  if (source.error)
    queueMicrotask(() => {
      if (source!.listeners.has(listener) && source!.error)
        error(source!.error);
    });
  return () => {
    if (!source!.listeners.delete(listener)) return;
    if (!source!.listeners.size) {
      source!.stop();
      sources.delete(key);
    }
  };
}
export async function readDisplayRecords(key: string) {
  const source = sources.get(key);
  if (source?.error) throw source.error;
  if (source?.value) return source.value;
  const [project, path] = key.split(":");
  return getDocs(collection(project === "customer" ? customerDb : db, path));
}

export function guestKey(record: BookingRecord) {
  const email = String(record.customerEmail || record.email || "")
    .trim()
    .toLowerCase();
  const name = String(
    record.customerName || record.guestName || record.name || "Guest",
  )
    .trim()
    .toLowerCase();
  const phone = String(record.customerPhone || record.phone || "").replace(
    /\s/g,
    "",
  );
  return email
    ? "email:" + email
    : `guest:${name}|${phone || record.userId || record.id || ""}`;
}
export function aggregateGuests(
  bookings: BookingRecord[],
  profiles: BookingRecord[],
) {
  const map = new Map<string, any>();
  for (const booking of bookings) {
    const key = guestKey(booking);
    let guest = map.get(key);
    if (!guest) {
      guest = {
        id: "",
        identityKey: key,
        name: booking.customerName || booking.guestName || "Guest",
        email: booking.customerEmail || booking.email || "",
        phone: booking.customerPhone || booking.phone || "",
        nationality: booking.nationality || "",
        notes: booking.notes || "",
        tags: [],
        visits: 0,
        totalSpent: 0,
        lastVisit: "",
        history: [],
      };
      map.set(key, guest);
    }
    if (cancelled(booking)) continue;
    const date = dateOnly(booking.checkIn);
    guest.visits++;
    guest.totalSpent =
      (Math.round(guest.totalSpent * 100) +
        Math.round(bookingPaid(booking) * 100)) /
      100;
    if (date > guest.lastVisit) guest.lastVisit = date;
    guest.history.push({
      date,
      room: bookingRoomLabel(booking),
      nights: Number(booking.nights || 0),
      amount: bookingPaid(booking),
    });
  }
  for (const profile of profiles) {
    const key = profile.identityKey || guestKey(profile);
    const guest = map.get(key) || {
      identityKey: key,
      visits: 0,
      totalSpent: 0,
      lastVisit: "",
      history: [],
      tags: [],
    };
    map.set(key, { ...guest, ...profile });
  }
  return [...map.values()].map((guest) => ({
    ...guest,
    totalStays: guest.visits,
    status: guest.visits >= 5 ? "vip" : guest.visits >= 2 ? "regular" : "new",
  }));
}
export async function getGuests() {
  const [bookings, profiles] = await Promise.all([
    getBookingSnapshot(true),
    readDisplayRecords("admin:Guests"),
  ]);
  return aggregateGuests(
    bookings.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    profiles.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
  );
}
export async function saveGuestProfile(guest: BookingRecord) {
  await requireAccess("receptionist");
  const name = String(guest.name || "").trim(),
    email = String(guest.email || "").trim();
  if (!name) throw new Error("Enter the guest name.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email.");
  const identityKey = guest.identityKey || guestKey(guest);
  const id = guest.id || encodeURIComponent(identityKey);
  await setDoc(
    doc(db, "Guests", id),
    {
      identityKey,
      name,
      email,
      phone: guest.phone || "",
      nationality: guest.nationality || "",
      notes: guest.notes || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
