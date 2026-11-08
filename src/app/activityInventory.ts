import {
  collection,
  doc,
  getDocs,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
} from "firebase/firestore";
import { db, customerDb } from "./firebase";
import { requireAccess } from "./auth";
import {
  mergeActivityBookings,
  heldActivityReservations,
  activityBookingKey,
  activityOccupies,
  activitySelections,
  assertActivityCapacity,
  bookingActivityReservations,
  occupiedActivities,
  type ActivityRecord,
  type ActivityReservation,
} from "./activityAvailability";

export type ActivityHold = {
  key: string;
  token: string;
  requests: ActivityReservation[];
  previous: ActivityRecord | null;
};
const registry = () => doc(db, "BookingLocks", "activityInventory");

// Both online confirmations and walk-ins reserve places in this ONE admin-
// project transaction before writing their booking in its original database.
// Held places remain occupied if a cross-project write has an unknown outcome.
export async function holdActivityPlaces(
  booking: ActivityRecord,
  allowEmpty = false,
): Promise<ActivityHold | null> {
  if (
    !activitySelections(booking).some(
      (selection) => selection.itemType !== "package",
    ) &&
    !allowEmpty
  )
    return null;
  await requireAccess("receptionist");
  const key = activityBookingKey(booking),
    token = crypto.randomUUID();
  return runTransaction(db, async (transaction) => {
    const lock = await transaction.get(registry());
    const [services, packages, online, staff] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "packages")),
      getDocs(collection(customerDb, "Bookings")),
      getDocs(collection(db, "reservations")),
    ]);
    const serviceDocs = await Promise.all(
      services.docs.map((document) => transaction.get(document.ref)),
    );
    const packageDocs = await Promise.all(
      packages.docs.map((document) => transaction.get(document.ref)),
    );
    const catalog: ActivityRecord[] = [
      ...serviceDocs
        .filter((document) => document.exists())
        .map((document) => ({
          ...document.data(),
          id: document.id,
          itemType: "service",
        })),
      ...packageDocs
        .filter((document) => document.exists())
        .map((document) => ({
          ...document.data(),
          id: document.id,
          itemType: "package",
        })),
    ];
    const records: ActivityRecord[] = mergeActivityBookings(
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
    const requests = bookingActivityReservations(booking, catalog);
    const now = Date.now();
    const original = records.find(
      (record) => activityBookingKey(record) === key,
    );
    let originalRequests: ActivityReservation[] = [];
    try {
      if (original && activityOccupies(original))
        originalRequests =
          original.activityReservations ||
          bookingActivityReservations(original, catalog);
    } catch {
      /* Legacy unscheduled bookings require explicit scheduling. */
    }
    for (const request of requests)
      if (
        Date.parse(request.date + "T00:00:00+08:00") + request.start * 60000 <=
          now &&
        !originalRequests.some(
          (previous) => JSON.stringify(previous) === JSON.stringify(request),
        )
      )
        throw new Error(
          "An activity session has already started. Select a later session before confirming.",
        );
    const allocations: ActivityRecord = { ...(lock.data()?.allocations || {}) };
    for (const [id, allocation] of Object.entries(allocations)) {
      const record = records.find(
        (record) => activityBookingKey(record) === id,
      );
      const closed =
        record &&
        [
          "cancelled",
          "canceled",
          "rejected",
          "checked-out",
          "completed",
        ].includes(String(record.status).toLowerCase()) &&
        !activityOccupies(record);
      if (
        closed ||
        (allocation.occupiedRequests || allocation.requests).every(
          (request: ActivityReservation) =>
            Date.parse(request.date + "T00:00:00+08:00") +
              request.end * 60000 <=
            now,
        )
      )
        delete allocations[id];
    }
    const previous = allocations[key] || null;
    const existingBooking = records.find(
      (record) => activityBookingKey(record) === key,
    );
    if (
      previous?.state === "held" &&
      (!existingBooking ||
        !activityOccupies(existingBooking) ||
        JSON.stringify(existingBooking.activityReservations) !==
          JSON.stringify(previous.requests))
    )
      throw new Error(
        "An activity confirmation is already in progress for this booking. Refresh the reservation before trying again.",
      );
    const occupied = occupiedActivities(catalog, records, allocations, key);
    assertActivityCapacity(requests, catalog, occupied);
    const occupiedRequests = heldActivityReservations(
      previous?.requests || originalRequests,
      requests,
    );
    allocations[key] = {
      requests,
      occupiedRequests,
      state: "held",
      token,
      updatedAt: now,
    };
    transaction.set(registry(), {
      revision: Number(lock.data()?.revision || 0) + 1,
      allocations,
      updatedAt: serverTimestamp(),
    });
    return { key, token, requests, previous };
  });
}

export async function finishActivityHold(
  hold: ActivityHold | null,
  committed: boolean,
): Promise<void> {
  if (!hold) return;
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(registry());
    const allocations: ActivityRecord = {
      ...(snapshot.data()?.allocations || {}),
    };
    if (allocations[hold.key]?.token !== hold.token) return;
    if (committed && !hold.requests.length) delete allocations[hold.key];
    else if (committed)
      allocations[hold.key] = {
        requests: hold.requests,
        token: hold.token,
        updatedAt: allocations[hold.key].updatedAt,
        state: "confirmed",
      };
    else if (hold.previous) allocations[hold.key] = hold.previous;
    else delete allocations[hold.key];
    transaction.set(registry(), {
      revision: Number(snapshot.data()?.revision || 0) + 1,
      allocations,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function reconcileActivityHold(
  hold: ActivityHold | null,
  reference: DocumentReference,
): Promise<void> {
  if (!hold) return;
  // Do not release an uncertain write blindly: that could sell the same places.
  const current = await getDocFromServer(reference);
  const committed =
    current.exists() &&
    activityOccupies(current.data()) &&
    JSON.stringify(current.data().activityReservations) ===
      JSON.stringify(hold.requests);
  await finishActivityHold(hold, committed);
}

export async function releaseClosedActivityPlaces(key: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(registry());
    const allocations = { ...(snapshot.data()?.allocations || {}) };
    if (!allocations[key]) return;
    delete allocations[key];
    transaction.set(registry(), {
      revision: Number(snapshot.data()?.revision || 0) + 1,
      allocations,
      updatedAt: serverTimestamp(),
    });
  });
}
