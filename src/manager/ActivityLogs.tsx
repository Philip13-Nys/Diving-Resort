import { useState, useEffect, useRef } from "react";
import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Filter, Download, User, Clock } from "lucide-react";

const activityLogs = [
  {
    id: 1,
    timestamp: "Jun 7, 2026 09:15 AM",
    user: "Maria Santos",
    role: "Receptionist",
    action: "Created Reservation",
    details: "Booking #BK-2026-001 for John Martinez",
    status: "success",
  },
  {
    id: 2,
    timestamp: "Jun 7, 2026 09:30 AM",
    user: "Carlos Reyes",
    role: "Receptionist",
    action: "Check-out Guest",
    details: "Completed check-out for Room 205",
    status: "success",
  },
  {
    id: 3,
    timestamp: "Jun 7, 2026 10:00 AM",
    user: "Admin Manager",
    role: "Manager",
    action: "Updated Room Rate",
    details: "Modified pricing for Ocean View Suite",
    status: "success",
  },
  {
    id: 4,
    timestamp: "Jun 7, 2026 10:15 AM",
    user: "Lisa Garcia",
    role: "Senior Receptionist",
    action: "Payment Received",
    details: "Payment of $2,250 for Booking #BK-2026-002",
    status: "success",
  },
  {
    id: 5,
    timestamp: "Jun 7, 2026 10:30 AM",
    user: "Carlos Reyes",
    role: "Receptionist",
    action: "Room Change Request",
    details: "Changed Room 203 to Room 305 for guest",
    status: "success",
  },
  {
    id: 6,
    timestamp: "Jun 7, 2026 11:00 AM",
    user: "Maria Santos",
    role: "Receptionist",
    action: "Failed Login Attempt",
    details: "Incorrect password entered",
    status: "warning",
  },
  {
    id: 7,
    timestamp: "Jun 7, 2026 11:30 AM",
    user: "Admin Manager",
    role: "Manager",
    action: "Generated Report",
    details: "Daily Occupancy Report for Jun 7, 2026",
    status: "success",
  },
  {
    id: 8,
    timestamp: "Jun 7, 2026 12:00 PM",
    user: "Lisa Garcia",
    role: "Senior Receptionist",
    action: "Cancelled Reservation",
    details: "Cancelled Booking #BK-2026-015 at guest request",
    status: "warning",
  },
];

type FilterStatus = "all" | "success" | "warning";

export default function ActivityLogs() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filteredLogs =
    filterStatus === "all"
      ? activityLogs
      : activityLogs.filter((log) => log.status === filterStatus);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    if (showFilter) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilter]);

  function handleExport() {
    const headers = [
      "Timestamp",
      "User",
      "Role",
      "Action",
      "Details",
      "Status",
    ];
    const rows = filteredLogs.map((log) => [
      log.timestamp,
      log.user,
      log.role,
      log.action,
      log.details,
      log.status,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "activity-log-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-500 mt-2">
            Monitor system activities by staff members
          </p>
        </div>
        <div className="flex gap-3 relative" ref={filterRef}>
          {/* Filter button + dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              className="border-gray-300"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {filterStatus !== "all" && (
                <span className="ml-2 w-2 h-2 rounded-full bg-blue-600 inline-block" />
              )}
            </Button>

            {showFilter && (
              <Card className="absolute right-0 top-full mt-2 w-48 p-3 shadow-lg z-50 bg-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Status
                </p>
                {(["all", "success", "warning"] as FilterStatus[]).map(
                  (option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 px-1 py-1.5 rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="filterStatus"
                        value={option}
                        checked={filterStatus === option}
                        onChange={() => {
                          setFilterStatus(option);
                          setShowFilter(false);
                        }}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {option}
                      </span>
                    </label>
                  ),
                )}
              </Card>
            )}
          </div>

          <Button
            variant="outline"
            className="border-gray-300"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-gray-500">Total Activities</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {activityLogs.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Successful Actions</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {activityLogs.filter((log) => log.status === "success").length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Warnings</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {activityLogs.filter((log) => log.status === "warning").length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Active Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Set(activityLogs.map((log) => log.user)).size}
          </p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </Card>
      </div>

      {/* Activity Log Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            System Activity
          </h2>
          {filterStatus !== "all" && (
            <span className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700 capitalize">
                {filterStatus}
              </span>{" "}
              entries ({filteredLogs.length} of {activityLogs.length})
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Timestamp
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  User
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Details
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    No entries match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {log.timestamp}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.user}
                          </p>
                          <p className="text-xs text-gray-500">{log.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {log.details}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          log.status === "success"
                            ? "bg-green-100 text-green-800"
                            : log.status === "warning"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.status.charAt(0).toUpperCase() +
                          log.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
