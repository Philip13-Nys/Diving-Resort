import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Plus, Wrench, AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";

type MaintenanceRequest = {
  id: string;
  room: string;
  issue: string;
  priority: string;
  status: string;
  reportedBy: string;
  assignedTo: string;
  reportedDate: string;
  estimatedCompletion: string;
};

const initialMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: "MR-001",
    room: "103",
    issue: "Air conditioning not cooling properly",
    priority: "high",
    status: "in_progress",
    reportedBy: "Housekeeping",
    assignedTo: "Ana Rodriguez",
    reportedDate: "Jun 7, 2026 08:00 AM",
    estimatedCompletion: "Jun 7, 2026 02:00 PM",
  },
  {
    id: "MR-002",
    room: "205",
    issue: "Leaking faucet in bathroom",
    priority: "medium",
    status: "pending",
    reportedBy: "Guest",
    assignedTo: "Unassigned",
    reportedDate: "Jun 7, 2026 09:30 AM",
    estimatedCompletion: "Jun 8, 2026 10:00 AM",
  },
  {
    id: "MR-003",
    room: "301",
    issue: "TV remote not working",
    priority: "low",
    status: "pending",
    reportedBy: "Guest",
    assignedTo: "Unassigned",
    reportedDate: "Jun 7, 2026 10:15 AM",
    estimatedCompletion: "Jun 7, 2026 04:00 PM",
  },
  {
    id: "MR-004",
    room: "102",
    issue: "Door lock malfunction",
    priority: "urgent",
    status: "completed",
    reportedBy: "Receptionist",
    assignedTo: "Ana Rodriguez",
    reportedDate: "Jun 6, 2026 03:00 PM",
    estimatedCompletion: "Jun 6, 2026 05:00 PM",
  },
];

export default function MaintenanceManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<
    "all" | "pending" | "in_progress" | "completed"
  >("all");
  const [showForm, setShowForm] = useState(false);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >(initialMaintenanceRequests);

  useEffect(() => {
    if (searchParams.get("action") === "new") setShowForm(true);
  }, [searchParams]);

  const closeForm = () => {
    setShowForm(false);
    setSearchParams({});
  };

  const updateStatus = (id: string, status: string) => {
    setMaintenanceRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  };

  const filteredRequests = maintenanceRequests.filter((request) => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const stats = {
    total: maintenanceRequests.length,
    pending: maintenanceRequests.filter((r) => r.status === "pending").length,
    inProgress: maintenanceRequests.filter((r) => r.status === "in_progress")
      .length,
    completed: maintenanceRequests.filter((r) => r.status === "completed")
      .length,
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Maintenance Management
          </h1>
          <p className="text-gray-500 mt-2">
            Track and manage room maintenance requests
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Maintenance Request
        </Button>
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                New Maintenance Request
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Room Number
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 103"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Issue Description
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the issue..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Priority
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Urgent</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Reported By
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Receptionist</option>
                    <option>Housekeeping</option>
                    <option>Guest</option>
                    <option>Manager</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Assign To
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Staff member name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Estimated Completion
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={closeForm}
              >
                Submit Request
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pending}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.inProgress}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.completed}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={
            filter === "all" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
          }
        >
          All Requests
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
          className={
            filter === "pending"
              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
              : ""
          }
        >
          Pending
        </Button>
        <Button
          variant={filter === "in_progress" ? "default" : "outline"}
          onClick={() => setFilter("in_progress")}
          className={
            filter === "in_progress"
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : ""
          }
        >
          In Progress
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
          className={
            filter === "completed"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : ""
          }
        >
          Completed
        </Button>
      </div>

      {/* Maintenance Requests Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Maintenance Requests
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Request ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Room
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Issue
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Priority
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Reported By
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Assigned To
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Reported Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {request.id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    Room {request.room}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {request.issue}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        request.priority === "urgent"
                          ? "bg-red-100 text-red-800"
                          : request.priority === "high"
                            ? "bg-orange-100 text-orange-800"
                            : request.priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {request.priority.charAt(0).toUpperCase() +
                        request.priority.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {request.reportedBy}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {request.assignedTo}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {request.reportedDate}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        request.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : request.status === "in_progress"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {request.status === "in_progress"
                        ? "In Progress"
                        : request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {request.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs"
                        onClick={() => updateStatus(request.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    {request.status === "in_progress" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                        onClick={() => updateStatus(request.id, "completed")}
                      >
                        Complete
                      </Button>
                    )}
                    {request.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700 text-xs"
                        onClick={() => updateStatus(request.id, "pending")}
                      >
                        Reopen
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
