import { requireAccess } from "./auth";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizeBookingValue } from "./bookingAvailability";

export async function saveMaintenance(
  id: string,
  values?: Record<string, any>,
  remove = false,
) {
  await requireAccess("manager");
  const ref = doc(db, "maintenanceRequests", id);
  return runTransaction(db, async (transaction) => {
    const previous = await transaction.get(ref);
    const record = { ...previous.data(), ...values };
    if (!record.roomId) throw new Error("Select a valid room.");
    const roomRef = doc(db, "rooms", record.roomId);
    const room = await transaction.get(roomRef);
    if (!room.exists()) throw new Error("The selected room no longer exists.");
    const docs = await getDocs(collection(db, "maintenanceRequests"));
    const others = await Promise.all(
      docs.docs
        .filter((doc) => doc.id !== id && doc.data().roomId === record.roomId)
        .map((doc) => transaction.get(doc.ref)),
    );
    const open = (value: any) =>
      ["pending", "in-progress"].includes(normalizeBookingValue(value.status));
    const blocked =
      (!remove && open(record)) ||
      others.some((doc) => doc.exists() && open(doc.data()));
    const roomData = room.data();
    const patch: Record<string, any> = { updatedAt: serverTimestamp() };
    if (blocked) {
      patch.maintenanceBlocked = true;
      if (!roomData.maintenanceBlocked)
        patch.preMaintenanceCondition = roomData.condition || "good";
      patch.condition = "maintenance";
    } else if (roomData.maintenanceBlocked) {
      patch.maintenanceBlocked = false;
      patch.condition = roomData.preMaintenanceCondition || "good";
    }
    transaction.update(roomRef, patch);
    if (remove) transaction.delete(ref);
    else
      transaction.set(
        ref,
        { ...record, updatedAt: serverTimestamp() },
        { merge: true },
      );
  });
}
