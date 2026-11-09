import { requireAccess } from "./auth";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { auth, db, customerDb } from "./firebase";
export const backupCollections = [
  "Users",
  "Staff",
  "Guests",
  "rooms",
  "roomTypes",
  "reservations",
  "Payments",
  "services",
  "packages",
  "pricingRules",
  "settings",
  "systemSettings",
  "publicSettings",
  "paymentSettings",
  "ActivityLogs",
  "DisplayReferences",
  "DisplayCounters",
];
export type LocalBackup = {
  version: 1;
  createdAt: string;
  projects: Record<string, string>;
  records: { store: string; path: string; data: any }[];
};
function encode(value: any): any {
  if (value instanceof Timestamp)
    return { __firestoreTimestamp: [value.seconds, value.nanoseconds] };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, encode(item)]),
    );
  return value;
}
function decode(value: any): any {
  if (value?.__firestoreTimestamp)
    return new Timestamp(
      value.__firestoreTimestamp[0],
      value.__firestoreTimestamp[1],
    );
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, decode(item)]),
    );
  return value;
}
export async function createLocalBackup(): Promise<LocalBackup> {
  await requireAccess("admin");
  const records: LocalBackup["records"] = [];
  // Sequential collection reads avoid a sudden burst against the free quota.
  for (const [name, store, collections] of [
    ["staff", db, backupCollections],
    [
      "customer",
      customerDb,
      ["Bookings", "Payments", "Inquiries", "Notifications"],
    ],
  ] as const) {
    for (const path of collections) {
      const snapshot = await getDocs(collection(store, path));
      for (const record of snapshot.docs) {
        records.push({
          store: name,
          path: record.ref.path,
          data: encode(record.data()),
        });
        if (path === "Inquiries") {
          const replies = await getDocs(
            collection(store, path, record.id, "replies"),
          );
          replies.docs.forEach((reply) =>
            records.push({
              store: name,
              path: reply.ref.path,
              data: encode(reply.data()),
            }),
          );
        }
      }
    }
  }
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    projects: {
      staff: db.app.options.projectId!,
      customer: customerDb.app.options.projectId!,
    },
    records,
  };
}
export function validateBackup(value: any): asserts value is LocalBackup {
  if (
    value?.version !== 1 ||
    !Array.isArray(value.records) ||
    value.records.length > 50000
  )
    throw new Error("Invalid or oversized backup.");
  for (const row of value.records) {
    if (
      !["staff", "customer"].includes(row.store) ||
      typeof row.path !== "string" ||
      !row.data ||
      typeof row.data !== "object" ||
      Array.isArray(row.data)
    )
      throw new Error("Invalid backup record.");
    const parts = row.path.split("/");
    if (
      parts.some((part: string) => !part || part === "." || part === "..") ||
      (parts.length !== 2 &&
        !(
          row.store === "customer" &&
          parts.length === 4 &&
          parts[0] === "Inquiries" &&
          parts[2] === "replies"
        ))
    )
      throw new Error("Invalid document path in backup.");
    const allowed =
      row.store === "staff"
        ? backupCollections
        : ["Bookings", "Payments", "Inquiries", "Notifications"];
    if (!allowed.includes(parts[0]))
      throw new Error("Unrecognized collection in backup.");
  }
}
export async function restoreMissingStaffRecords(value: LocalBackup) {
  await requireAccess("admin");
  validateBackup(value);
  if (!auth.currentUser) throw new Error("Sign in again before restoring.");
  if (value.projects.staff !== db.app.options.projectId)
    throw new Error("This backup belongs to another project.");
  let restored = 0;
  for (const record of value.records.filter(
    (row) => row.store === "staff" && row.path.split("/")[0] !== "Users",
  )) {
    try {
      const added = await runTransaction(db, async (transaction) => {
        const reference = doc(db, record.path);
        const current = await transaction.get(reference);
        if (current.exists()) return false;
        transaction.set(reference, decode(record.data()));
        return true;
      });
      if (added) restored++;
    } catch (error) {
      throw new Error(
        `${restored} missing records restored before a failure. Existing records were preserved. Retry is safe. ${error instanceof Error ? error.message : ""}`,
      );
    }
  }
  return restored;
}
