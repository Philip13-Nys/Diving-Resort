import { useState, useEffect, useRef } from "react";
import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { FileText, Download, Calendar, Filter, X } from "lucide-react";

const reportTemplates = [
  {
    id: 1,
    name: "Occupancy Report",
    description: "Room occupancy rates and trends",
    category: "Operational",
    frequency: "Daily",
  },
  {
    id: 2,
    name: "Revenue Report",
    description: "Sales performance and revenue breakdown",
    category: "Financial",
    frequency: "Daily",
  },
  {
    id: 3,
    name: "Reservation Summary",
    description: "Booking statistics and channel performance",
    category: "Operational",
    frequency: "Weekly",
  },
  {
    id: 4,
    name: "Guest Analytics",
    description: "Guest demographics and behavior insights",
    category: "Analytics",
    frequency: "Monthly",
  },
  {
    id: 5,
    name: "Staff Performance",
    description: "Employee productivity and service metrics",
    category: "Human Resources",
    frequency: "Monthly",
  },
  {
    id: 6,
    name: "Maintenance Log",
    description: "Maintenance activities and costs",
    category: "Operational",
    frequency: "Weekly",
  },
];

type RecentReport = {
  name: string;
  date: string;
  size: string;
  status: string;
};

const initialRecentReports: RecentReport[] = [
  {
    name: "Daily Occupancy Report",
    date: "Jun 7, 2026",
    size: "245 KB",
    status: "ready",
  },
  {
    name: "Weekly Revenue Summary",
    date: "Jun 6, 2026",
    size: "512 KB",
    status: "ready",
  },
  {
    name: "Monthly Guest Analytics",
    date: "Jun 1, 2026",
    size: "1.2 MB",
    status: "ready",
  },
  {
    name: "Maintenance Report",
    date: "Jun 5, 2026",
    size: "180 KB",
    status: "ready",
  },
];

type FilterCategory =
  | "All"
  | "Operational"
  | "Financial"
  | "Analytics"
  | "Human Resources";

const CATEGORIES: FilterCategory[] = [
  "All",
  "Operational",
  "Financial",
  "Analytics",
  "Human Resources",
];

const RANDOM_SIZES = [
  "210 KB",
  "324 KB",
  "456 KB",
  "512 KB",
  "128 KB",
  "389 KB",
  "640 KB",
];

function randomSize() {
  return RANDOM_SIZES[Math.floor(Math.random() * RANDOM_SIZES.length)];
}

export default function Reports() {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("All");
  const [showFilter, setShowFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recentReports, setRecentReports] =
    useState<RecentReport[]>(initialRecentReports);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  // Custom report form state
  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState("Occupancy");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState("PDF");

  const filterRef = useRef<HTMLDivElement>(null);

  const filteredTemplates =
    filterCategory === "All"
      ? reportTemplates
      : reportTemplates.filter((r) => r.category === filterCategory);

  // Close filter dropdown when clicking outside
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

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowModal(false);
    }
    if (showModal) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  function handleGenerate(templateId: number, templateName: string) {
    if (generatingId !== null) return;
    setGeneratingId(templateId);
    setTimeout(() => {
      setRecentReports((prev) => [
        {
          name: templateName,
          date: "Jun 23, 2026",
          size: randomSize(),
          status: "ready",
        },
        ...prev,
      ]);
      setGeneratingId(null);
    }, 1500);
  }

  function handleCustomReport() {
    if (!reportName.trim()) return;
    const newReport: RecentReport = {
      name: reportName.trim(),
      date: "Jun 23, 2026",
      size: randomSize(),
      status: "ready",
    };
    setRecentReports((prev) => [newReport, ...prev]);
    // Reset form and close modal
    setReportName("");
    setReportType("Occupancy");
    setStartDate("");
    setEndDate("");
    setFormat("PDF");
    setShowModal(false);
  }

  function handleDownload(report: RecentReport) {
    const content = `Report: ${report.name}\nGenerated: ${report.date}\nStatus: Ready`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.name.replace(/\s+/g, "_")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-2">
            Generate and access operational and analytical reports
          </p>
        </div>
        <div className="flex gap-3">
          {/* Filter button + dropdown */}
          <div className="relative" ref={filterRef}>
            <Button
              variant="outline"
              className="border-gray-300"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {filterCategory !== "All" && (
                <span className="ml-2 w-2 h-2 rounded-full bg-blue-600 inline-block" />
              )}
            </Button>

            {showFilter && (
              <Card className="absolute right-0 top-full mt-2 w-52 p-3 shadow-lg z-50 bg-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Category
                </p>
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 px-1 py-1.5 rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="filterCategory"
                      value={cat}
                      checked={filterCategory === cat}
                      onChange={() => {
                        setFilterCategory(cat);
                        setShowFilter(false);
                      }}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{cat}</span>
                  </label>
                ))}
              </Card>
            )}
          </div>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowModal(true)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Recent Reports */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recently Generated
        </h2>
        <div className="space-y-3">
          {recentReports.map((report, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-sm text-gray-500">
                    Generated on {report.date} · {report.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Ready
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(report)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Report Templates */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Report Templates
        </h2>
        {filterCategory !== "All" && (
          <span className="text-sm text-gray-500">
            Filtered by{" "}
            <span className="font-medium text-gray-700">{filterCategory}</span>{" "}
            ({filteredTemplates.length} of {reportTemplates.length})
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((report) => {
          const isGenerating = generatingId === report.id;
          return (
            <Card key={report.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {report.frequency}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {report.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500">{report.category}</span>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  disabled={isGenerating || generatingId !== null}
                  onClick={() => handleGenerate(report.id, report.name)}
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Custom Report Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <Card className="bg-white w-full max-w-lg mx-4 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Custom Report
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g. Q2 Revenue Summary"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>Occupancy</option>
                  <option>Revenue</option>
                  <option>Reservation</option>
                  <option>Guest Analytics</option>
                  <option>Staff Performance</option>
                  <option>Maintenance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                className="border-gray-300"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                disabled={!reportName.trim()}
                onClick={handleCustomReport}
              >
                Generate Report
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
