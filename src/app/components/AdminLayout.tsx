import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  DollarSign,
  TrendingUp,
  Menu,
  X,
  Waves,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const navigation = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Manager Dashboard", path: "/admin/manager", icon: BarChart3 },
  {
    name: "Receptionist Dashboard",
    path: "/admin/receptionist",
    icon: Users,
  },
  { name: "User Role Management", path: "/admin/users", icon: UserCog },
  { name: "Staff Profiles", path: "/admin/staff", icon: Users },
  {
    name: "Commission Report",
    path: "/admin/commission",
    icon: DollarSign,
  },
  {
    name: "Sales & Financial Reports",
    path: "/admin/sales",
    icon: TrendingUp,
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [userName, setUserName] = useState("Administrator");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("Administrator");
        setUserEmail("");
        return;
      }

      setUserEmail(user.email || "");

      try {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          setUserName(
            userData.name ||
              userData.fullName ||
              userData.displayName ||
              user.email?.split("@")[0] ||
              "Administrator",
          );
        } else {
          setUserName(
            user.displayName || user.email?.split("@")[0] || "Administrator",
          );
        }
      } catch (error) {
        console.error("Error loading user profile:", error);

        setUserName(
          user.displayName || user.email?.split("@")[0] || "Administrator",
        );
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const navigate = useNavigate();
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
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="h-screen flex overflow-hidden bg-gray-50">
        <aside
          className={`
            fixed inset-y-0 left-0 z-30
            w-64
            bg-gradient-to-b from-cyan-600 to-blue-700
            text-white
            flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}

            lg:static
            lg:translate-x-0
            lg:flex
            shadow-xl lg:shadow-none
          `}
        >
          <div className="p-6 flex items-center gap-3">
            <Waves className="size-8" />
            <div className="flex-1">
              <h1 className="font-bold text-xl">Beach & Dive Resort</h1>
              <p className="text-cyan-100 text-sm">Admin Panel</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200 ${
                    isActive
                      ? "bg-white text-cyan-700 font-semibold shadow"
                      : "text-cyan-50 hover:bg-cyan-500/30"
                  }`
                }
              >
                <item.icon className="size-5 shrink-0" />
                <span className="text-sm">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-cyan-500">
            <div className="flex items-center gap-3 px-2">
              <div className="size-10 rounded-full bg-cyan-400 flex items-center justify-center font-semibold text-cyan-900">
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{userName}</p>

                <p className="text-xs text-cyan-100 truncate">{userEmail}</p>
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                <LogOut className="size-5 text-cyan-100 hover:text-red-300" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              {sidebarOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
            <h2 className="flex-1 text-lg md:text-xl font-semibold text-gray-800 truncate">
              Resort Management System
            </h2>
            <div className="hidden md:block text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
