import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useActivityAvailability } from "../useActivityAvailability";
import {
  activityAvailabilityRows,
  activityPolicy,
  activityTimeLabel,
  pendingActivityReservations,
} from "../activityAvailability";
import { exportReport } from "../reportData";

export default function ServiceAvailabilityPanel({
  title = "Service availability",
  exportable = false,
  managePath,
  standalone = false,
}: {
  title?: string;
  exportable?: boolean;
  managePath?: string;
  standalone?: boolean;
}) {
  const inventory = useActivityAvailability();
  const [date, setDate] = useState(() =>
    new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
  );
  const shiftDate = (days: number) => {
    const next = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000);
    setDate(next.toISOString().slice(0, 10));
  };
  const [serviceId, setServiceId] = useState("all");
  const [time, setTime] = useState("all");
  const [collapsedServices, setCollapsedServices] = useState<Set<string>>(
    () => new Set(),
  );
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
  const availableUnits = filtered.reduce(
    (sum, row) => sum + Math.max(0, row.remaining),
    0,
  );
  const reservedUnits = filtered.reduce((sum, row) => sum + row.reserved, 0);
  const unavailableSessions = filtered.filter(
    (row) => row.error || row.remaining <= 0,
  ).length;
  const serviceGroups = new Map<string, typeof filtered>();
  for (const row of filtered) {
    const key = `${row.itemType}:${row.id}`;
    const group = serviceGroups.get(key) || [];
    group.push(row);
    serviceGroups.set(key, group);
  }
  const allServicesCollapsed =
    serviceGroups.size > 0 &&
    [...serviceGroups.keys()].every((key) => collapsedServices.has(key));
  const toggleService = (key: string) => {
    setCollapsedServices((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const exportExcel = () =>
    exportReport(
      `Service Availability ${date}`,
      [
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
          `${activityTimeLabel(row.time)} – ${activityTimeLabel(row.endTime)}`,
          row.label,
          row.total,
          row.reserved,
          row.held,
          pending(row),
          row.remaining,
          row.error || (row.remaining ? "Available" : "Unavailable"),
          new Date().toISOString(),
        ]),
      ],
      date,
    );
  const renderRow = (row: (typeof filtered)[number]) => (
    <tr
      key={`${row.itemType}:${row.id}:${row.time}`}
      className="border-t border-gray-100 hover:bg-gray-50"
    >
      <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
      <td className="px-3 py-2">
        {activityTimeLabel(row.time)} – {activityTimeLabel(row.endTime)}
      </td>
      <td className="px-3 py-2">{row.label}</td>
      <td className="px-3 py-2">{row.total}</td>
      <td className="px-3 py-2">{row.reserved}</td>
      <td className="px-3 py-2">{row.held}</td>
      <td className="px-3 py-2">{pending(row)}</td>
      <td className="px-3 py-2 font-medium">
        {row.remaining} of {row.total}
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
            row.error || !row.remaining ? "text-red-700" : "text-green-700"
          }
        >
          {row.error || !row.remaining ? "Unavailable" : "Available"}
        </span>
      </td>
    </tr>
  );
  return (
    <section
      className={`min-w-0 rounded-xl border border-gray-200 bg-white ${standalone ? "p-5 shadow-sm sm:p-6" : "my-5 p-4 sm:p-5"}`}
      aria-label={title}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-4 ${standalone ? "mb-6" : "mb-3"}`}
      >
        <div>
          <h2
            className={`${standalone ? "text-xl" : "text-base"} font-semibold text-gray-900`}
          >
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {managePath && (
            <Link
              to={managePath}
              className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Manage services
            </Link>
          )}
          {exportable && (
            <button
              type="button"
              onClick={exportExcel}
              disabled={
                inventory.loading ||
                Boolean(inventory.error) ||
                !filtered.length
              }
              className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Export availability Excel
            </button>
          )}
        </div>
      </div>
      <div
        className={
          standalone
            ? "mb-6 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(300px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)]"
            : "mb-3 flex flex-wrap gap-3"
        }
      >
        {standalone ? (
          <div className="min-w-0">
            <label
              htmlFor="manager-service-date"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              View date
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="manager-service-date"
                aria-label="Service availability date"
                type="date"
                value={date}
                onChange={(event) =>
                  event.target.value && setDate(event.target.value)
                }
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => shiftDate(-1)}
                className="rounded-lg border border-gray-300 bg-white p-2.5 text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next day"
                onClick={() => shiftDate(1)}
                className="rounded-lg border border-gray-300 bg-white p-2.5 text-gray-700 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setDate(
                    new Date(Date.now() + 8 * 3600000)
                      .toISOString()
                      .slice(0, 10),
                  )
                }
                className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Today
              </button>
            </div>
          </div>
        ) : (
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
        )}
        <label
          className={
            standalone
              ? "flex flex-col gap-1.5 text-sm font-medium text-gray-700"
              : "text-xs text-gray-600"
          }
        >
          Service
          <select
            aria-label="Service availability filter"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className={
              standalone
                ? "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                : "ml-2 max-w-48 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            }
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
        <label
          className={
            standalone
              ? "flex flex-col gap-1.5 text-sm font-medium text-gray-700"
              : "text-xs text-gray-600"
          }
        >
          Session
          <select
            aria-label="Service session filter"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={
              standalone
                ? "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                : "ml-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            }
          >
            <option value="all">All sessions</option>
            {[...new Set(rows.map((row) => row.time))].sort().map((value) => (
              <option key={value} value={value}>{activityTimeLabel(value)}</option>
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
          {standalone && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Scheduled sessions", value: filtered.length },
                { label: "Available units", value: availableUnits },
                { label: "Reserved units", value: reservedUnits },
                { label: "Unavailable", value: unavailableSessions },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
          {unconfigured.length > 0 && (
            <p role="status" className="mb-3 text-xs text-amber-800">
              Schedule/quantity not configured:{" "}
              {unconfigured.map((item) => item.name).join(", ")}. These items
              cannot be booked online.
            </p>
          )}
          {standalone && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-700">
                {serviceGroups.size} service
                {serviceGroups.size === 1 ? "" : "s"} · {filtered.length}{" "}
                session{filtered.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                disabled={serviceGroups.size === 0}
                onClick={() =>
                  setCollapsedServices(
                    allServicesCollapsed
                      ? new Set()
                      : new Set(serviceGroups.keys()),
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allServicesCollapsed ? "Expand all" : "Collapse all"}
              </button>
            </div>
          )}
          <div
            className={`${standalone ? "max-h-[70vh]" : "max-h-80"} overflow-auto rounded-lg border border-gray-200`}
          >
            <table
              className={`w-full min-w-[760px] text-left ${standalone ? "text-sm" : "text-xs"}`}
            >
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
                      className={`whitespace-nowrap px-3 font-medium ${standalone ? "py-3" : "py-2"}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standalone
                  ? [...serviceGroups].map(([key, group]) => (
                      <Fragment key={key}>
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <th
                            colSpan={9}
                            scope="rowgroup"
                            className="px-3 py-2 text-left"
                          >
                            <button
                              type="button"
                              aria-expanded={!collapsedServices.has(key)}
                              aria-label={`${collapsedServices.has(key) ? "Expand" : "Collapse"} ${group[0].name} sessions`}
                              onClick={() => toggleService(key)}
                              className="flex w-full items-center gap-2 rounded py-1 text-left font-semibold text-gray-800 hover:text-blue-700"
                            >
                              {collapsedServices.has(key) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              <span>{group[0].name}</span>
                              <span className="font-normal text-gray-500">
                                ({group.length} session
                                {group.length === 1 ? "" : "s"})
                              </span>
                            </button>
                          </th>
                        </tr>
                        {!collapsedServices.has(key) && group.map(renderRow)}
                      </Fragment>
                    ))
                  : filtered.map(renderRow)}
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
        </>
      )}
    </section>
  );
}
