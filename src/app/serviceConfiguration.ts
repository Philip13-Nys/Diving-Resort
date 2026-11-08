import {
  collection,
  doc,
  getDocsFromServer,
  runTransaction,
} from "firebase/firestore";
import { db, customerDb } from "./firebase";
import { requireAccess } from "./auth";
import {
  activityPolicy,
  mergeActivityBookings,
  validateActivityPolicyChange,
  type ActivityRecord,
} from "./activityAvailability";

export async function saveServiceConfiguration(
  kind: "services" | "packages",
  id: string | undefined,
  fields: ActivityRecord,
) {
  await requireAccess("manager");
  const next = activityPolicy(fields);
  if (kind === "services" && !next)
    throw new Error("Enter a valid service capacity and schedule.");
  const price = Number(
    kind === "packages" ? fields.packagePrice : fields.price,
  );
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Enter a valid nonnegative price.");
  const reference = id ? doc(db, kind, id) : doc(collection(db, kind));
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    if (kind === "packages") {
      if (id && !existing.exists())
        throw new Error("This package was removed. Refresh the page.");
      transaction.set(reference, fields, { merge: true });
      return;
    }
    const lock = await transaction.get(
      doc(db, "BookingLocks", "activityInventory"),
    );
    if (id && !existing.exists())
      throw new Error("This service was removed. Refresh the page.");
    const snapshots = await Promise.all([
      getDocsFromServer(collection(db, "services")),
      getDocsFromServer(collection(db, "packages")),
      getDocsFromServer(collection(customerDb, "Bookings")),
      getDocsFromServer(collection(db, "reservations")),
    ]);
    const catalog: ActivityRecord[] = snapshots
      .slice(0, 2)
      .flatMap((snapshot, index) =>
        snapshot.docs.map((document) => ({
          ...document.data(),
          id: document.id,
          itemType: index === 0 ? "service" : "package",
        })),
      );
    const item = {
      ...(existing.data() || {}),
      id: reference.id,
      itemType: "service",
    };
    const matching = catalog.findIndex(
      (value) => value.id === item.id && value.itemType === item.itemType,
    );
    if (matching >= 0) catalog[matching] = item;
    else catalog.push(item);
    const bookings = mergeActivityBookings(
      snapshots[2].docs.map((document) => ({
        ...document.data(),
        id: document.id,
        _bookingStore: "customer",
      })),
      snapshots[3].docs.map((document) => ({
        ...document.data(),
        id: document.id,
        _bookingStore: "staff",
      })),
    );
    validateActivityPolicyChange(
      item,
      next!,
      catalog,
      bookings,
      lock.data()?.allocations || {},
    );
    transaction.set(reference, fields, { merge: true });
  });
  return reference;
}
