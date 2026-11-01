import { useRecordRevision } from "../app/useBookingInventory";
import { saveMaintenance } from "../app/maintenanceOperations";
import { AsyncButton, AsyncForm } from "../app/components/ui/async-action";
import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import {
  Plus,
  Wrench,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useSearchParams } from "react-router";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../app/firebase";
import { createActivityLog } from "../app/activitylogss";

type RoomOption = {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: number;
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  issue: string;
  priority: string;
  status: string;
  reportedBy: string;
  assignedTo: string;
  reportedDate: string;
};

type RequestFilter = "all" | "pending" | "in_progress" | "completed";

type NewRequest = {
  roomId: string;
  issue: string;
  priority: string;
  reportedBy: string;
  assignedTo: string;
};

const emptyRequest: NewRequest = {
  roomId: "",
  issue: "",
  priority: "medium",
  reportedBy: "Receptionist",
  assignedTo: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100";

const labelClass = "mb-1 block text-sm font-medium text-gray-700";

const displayStatus = (status: string) => {
  if (status === "in_progress") return "In Progress";

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatDate = (value: unknown): string => {
  if (!value) return "";

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return String(value);
};

const getString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" || typeof value === "number") {
      const result = String(value).trim();

      if (result) return result;
    }
  }

  return "";
};

