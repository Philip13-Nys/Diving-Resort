import { useState } from "react";
import { BedDouble, Waves, Trees, Anchor } from "lucide-react";

type RoomStatus =
  | "available"
  | "occupied"
  | "checkout-today"
  | "maintenance"
  | "reserved";

interface Room {
  id: string;
  type: "Beachfront Suite" | "Ocean View" | "Garden Room" | "Dive Cabin";
  capacity: number;
  floor: number;
  rate: number;
  status: RoomStatus;
  guest?: string;
  checkOut?: string;
  features: string[];
}

const ROOMS: Room[] = [
  {
    id: "1",
    type: "Dive Cabin",
    capacity: 2,
    floor: 1,
    rate: 3800,
    status: "available",
    features: ["AC", "WiFi", "Sea View"],
  },
  {
    id: "2",
    type: "Garden Room",
    capacity: 2,
    floor: 1,
    rate: 2500,
    status: "available",
    features: ["AC", "WiFi", "Garden View"],
  },
  {
    id: "3",
    type: "Garden Room",
    capacity: 3,
    floor: 1,
    rate: 3000,
    status: "occupied",
    guest: "Mark Reyes",
    checkOut: "Jun 12",
    features: ["AC", "WiFi", "Garden View"],
  },
  {
    id: "4",
    type: "Garden Room",
    capacity: 2,
    floor: 1,
    rate: 2500,
    status: "available",
    features: ["AC", "WiFi", "Garden View"],
  },
  {
    id: "5",
    type: "Dive Cabin",
    capacity: 2,
    floor: 1,
    rate: 3800,
    status: "occupied",
    guest: "Sofia Cruz",
    checkOut: "Jun 11",
    features: ["AC", "WiFi", "Sea View"],
  },
  {
    id: "6",
    type: "Ocean View",
    capacity: 4,
    floor: 2,
    rate: 5500,
    status: "occupied",
    guest: "Ana Gomez",
    checkOut: "Jun 15",
    features: ["AC", "WiFi", "Balcony", "Ocean View"],
  },
  {
    id: "7",
    type: "Ocean View",
    capacity: 2,
    floor: 2,
    rate: 4200,
    status: "checkout-today",
    guest: "Departing Guest",
    checkOut: "Jun 7",
    features: ["AC", "WiFi", "Ocean View"],
  },
  {
    id: "8",
    type: "Ocean View",
    capacity: 2,
    floor: 2,
    rate: 4200,
    status: "occupied",
    guest: "Linda Tan",
    checkOut: "Jun 9",
    features: ["AC", "WiFi", "Balcony", "Ocean View"],
  },
  {
    id: "9",
    type: "Ocean View",
    capacity: 4,
    floor: 2,
    rate: 5500,
    status: "available",
    features: ["AC", "WiFi", "Balcony", "Ocean View"],
  },
  {
    id: "10",
    type: "Ocean View",
    capacity: 2,
    floor: 2,
    rate: 4200,
    status: "maintenance",
    features: ["AC", "WiFi", "Ocean View"],
  },
  {
    id: "11",
    type: "Beachfront Suite",
    capacity: 2,
    floor: 1,
    rate: 6500,
    status: "available",
    features: ["AC", "WiFi", "Private Beach", "Jacuzzi"],
  },
  {
    id: "12",
    type: "Beachfront Suite",
    capacity: 2,
    floor: 1,
    rate: 6500,
    status: "occupied",
    guest: "James Villanueva",
    checkOut: "Jun 10",
    features: ["AC", "WiFi", "Private Beach", "Jacuzzi"],
  },
  {
    id: "13",
    type: "Dive Cabin",
    capacity: 2,
    floor: 1,
    rate: 3800,
    status: "reserved",
    features: ["AC", "WiFi", "Sea View"],
  },
  {
    id: "14",
    type: "Beachfront Suite",
    capacity: 4,
    floor: 1,
    rate: 7500,
    status: "reserved",
    guest: "Ryan Lim",
    checkOut: "Jun 14",
    features: ["AC", "WiFi", "Private Beach", "Jacuzzi", "Kitchen"],
  },
  {
    id: "15",
    type: "Beachfront Suite",
    capacity: 2,
    floor: 1,
    rate: 6500,
    status: "available",
    features: ["AC", "WiFi", "Private Beach"],
  },
];

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  available: {
    label: "Available",
    color: "#0d7377",
    bg: "#e2f3f2",
    border: "#0d7377",
  },
  occupied: {
    label: "Occupied",
    color: "#d4183d",
    bg: "#fef2f2",
    border: "#d4183d",
  },
  "checkout-today": {
    label: "Checkout Today",
    color: "#f97316",
    bg: "#fff7ed",
    border: "#f97316",
  },
  maintenance: {
    label: "Maintenance",
    color: "#4a7a7a",
    bg: "#f0f9f8",
    border: "#a0c4c4",
  },
  reserved: {
    label: "Reserved",
    color: "#06b6d4",
    bg: "#ecfeff",
    border: "#06b6d4",
  },
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Beachfront Suite": Waves,
  "Ocean View": Waves,
  "Garden Room": Trees,
  "Dive Cabin": Anchor,
};

