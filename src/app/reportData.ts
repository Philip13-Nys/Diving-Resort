import { displayRecordId } from "./bookingAvailability";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { getBookingSnapshot, getPaymentSnapshot } from "./bookingStore";

export function servicePackageRevenue(records: Record<string, any>[]) {
  const totals = new Map<string, { type: "Service" | "Package"; name: string; bookings: number; collected: number }>();
  for (const record of records) {
    if (["cancelled", "canceled", "rejected"].includes(String(record.status || "").toLowerCase())) continue;
    const total = Number(record.totalPrice ?? record.totalAmount ?? record.total ?? 0);
    const paid = Math.max(0, Math.min(total, Number(record.amountPaid ?? record.paid ?? 0)));
    if (!(total > 0 && paid > 0)) continue;
    const kind = String(record.bookingType || record.itemType || "").toLowerCase();
    const items: { type: "Service" | "Package"; name: string; price: number }[] = [];
    if (["service", "activity", "package"].includes(kind)) {
      const name = String(record.packageName || record.serviceName || record.activityName || record.itemName || "").trim();
      const subtotal = Number(record.subtotal);
      const price = Number.isFinite(subtotal) && subtotal > 0
        ? subtotal : Math.max(0, total - Number(record.reservationFee || 0));
      if (name && price > 0) items.push({ type: kind === "package" ? "Package" : "Service", name, price });
    } else if (Array.isArray(record.addOns)) {
      for (const item of record.addOns) {
        const name = String(item.name || "").trim();
        const price = Number(item.price || 0);
        if (name && price > 0) items.push({ type: String(item.type || "").toLowerCase() === "package" ? "Package" : "Service", name, price });
      }
    }
    for (const item of items) {
      const key = `${item.type}:${item.name.toLowerCase()}`;
      const row = totals.get(key) || { type: item.type, name: item.name, bookings: 0, collected: 0 };
      row.bookings++;
      row.collected += Math.round(item.price / total * paid * 100) / 100;
      totals.set(key, row);
    }
  }
  return [...totals.values()].sort((a, b) => b.collected - a.collected || a.name.localeCompare(b.name));
}
import {
  bookingRoomLabel,
  dateOnly,
  normalizeInventory,
  roomBookingsOnDate,
  localDate,
  bookingTotal,
  bookingPaid,
  cancelled,
  completedPayment,
} from "./bookingAvailability";
export async function reportRows(
  kind: string,
  start = "",
  end = "",
): Promise<unknown[][]> {
  if (start && end && end < start)
    throw new Error("End date must be on or after the start date.");
  const inside = (value: any) => {
    const date = dateOnly(value);
    return (!start || date >= start) && (!end || (date && date <= end));
  };
  if (kind.includes("Maintenance")) {
    const docs = await getDocs(collection(db, "maintenanceRequests"));
    return [
      ["Request", "Room", "Issue", "Status", "Assigned to", "Created"],
      ...docs.docs
        .filter((doc) => inside(doc.data().createdAt))
        .map((doc) => {
          const d = doc.data();
          return [
            d.requestNumber || doc.id,
            d.roomId,
            d.issue,
            d.status,
            d.assignedTo,
            dateOnly(d.createdAt),
          ];
        }),
    ];
  }
  if (kind.includes("Staff")) {
    const docs = await getDocs(collection(db, "ActivityLogs"));
    return [
      ["Staff", "Action", "Details", "Status", "Date"],
      ...docs.docs
        .filter((doc) => inside(doc.data().createdAt ?? doc.data().timestamp))
        .map((doc) => {
          const d = doc.data();
          return [
            d.userName || d.name || d.user,
            d.action,
            d.details,
            d.status,
            dateOnly(d.createdAt ?? d.timestamp),
          ];
        }),
    ];
  }
  if (kind.includes("Revenue")) {
    const docs = await getPaymentSnapshot(true);
    return [
      [
        "Receipt",
        "Booking",
        "Guest",
        "Amount received",
        "Method",
        "Date",
        "Source",
      ],
      ...docs.docs
        .filter(
          (doc) =>
            completedPayment(doc.data()) &&
            inside(doc.data().createdAt ?? doc.data().date),
        )
        .map((doc) => {
          const d = doc.data();
          return [
            displayRecordId(d.receiptNo || doc.id, "RCP"),
            displayRecordId(d.bookingId),
            d.guest || d.customerName,
            d.amount,
            d.method || d.paymentMethod,
            dateOnly(d.createdAt ?? d.date),
            d._bookingStore,
          ];
        }),
    ];
  }
  const docs = await getBookingSnapshot(true);
  const records: Record<string, any>[] = docs.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  }));
  if (kind.includes("Occupancy")) {
    const [rooms, types] = await Promise.all([
      getDocs(collection(db, "rooms")),
      getDocs(collection(db, "roomTypes")),
    ]);
    const inventory = normalizeInventory(
      rooms.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      types.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    );
    const first = start || localDate(),
      last = end || first;
    const count =
      Math.round((Date.parse(last) - Date.parse(first)) / 86400000) + 1;
    if (!Number.isFinite(count) || count < 1 || count > 366)
      throw new Error("Choose an occupancy range of up to one year.");
    const rows: unknown[][] = [
      ["Date", "Room", "Type", "Reservation status", "Guest", "Room condition"],
    ];
    for (let i = 0; i < count; i++) {
      const date = new Date(Date.parse(first) + i * 86400000)
        .toISOString()
        .slice(0, 10);
      const bookings = roomBookingsOnDate(inventory, records, date);
      for (const room of inventory) {
        const b = bookings.get(room.id);
        rows.push([
          date,
          room.roomNumber,
          room.type,
          b?.status || "unreserved",
          b?.customerName || "",
          room.status,
        ]);
      }
    }
    return rows;
  }
  const bookings = records.filter(
    (record) => inside(record.checkIn) && !cancelled(record),
  );
  if (kind.includes("Guest"))
    return [
      ["Guest", "Email", "Phone", "Arrival", "Room", "Paid"],
      ...bookings.map((b) => [
        b.customerName,
        b.customerEmail || b.email,
        b.customerPhone || b.phone,
        dateOnly(b.checkIn),
        bookingRoomLabel(b),
        bookingPaid(b),
      ]),
    ];
  return [
    [
      "Booking",
      "Guest",
      "Room",
      "Arrival",
      "Departure",
      "Status",
      "Total",
      "Paid",
      "Balance",
      "Source",
    ],
    ...bookings.map((b) => [
      displayRecordId(b.id),
      b.customerName,
      bookingRoomLabel(b),
      dateOnly(b.checkIn),
      dateOnly(b.checkOut),
      b.status,
      bookingTotal(b),
      bookingPaid(b),
      Math.max(0, bookingTotal(b) - bookingPaid(b)),
      b._bookingStore,
    ]),
  ];
}

export function exportReport(name: string, rows: unknown[][], format: string) {
  const filename = name.replace(/[^\p{L}\p{N}_-]+/gu, "_");
  if (format === "PDF") {
    printTable(name, rows);
    return;
  }
  if (format === "Excel") {
    const escape = (v: unknown) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[char]!,
      );
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>${rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escape(cell)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
    downloadFile(xml, filename + ".xml", "application/vnd.ms-excel");
    return;
  }
  downloadFile(toCsv(rows), filename + ".csv");
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function toCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function downloadFile(
  content: BlobPart,
  filename: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function printTable(
  title: string,
  rows: unknown[][],
  target?: Window | null,
) {
  const popup = target ?? window.open("", "_blank");
  if (!popup)
    throw new Error("Allow pop-ups to print or save this report as PDF.");
  const escape = (value: unknown) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  popup.document.open();
  popup.document.write(
    `<html><head><title>${escape(title)}</title><style>body{font:12px sans-serif}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:6px}tr{break-inside:avoid}</style></head><body><h1>${escape(title)}</h1><table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</table></body></html>`,
  );
  popup.document.close();
  popup.focus();
  popup.print();
}
