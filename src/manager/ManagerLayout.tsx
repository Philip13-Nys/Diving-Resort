import {
  LayoutDashboard,
  Users,
  Hotel,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  BookOpen,
  UserCircle,
  FileText,
  Settings,
  Activity,
  Wrench,
  Waves,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../app/firebase";

const navigation = [
  { name: "Dashboard", href: "/manager", icon: LayoutDashboard },
  {
    name: "Receptionist Dashboard",
    href: "/manager/receptionist-dashboard",
    icon: Users,
  },
  { name: "Room Management", href: "/manager/rooms", icon: Hotel },
  {
    name: "Room Availabilityyyyy",
    href: "/manager/room-availability",
    icon: CalendarCheck,
  },
  { name: "Pricing Management", href: "/manager/pricing", icon: DollarSign },
  {
    name: "Sales Analytics",
    href: "/manager/sales-analytics",
    icon: TrendingUp,
  },
  { name: "Bookings", href: "/manager/bookings", icon: BookOpen },
  { name: "Guest Records", href: "/manager/guests", icon: UserCircle },
  { name: "Reports", href: "/manager/reports", icon: FileText },
  { name: "Staff Profiles", href: "/manager/staff", icon: Settings },
  { name: "Activity Logs", href: "/manager/activity-logs", icon: Activity },
  { name: "Maintenance", href: "/manager/maintenance", icon: Wrench },
  { name: "Services", href: "/manager/services", icon: Waves },
];

export default function ManagerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Manager");
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserName("User");
        setUserRole("Manager");
        return;
      }

      try {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          setUserName(userData.name || "User");
          setUserRole(userData.role || "Manager");
        } else {
          console.log("User document not found:", user.uid);
        }
      } catch (error) {
        console.error("Error loading user information:", error);
      }
    });

    return () => unsubscribe();
  }, []);
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    try {
      await signOut(auth);

      setSidebarOpen(false);

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to log out. Please try again.");
    }
  };
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static z-30 flex flex-col h-full w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600">Resort Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Beach & Diving Resort</p>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  onClick={() => setSidebarOpen(false)}
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          {/* Manager Profile / Logout */}
          <div className="mt-auto bg-blue-600 px-4 py-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-900 font-medium text-sm">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* User information */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userName}
                </p>

                <p className="text-xs text-blue-100 truncate">
                  {currentUser?.email || "No email"}
                </p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-white hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>

            <h1 className="font-semibold">Resort Manager</h1>
          </header>
          <Outlet />
        </div>
      </div>
    </>
  );
}
