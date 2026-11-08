import { useState } from "react";
import {
  activityCapacityLabel,
  activityPolicy,
  activitySession,
  activitySlots,
  activityTimeLabel,
  type ActivityReservation,
  type ActivityRecord,
} from "../activityAvailability";
export default function ActivityAvailabilityFields({
  item,
}: {
  item?: ActivityRecord | null;
}) {
  const policy = item && activityPolicy(item);
  const [capacityType, setCapacityType] = useState(
    policy?.capacityType || "participants",
  );
  const legacy = String(item?.duration || "").match(
    /([\d.]+)\s*(hours?|hrs?|minutes?|mins?)/i,
  );
  const legacyMinutes = legacy
    ? Math.round(Number(legacy[1]) * (/^h/i.test(legacy[2]) ? 60 : 1))
    : 60;
  return (
    <fieldset className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">
        Schedule & service quantity
      </legend>
      <p className="text-xs text-gray-600">
        Choose equipment units or participant slots. Prices remain per
        participant. Set total capacity to 0 to stop new reservations. Times use
        Philippine time.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-700">
          Counting mode
          <select
            name="activityCapacityType"
            value={capacityType}
            onChange={(event) =>
              setCapacityType(event.target.value as "participants" | "units")
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="participants">Participant slots</option>
            <option value="units">Equipment units</option>
          </select>
        </label>
        {capacityType === "units" && (
          <label className="text-xs font-medium text-gray-700">
            Participants per unit
            <input
              name="activityParticipantsPerUnit"
              type="number"
              min={1}
              max={10000}
              step={1}
              required
              defaultValue={policy?.participantsPerUnit || 1}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        )}
        <label className="text-xs font-medium text-gray-700">
          Total quantity / capacity
          <input
            name="activityCapacity"
            type="number"
            min={0}
            max={10000}
            step={1}
            required
            defaultValue={policy?.capacity ?? item?.maxParticipants ?? 10}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          Session duration (minutes)
          <input
            name="activityDuration"
            type="number"
            min={1}
            max={1440}
            step={1}
            required
            defaultValue={policy?.durationMinutes || legacyMinutes}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          Available from
          <input
            name="activityOpensAt"
            type="time"
            required
            defaultValue={policy?.opensAt || "08:00"}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          Available until
          <input
            name="activityClosesAt"
            type="time"
            required
            defaultValue={policy?.closesAt || "17:00"}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-gray-700">Operating days</p>
        <div className="flex flex-wrap gap-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day, index) => (
              <label
                key={day}
                className="flex items-center gap-1 text-xs text-gray-700"
              >
                <input
                  type="checkbox"
                  name="activityDays"
                  value={index}
                  defaultChecked={policy ? policy.days.includes(index) : true}
                />
                {day}
              </label>
            ),
          )}
        </div>
      </div>
    </fieldset>
  );
}
export function ActivityAvailabilitySummary({
  item,
  date,
  inventory,
}: {
  item: ActivityRecord;
  date: string;
  inventory: {
    catalog: ActivityRecord[];
    occupied: ActivityReservation[];
    loading: boolean;
    error: string;
  };
}) {
  const policy = activityPolicy(item);
  if (!policy)
    return (
      <p className="my-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
        Availability not configured. Edit this item to enable online booking.
      </p>
    );
  if (inventory.error || inventory.loading)
    return (
      <p className="my-3 text-xs text-gray-500">
        {inventory.error || "Checking activity availability..."}
      </p>
    );
  const sessions = activitySlots(item, date).map((time) => ({
    time,
    ...activitySession(item, date, time, inventory.catalog, inventory.occupied),
  }));
  return (
    <details className="my-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
      <summary className="cursor-pointer font-medium text-cyan-800">
        {activityTimeLabel(policy.opensAt)} –{" "}
        {activityTimeLabel(policy.closesAt)} · View remaining places
      </summary>
      <div className="mt-2 space-y-1">
        {sessions.length ? (
          sessions.map((session) => (
            <p key={session.time} className="flex justify-between gap-3">
              <span>
                {activityTimeLabel(session.time)} –{" "}
                {activityTimeLabel(session.endTime)}
              </span>
              <span>
                {session.error
                  ? "Unavailable"
                  : session.remaining +
                    " of " +
                    policy.capacity +
                    " available (" +
                    activityCapacityLabel(item) +
                    "); reserved " +
                    session.reserved +
                    "; held " +
                    session.held}
              </span>
            </p>
          ))
        ) : (
          <p>Not operating on this date.</p>
        )}
      </div>
    </details>
  );
}
