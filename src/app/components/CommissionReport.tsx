import { ensureRecordReferences } from "../bookingStore";
import { watchRecords } from "../bookingStore";
import { mergeBookingDocuments } from "../bookingStore";
import { useEffect, useMemo, useState } from "react";
import { type QueryDocumentSnapshot } from "firebase/firestore";
import { Download, Loader2, RefreshCw, X } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { AsyncButton } from "./ui/async-action";
import {
  commissionRows,
  groupCommissions,
} from "../commissionReport";
import { exportWorkbook } from "../reportData";
import {
  dateOnly,
  moneyCents,
  type BookingRecord,
} from "../bookingAvailability";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const peso = (value: number) =>
  value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
const currentYear = new Date().getFullYear();

export default function CommissionReport() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(currentYear);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError("");
    const parts: Record<"customer" | "staff", QueryDocumentSnapshot[]> = {
      customer: [],
      staff: [],
    };
    const ready = new Set<string>();
    const failures = new Map<string, string>();
    const emit = async () => {
      const merged = mergeBookingDocuments(parts.customer, parts.staff);
      if (ready.size === 2) await ensureRecordReferences("BK", merged.map(document => document.id));
      setBookings(
        merged.map((document) => ({
          ...document.data(),
          id: document.id,
        })),
      );
      setError([...failures.values()].join(" "));
      setLoading(ready.size < 2 && failures.size === 0);
    };
    const sources = [
      ["customer", "customer:Bookings"],
      ["staff", "admin:reservations"],
    ] as const;
    const stops = sources.map(([key, reference]) =>
      watchRecords(
        reference,
        (snapshot) => {
          parts[key] = snapshot.docs;
          ready.add(key);
          failures.delete(key);
          void emit().catch(error => { setError(String(error)); setLoading(false); });
        },
        (failure) => {
          console.error("Unable to load commissions", failure);
          failures.set(
            key,
            "Unable to load " +
              (key === "staff" ? "Walk-in" : "online") +
              " commission records. Check your connection and permissions.",
          );
          void emit().catch(error => { setError(String(error)); setLoading(false); });
        },
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [retry]);
  const rows = useMemo(
    () => commissionRows(bookings, month, year),
    [bookings, month, year],
  );
  const groups = useMemo(() => groupCommissions(rows), [rows]);
  const total =
    rows.reduce((sum, row) => sum + moneyCents(row.commission), 0) / 100;
  const bookingValue = rows.reduce((sum, row) => sum + row.bookingValue, 0);
  const detail = groups.find((group) => group.key === detailKey);
  const detailRows = detail
    ? rows.filter(
        (row) => row.commissioner.trim().toLocaleLowerCase() === detail.key,
      )
    : [];
  const period = months[month] + " " + year;
  const invalid = bookings.filter((booking) => {
    if (
      dateOnly(booking.checkIn).slice(0, 7) !==
      `${year}-${String(month + 1).padStart(2, "0")}`
    )
      return false;
    if (booking.commissionAmount == null || booking.commissionAmount === "")
      return false;
    try {
      moneyCents(booking.commissionAmount);
      return false;
    } catch {
      return true;
    }
  }).length;
  const trend = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date(year, month - 5 + index, 1);
        return {
          month: months[date.getMonth()].slice(0, 3) + " " + date.getFullYear(),
          commission:
            commissionRows(
              bookings,
              date.getMonth(),
              date.getFullYear(),
            ).reduce((sum, row) => sum + moneyCents(row.commission), 0) / 100,
        };
      }),
    [bookings, month, year],
  );
  const years = [
    ...new Set([
      currentYear - 1,
      currentYear,
      currentYear + 1,
      ...bookings
        .map((booking) => Number(dateOnly(booking.checkIn).slice(0, 4)))
        .filter(
          (value) => Number.isInteger(value) && value >= 2000 && value <= 2100,
        ),
    ]),
  ].sort((a, b) => b - a);
  const exportExcel = () => exportWorkbook(`Commission Report ${period}`, [
    { name: "Summary", rows: [
      ["Commissioner", "Bookings", "Booking value", "Commission"],
      ...groups.map((group) => [group.name, group.bookings, group.bookingValue, group.commission]),
    ] },
    { name: "Bookings", rows: [
      ["Commissioner", "Booking Reference", "Guest", "Room(s)", "Check-in", "Check-out", "Source", "Status", "Booking Value (PHP)", "Commission (PHP)"],
      ...rows.map((row) => [row.commissioner, row.reference, row.guest, row.room, row.checkIn, row.checkOut, row.source, row.status, row.bookingValue, row.commission]),
    ] },
  ], period);
  if (loading)
    return (
      <div
        className="flex items-center justify-center gap-3 py-20 text-gray-500"
        role="status"
      >
        <Loader2 className="size-5 animate-spin" />
        Loading commission records…
      </div>
    );
  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Commission Report
          </h1>
          <p className="mt-1 text-gray-600">
            Recorded referral commissions from online and Walk-in bookings.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Grouped by check-in month. Cancelled and rejected bookings are
            excluded. Recorded commission is not proof of payout.
          </p>
        </div>
        <AsyncButton
          onClick={exportExcel}
          disabled={Boolean(error) || !rows.length}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          Export Excel
        </AsyncButton>
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>
          <AsyncButton
            onClick={() => setRetry((value) => value + 1)}
            className="flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            Retry
          </AsyncButton>
        </div>
      )}
      {invalid > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {invalid} booking(s) have invalid commission amounts and are excluded.
          Correct those records before using this report.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <label className="text-sm text-gray-600">
          Month
          <select
            value={month}
            onChange={(event) => {
              setMonth(Number(event.target.value));
              setDetailKey(null);
            }}
            className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            {months.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600">
          Year
          <select
            value={year}
            onChange={(event) => {
              setYear(Number(event.target.value));
              setDetailKey(null);
            }}
            className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-gray-500 sm:pb-2">
          {period} · Updates automatically when bookings change
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Recorded Commission", value: peso(total) },
          { label: "Commissioned Bookings", value: rows.length },
          { label: "Commissioners", value: groups.length },
          { label: "Related Booking Value", value: peso(bookingValue) },
        ].map((item) => (
          <div key={item.label} className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 break-words text-2xl font-bold text-gray-900">
              {error ? "—" : item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Commission by Month</h2>
        {trend.some((point) => point.commission > 0) ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
              />
              <Tooltip formatter={(value) => peso(Number(value))} />
              <Bar
                dataKey="commission"
                name="Recorded Commission"
                fill="#2563eb"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {error ? "Commission trend unavailable." : "No commissions recorded in the last six months."}
          </p>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Commissioners</h2>
          <p className="mt-1 text-sm text-gray-500">
            Uses the commissioner name and commission amount saved with each
            booking.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {[
                  "Commissioner",
                  "Bookings",
                  "Booking Value",
                  "Commission",
                  "Details",
                ].map((title) => (
                  <th key={title} className="px-5 py-3 font-medium">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {!error &&
                groups.map((group) => (
                  <tr key={group.key}>
                    <td className="px-5 py-4 font-medium">{group.name}</td>
                    <td className="px-5 py-4">{group.bookings}</td>
                    <td className="px-5 py-4">{peso(group.bookingValue)}</td>
                    <td className="px-5 py-4 font-semibold text-blue-700">
                      {peso(group.commission)}
                    </td>
                    <td className="px-5 py-4">
                      <AsyncButton
                        onClick={() => setDetailKey(group.key)}
                        className="text-blue-700 hover:underline"
                      >
                        View bookings
                      </AsyncButton>
                    </td>
                  </tr>
                ))}
              {(!groups.length || error) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {error
                      ? "Report unavailable."
                      : "No commissions recorded for this check-in month."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <h2 className="border-b p-5 text-lg font-semibold">
          Booking Commission Details
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {[
                  "Reference",
                  "Commissioner",
                  "Guest",
                  "Room(s)",
                  "Check-in",
                  "Source",
                  "Commission",
                ].map((title) => (
                  <th key={title} className="px-4 py-3 font-medium">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {!error &&
                rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3">{row.commissioner}</td>
                    <td className="px-4 py-3">{row.guest}</td>
                    <td className="px-4 py-3">{row.room}</td>
                    <td className="px-4 py-3">{row.checkIn}</td>
                    <td className="px-4 py-3">{row.source}</td>
                    <td className="px-4 py-3 font-medium">
                      {peso(row.commission)}
                    </td>
                  </tr>
                ))}
              {(!rows.length || error) && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {error
                      ? "Report unavailable."
                      : "No commissioned bookings in this period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="commission-detail-title"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="commission-detail-title"
                className="text-xl font-semibold"
              >
                {detail.name}
              </h2>
              <AsyncButton
                aria-label="Close commissioner details"
                onClick={() => setDetailKey(null)}
              >
                <X className="size-5" />
              </AsyncButton>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {period} · {detail.bookings} booking(s) ·{" "}
              {peso(detail.commission)} recorded commission
            </p>
            <ul className="mt-5 divide-y">
              {detailRows.map((row) => (
                <li key={row.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{row.guest}</p>
                    <p className="text-xs text-gray-500">
                      {row.reference} · {row.checkIn} · {row.source}
                    </p>
                  </div>
                  <span className="font-medium text-blue-700">
                    {peso(row.commission)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
