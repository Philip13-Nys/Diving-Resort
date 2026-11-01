import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, customerDb } from "./firebase";
import {
  normalizeBookingValue,
  type BookingRecord,
} from "./bookingAvailability";

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
      status: normalizeBookingValue(document.data().status || "pending"),
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
          isStaffReservation(data) &&
          ![document.id, data.bookingId, data.bookingRef]
            .filter(Boolean)
            .some((value) => references.has(String(value)))
        );
      })
      .map((document) => bookingDocument(document, "staff")),
  ];
}
export async function getBookingSnapshot() {
  const [customer, staff] = await Promise.all([
    getDocs(collection(customerDb, "Bookings")),
    getDocs(collection(db, "reservations")),
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
export async function getPaymentSnapshot() {
  const [customer, staff] = await Promise.all([
    getDocs(collection(customerDb, "Payments")),
    getDocs(collection(db, "Payments")),
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
