import { useEffect, useRef, useState } from "react";
import { Clock, Save } from "lucide-react";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { requireAccess } from "../auth";
import { AsyncButton, AsyncForm } from "./ui/async-action";

type StayTimes = { checkInTime: string; checkOutTime: string };
const DEFAULT_TIMES: StayTimes = {
  checkInTime: "14:00",
  checkOutTime: "11:00",
};
const validTime = (value: unknown): value is string =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export default function StayTimeSettings() {
  const [times, setTimes] = useState<StayTimes>(DEFAULT_TIMES);
  const [saved, setSaved] = useState<StayTimes>(DEFAULT_TIMES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    const values: Record<string, Record<string, unknown>> = {};
    const ready = new Set<string>();
    const failures = new Set<string>();
    const unsubscribes = ["publicSettings", "systemSettings"].map((name) =>
      onSnapshot(
        doc(db, name, "general"),
        (snapshot) => {
          values[name] = snapshot.exists() ? snapshot.data() : {};
          ready.add(name);
          failures.delete(name);
          if (ready.size !== 2 || failures.size) return;
          const published = values.publicSettings;
          const internal = values.systemSettings;
          const next: StayTimes = {
            checkInTime: validTime(published.checkInTime)
              ? published.checkInTime
              : validTime(internal.checkInTime)
                ? internal.checkInTime
                : DEFAULT_TIMES.checkInTime,
            checkOutTime: validTime(published.checkOutTime)
              ? published.checkOutTime
              : validTime(internal.checkOutTime)
                ? internal.checkOutTime
                : DEFAULT_TIMES.checkOutTime,
          };
          setSaved(next);
          if (!dirty.current) setTimes(next);
          setLoadError("");
          setLoading(false);
        },
        (failure) => {
          console.error("Unable to load room stay times:", failure);
          failures.add(name);
          setLoadError(
            "Unable to load stay times. Refresh the page to try again.",
          );
          setLoading(false);
        },
      ),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);

  const changed =
    times.checkInTime !== saved.checkInTime ||
    times.checkOutTime !== saved.checkOutTime;

  function change(field: keyof StayTimes, value: string) {
    dirty.current = true;
    setTimes((previous) => ({ ...previous, [field]: value }));
    setError("");
    setSuccess("");
  }

  async function save() {
    if (savingRef.current || loading || loadError) return;
    setError("");
    setSuccess("");
    if (!validTime(times.checkInTime) || !validTime(times.checkOutTime)) {
      setError("Enter a valid check-in and check-out time.");
      return;
    }
    if (times.checkInTime === times.checkOutTime) {
      setError("Check-in and check-out times cannot be the same.");
      return;
    }
    if (!changed) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await requireAccess("manager");
      const batch = writeBatch(db);
      const fields = { ...times, updatedAt: serverTimestamp() };
      batch.set(doc(db, "systemSettings", "general"), fields, { merge: true });
      batch.set(doc(db, "publicSettings", "general"), fields, { merge: true });
      await batch.commit();
      dirty.current = false;
      setSaved(times);
      setSuccess("Stay times saved. New bookings will use these times.");
    } catch (failure) {
      console.error("Unable to save room stay times:", failure);
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to save stay times. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="room-stay-times-title"
      className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3"
    >
      <AsyncForm
        onSubmit={save}
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5"
      >
        <div className="lg:mr-auto">
          <h2
            id="room-stay-times-title"
            className="flex items-center gap-2 text-sm font-semibold text-gray-900"
          >
            <Clock className="h-4 w-4 text-cyan-700" aria-hidden="true" /> Stay
            times
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Displayed on customer bookings · Philippine time
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-80">
          <label
            htmlFor="room-check-in-time"
            className="min-w-0 text-xs font-medium text-gray-600"
          >
            Check-in from
            <input
              id="room-check-in-time"
              type="time"
              required
              value={times.checkInTime}
              onChange={(event) => change("checkInTime", event.target.value)}
              disabled={loading || saving || Boolean(loadError)}
              className="mt-1 block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>
          <label
            htmlFor="room-check-out-time"
            className="min-w-0 text-xs font-medium text-gray-600"
          >
            Check-out until
            <input
              id="room-check-out-time"
              type="time"
              required
              value={times.checkOutTime}
              onChange={(event) => change("checkOutTime", event.target.value)}
              disabled={loading || saving || Boolean(loadError)}
              className="mt-1 block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>
        </div>
        <AsyncButton
          type="submit"
          disabled={loading || saving || Boolean(loadError) || !changed}
          className="flex items-center justify-center gap-2 self-stretch rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50 lg:self-end"
        >
          <Save className="h-4 w-4" aria-hidden="true" /> Save times
        </AsyncButton>
      </AsyncForm>
      {loading && (
        <p role="status" className="mt-2 text-xs text-gray-500">
          Loading stay times...
        </p>
      )}
      {(loadError || error) && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {loadError || error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-2 text-xs text-green-700">
          {success}
        </p>
      )}
    </section>
  );
}
