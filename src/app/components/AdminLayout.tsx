import { useState } from 'react';
import { Outlet, NavLink } from 'react-router';
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
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Manager Dashboard', path: '/manager', icon: BarChart3 },
  { name: 'Receptionist Dashboard', path: '/receptionist', icon: Users },
  { name: 'User Role Management', path: '/users', icon: UserCog },
  { name: 'Staff Profiles', path: '/staff', icon: Users },
  { name: 'Commission Report', path: '/commission', icon: DollarSign },
  { name: 'Sales & Financial Reports', path: '/sales', icon: TrendingUp },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="size-full flex bg-gray-50">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-gradient-to-b from-cyan-600 to-blue-700 text-white flex flex-col overflow-hidden`}
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
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-white text-cyan-700 font-medium'
                    : 'text-cyan-50 hover:bg-cyan-500/30'
                }`
              }
            >
              <item.icon className="size-5" />
              <span className="text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-cyan-500">
          <div className="flex items-center gap-3 px-2">
            <div className="size-10 rounded-full bg-cyan-400 flex items-center justify-center font-semibold text-cyan-900">
              A
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Administrator</p>
              <p className="text-xs text-cyan-100">admin@resort.com</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <h2 className="text-xl font-semibold text-gray-800 flex-1">
            Resort Management System
          </h2>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
