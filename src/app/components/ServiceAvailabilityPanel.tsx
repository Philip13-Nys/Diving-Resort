import { useState } from "react";
import { Link } from "react-router-dom";
import { useActivityAvailability } from "../useActivityAvailability";
import {
  activityAvailabilityRows,
  activityPolicy,
  pendingActivityReservations,
} from "../activityAvailability";
import { downloadFile, toCsv } from "../reportData";

export default function ServiceAvailabilityPanel({
  title = "Service availability",
  exportable = false,
  managePath,
}: {
  title?: string;
  exportable?: boolean;
  managePath?: string;
}) {
  const inventory = useActivityAvailability();
  const [date, setDate] = useState(() =>
    new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
  );
  const [serviceId, setServiceId] = useState("all");
  const [time, setTime] = useState("all");
  const rows = activityAvailabilityRows(
    inventory.catalog,
    inventory.occupied,
    date,
  );
  const pendingRows = activityAvailabilityRows(
    inventory.catalog,
    pendingActivityReservations(
      inventory.catalog,
      inventory.bookings,
      inventory.allocations,
    ),
    date,
    -Infinity,
  );
  const pending = (row: (typeof rows)[number]) =>
    pendingRows.find(
      (value) =>
        value.id === row.id &&
        value.itemType === row.itemType &&
        value.time === row.time,
    )?.reserved || 0;
  const filtered = rows.filter(
    (row) =>
      (serviceId === "all" || serviceId === row.itemType + ":" + row.id) &&
      (time === "all" || time === row.time),
  );
  const services = inventory.catalog.filter(
    (item) => item.itemType !== "package",
  );
  const unconfigured = services.filter((item) => !activityPolicy(item));
  const csv = () =>
    downloadFile(
      toCsv([
        [
          "Service",
          "Type",
          "Date",
          "Session",
          "Capacity unit",
          "Total",
          "Confirmed reserved",
          "Confirmation hold",
          "Pending demand (not reserved)",
          "Available",
          "Status",
          "Snapshot generated",
        ],
        ...filtered.map((row) => [
          row.name,
          row.itemType,
          row.date,
          row.time,
          row.label,
          row.total,
          row.reserved,
          row.held,
          pending(row),
          row.remaining,
          row.error || (row.remaining ? "Available" : "Fully Booked"),
          new Date().toISOString(),
        ]),
      ]),
      "service-availability-" + date + ".csv",
    );
  return (
    <section
      className="my-5 min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
      aria-label={title}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">
            Live units/slots by session · Philippine time. Pending demand is
            separate from reserved inventory.
          </p>
        </div>
        <div className="flex gap-3">
          {managePath && (
            <Link to={managePath} className="text-sm font-medium text-cyan-700">
              Manage services
            </Link>
          )}
          {exportable && (
            <button
              type="button"
              onClick={csv}
              disabled={
                inventory.loading ||
                Boolean(inventory.error) ||
                !filtered.length
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs disabled:opacity-50"
            >
              Export availability CSV
            </button>
          )}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3">
        <label className="text-xs text-gray-600">
          Date
          <input
            aria-label="Service availability date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="ml-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-600">
          Service
          <select
            aria-label="Service availability filter"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="ml-2 max-w-48 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All services</option>
            {services.map((item) => (
              <option
                key={item.itemType + item.id}
                value={item.itemType + ":" + item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600">
          Session
          <select
            aria-label="Service session filter"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="ml-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All sessions</option>
            {[...new Set(rows.map((row) => row.time))].sort().map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {inventory.loading ? (
        <p role="status" className="text-sm text-gray-500">
          Loading service availability...
        </p>
      ) : inventory.error ? (
        <p role="alert" className="text-sm text-red-700">
          {inventory.error}
        </p>
      ) : (
        <>
          {unconfigured.length > 0 && (
            <p role="status" className="mb-3 text-xs text-amber-800">
              Schedule/quantity not configured:{" "}
              {unconfigured.map((item) => item.name).join(", ")}. These items
              cannot be booked online.
            </p>
          )}
          <div className="max-h-80 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 bg-gray-50 text-gray-600">
                <tr>
                  {[
                    "Service",
                    "Session",
                    "Units / slots",
                    "Total",
                    "Reserved",
                    "Processing",
                    "Pending",
                    "Available",
                    "Status",
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-3 py-2 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.itemType + row.id + row.time}
                    className="border-t border-gray-100"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-3 py-2">
                      {row.time} – {row.endTime}
                    </td>
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{row.total}</td>
                    <td className="px-3 py-2">{row.reserved}</td>
                    <td className="px-3 py-2">{row.held}</td>
                    <td className="px-3 py-2">{pending(row)}</td>
                    <td className="px-3 py-2 font-medium">
                      {row.remaining} of {row.total} Available
                    </td>
                    <td className="px-3 py-2">
                      <span
                        title={
                          row.error ||
                          (row.linkedLimited
                            ? "Availability is limited by an included service."
                            : "")
                        }
                        className={
                          row.error || !row.remaining
                            ? "text-red-700"
                            : "text-green-700"
                        }
                      >
                        {row.error
                          ? "Unavailable"
                          : row.remaining
                            ? "Available"
                            : "Fully Booked"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-5 text-center text-gray-500"
                    >
                      No scheduled sessions match this date/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Reserved = confirmed overlapping quantity; Processing = confirmation
            holds. Total inventory is never decremented. Packages do not use
            scheduled inventory.
          </p>
        </>
      )}
    </section>
  );
}
