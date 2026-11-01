import { watchRecords } from "../bookingStore";
import { mergeBookingDocuments } from "../bookingStore";
import { useEffect, useMemo, useState } from "react";
import { type QueryDocumentSnapshot } from "firebase/firestore";
import { CalendarDays, Download, Loader2, RefreshCw, X } from "lucide-react";
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
  commissionCsv,
} from "../commissionReport";
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
    const emit = () => {
      setBookings(
        mergeBookingDocuments(parts.customer, parts.staff).map((document) => ({
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
          emit();
        },
        (failure) => {
          console.error("Unable to load commissions", failure);
          failures.set(
            key,
            "Unable to load " +
              (key === "staff" ? "Walk-in" : "online") +
              " commission records. Check your connection and permissions.",
          );
          emit();
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
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([commissionCsv(rows, period)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `commission-report-${year}-${String(month + 1).padStart(2, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
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
          onClick={exportCsv}
          disabled={Boolean(error) || !rows.length}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white disabled:opacity-50"
        >
          <Download className="size-4" />
          Export CSV
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
      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4">
        <CalendarDays className="mb-2 size-5 text-cyan-600" />
        <label className="text-sm text-gray-600">
          Month
          <select
            value={month}
            onChange={(event) => {
              setMonth(Number(event.target.value));
              setDetailKey(null);
            }}
            className="mt-1 block rounded-lg border px-3 py-2"
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
            className="mt-1 block rounded-lg border px-3 py-2"
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p className="mb-2 text-sm text-gray-500">
          {period} · Updates automatically when bookings change
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Recorded Commission", value: peso(total) },
          { label: "Commissioned Bookings", value: rows.length },
          { label: "Commissioners", value: groups.length },
          { label: "Related Booking Value", value: peso(bookingValue) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {error ? "—" : item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Commission by Month</h2>
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
              fill="#0891b2"
            />
          </BarChart>
        </ResponsiveContainer>
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
                    <td className="px-5 py-4 font-semibold text-cyan-700">
                      {peso(group.commission)}
                    </td>
                    <td className="px-5 py-4">
                      <AsyncButton
                        onClick={() => setDetailKey(group.key)}
                        className="text-cyan-700"
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
                rows.map((row) => (
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
                  <span className="font-medium text-cyan-700">
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
