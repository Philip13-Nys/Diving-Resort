import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown } from "lucide-react";

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 820000, bookings: 142 },
  { month: "Feb", revenue: 950000, bookings: 168 },
  { month: "Mar", revenue: 1100000, bookings: 195 },
  { month: "Apr", revenue: 1050000, bookings: 184 },
  { month: "May", revenue: 1200000, bookings: 210 },
  { month: "Jun", revenue: 480000, bookings: 82 },
];

const ROOM_TYPE_DIST = [
  { name: "Beachfront Suite", value: 35, color: "#0d7377" },
  { name: "Ocean View", value: 30, color: "#14b8a6" },
  { name: "Garden Room", value: 22, color: "#06b6d4" },
  { name: "Dive Cabin", value: 13, color: "#f97316" },
];

const OCCUPANCY_WEEKLY = [
  { day: "Mon", rate: 72 },
  { day: "Tue", rate: 68 },
  { day: "Wed", rate: 75 },
  { day: "Thu", rate: 80 },
  { day: "Fri", rate: 92 },
  { day: "Sat", rate: 96 },
  { day: "Sun", rate: 88 },
];

const PAYMENT_METHODS = [
  { method: "Cash", amount: 580000, count: 98 },
  { method: "Card", amount: 420000, count: 65 },
  { method: "GCash", amount: 200000, count: 47 },
];

const TOP_GUESTS = [
  { name: "Lester Tan", visits: 8, spent: 160000 },
  { name: "James Villanueva", visits: 5, spent: 85000 },
  { name: "Sofia Cruz", visits: 4, spent: 40000 },
  { name: "Ana Gomez", visits: 3, spent: 32000 },
  { name: "Grace Kim", visits: 2, spent: 24000 },
];

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");

  const totalRevenue = MONTHLY_REVENUE.reduce((a, b) => a + b.revenue, 0);
  const totalBookings = MONTHLY_REVENUE.reduce((a, b) => a + b.bookings, 0);

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly", "yearly"] as ReportPeriod[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-2 rounded-lg text-sm capitalize border transition-all"
                style={{
                  background: period === p ? "#0d7377" : "white",
                  color: period === p ? "white" : "#4a7a7a",
                  borderColor:
                    period === p ? "#0d7377" : "rgba(13,115,119,0.2)",
                }}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <button
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
          style={{ borderColor: "rgba(13,115,119,0.2)", color: "#0d7377" }}
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue (YTD)",
            value: `₱${(totalRevenue / 1000000).toFixed(1)}M`,
            trend: +12.4,
            color: "#0d7377",
          },
          {
            label: "Total Bookings (YTD)",
            value: totalBookings,
            trend: +8.2,
            color: "#14b8a6",
          },
          {
            label: "Avg. Occupancy Rate",
            value: "78.5%",
            trend: +3.1,
            color: "#06b6d4",
          },
          {
            label: "Avg. Revenue / Booking",
            value: "₱5,842",
            trend: -1.2,
            color: "#f97316",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border p-5"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <p
              className="text-3xl mb-1"
              style={{ color: kpi.color, fontFamily: "Georgia, serif" }}
            >
              {kpi.value}
            </p>
            <p className="text-xs mb-3" style={{ color: "#4a7a7a" }}>
              {kpi.label}
            </p>
            <div className="flex items-center gap-1 text-xs">
              {kpi.trend > 0 ? (
                <TrendingUp
                  className="w-3.5 h-3.5"
                  style={{ color: "#0d7377" }}
                />
              ) : (
                <TrendingDown
                  className="w-3.5 h-3.5"
                  style={{ color: "#d4183d" }}
                />
              )}
              <span style={{ color: kpi.trend > 0 ? "#0d7377" : "#d4183d" }}>
                {kpi.trend > 0 ? "+" : ""}
                {kpi.trend}% vs last period
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 bg-white rounded-xl border p-5"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3
            className="font-medium mb-5"
            style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
          >
            Monthly Revenue & Bookings
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_REVENUE} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(13,115,119,0.08)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#4a7a7a" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#4a7a7a" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#4a7a7a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(13,115,119,0.15)",
                  borderRadius: 8,
                }}
                formatter={(val: number, name: string) => [
                  name === "revenue" ? `₱${val.toLocaleString()}` : val,
                  name === "revenue" ? "Revenue" : "Bookings",
                ]}
              />
              <Legend
                formatter={(v) => (v === "revenue" ? "Revenue" : "Bookings")}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#0d7377"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="bookings"
                fill="#14b8a6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="bg-white rounded-xl border p-5"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3
            className="font-medium mb-5"
            style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
          >
            Bookings by Room Type
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={ROOM_TYPE_DIST}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {ROOM_TYPE_DIST.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Share"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(13,115,119,0.15)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {ROOM_TYPE_DIST.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: d.color }}
                />
                <span className="flex-1" style={{ color: "#4a7a7a" }}>
                  {d.name}
                </span>
                <span style={{ color: "#0a2e2e" }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 bg-white rounded-xl border p-5"
          style={{ borderColor: "rgba(13,115,119,0.1)" }}
        >
          <h3
            className="font-medium mb-5"
            style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
          >
            Weekly Occupancy Rate (%)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={OCCUPANCY_WEEKLY}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(13,115,119,0.08)"
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#4a7a7a" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fontSize: 11, fill: "#4a7a7a" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Occupancy"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(13,115,119,0.15)",
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#0d7377"
                strokeWidth={2.5}
                dot={{ fill: "#0d7377", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          {/* Payment breakdown */}
          <div
            className="bg-white rounded-xl border p-5"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium mb-4"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Payment Methods
            </h3>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((p) => {
                const pct = Math.round(
                  (p.amount /
                    PAYMENT_METHODS.reduce((a, b) => a + b.amount, 0)) *
                    100,
                );
                const colors: Record<string, string> = {
                  Cash: "#0d7377",
                  Card: "#06b6d4",
                  GCash: "#14b8a6",
                };
                return (
                  <div key={p.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: "#0a2e2e" }}>{p.method}</span>
                      <span style={{ color: "#4a7a7a" }}>
                        ₱{(p.amount / 1000).toFixed(0)}K ({p.count} txns)
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full"
                      style={{ background: "#e2f3f2" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: colors[p.method],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top guests */}
          <div
            className="bg-white rounded-xl border p-5"
            style={{ borderColor: "rgba(13,115,119,0.1)" }}
          >
            <h3
              className="font-medium mb-4"
              style={{ color: "#0a2e2e", fontFamily: "Georgia, serif" }}
            >
              Top Guests
            </h3>
            <div className="space-y-2">
              {TOP_GUESTS.map((g, i) => (
                <div key={g.name} className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    style={{
                      background: i === 0 ? "#f97316" : "#e2f3f2",
                      color: i === 0 ? "#fff" : "#0d7377",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: "#0a2e2e" }}>
                    {g.name}
                  </span>
                  <span className="text-xs" style={{ color: "#0d7377" }}>
                    ₱{(g.spent / 1000).toFixed(0)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
