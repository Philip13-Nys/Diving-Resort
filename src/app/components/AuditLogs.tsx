import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { toCsv, downloadFile } from "../reportData";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  User,
} from "lucide-react";

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("All");

  const [auditLogs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(db, "ActivityLogs"),
          orderBy("timestamp", "desc"),
          limit(1000),
        ),
        (snapshot) => {
          setLogs(
            snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                ...d,
                user: d.user || "Unknown",
                module: d.module || d.role || "System",
                severity:
                  d.severity || (d.status === "warning" ? "Warning" : "Info"),
                status: d.status || "success",
                timestamp: d.timestamp?.toDate?.().toLocaleString() || "",
              };
            }),
          );
          setError("");
          setLoading(false);
        },
        () => {
          setError("Unable to load activity logs. Reload to retry.");
          setLoading(false);
        },
      ),
    [],
  );
  useEffect(() => setPage(1), [searchTerm, selectedSeverity]);
  const filtered = auditLogs.filter(
    (log) =>
      (selectedSeverity === "All" ||
        selectedSeverity === "All Severities" ||
        log.severity === selectedSeverity) &&
      [log.user, log.action, log.module, log.details].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const exportLogs = () =>
    downloadFile(
      toCsv([
        ["Timestamp", "User", "Action", "Module", "Details", "Status"],
        ...filtered.map((log) => [
          log.timestamp,
          log.user,
          log.action,
          log.module,
          log.details,
          log.status,
        ]),
      ]),
      "audit-logs.csv",
    );
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <AlertCircle className="size-4 text-red-600" />;
      case "Warning":
        return <AlertCircle className="size-4 text-orange-600" />;
      case "Info":
        return <Info className="size-4 text-blue-600" />;
      default:
        return <CheckCircle className="size-4 text-green-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Success: "bg-green-100 text-green-700",
      Failed: "bg-red-100 text-red-700",
      Blocked: "bg-orange-100 text-orange-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-w-0 space-y-6">
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-500 mt-2">
            Monitor system activities by staff members
          </p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Download className="size-4" />
          Export Logs
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          System Activity
        </h2>
        <div className="pb-4 border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by user, action, or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Severities</option>
              <option>Critical</option>
              <option>Warning</option>
              <option>Info</option>
            </select>
            <button
              onClick={() => setPage(1)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="size-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Module
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Details
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    Loading activity logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    No entries match the current filter.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {log.timestamp}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {log.user}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs whitespace-normal break-words text-sm text-gray-600">
                        {log.details}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(String(log.status).charAt(0).toUpperCase() + String(log.status).slice(1).toLowerCase())}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(log.severity)}
                          <span className="text-sm text-gray-600">
                            {log.severity}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Showing{" "}
            {Math.min(
              10,
              Math.max(0, filtered.length - (currentPage - 1) * 10),
            )}{" "}
            of {filtered.length} activities
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
              {currentPage} / {pages}
            </span>
            <button
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
