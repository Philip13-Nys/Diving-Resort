import BackupManagement from "./components/BackupManagement";
import RequireRole from "./RequireRole";
import { createHashRouter, Navigate } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import Dashboard from "./components/Dashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import UserRoleManagement from "./components/UserRoleManagement";
import PaymentConfiguration from "./components/PaymentConfiguration";
import CommissionReport from "./components/CommissionReport";
import SystemSettings from "./components/SystemSettings";

import ManagerLayout from "../manager/ManagerLayout";
import ManagersDashboard from "../manager/ManagersDashboard";
import ReceptionistDashboards from "../manager/ReceptionistDashboards";
import RoomManagement from "../manager/RoomManagement";
import RoomAvailability from "../manager/RoomAvailability";
import PricingManagement from "../manager/PricingManagement";
import SalesAnalytics from "../manager/SalesAnalytics";
import GuestRecords from "../manager/GuestRecords";
import Reports from "../manager/Reports";
import ActivityLogs from "../manager/ActivityLogs";
import ServicesManagement from "../manager/ServicesManagement";
import ServiceAvailability from "../manager/ServiceAvailability";

import ReceptionistLayout from "../receptionist/ReceptionistLayout";
import ReceptionistsDashboard from "../receptionist/ReceptionistsDashboard";
import CalendarView from "../receptionist/CalendarView";
import Inquiries from "../receptionist/Inquiries";
import CustomerReservations from "../receptionist/CustomerReservations";
import WalkIn from "../receptionist/WalkIn";
import Guests from "../receptionist/Guests";
import ReceptionistRoomAvailability from "../receptionist/RoomAvailability";
import Payments from "../receptionist/Payments";

import Login from "../app/login";

export const router = createHashRouter([
  {
    path: "/login",
    Component: Login,
  },

  {
    path: "admin/",
    element: <RequireRole area="admin"><AdminLayout /></RequireRole>,
    children: [
      { index: true, Component: Dashboard },
      { path: "manager", Component: ManagerDashboard },
      { path: "receptionist", element: <ReceptionistsDashboard embedded /> },
      { path: "users", Component: UserRoleManagement },
      { path: "staff", element: <Navigate to="/admin" replace /> },
      { path: "audit-logs", element: <Navigate to="/manager/activity-logs" replace /> },
      { path: "backups", Component: BackupManagement },
      { path: "commission", element: <Navigate to="/manager/commission" replace /> },
      { path: "sales", element: <Navigate to="/manager/sales-analytics" replace /> },
      {
        path: "/admin/payment-configuration",
        element: <PaymentConfiguration />,
      },
      {
        path: "settings",
        element: <SystemSettings />,
      },
    ],
  },

  {
    path: "manager/",
    element: <RequireRole area="manager"><ManagerLayout /></RequireRole>,
    children: [
      { index: true, Component: ManagersDashboard },
      { path: "receptionist-dashboard", Component: ReceptionistDashboards },
      { path: "rooms", Component: RoomManagement },
      { path: "room-availability", Component: RoomAvailability },
      { path: "pricing", Component: PricingManagement },
      { path: "sales-analytics", Component: SalesAnalytics },
      { path: "reservations", element: <Navigate to="/manager/receptionist-dashboard" replace /> },
      { path: "bookings", element: <Navigate to="/manager/receptionist-dashboard" replace /> },
      { path: "guests", Component: GuestRecords },
      { path: "reports", Component: Reports },
      { path: "commission", Component: CommissionReport },
      { path: "staff", element: <Navigate to="/manager" replace /> },
      { path: "activity-logs", Component: ActivityLogs },
      { path: "maintenance", element: <Navigate to="/manager/rooms" replace /> },
      { path: "services", Component: ServicesManagement },
      { path: "service-availability", Component: ServiceAvailability },
    ],
  },

  {
    path: "receptionist/",
    element: <RequireRole area="receptionist"><ReceptionistLayout /></RequireRole>,
    children: [
      { index: true, Component: ReceptionistsDashboard },
      { path: "calendar", Component: CalendarView },
      { path: "inquiries", Component: Inquiries },
      { path: "reservations", Component: CustomerReservations },
      { path: "walkin", Component: WalkIn },
      { path: "guests", Component: Guests },
      { path: "service-availability", Component: ServiceAvailability },
      { path: "availability", Component: ReceptionistRoomAvailability },
      { path: "payments", Component: Payments },
      { path: "reports", element: <Navigate to="/receptionist" replace /> },
    ],
  },

  { path: "*", element: <Navigate to="/login" replace /> },
]);
