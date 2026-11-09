import { collectedBookingAmount, displayRecordId } from "./bookingAvailability";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { getBookingSnapshot, getPaymentSnapshot } from "./bookingStore";

export function servicePackageRevenue(records: Record<string, any>[]) {
  const totals = new Map<
    string,
    {
      type: "Service" | "Package";
      name: string;
      bookings: number;
      collected: number;
    }
  >();
  for (const record of records) {
    if (
      ["cancelled", "canceled", "rejected"].includes(
        String(record.status || "").toLowerCase(),
      )
    )
      continue;
    const total = Number(
      record.totalPrice ?? record.totalAmount ?? record.total ?? 0,
    );
    const paid = collectedBookingAmount(record);
    if (!(total > 0 && paid > 0)) continue;
    const kind = [record.itemType, record.bookingType]
      .map((value) => String(value || "").trim().toLowerCase())
      .find((value) => ["service", "activity", "package"].includes(value)) || "";
    const items: {
      type: "Service" | "Package";
      name: string;
      price: number;
    }[] = [];
    if (["service", "activity", "package"].includes(kind)) {
      const name = String(
        record.packageName ||
          record.serviceName ||
          record.activityName ||
          record.itemName ||
          "",
      ).trim();
      const subtotal = Number(record.subtotal);
      const price =
        Number.isFinite(subtotal) && subtotal > 0
          ? subtotal
          : Math.max(0, total - Number(record.reservationFee || 0));
      if (name && price > 0)
        items.push({
          type: kind === "package" ? "Package" : "Service",
          name,
          price,
        });
    } else if (Array.isArray(record.addOns)) {
      for (const item of record.addOns) {
        const name = String(item.name || "").trim();
        const price = Number(item.price || 0);
        if (name && price > 0)
          items.push({
            type:
              String(item.type || "").toLowerCase() === "package"
                ? "Package"
                : "Service",
            name,
            price,
          });
      }
    }
    for (const item of items) {
      const key = `${item.type}:${item.name.toLowerCase()}`;
      const row = totals.get(key) || {
        type: item.type,
        name: item.name,
        bookings: 0,
        collected: 0,
      };
      row.bookings++;
      row.collected += Math.round((item.price / total) * paid * 100) / 100;
      totals.set(key, row);
    }
  }
  return [...totals.values()].sort(
    (a, b) => b.collected - a.collected || a.name.localeCompare(b.name),
  );
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
  if (!kind.includes("Reservation"))
    throw new Error("This report type is no longer available.");
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

const excelXml = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!,
    );

const excelColumn = (index: number) => {
  let result = "";
  for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26))
    result = String.fromCharCode(65 + ((number - 1) % 26)) + result;
  return result;
};

// A small uncompressed ZIP writer keeps Excel exports free of extra dependencies.
const zipFiles = (files: [string, string][]): Uint8Array => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value >>> 0, true);
  const crc32 = (bytes: Uint8Array) => {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ -1) >>> 0;
  };
  for (const [name, content] of files) {
    const filename = encoder.encode(name);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + filename.length);
    const localView = new DataView(local.buffer);
    u32(localView, 0, 0x04034b50);
    u16(localView, 4, 20);
    u16(localView, 6, 0x0800);
    u32(localView, 14, checksum);
    u32(localView, 18, data.length);
    u32(localView, 22, data.length);
    u16(localView, 26, filename.length);
    local.set(filename, 30);
    chunks.push(local, data);
    const central = new Uint8Array(46 + filename.length);
    const centralView = new DataView(central.buffer);
    u32(centralView, 0, 0x02014b50);
    u16(centralView, 4, 20);
    u16(centralView, 6, 20);
    u16(centralView, 8, 0x0800);
    u32(centralView, 16, checksum);
    u32(centralView, 20, data.length);
    u32(centralView, 24, data.length);
    u16(centralView, 28, filename.length);
    u32(centralView, 42, offset);
    central.set(filename, 46);
    directory.push(central);
    offset += local.length + data.length;
  }
  const directorySize = directory.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50);
  u16(endView, 8, files.length);
  u16(endView, 10, files.length);
  u32(endView, 12, directorySize);
  u32(endView, 16, offset);
  const result = new Uint8Array(offset + directorySize + end.length);
  let position = 0;
  for (const part of [...chunks, ...directory, end]) {
    result.set(part, position);
    position += part.length;
  }
  return result;
};

type ExcelSheet = { name: string; rows: unknown[][] };

export function excelWorkbookSheets(name: string, sheets: ExcelSheet[], period = ""): Uint8Array {
  const worksheetFiles = sheets.map((sheet, sheetIndex): [string, string] => [
    `xl/worksheets/sheet${sheetIndex + 1}.xml`,
    excelWorksheet(sheet.name === "Report" ? name : sheet.name, sheet.rows, period),
  ]);
  const contentTypes = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${excelXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const relationships = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  return zipFiles([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${contentTypes}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ...worksheetFiles,
    ["xl/styles.xml", excelStyles],
  ]);
}

function excelWorksheet(name: string, rows: unknown[][], period: string): string {
  const headers = rows[0] || [];
  const data = rows.slice(1);
  const columns = Math.max(1, ...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, index) =>
    Math.min(42, Math.max(13, ...rows.map((row) => String(row[index] ?? "").length + 2))),
  );
  const cell = (value: unknown, row: number, column: number, style = 0) => {
    const reference = `${excelColumn(column)}${row}`;
    if (typeof value === "number" && Number.isFinite(value))
      return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
    return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${excelXml(value)}</t></is></c>`;
  };
  const title = `<row r="1" ht="28" customHeight="1">${cell(name, 1, 0, 3)}</row>`;
  const periodRow = `<row r="2">${cell(period || "All recorded dates", 2, 0)}</row>`;
  const generated = `<row r="3">${cell(`Generated ${new Date().toLocaleString("en-PH")}`, 3, 0)}</row>`;
  const headerRow = `<row r="5">${headers.map((value, column) => cell(value, 5, column, 1)).join("")}</row>`;
  const dataRows = data.map((values, index) =>
    `<row r="${index + 6}">${values.map((value, column) =>
      cell(value, index + 6, column, typeof value === "number" && /amount|paid|balance|total|revenue|received|price|collection|collected|commission|booking.value/i.test(String(headers[column] || "")) ? 2 : 0),
    ).join("")}</row>`,
  ).join("");
  const lastColumn = excelColumn(columns - 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${title}${periodRow}${generated}${headerRow}${dataRows}</sheetData><autoFilter ref="A5:${lastColumn}${Math.max(5, data.length + 5)}"/>${columns > 1 ? `<mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells>` : ""}</worksheet>`;
}

const excelStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D7377"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;

export function excelWorkbook(name: string, rows: unknown[][], period = ""): Uint8Array {
  return excelWorkbookSheets(name, [{ name: "Report", rows }], period);
}

export function exportWorkbook(name: string, sheets: ExcelSheet[], period = "") {
  const filename = name.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Report";
  const workbook = excelWorkbookSheets(name, sheets, period);
  downloadFile(workbook.buffer as ArrayBuffer, filename + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function exportReport(name: string, rows: unknown[][], period = "") {
  exportWorkbook(name, [{ name: "Report", rows }], period);
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
