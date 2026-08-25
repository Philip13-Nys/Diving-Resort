import { useState, useEffect } from "react";
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
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, customerDb } from "../app/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";

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
  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
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
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);

  const [userName, setUserName] = useState("Receptionist");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("R");

  const [inquiryCount, setInquiryCount] = useState(0);

  useEffect(() => {
    const inquiriesRef = collection(customerDb, "Inquiries");

    const unsubscribe = onSnapshot(inquiriesRef, (snapshot) => {
      const unreadCount = snapshot.docs.filter((inquiryDoc) => {
        const data = inquiryDoc.data();

        return data.read !== true;
      }).length;

      setUnreadInquiryCount(unreadCount);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const inquiriesRef = collection(customerDb, "Inquiries");

    const unsubscribe = onSnapshot(inquiriesRef, (snapshot) => {
      setInquiryCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          console.log("No logged-in user.");
          setUserName("Receptionist");
          setUserEmail("");
          setUserInitial("R");
          return;
        }

        console.log("Logged-in Firebase user:", user);

        setUserEmail(user.email || "");

        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          console.log("Logged-in user Firestore data:", data);

          // Your receptionist Users documents use "name"
          const name = String(data.name || "").trim();

          if (name) {
            setUserName(name);
            setUserInitial(name.charAt(0).toUpperCase());
          } else {
            // Fallback to Firebase Auth display name
            const authName = user.displayName?.trim();

            if (authName) {
              setUserName(authName);
              setUserInitial(authName.charAt(0).toUpperCase());
            }
          }
        } else {
          console.log("User document does not exist:", user.uid);

          // Still show Firebase Auth name if Firestore profile is missing
          const authName = user.displayName?.trim();

          if (authName) {
            setUserName(authName);
            setUserInitial(authName.charAt(0).toUpperCase());
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    try {
      await signOut(auth);
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
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-30 flex flex-col h-full transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 260, background: "#0a2e2e", minWidth: 260 }}
      >
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
                {item.id === "inquiries" && inquiryCount > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: "#f97316", color: "#fff" }}
                  >
                    {inquiryCount}
                  </span>
                )}
                {active && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div
          className="px-5 py-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ background: "#0d7377", color: "#e2f3f2" }}
            >
              {userInitial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{userName}</div>

              <div className="text-xs truncate" style={{ color: "#4a7a7a" }}>
                {userEmail}
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
                {userInitial}
              </div>

              <span className="text-sm" style={{ color: "#0a2e2e" }}>
                {userName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
