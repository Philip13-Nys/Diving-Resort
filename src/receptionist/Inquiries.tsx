import { useState } from "react";
import {
  MessageSquare,
  Phone,
  Mail,
  Check,
  Clock,
  X,
  ChevronDown,
  Search,
  Send,
} from "lucide-react";

type Status = "new" | "in-progress" | "resolved" | "cancelled";

interface Inquiry {
  id: string;
  name: string;
  contact: string;
  type: "email" | "phone" | "walk-in";
  subject: string;
  message: string;
  date: string;
  status: Status;
  pax: number;
  dates: string;
}

const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: "INQ-001",
    name: "Roberto dela Cruz",
    contact: "roberto@email.com",
    type: "email",
    subject: "Dive Package Inquiry",
    message:
      "Hello, I would like to inquire about your 5-day dive package for 4 persons. We are PADI-certified divers.",
    date: "Jun 7, 08:14",
    status: "new",
    pax: 4,
    dates: "Jun 20–25",
  },
  {
    id: "INQ-002",
    name: "Grace Kim",
    contact: "+63 912 345 6789",
    type: "phone",
    subject: "Honeymoon Suite Availability",
    message:
      "Looking for beachfront suite for our honeymoon, 3 nights. Any special packages?",
    date: "Jun 7, 09:30",
    status: "new",
    pax: 2,
    dates: "Jul 1–4",
  },
  {
    id: "INQ-003",
    name: "Lester Tan",
    contact: "lester.t@corp.ph",
    type: "email",
    subject: "Corporate Retreat – 20 pax",
    message:
      "We need rooms for 20 people for a 3-day corporate event. Please provide group rates.",
    date: "Jun 6, 15:45",
    status: "in-progress",
    pax: 20,
    dates: "Aug 10–13",
  },
  {
    id: "INQ-004",
    name: "Mia Fernandez",
    contact: "mia@gmail.com",
    type: "email",
    subject: "Family Room Rates",
    message: "What are the rates for a family room with 2 adults and 2 kids?",
    date: "Jun 6, 11:20",
    status: "resolved",
    pax: 4,
    dates: "Jun 28–30",
  },
  {
    id: "INQ-005",
    name: "Walk-in Guest",
    contact: "N/A",
    type: "walk-in",
    subject: "Room Tonight",
    message: "Couple looking for any available room for tonight, 1 night.",
    date: "Jun 7, 10:05",
    status: "new",
    pax: 2,
    dates: "Jun 7–8",
  },
];

const STATUS_CONFIG: Record<
  Status,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  new: { label: "New", color: "#f97316", bg: "#fff7ed", icon: Clock },
  "in-progress": {
    label: "In Progress",
    color: "#06b6d4",
    bg: "#ecfeff",
    icon: Clock,
  },
  resolved: { label: "Resolved", color: "#0d7377", bg: "#e2f3f2", icon: Check },
  cancelled: { label: "Cancelled", color: "#d4183d", bg: "#fef2f2", icon: X },
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  phone: Phone,
  "walk-in": MessageSquare,
};

export default function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>(INITIAL_INQUIRIES);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [reply, setReply] = useState("");

  const filtered = inquiries.filter((i) => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || i.status === filter;
    return matchSearch && matchFilter;
  });

  const updateStatus = (id: string, status: Status) => {
    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i)),
    );
    if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
  };

  return (
    <div
      className="flex gap-6 h-full"
      style={{ minHeight: "calc(100vh - 140px)" }}
    >
      {/* List */}
      <div
        className="w-full lg:w-96 flex-shrink-0 bg-white rounded-xl border flex flex-col"
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
              placeholder="Search inquiries…"
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
          <div className="flex gap-2 flex-wrap">
            {(["all", "new", "in-progress", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="px-3 py-1 rounded-full text-xs transition-all"
                style={{
                  background: filter === s ? "#0d7377" : "#e2f3f2",
                  color: filter === s ? "#fff" : "#0d7377",
                }}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto divide-y"
          style={{ divideColor: "rgba(13,115,119,0.08)" }}
        >
          {filtered.map((inq) => {
            const TypeIcon = TYPE_ICON[inq.type];
            const s = STATUS_CONFIG[inq.status];
            return (
              <button
                key={inq.id}
                onClick={() => setSelected(inq)}
                className="w-full text-left p-4 transition-all"
                style={{
                  background:
                    selected?.id === inq.id ? "#f0f9f8" : "transparent",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#e2f3f2" }}
                  >
                    <TypeIcon
                      className="w-4 h-4"
                      style={{ color: "#0d7377" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "#0a2e2e" }}
                      >
                        {inq.name}
                      </span>
                      <span
                        className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "#4a7a7a" }}
                    >
                      {inq.subject}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#4a7a7a" }}>
                      {inq.date} · {inq.pax} pax
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div
        className="flex-1 bg-white rounded-xl border flex flex-col"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        {!selected ? (
          <div
            className="flex-1 flex items-center justify-center flex-col gap-3"
            style={{ color: "#4a7a7a" }}
          >
            <MessageSquare className="w-12 h-12 opacity-30" />
            <p className="text-sm">Select an inquiry to view details</p>
          </div>
        ) : (
          <>
            <div
              className="px-6 py-4 border-b flex items-center gap-4"
              style={{ borderColor: "rgba(13,115,119,0.1)" }}
            >
              <div>
                <h3
                  className="font-medium"
                  style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
                >
                  {selected.name}
                </h3>
                <p className="text-sm" style={{ color: "#4a7a7a" }}>
                  {selected.subject} · {selected.date}
                </p>
              </div>
              <div className="ml-auto flex gap-2 flex-wrap">
                {(["in-progress", "resolved", "cancelled"] as Status[]).map(
                  (s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selected.id, s)}
                        className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                        style={{
                          borderColor:
                            selected.status === s
                              ? cfg.color
                              : "rgba(13,115,119,0.2)",
                          background:
                            selected.status === s ? cfg.bg : "transparent",
                          color: selected.status === s ? cfg.color : "#4a7a7a",
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Contact", value: selected.contact },
                  { label: "Type", value: selected.type },
                  { label: "Guests", value: `${selected.pax} pax` },
                  { label: "Requested Dates", value: selected.dates },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="p-3 rounded-lg"
                    style={{ background: "#f0f9f8" }}
                  >
                    <p className="text-xs mb-1" style={{ color: "#4a7a7a" }}>
                      {f.label}
                    </p>
                    <p className="text-sm" style={{ color: "#0a2e2e" }}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Message */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "#f0f9f8",
                  borderLeft: "4px solid #0d7377",
                }}
              >
                <p
                  className="text-xs mb-2 font-medium"
                  style={{ color: "#0d7377" }}
                >
                  Guest Message
                </p>
                <p className="text-sm" style={{ color: "#0a2e2e" }}>
                  {selected.message}
                </p>
              </div>

              {/* Reply area */}
              <div>
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: "#0a2e2e" }}
                >
                  Reply
                </p>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Type your reply…"
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none resize-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      setReply("");
                      updateStatus(selected.id, "resolved");
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm text-white transition-colors"
                    style={{ background: "#0d7377" }}
                  >
                    <Send className="w-4 h-4" /> Send Reply
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