export default function MaintenanceManagement() {
  const recordRevision = useRecordRevision(
    "admin:maintenanceRequests,admin:rooms,admin:roomTypes",
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<RequestFilter>("all");
  const [showForm, setShowForm] = useState(false);

  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >([]);

  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [newRequest, setNewRequest] = useState<NewRequest>({
    ...emptyRequest,
  });

  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMaintenanceRequests = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "maintenanceRequests"));

      const requests: MaintenanceRequest[] = snapshot.docs
        .map((item) => {
          const data = item.data();

          return {
            id: item.id,
            requestNumber: Number(data.requestNumber || 1),
            roomId: getString(data.roomId, data.roomID),
            roomNumber: getString(data.roomNumber),
            roomTypeId: getString(data.roomTypeId),
            roomTypeName: getString(data.roomTypeName, data.roomType),
            issue: getString(data.issue, data.description),
            priority: getString(data.priority, "medium").toLowerCase(),
            status: getString(data.status, "pending").toLowerCase(),
            reportedBy: getString(data.reportedBy),
            assignedTo: getString(data.assignedTo, "Unassigned"),
            reportedDate: formatDate(data.reportedDate),
          };
        })
        .sort((a, b) => a.requestNumber - b.requestNumber);

      setMaintenanceRequests(requests);
    } catch (error) {
      console.error("Error loading maintenance requests:", error);
      alert("Failed to load maintenance requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);

    try {
      const [roomSnapshot, roomTypeSnapshot] = await Promise.all([
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "roomTypes")),
      ]);

      const roomTypes = new Map<string, string>();

      roomTypeSnapshot.docs.forEach((item) => {
        const data = item.data();

        roomTypes.set(
          item.id,
          getString(
            data.name,
            data.roomTypeName,
            data.typeName,
            data.roomType,
            data.title,
          ) || item.id,
        );
      });

      const roomOptions: RoomOption[] = roomSnapshot.docs.map((item) => {
        const data = item.data();

        const roomId = getString(data.roomId, item.id);
        const roomTypeId = getString(
          data.roomTypeId,
          data.typeId,
          data.roomTypeID,
        );

        const roomTypeName =
          getString(
            data.type,
            data.roomTypeName,
            data.typeName,
            data.roomType,
            data.category,
            roomTypes.get(roomTypeId),
          ) || "Unspecified Room Type";

        return {
          id: roomId,
          roomTypeId,
          roomTypeName,
        };
      });

      roomOptions.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true }),
      );

      setRooms(roomOptions);
    } catch (error) {
      console.error("Error loading rooms:", error);
      alert("Failed to load rooms. Please check your Firebase connection.");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMaintenanceRequests();
    void loadRooms();
  }, [loadMaintenanceRequests, loadRooms, recordRevision]);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowForm(true);
    }
  }, [searchParams]);

  const closeForm = () => {
    setShowForm(false);
    setNewRequest({ ...emptyRequest });

    if (searchParams.has("action")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("action");
      setSearchParams(nextParams);
    }
  };

  const updateStatus = async (
    id: string,
    status: "pending" | "in_progress" | "completed",
  ) => {
    if (updatingId || deletingId || submitting) return;

    const request = maintenanceRequests.find((item) => item.id === id);

    if (!request) {
      alert("Maintenance request not found.");
      return;
    }

    setUpdatingId(id);

    try {
      await saveMaintenance(id, {
        status,
        updatedAt: serverTimestamp(),
      });

      setMaintenanceRequests((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );

      try {
        await createActivityLog({
          action: "Updated Maintenance Request",
          details: `Changed REQ-${request.requestNumber} for Room ID ${request.roomId || "not specified"} to ${displayStatus(status)}.`,
          status: "success",
        });
      } catch (logError) {
        console.error("Failed to create activity log:", logError);
      }
    } catch (error) {
      console.error("Error updating maintenance status:", error);
      alert("Failed to update maintenance request. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeMaintenanceRequest = async (id: string) => {
    if (deletingId || updatingId || submitting) return;

    const request = maintenanceRequests.find((item) => item.id === id);

    if (!request) {
      alert("Maintenance request not found.");
      return;
    }

    const roomDescription = request.roomId || "not specified";

    const confirmed = window.confirm(
      `Are you sure you want to permanently remove REQ-${request.requestNumber} for Room ID ${roomDescription}?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await saveMaintenance(id, undefined, true);

      setMaintenanceRequests((current) =>
        current.filter((item) => item.id !== id),
      );

      try {
        await createActivityLog({
          action: "Removed Maintenance Request",
          details: `Removed REQ-${request.requestNumber} for Room ID ${roomDescription}.`,
          status: "success",
        });
      } catch (logError) {
        console.error("Failed to create removal activity log:", logError);
      }

      alert(`REQ-${request.requestNumber} was removed successfully.`);
    } catch (error) {
      console.error("Error removing maintenance request:", error);
      alert("Failed to remove maintenance request. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddMaintenanceRequest = async () => {
    if (submitting || updatingId || deletingId) return;

    const selectedRoom = rooms.find((room) => room.id === newRequest.roomId);

    if (!selectedRoom) {
      alert("Please select a valid room from the Room ID list.");
      return;
    }

    if (!newRequest.issue.trim()) {
      alert("Please enter an issue description.");
      return;
    }

    setSubmitting(true);

    try {
      const snapshot = await getDocs(collection(db, "maintenanceRequests"));

      const requestNumbers = snapshot.docs
        .map((item) => Number(item.data().requestNumber || 0))
        .filter((number) => Number.isFinite(number) && number > 0);

      const nextRequestNumber =
        requestNumbers.length > 0 ? Math.max(...requestNumbers) + 1 : 1;

      await saveMaintenance(doc(collection(db, "maintenanceRequests")).id, {
        requestNumber: nextRequestNumber,

        roomId: selectedRoom.id,
        roomTypeId: selectedRoom.roomTypeId,
        roomTypeName: selectedRoom.roomTypeName,

        issue: newRequest.issue.trim(),
        priority: newRequest.priority.toLowerCase(),
        status: "pending",
        reportedBy: newRequest.reportedBy,
        assignedTo: newRequest.assignedTo.trim() || "Unassigned",
        reportedDate: new Date().toLocaleString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await createActivityLog({
          action: "Created Maintenance Request",
          details: `Created REQ-${nextRequestNumber} for Room ID ${selectedRoom.id} (${selectedRoom.roomTypeName}).`,
          status: "success",
        });
      } catch (logError) {
        console.error("Failed to create activity log:", logError);
      }

      await loadMaintenanceRequests();

      setNewRequest({ ...emptyRequest });
      closeForm();

      alert(
        `Maintenance request REQ-${nextRequestNumber} submitted successfully.`,
      );
    } catch (error) {
      console.error("Error adding maintenance request:", error);
      alert("Failed to add maintenance request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = maintenanceRequests.filter((request) => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const stats = {
    total: maintenanceRequests.length,
    pending: maintenanceRequests.filter(
      (request) => request.status === "pending",
    ).length,
    inProgress: maintenanceRequests.filter(
      (request) => request.status === "in_progress",
    ).length,
    completed: maintenanceRequests.filter(
      (request) => request.status === "completed",
    ).length,
  };

  const selectedRoom = rooms.find((room) => room.id === newRequest.roomId);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Maintenance Management
          </h1>
          <p className="mt-2 text-gray-500">
            Track and manage room maintenance requests
          </p>
        </div>

        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => {
            setNewRequest({ ...emptyRequest });
            setShowForm(true);
          }}
          disabled={submitting || deletingId !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Maintenance Request
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="m-4 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  New Maintenance Request
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select the registered room and provide the issue details.
                </p>
              </div>

              <AsyncButton
                type="button"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Close form"
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </AsyncButton>
            </div>

            <AsyncForm
              onSubmit={(event) => {
                event.preventDefault();
                return handleAddMaintenanceRequest();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="maintenance-room-id" className={labelClass}>
                  Room ID <span className="text-red-500">*</span>
                </label>

                <select
                  id="maintenance-room-id"
                  value={newRequest.roomId}
                  onChange={(event) =>
                    setNewRequest((current) => ({
                      ...current,
                      roomId: event.target.value,
                    }))
                  }
                  className={inputClass}
                  disabled={submitting || roomsLoading}
                  required
                >
                  <option value="">
                    {roomsLoading
                      ? "Loading rooms..."
                      : rooms.length
                        ? "Select a room"
                        : "No registered rooms found"}
                  </option>

                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.id} — {room.roomTypeName}
                    </option>
                  ))}
                </select>

                {!roomsLoading && rooms.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">
                    Add rooms to the rooms collection before creating a
                    room-linked maintenance request.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="maintenance-room-type" className={labelClass}>
                  Room Type
                </label>

                <input
                  id="maintenance-room-type"
                  value={selectedRoom?.roomTypeName ?? ""}
                  readOnly
                  className={`${inputClass} bg-gray-50`}
                  placeholder="Automatically populated from the selected room"
                />
              </div>

              {selectedRoom && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  <p>
                    <span className="font-medium">Room ID:</span>{" "}
                    {selectedRoom.id}
                  </p>
                  <p>
                    <span className="font-medium">Room Type:</span>{" "}
                    {selectedRoom.roomTypeName}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="maintenance-issue" className={labelClass}>
                  Issue Description <span className="text-red-500">*</span>
                </label>

                <textarea
                  id="maintenance-issue"
                  value={newRequest.issue}
                  onChange={(event) =>
                    setNewRequest((current) => ({
                      ...current,
                      issue: event.target.value,
                    }))
                  }
                  rows={3}
                  maxLength={1000}
                  className={inputClass}
                  placeholder="Describe the maintenance issue..."
                  disabled={submitting}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="maintenance-priority" className={labelClass}>
                    Priority <span className="text-red-500">*</span>
                  </label>

                  <select
                    id="maintenance-priority"
                    value={newRequest.priority}
                    onChange={(event) =>
                      setNewRequest((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={submitting}
                    required
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="maintenance-reported-by"
                    className={labelClass}
                  >
                    Reported By <span className="text-red-500">*</span>
                  </label>

                  <select
                    id="maintenance-reported-by"
                    value={newRequest.reportedBy}
                    onChange={(event) =>
                      setNewRequest((current) => ({
                        ...current,
                        reportedBy: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={submitting}
                    required
                  >
                    <option value="Receptionist">Receptionist</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="maintenance-assigned-to" className={labelClass}>
                  Assign To
                </label>

                <input
                  id="maintenance-assigned-to"
                  value={newRequest.assignedTo}
                  onChange={(event) =>
                    setNewRequest((current) => ({
                      ...current,
                      assignedTo: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Staff member name (optional)"
                  disabled={submitting}
                  maxLength={150}
                />
              </div>

              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  disabled={
                    submitting ||
                    roomsLoading ||
                    rooms.length === 0 ||
                    !newRequest.roomId
                  }
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </AsyncForm>
          </Card>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
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

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All Requests"],
            ["pending", "Pending"],
            ["in_progress", "In Progress"],
            ["completed", "Completed"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? value === "pending"
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : value === "in_progress"
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : value === "completed"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                : ""
            }
          >
            {label}
          </Button>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Maintenance Requests
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRequests.length} request(s)
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              return Promise.all([loadMaintenanceRequests(), loadRooms()]);
            }}
            disabled={loading || roomsLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  "Request ID",
                  "Room ID",
                  "Room Type",
                  "Issue",
                  "Priority",
                  "Reported By",
                  "Assigned To",
                  "Reported Date",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Loading maintenance requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No maintenance requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      REQ-{request.requestNumber}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-900">
                      {request.roomId || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700">
                      {request.roomTypeName || "Unspecified"}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                      <div className="whitespace-normal break-words">
                        {request.issue || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          request.priority === "urgent"
                            ? "bg-red-100 text-red-800"
                            : request.priority === "high"
                              ? "bg-orange-100 text-orange-800"
                              : request.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {displayStatus(request.priority)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700">
                      {request.reportedBy || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700">
                      {request.assignedTo || "Unassigned"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700">
                      {request.reportedDate || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          request.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : request.status === "in_progress"
                              ? "bg-orange-100 text-orange-800"
                              : request.status === "cancelled"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {displayStatus(request.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {request.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-300 text-xs text-orange-600 hover:bg-orange-50"
                            onClick={() =>
                              void updateStatus(request.id, "in_progress")
                            }
                            disabled={
                              updatingId !== null ||
                              deletingId !== null ||
                              submitting
                            }
                          >
                            {updatingId === request.id
                              ? "Updating..."
                              : "Start"}
                          </Button>
                        )}

                        {request.status === "in_progress" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-300 text-xs text-green-600 hover:bg-green-50"
                            onClick={() =>
                              void updateStatus(request.id, "completed")
                            }
                            disabled={
                              updatingId !== null ||
                              deletingId !== null ||
                              submitting
                            }
                          >
                            {updatingId === request.id
                              ? "Updating..."
                              : "Complete"}
                          </Button>
                        )}

                        {request.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onClick={() =>
                              void updateStatus(request.id, "pending")
                            }
                            disabled={
                              updatingId !== null ||
                              deletingId !== null ||
                              submitting
                            }
                          >
                            {updatingId === request.id
                              ? "Updating..."
                              : "Reopen"}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-xs text-red-600 hover:bg-red-50"
                          onClick={() =>
                            void removeMaintenanceRequest(request.id)
                          }
                          disabled={
                            updatingId !== null ||
                            deletingId !== null ||
                            submitting
                          }
                          title="Permanently remove this maintenance request"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {deletingId === request.id ? "Removing..." : "Remove"}
                        </Button>
                      </div>
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
