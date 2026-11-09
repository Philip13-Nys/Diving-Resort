import { reportRows, exportReport } from "../app/reportData";
import { localDate } from "../app/bookingAvailability";
import { useState } from "react";
import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { FileText, Download, Calendar, X } from "lucide-react";

const reportTemplates = [
  {
    id: "Occupancy",
    name: "Occupancy Report",
    description: "Room reservations and occupancy by date",
    frequency: "Daily",
  },
  {
    id: "Revenue",
    name: "Revenue Report",
    description: "Completed payments and collected amounts",
    frequency: "Daily",
  },
  {
    id: "Reservation",
    name: "Reservation Summary",
    description: "Booking status, amounts, and remaining balances",
    frequency: "Weekly",
  },
] as const;

type RecentReport = {
  name: string;
  rows: unknown[][];
  period: string;
  generatedAt: string;
};

export default function Reports() {
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState("Occupancy");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const generate = async (name: string, kind: string, from = "", to = "") => {
    if (generating) return;
    setGenerating(kind);
    try {
      if (kind === "Occupancy" && !from && !to) from = to = localDate();
      const rows = await reportRows(kind, from, to);
      const period = from || to ? `${from || "Beginning"} to ${to || "Today"}` : "";
      exportReport(name, rows, period);
      setRecentReports((previous) => [
        { name, rows, period, generatedAt: new Date().toLocaleString() },
        ...previous,
      ]);
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to generate report.");
      return false;
    } finally {
      setGenerating(null);
    }
  };

  const generateCustom = async () => {
    if (!reportName.trim()) return;
    const success = await generate(reportName.trim(), reportType, startDate, endDate);
    if (success) {
      setShowModal(false);
      setReportName("");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-gray-500">Generate and download Excel reports</p>
        </div>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <Calendar className="mr-2 h-4 w-4" /> Custom Report
        </Button>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900">Report Templates</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {reportTemplates.map((report) => (
          <Card key={report.id} className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                {report.frequency}
              </span>
            </div>
            <h3 className="mb-2 font-semibold text-gray-900">{report.name}</h3>
            <p className="mb-5 flex-1 text-sm text-gray-600">{report.description}</p>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-xs text-gray-500">Excel (.xlsx)</span>
              <Button
                size="sm"
                disabled={generating !== null}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={() => void generate(report.name, report.id)}
              >
                {generating === report.id ? "Generating..." : "Generate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recently Generated</h2>
        {recentReports.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Generate a report above to download an Excel file.
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((report, index) => (
              <div key={`${report.generatedAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-sm text-gray-500">
                    {report.generatedAt} · {Math.max(0, report.rows.length - 1)} records · Excel
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportReport(report.name, report.rows, report.period)}>
                  <Download className="mr-2 h-4 w-4" /> Download again
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(event) => {
          if (event.target === event.currentTarget) setShowModal(false);
        }}>
          <Card className="w-full max-w-lg bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Custom Report</h2>
              <button type="button" aria-label="Close modal" className="text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Report Name
                <input value={reportName} onChange={(event) => setReportName(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="e.g. November Revenue" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Report Type
                <select value={reportType} onChange={(event) => setReportType(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                  {reportTemplates.map((report) => <option key={report.id} value={report.id}>{report.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button disabled={!reportName.trim() || generating !== null} className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" onClick={() => void generateCustom()}>
                {generating ? "Generating..." : "Generate Excel"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
