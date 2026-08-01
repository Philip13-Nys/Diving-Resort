import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  BookOpen,
  UserPlus,
  Users,
  BedDouble,
  CreditCard,
  BarChart3,
  Shell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../app/firebase";

const NAV_ITEMS: {
  id:
    | "dashboard"
    | "calendar"
    | "inquiries"
    | "reservations"
    | "walkin"
    | "guests"
    | "availability"
    | "payments"
    | "reports";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "inquiries", label: "Inquiries", icon: MessageSquare, badge: 5 },
  { id: "reservations", label: "Reservations", icon: BookOpen },
  { id: "walkin", label: "Walk-in", icon: UserPlus },
  { id: "guests", label: "Guests", icon: Users },
  { id: "availability", label: "Room Availability", icon: BedDouble },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function ReceptionistLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    try {
      await signOut(auth); // Logs out the Firebase user
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to log out.");
    }
  };

  const currentPage =
    location.pathname.split("/").filter(Boolean).pop() || "dashboard";

  const currentNav = NAV_ITEMS.find((item) => item.id === currentPage);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#f0f9f8" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 flex flex-col h-full transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 260, background: "#0a2e2e", minWidth: 260 }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#14b8a6" }}
          >
            <Shell className="w-5 h-5" style={{ color: "#0a2e2e" }} />
          </div>
          <div>
            <div
              className="text-white font-medium leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Sabang Diving Resort
            </div>
            <div className="text-xs" style={{ color: "#4a7a7a" }}>
              Resort & Dive Center
            </div>
          </div>
          <button
            className="ml-auto lg:hidden text-teal-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "dashboard") {
                    navigate("/receptionist");
                  } else {
                    navigate(`/receptionist/${item.id}`);
                  }

                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 mx-0 transition-all text-left group"
                style={{
                  background: active ? "rgba(20,184,166,0.15)" : "transparent",
                  borderLeft: active
                    ? "3px solid #14b8a6"
                    : "3px solid transparent",
                  color: active ? "#14b8a6" : "#a0c4c4",
                }}
                onMouseEnter={(e) =>
                  !active &&
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.05)")
                }
                onMouseLeave={(e) =>
                  !active &&
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-sm">{item.label}</span>
                {item.badge && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: "#f97316", color: "#fff" }}
                  >
                    {item.badge}
                  </span>
                )}
                {active && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div
          className="px-5 py-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ background: "#0d7377", color: "#e2f3f2" }}
            >
              R
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">Receptionist</div>
              <div className="text-xs truncate" style={{ color: "#4a7a7a" }}>
                Receptionist
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#4a7a7a" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#f97316";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#4a7a7a";
              }}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex-shrink-0 flex items-center gap-4 px-6 py-4 bg-white border-b"
          style={{ borderColor: "rgba(13,115,119,0.12)" }}
        >
          <button
            className="lg:hidden p-2 rounded-lg"
            style={{ color: "#0d7377" }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1
              className="text-lg"
              style={{
                color: "#0a2e2e",
                fontFamily: "Georgia, serif",
                fontWeight: 400,
              }}
            >
              {currentNav?.label}
            </h1>
          </div>
          <div className="flex-1 max-w-sm ml-4 hidden md:block">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#4a7a7a" }}
              />
              <input
                type="text"
                placeholder="Search guests, bookings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none border"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              className="relative p-2 rounded-lg"
              style={{ color: "#0d7377" }}
            >
              <Bell className="w-5 h-5" />
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: "#f97316" }}
              />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ background: "#0d7377", color: "#e2f3f2" }}
              >
                R
              </div>
              <span className="text-sm" style={{ color: "#0a2e2e" }}>
                Receptionist
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
