import AuditLogs from "./components/AuditLogs";
import BackupManagement from "./components/BackupManagement";
import RequireRole from "./RequireRole";
import { createHashRouter, Navigate } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import Dashboard from "./components/Dashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import UserRoleManagement from "./components/UserRoleManagement";
import StaffProfiles from "./components/StaffProfiles";
import PaymentConfiguration from "./components/PaymentConfiguration";
import CommissionReport from "./components/CommissionReport";
import SalesReports from "./components/SalesReports";
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
import ManagersStaffProfiles from "../manager/ManagersStaffProfiles";
import ActivityLogs from "../manager/ActivityLogs";
import MaintenanceManagement from "../manager/MaintenanceManagement";
import ServicesManagement from "../manager/ServicesManagement";

import ReceptionistLayout from "../receptionist/ReceptionistLayout";
import ReceptionistsDashboard from "../receptionist/ReceptionistsDashboard";
import CalendarView from "../receptionist/CalendarView";
import Inquiries from "../receptionist/Inquiries";
import CustomerReservations from "../receptionist/CustomerReservations";
import WalkIn from "../receptionist/WalkIn";
import Guests from "../receptionist/Guests";
import ReceptionistRoomAvailability from "../receptionist/RoomAvailability";
import Payments from "../receptionist/Payments";
import ReceptionistReports from "../receptionist/Reports";

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
      { path: "receptionist", Component: ReceptionistDashboard },
      { path: "users", Component: UserRoleManagement },
      { path: "staff", Component: StaffProfiles },
      { path: "audit-logs", Component: AuditLogs },
      { path: "backups", Component: BackupManagement },
      { path: "commission", Component: CommissionReport },
      { path: "sales", Component: SalesReports },
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
      { path: "staff", Component: ManagersStaffProfiles },
      { path: "activity-logs", Component: ActivityLogs },
      { path: "maintenance", Component: MaintenanceManagement },
      { path: "services", Component: ServicesManagement },
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
      { path: "availability", Component: ReceptionistRoomAvailability },
      { path: "payments", Component: Payments },
      { path: "reports", Component: ReceptionistReports },
    ],
  },

  { path: "*", element: <Navigate to="/login" replace /> },
]);