export default function RoomAvailability() {
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Room | null>(null);

  const filtered = ROOMS.filter((r) => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchStatus && matchType;
  });

  const counts = {
    available: ROOMS.filter((r) => r.status === "available").length,
    occupied: ROOMS.filter((r) => r.status === "occupied").length,
    checkout: ROOMS.filter((r) => r.status === "checkout-today").length,
    maintenance: ROOMS.filter((r) => r.status === "maintenance").length,
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Available",
            count: counts.available,
            status: "available" as RoomStatus,
            color: "#0d7377",
            bg: "#e2f3f2",
          },
          {
            label: "Occupied",
            count: counts.occupied,
            status: "occupied" as RoomStatus,
            color: "#d4183d",
            bg: "#fef2f2",
          },
          {
            label: "Checkout Today",
            count: counts.checkout,
            status: "checkout-today" as RoomStatus,
            color: "#f97316",
            bg: "#fff7ed",
          },
          {
            label: "Maintenance",
            count: counts.maintenance,
            status: "maintenance" as RoomStatus,
            color: "#4a7a7a",
            bg: "#f0f9f8",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setFilter(filter === s.status ? "all" : s.status)}
            className="p-4 rounded-xl border text-left transition-all"
            style={{
              background: filter === s.status ? s.bg : "white",
              borderColor:
                filter === s.status ? s.color : "rgba(13,115,119,0.1)",
            }}
          >
            <div
              className="text-3xl mb-1"
              style={{ color: s.color, fontFamily: "Georgia, serif" }}
            >
              {s.count}
            </div>
            <div className="text-sm" style={{ color: "#4a7a7a" }}>
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <span className="text-sm self-center" style={{ color: "#4a7a7a" }}>
          Type:
        </span>
        {[
          "all",
          "Beachfront Suite",
          "Ocean View",
          "Garden Room",
          "Dive Cabin",
        ].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="px-3 py-1.5 rounded-lg text-xs border transition-all"
            style={{
              background: typeFilter === t ? "#0d7377" : "white",
              color: typeFilter === t ? "white" : "#4a7a7a",
              borderColor:
                typeFilter === t ? "#0d7377" : "rgba(13,115,119,0.2)",
            }}
          >
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Room grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {filtered.map((room) => {
            const s = STATUS_CONFIG[room.status];
            const Icon = TYPE_ICON[room.type];
            return (
              <button
                key={room.id}
                onClick={() => setSelected(room === selected ? null : room)}
                className="p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                style={{
                  borderColor:
                    selected?.id === room.id ? s.border : "transparent",
                  background: s.bg,
                  boxShadow:
                    selected?.id === room.id
                      ? `0 0 0 2px ${s.border}30`
                      : undefined,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className="text-2xl font-medium"
                    style={{ color: s.color, fontFamily: "Georgia, serif" }}
                  >
                    {room.id}
                  </span>
                  <Icon className="w-4 h-4 mt-1" style={{ color: s.color }} />
                </div>
                <p
                  className="text-xs font-medium mb-0.5 truncate"
                  style={{ color: "#0a2e2e" }}
                >
                  {room.type}
                </p>
                <p className="text-xs" style={{ color: "#4a7a7a" }}>
                  {room.capacity} pax
                </p>
                <div className="mt-2">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: `${s.color}20`, color: s.color }}
                  >
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Room detail panel */}
        {selected && (
          <div
            className="w-72 flex-shrink-0 bg-white rounded-xl border self-start"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <div
              className="p-5 border-b"
              style={{
                background: STATUS_CONFIG[selected.status].bg,
                borderColor: "rgba(13,115,119,0.1)",
                borderRadius: "0.75rem 0.75rem 0 0",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-3xl font-medium"
                  style={{
                    color: STATUS_CONFIG[selected.status].color,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Room {selected.id}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: "#4a7a7a" }}
                >
                  ✕
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: "#0a2e2e" }}>
                {selected.type}
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full inline-block mt-2"
                style={{
                  background: STATUS_CONFIG[selected.status].color,
                  color: "#fff",
                }}
              >
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Capacity", value: `${selected.capacity} guests` },
                  { label: "Floor", value: `Floor ${selected.floor}` },
                  {
                    label: "Rate",
                    value: `₱${selected.rate.toLocaleString()}/night`,
                  },
                  { label: "Type", value: selected.type },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="p-2 rounded-lg"
                    style={{ background: "#f0f9f8" }}
                  >
                    <p className="text-xs" style={{ color: "#4a7a7a" }}>
                      {f.label}
                    </p>
                    <p className="text-sm" style={{ color: "#0a2e2e" }}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
              {selected.guest && (
                <div
                  className="p-3 rounded-lg"
                  style={{ background: "#fef2f2" }}
                >
                  <p className="text-xs mb-0.5" style={{ color: "#4a7a7a" }}>
                    Current Guest
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#0a2e2e" }}
                  >
                    {selected.guest}
                  </p>
                  {selected.checkOut && (
                    <p className="text-xs mt-0.5" style={{ color: "#d4183d" }}>
                      Checkout: {selected.checkOut}
                    </p>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs mb-2" style={{ color: "#4a7a7a" }}>
                  Features
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.features.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: "#e2f3f2", color: "#0d7377" }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              {selected.status === "available" && (
                <button
                  className="w-full py-2.5 rounded-lg text-sm text-white"
                  style={{ background: "#0d7377" }}
                >
                  Book This Room
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
