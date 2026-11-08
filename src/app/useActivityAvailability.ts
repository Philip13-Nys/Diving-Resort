import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { watchRecords } from "./bookingStore";
import {
  mergeActivityBookings,
  occupiedActivities,
  type ActivityRecord,
  type ActivityReservation,
} from "./activityAvailability";
export function useActivityAvailability() {
  const [state, setState] = useState<{
    catalog: ActivityRecord[];
    bookings: ActivityRecord[];
    allocations: ActivityRecord;
    occupied: ActivityReservation[];
    loading: boolean;
    error: string;
  }>({
    catalog: [],
    bookings: [],
    allocations: {},
    occupied: [],
    loading: true,
    error: "",
  });
  useEffect(() => {
    let active = true,
      lockReady = false;
    let allocations: ActivityRecord = {};
    const data: ActivityRecord[][] = [],
      errors = new Set<number>();
    const publish = () => {
      if (
        !active ||
        errors.size ||
        !lockReady ||
        data.filter(Boolean).length !== 4
      )
        return;
      const catalog = [
        ...data[0].map((item) => ({ ...item, itemType: "service" })),
        ...data[1].map((item) => ({ ...item, itemType: "package" })),
      ];
      const bookings = mergeActivityBookings(
        data[2].map((item) => ({ ...item, _bookingStore: "customer" })),
        data[3].map((item) => ({ ...item, _bookingStore: "staff" })),
      );
      setState({
        catalog,
        bookings,
        allocations,
        occupied: occupiedActivities(catalog, bookings, allocations),
        loading: false,
        error: "",
      });
    };
    const failed = (index: number) => {
      errors.add(index);
      if (active)
        setState((previous) => ({
          ...previous,
          loading: false,
          error:
            "Unable to verify activity availability. Refresh the page to retry.",
        }));
    };
    const stops = [
      "admin:services",
      "admin:packages",
      "customer:Bookings",
      "admin:reservations",
    ].map((source, index) =>
      watchRecords(
        source,
        (snapshot) => {
          data[index] = snapshot.docs.map((document) => ({
            ...document.data(),
            id: document.id,
          }));
          errors.delete(index);
          publish();
        },
        () => failed(index),
      ),
    );
    stops.push(
      onSnapshot(
        doc(db, "BookingLocks", "activityInventory"),
        (snapshot) => {
          allocations = snapshot.data()?.allocations || {};
          lockReady = true;
          errors.delete(4);
          publish();
        },
        () => failed(4),
      ),
    );
    const timer = setInterval(publish, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      stops.forEach((stop) => stop());
    };
  }, []);
  return state;
}
