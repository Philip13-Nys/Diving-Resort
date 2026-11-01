import { useEffect, useMemo, useState } from "react";

import {
  mergeReservations,
  normalizeInventory,
  type BookingRecord,
} from "./bookingAvailability";
import { watchRecords } from "./bookingStore";
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
      ["rooms", "admin:rooms"],
      ["types", "admin:roomTypes"],
      ["bookings", "customer:Bookings"],
      ["legacy", "admin:reservations"],
    ] as const;
    const stops = sources.map(([key, reference]) =>
      watchRecords(
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

// Only the visible page subscribes to its dependencies. No polling timer.
// First snapshots are handled by the page's existing initial load.
export function useRecordRevision(sources: string) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stops = sources
      .split(",")
      .filter(Boolean)
      .map((source) => {
        const [project, path] = source.split(":");
        let initial = true;
        return watchRecords(
          source,
          () => {
            if (initial) {
              initial = false;
              return;
            }
            clearTimeout(timer);
            timer = setTimeout(() => setRevision((value) => value + 1), 100);
          },
          (error) => {
            console.error(`Live updates unavailable for ${path}`, error);
            window.dispatchEvent(
              new CustomEvent("record-sync-error", {
                detail:
                  "Live updates are unavailable. Reload to retry; displayed records may be outdated.",
              }),
            );
          },
        );
      });
    return () => {
      clearTimeout(timer);
      stops.forEach((stop) => stop());
    };
  }, [sources]);
  return revision;
}
