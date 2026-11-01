import { useRef, useState } from "react";
import { AsyncButton } from "./ui/async-action";
import {
  createLocalBackup,
  restoreMissingStaffRecords,
  validateBackup,
  type LocalBackup,
} from "../localBackup";
import { downloadFile } from "../reportData";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
} from "lucide-react";

export default function BackupManagement() {
  const input = useRef<HTMLInputElement>(null);
  const [backupHistory, setHistory] = useState<any[]>([]);
  const [databaseTables, setTables] = useState<any[]>([]);
  const [message, setMessage] = useState(
    "No backup has been created in this session.",
  );
  const storageStats = [
    {
      label: "Session Backups",
      value: backupHistory.length,
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Storage",
      value: "Downloads",
      color: "from-purple-500 to-pink-600",
    },
    {
      label: "Last Backup",
      value: backupHistory[0]?.date || "None",
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Next Backup",
      value: "Manual",
      color: "from-orange-500 to-amber-600",
    },
  ];
  async function restore(backup: LocalBackup) {
    try {
      validateBackup(backup);
      if (
        !window.confirm(
          "Restore missing staff records from " +
            backup.createdAt +
            "? Existing records, login accounts and customer-project records will not be overwritten.",
        )
      )
        return;
      setMessage("Restoring missing staff records…");
      const restored = await restoreMissingStaffRecords(backup);
      setMessage(restored + " missing staff records restored.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore failed.");
    }
  }
  async function create() {
    try {
      setMessage("Reading records for backup…");
      const started = Date.now(),
        data = await createLocalBackup(),
        json = JSON.stringify(data, null, 2);
      const name =
        "resort-backup-" + data.createdAt.replace(/[:.]/g, "-") + ".json";
      downloadFile(json, name, "application/json");
      setHistory((previous) => [
        {
          id: started,
          name,
          type: "Manual",
          date: new Date().toLocaleString(),
          size: (new Blob([json]).size / 1024).toFixed(1) + " KB",
          status: "Exported",
          duration: ((Date.now() - started) / 1000).toFixed(1) + " s",
          data,
        },
        ...previous,
      ]);
      const groups = new Map<string, number>();
      data.records.forEach((row) => {
        const key = row.store + "/" + row.path.split("/")[0];
        groups.set(key, (groups.get(key) || 0) + 1);
      });
      setTables(
        [...groups].map(([name, records]) => ({
          name,
          records,
          size: "",
          lastUpdated: "at export",
        })),
      );
      setMessage(
        "Backup downloaded. Keep this file private; it contains guest and staff information.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Backup failed.");
    }
  }
  return (
    <div className="space-y-6">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 25 * 1024 * 1024)
              throw new Error("Backup file exceeds 25 MB.");
            await restore(JSON.parse(await file.text()));
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Invalid backup file.",
            );
          }
          event.target.value = "";
        }}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Backup and Data Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage system backups, data recovery, and database maintenance for
            data security
          </p>
        </div>
        <div className="flex gap-3">
          <AsyncButton
            onClick={() => input.current?.click()}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="size-4" />
            Restore
          </AsyncButton>
          <AsyncButton
            onClick={create}
            className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Database className="size-4" />
            Create Backup
          </AsyncButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {storageStats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}
          >
            <p className="text-sm text-white/80 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Backup Schedule
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Daily Backup</p>
                  <p className="text-sm text-gray-600">
                    Manual export; no background service
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled
                  checked={false}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Weekly Backup</p>
                  <p className="text-sm text-gray-600">
                    Manual export; no background service
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled
                  checked={false}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Database className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Monthly Backup</p>
                  <p className="text-sm text-gray-600">
                    Manual export; no background service
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled
                  checked={false}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Storage Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Location
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>Browser download (local JSON)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retention: managed in your Downloads folder
              </label>
              <input
                type="number"
                disabled
                value="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Format
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>JSON with Firestore timestamps</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="encrypt"
                disabled
                checked={false}
                className="size-4 text-cyan-600 rounded focus:ring-cyan-500"
              />
              <label htmlFor="encrypt" className="text-sm text-gray-700">
                Plain JSON export; store securely
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Backup History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Backup Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {backupHistory.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Database className="size-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {backup.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        backup.type === "Automatic"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {backup.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {backup.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {backup.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {backup.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">
                        {backup.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <AsyncButton
                        onClick={() =>
                          downloadFile(
                            JSON.stringify(backup.data, null, 2),
                            backup.name,
                            "application/json",
                          )
                        }
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="size-4 text-gray-600" />
                      </AsyncButton>
                      <AsyncButton
                        onClick={() => restore(backup.data)}
                        className="p-2 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <RefreshCw className="size-4 text-cyan-600" />
                      </AsyncButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Database Tables
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {databaseTables.map((table) => (
              <div
                key={table.name}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {table.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {table.records} records
                    </p>
                  </div>
                  <span className="text-sm font-medium text-cyan-600">
                    {table.size}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Updated {table.lastUpdated}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="size-5 text-green-600 mt-0.5" />
        <div>
          <h4 className="font-semibold text-green-900">Backup Status</h4>
          <p className="text-sm text-green-800 mt-1">
            {message} Authentication credentials, uploaded image files, and
            unknown subcollections are not included.
          </p>
        </div>
      </div>
    </div>
  );
}
