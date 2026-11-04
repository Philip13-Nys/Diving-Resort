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

export function maintenanceRoomId(record: Record<string, any>, rooms: { id: string; roomId?: string }[]) {
  const reference = String(record.roomId || record.roomID || "").trim();
  if (!reference) throw new Error("Select a valid room.");
  const exact = rooms.find(room => room.id === reference);
  if (exact) return exact.id;
  const matches = rooms.filter(room => String(room.roomId || "").trim() === reference);
  if (matches.length !== 1) throw new Error(matches.length ? "This room code matches multiple rooms. Correct it in Room Management." : "The selected room no longer exists. Check its room code in Room Management.");
  return matches[0].id;
}

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
    const inventory = await getDocs(collection(db, "rooms"));
    const rooms = inventory.docs.map(room => ({ ...room.data(), id: room.id }));
    const physicalId = maintenanceRoomId(record, rooms);
    const roomRef = doc(db, "rooms", physicalId);
    const room = await transaction.get(roomRef);
    if (!room.exists()) throw new Error("The selected room no longer exists.");
    const docs = await getDocs(collection(db, "maintenanceRequests"));
    const others = await Promise.all(
      docs.docs
        .filter((doc) => {
          if (doc.id === id) return false;
          try { return maintenanceRoomId(doc.data(), rooms) === physicalId; }
          catch { return false; }
        })
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
