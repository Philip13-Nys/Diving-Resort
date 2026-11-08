import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
} from "firebase/firestore";
import { db, customerDb } from "./firebase";
import {
  mergeActivityBookings,
  occupiedActivities,
  type ActivityRecord,
} from "./activityAvailability";
export async function readActivitySnapshot() {
  const [services, packages, online, staff, lock] = await Promise.all([
    getDocsFromServer(collection(db, "services")),
    getDocsFromServer(collection(db, "packages")),
    getDocsFromServer(collection(customerDb, "Bookings")),
    getDocsFromServer(collection(db, "reservations")),
    getDocFromServer(doc(db, "BookingLocks", "activityInventory")),
  ]);
  const catalog: ActivityRecord[] = [
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
  ];
  const bookings = mergeActivityBookings(
    online.docs.map((document) => ({
      ...document.data(),
      id: document.id,
      _bookingStore: "customer",
    })),
    staff.docs.map((document) => ({
      ...document.data(),
      id: document.id,
      _bookingStore: "staff",
    })),
  );
  const allocations = lock.data()?.allocations || {};
  return {
    catalog,
    bookings,
    allocations,
    occupied: occupiedActivities(catalog, bookings, allocations),
  };
}
