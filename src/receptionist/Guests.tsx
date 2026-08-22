import { Search, Plus, Edit2, Phone, Mail, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

import { customerDb } from "../app/firebase";
interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  idType: string;
  idNumber: string;
  visits: number;
  lastVisit: string;
  totalSpent: number;
  tags: string[];
  notes: string;
}
 

const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  VIP: { color: "#f97316", bg: "#fff7ed" },
  Regular: { color: "#06b6d4", bg: "#ecfeff" },
  Diver: { color: "#0d7377", bg: "#e2f3f2" },
  New: { color: "#14b8a6", bg: "#f0fdfa" },
  Corporate: { color: "#4a7a7a", bg: "#f0f9f8" },
};

function GuestModal({
  guest,
  onClose,
  onSave,
}: {
  guest: Partial<Guest>;
  onClose: () => void;
  onSave: (g: Guest) => void;
}) {
  const [form, setForm] = useState<Partial<Guest>>(guest);
  const update = (k: keyof Guest, v: string | number | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3 style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}>
            {form.id ? "Edit Guest" : "New Guest"}
          </h3>
          <button onClick={onClose} style={{ color: "#4a7a7a" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: "Full Name", key: "name" as const },
            { label: "Email", key: "email" as const },
            { label: "Phone", key: "phone" as const },
            { label: "Nationality", key: "nationality" as const },
            { label: "ID Type", key: "idType" as const },
            { label: "ID Number", key: "idNumber" as const },
          ].map((f) => (
            <div key={f.key}>
              <label
                className="block text-xs mb-1"
                style={{ color: "#4a7a7a" }}
              >
                {f.label}
              </label>
              <input
                type="text"
                value={(form[f.key] as string) ?? ""}
                onChange={(e) => update(f.key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs mb-1" style={{ color: "#4a7a7a" }}>
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
              style={{
                borderColor: "rgba(13,115,119,0.2)",
                background: "#f0f9f8",
                color: "#0a2e2e",
              }}
            />
          </div>
        </div>
        <div
          className="flex justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                ...form,
                id: form.id || `G-${Date.now()}`,
                visits: form.visits ?? 0,
                totalSpent: form.totalSpent ?? 0,
                tags: form.tags ?? [],
                lastVisit: form.lastVisit ?? "—",
              } as Guest)
            }
            className="px-5 py-2 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Save Guest
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Guest | null>(null);
  const [modal, setModal] = useState<Partial<Guest> | null>(null);
  const filtered = guests.filter((g) => {
  const q = search.toLowerCase();

  return (
    (g.name ?? "").toLowerCase().includes(q) ||
    (g.email ?? "").toLowerCase().includes(q) ||
    (g.phone ?? "").toLowerCase().includes(q)
  );
});
  useEffect(() => {
  loadGuests();
}, []);

const loadGuests = async () => {
  try {
    const snapshot = await getDocs(collection(customerDb, "Bookings"));

    const guestMap = new Map<string, Guest>();

    snapshot.forEach((bookingDoc) => {
      const data = bookingDoc.data();

      const email = data.customerEmail || "";

      if (!guestMap.has(email)) {
        guestMap.set(email, {
          id: bookingDoc.id,

          name: data.customerName || "Unknown Guest",

          email,

          phone: data.customerPhone || "",

          nationality: data.nationality || "",

          idType: data.idType || "",

          idNumber: data.idNumber || "",

          visits: 1,

          lastVisit: data.checkOut || "",

          totalSpent: Number(
            data.totalPrice ??
              data.totalAmount ??
              data.total ??
              0
          ),

          tags: [],

          notes: data.notes || "",
        });
      } else {
        const guest = guestMap.get(email)!;

        guest.visits += 1;

        guest.totalSpent += Number(
          data.totalPrice ??
            data.totalAmount ??
            data.total ??
            0
        );

        guest.lastVisit = data.checkOut || guest.lastVisit;
      }
    });

    setGuests(Array.from(guestMap.values()));
  } catch (err) {
    console.error(err);
  }
};

  const saveGuest = async (g: Guest) => {
  try {
    if (g.id) {
      await updateDoc(doc(customerDb, "Bookings", g.id), {
        customerName: g.name,
        customerEmail: g.email,
        customerPhone: g.phone,
        nationality: g.nationality,
        idType: g.idType,
        idNumber: g.idNumber,
        notes: g.notes,
      });
    } else {
      await addDoc(collection(customerDb, "Bookings"), {
        customerName: g.name,
        customerEmail: g.email,
        customerPhone: g.phone,
        nationality: g.nationality,
        idType: g.idType,
        idNumber: g.idNumber,
        notes: g.notes,
      });
    }

    loadGuests();
    setModal(null);
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="flex gap-6" style={{ minHeight: "calc(100vh - 140px)" }}>
      {modal && (
        <GuestModal
          guest={modal}
          onClose={() => setModal(null)}
          onSave={saveGuest}
        />
      )}

      {/* List */}
      <div
        className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl border flex flex-col"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        <div
          className="p-4 border-b space-y-3"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#4a7a7a" }}
            />
            <input
              type="text"
              placeholder="Search guests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
              style={{
                borderColor: "rgba(13,115,119,0.2)",
                background: "#f0f9f8",
                color: "#0a2e2e",
              }}
            />
          </div>
          <button
            onClick={() => setModal({})}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            <Plus className="w-4 h-4" /> Add Guest
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[rgba(13,115,119,0.08)]">
          {filtered.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              className="w-full text-left p-4 transition-all"
              style={{
                background: selected?.id === g.id ? "#f0f9f8" : "transparent",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{ background: "#e2f3f2", color: "#0d7377" }}
                >
                  {g.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "#0a2e2e" }}
                  >
                    {g.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#4a7a7a" }}>
                    {g.email}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {g.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 rounded"
                        style={{
                          background: TAG_COLORS[t]?.bg,
                          color: TAG_COLORS[t]?.color,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                {g.visits >= 5 && (
                  <Star
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#f97316" }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div
        className="flex-1 bg-white rounded-xl border"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        {!selected ? (
          <div
            className="flex-1 flex items-center justify-center h-full flex-col gap-3"
            style={{ color: "#4a7a7a" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "#e2f3f2" }}
            >
              <Search className="w-8 h-8" style={{ color: "#0d7377" }} />
            </div>
            <p className="text-sm">Select a guest to view profile</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div
              className="p-6 border-b"
              style={{
                background: "linear-gradient(135deg, #0a2e2e 0%, #0d7377 100%)",
                borderColor: "transparent",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium"
                  style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                >
                  {selected.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h3
                    className="text-xl text-white"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {selected.name}
                  </h3>
                  <p className="text-teal-300 text-sm">
                    {selected.nationality} · {selected.visits} visit
                    {selected.visits !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selected.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          color: "#fff",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setModal(selected)}
                  className="p-2 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Visits", value: selected.visits },
                  {
                    label: "Total Spent",
                    value: `₱${selected.totalSpent.toLocaleString()}`,
                  },
                  { label: "Last Visit", value: selected.lastVisit },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-4 rounded-xl text-center"
                    style={{ background: "#f0f9f8" }}
                  >
                    <p
                      className="text-lg font-medium"
                      style={{ color: "#0d7377", fontFamily: "Georgia, serif" }}
                    >
                      {s.value}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#4a7a7a" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: "#f0f9f8" }}
                >
                  <Mail className="w-4 h-4" style={{ color: "#0d7377" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#4a7a7a" }}>
                      Email
                    </p>
                    <p className="text-sm" style={{ color: "#0a2e2e" }}>
                      {selected.email}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: "#f0f9f8" }}
                >
                  <Phone className="w-4 h-4" style={{ color: "#0d7377" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#4a7a7a" }}>
                      Phone
                    </p>
                    <p className="text-sm" style={{ color: "#0a2e2e" }}>
                      {selected.phone}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "ID Type", value: selected.idType },
                  { label: "ID Number", value: selected.idNumber },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="p-3 rounded-lg"
                    style={{ background: "#f0f9f8" }}
                  >
                    <p className="text-xs mb-0.5" style={{ color: "#4a7a7a" }}>
                      {f.label}
                    </p>
                    <p className="text-sm" style={{ color: "#0a2e2e" }}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>

              {selected.notes && (
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "#f0f9f8",
                    borderLeft: "4px solid #0d7377",
                  }}
                >
                  <p
                    className="text-xs mb-1 font-medium"
                    style={{ color: "#0d7377" }}
                  >
                    Notes
                  </p>
                  <p className="text-sm" style={{ color: "#0a2e2e" }}>
                    {selected.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
