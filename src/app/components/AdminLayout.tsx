import { logoutUser } from "../auth";
import { AsyncButton } from "./ui/async-action";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Menu,
  X,
  Waves,
  BarChart3,
  LogOut,
  CreditCard,
  Settings,
} from "lucide-react";

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const navigation = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Manager Dashboard",
    path: "/admin/manager",
    icon: BarChart3,
  },
  {
    name: "Receptionist Dashboard",
    path: "/admin/receptionist",
    icon: Users,
  },
  {
    name: "Payment Configuration",
    path: "/admin/payment-configuration",
    icon: CreditCard,
  },
  {
    name: "System Settings",
    path: "/admin/settings",
    icon: Settings,
  },
  {
    name: "User Role Management",
    path: "/admin/users",
    icon: UserCog,
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Administrator");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

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
              user.displayName ||
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
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || window.innerWidth >= 1024) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    try {
      await logoutUser();
      setSidebarOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      window.alert("Failed to log out. Please try again.");
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen h-dvh w-full overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <AsyncButton
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 flex
          w-[min(18rem,85vw)] flex-col
          bg-gradient-to-b from-cyan-600 to-blue-700
          text-white shadow-xl
          transition-transform duration-300 ease-in-out
          motion-reduce:transition-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:z-auto lg:w-60 lg:shrink-0
          lg:translate-x-0 lg:shadow-none
          xl:w-64
        `}
      >
        {/* Resort branding */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 p-4 sm:p-5 xl:p-6">
          <Waves className="size-8 shrink-0" />

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight xl:text-xl">
              Beach &amp; Dive Resort
            </h1>

            <p className="mt-1 text-sm text-cyan-100">Admin Panel</p>
          </div>

          <AsyncButton
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="rounded-lg p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
          >
            <X className="size-5" />
          </AsyncButton>
        </div>

        {/* Navigation menu */}
        <nav
          aria-label="Admin navigation"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4"
        >
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-200 sm:px-4 ${
                    isActive
                      ? "bg-white font-semibold text-cyan-800 shadow-sm"
                      : "text-cyan-50 hover:bg-white/10"
                  }`
                }
              >
                <item.icon className="size-5 shrink-0" />

                <span className="min-w-0 break-words text-sm leading-5">
                  {item.name}
                </span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User profile and logout */}
        <div className="shrink-0 border-t border-white/15 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3 px-1 sm:px-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-semibold text-cyan-950">
              {userName.charAt(0).toUpperCase() || "A"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>

              <p className="truncate text-xs text-cyan-100">{userEmail}</p>
            </div>

            <AsyncButton
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <LogOut className="size-5 text-cyan-100 hover:text-red-200" />
            </AsyncButton>
          </div>
        </div>
      </aside>

      {/* Main application area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="z-30 flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-3 sm:gap-3 sm:px-5 sm:py-4 lg:px-6">
          <AsyncButton
            type="button"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-controls="admin-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 lg:hidden"
          >
            {sidebarOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </AsyncButton>

          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 sm:text-base md:text-lg xl:text-xl">
            Resort Management System
          </h2>

          <div className="hidden shrink-0 text-right text-sm text-gray-500 lg:block">
            {new Date().toLocaleDateString("en-PH", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto overscroll-y-contain p-3 min-[480px]:p-4 sm:p-5 lg:p-6 xl:p-8">
          <div className="mx-auto w-full min-w-0 max-w-[1800px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
