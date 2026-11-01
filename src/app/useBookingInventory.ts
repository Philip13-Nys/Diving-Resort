import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, customerDb } from "./firebase";
import {
  mergeReservations,
  normalizeInventory,
  type BookingRecord,
} from "./bookingAvailability";

export function useBookingInventory() {
  const [records, setRecords] = useState<Record<string, BookingRecord[]>>({
    rooms: [],
    types: [],
    bookings: [],
    legacy: [],
  });
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const sources = [
      ["rooms", collection(db, "rooms")],
      ["types", collection(db, "roomTypes")],
      ["bookings", collection(customerDb, "Bookings")],
      ["legacy", collection(db, "reservations")],
    ] as const;
    const stops = sources.map(([key, reference]) =>
      onSnapshot(
        reference,
        (snapshot) => {
          setRecords((current) => ({
            ...current,
            [key]: snapshot.docs.map((document) => ({
              ...document.data(),
              id: document.id,
            })),
          }));
          setReady((current) => ({ ...current, [key]: true }));
          setErrors((current) => ({ ...current, [key]: "" }));
        },
        (error) => {
          console.error(`Unable to load ${key}`, error);
          setReady((current) => ({ ...current, [key]: true }));
          setErrors((current) => ({
            ...current,
            [key]: `Unable to load ${key === "legacy" ? "legacy reservations" : key}. Check your connection and database permissions.`,
          }));
        },
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, []);
  const rooms = useMemo(
    () => normalizeInventory(records.rooms, records.types),
    [records.rooms, records.types],
  );
  const reservations = useMemo(
    () => mergeReservations(records.bookings, records.legacy),
    [records.bookings, records.legacy],
  );
  return {
    rooms,
    roomTypes: records.types,
    bookings: records.bookings,
    reservations,
    loading: Object.keys(ready).length < 4,
    error: Object.values(errors).filter(Boolean).join(" "),
  };
}
