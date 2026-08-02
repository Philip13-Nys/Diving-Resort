import { Outlet, Link, useLocation } from "react-router";
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
} from "lucide-react";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/manager", icon: LayoutDashboard },
  {
    name: "Receptionist Dashboard",
    href: "/manager/receptionist-dashboard",
    icon: Users,
  },
  { name: "Room Management", href: "/manager/rooms", icon: Hotel },
  {
    name: "Room Availability",
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  {
    sidebarOpen && (
      <div
        className="fixed inset-0 bg-black/50 z-20 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    );
  }
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 h-full w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">Resort Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Beach & Diving Resort</p>
        </div>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="w-5 h-5" />
        </button>
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
  );
}
