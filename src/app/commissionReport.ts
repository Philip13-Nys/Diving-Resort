import { displayRecordId } from "./bookingAvailability";
import {
  bookingRoomLabel,
  dateOnly,
  moneyCents,
  normalizeBookingValue,
  type BookingRecord,
} from "./bookingAvailability";

export function commissionRows(
  bookings: BookingRecord[],
  month: number,
  year: number,
) {
  const period = `${year}-${String(month + 1).padStart(2, "0")}`;
  return bookings
    .filter((booking) => {
      const status = normalizeBookingValue(booking.status);
      return (
        !["cancelled", "canceled", "rejected"].includes(status) &&
        dateOnly(booking.checkIn).slice(0, 7) === period
      );
    })
    .flatMap((booking) => {
      const rawAmount = booking.commissionAmount;
      if (rawAmount === undefined || rawAmount === null || rawAmount === "")
        return [];
      let cents: number;
      try {
        cents = moneyCents(rawAmount);
      } catch {
        return [];
      }
      if (cents === 0) return [];
      return [
        {
          id: String(booking.id),
          reference: displayRecordId(booking.id),
          commissioner:
            String(booking.commissionerName || "").trim() ||
            "Unassigned commissioner",
          guest: String(booking.customerName || booking.guestName || "Guest"),
          room: bookingRoomLabel(booking),
          checkIn: dateOnly(booking.checkIn),
          checkOut: dateOnly(booking.checkOut),
          source: String(
            booking.bookingType || booking.bookingSource || "Online",
          ),
          status: normalizeBookingValue(booking.status),
          bookingValue: Number(
            booking.totalPrice ?? booking.totalAmount ?? booking.total ?? 0,
          ),
          commission: cents / 100,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.checkIn.localeCompare(b.checkIn) ||
        a.reference.localeCompare(b.reference),
    );
}
export type CommissionRow = ReturnType<typeof commissionRows>[number];
export function groupCommissions(rows: CommissionRow[]) {
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      bookings: number;
      bookingValue: number;
      commission: number;
    }
  >();
  for (const row of rows) {
    const key = row.commissioner.trim().toLocaleLowerCase();
    const group = groups.get(key) || {
      key,
      name: row.commissioner,
      bookings: 0,
      bookingValue: 0,
      commission: 0,
    };
    group.bookings++;
    group.bookingValue =
      Math.round((group.bookingValue + row.bookingValue) * 100) / 100;
    group.commission =
      (moneyCents(group.commission) + moneyCents(row.commission)) / 100;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.commission - a.commission || a.name.localeCompare(b.name),
  );
}
export function commissionCsv(rows: CommissionRow[], period: string): string {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const records: unknown[][] = [
    ["Commission Report", period],
    ["Basis", "Check-in month; recorded commissions are not proof of payout"],
    [
      "Commissioner",
      "Booking Reference",
      "Guest",
      "Room(s)",
      "Check-in",
      "Check-out",
      "Source",
      "Status",
      "Booking Value (PHP)",
      "Commission (PHP)",
    ],
    ...rows.map((row) => [
      row.commissioner,
      row.reference,
      row.guest,
      row.room,
      row.checkIn,
      row.checkOut,
      row.source,
      row.status,
      row.bookingValue.toFixed(2),
      row.commission.toFixed(2),
    ]),
    [
      "Total",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      (
        rows.reduce((sum, row) => sum + moneyCents(row.commission), 0) / 100
      ).toFixed(2),
    ],
  ];
  return (
    "\uFEFF" + records.map((record) => record.map(cell).join(",")).join("\r\n")
  );
}
