import { Fragment } from "react";
import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Edit, TrendingUp, Calendar, X, Save } from "lucide-react";
import { useState } from "react";

const pricingRules = [
  {
    id: 1,
    name: "Peak Season Rate",
    period: "Dec 15 - Jan 15",
    multiplier: "1.5x",
    status: "active",
    affectedRooms: "All room types",
  },
  {
    id: 2,
    name: "Weekend Premium",
    period: "Every Fri-Sun",
    multiplier: "1.3x",
    status: "active",
    affectedRooms: "Ocean View & Villa",
  },
  {
    id: 3,
    name: "Low Season Discount",
    period: "Sep 1 - Nov 30",
    multiplier: "0.8x",
    status: "scheduled",
    affectedRooms: "Standard & Deluxe",
  },
];

const currentRates = [
  { roomType: "Standard Room", baseRate: 150, weekendRate: 180, peakRate: 225 },
  { roomType: "Deluxe Room", baseRate: 250, weekendRate: 300, peakRate: 375 },
  {
    roomType: "Ocean View Suite",
    baseRate: 400,
    weekendRate: 520,
    peakRate: 600,
  },
  {
    roomType: "Beach Front Villa",
    baseRate: 800,
    weekendRate: 1040,
    peakRate: 1200,
  },
];

export default function PricingManagement() {
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<number | null>(null);

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pricing / Rate Management
          </h1>
          <p className="text-gray-500 mt-2">
            Set and manage room rates and pricing policies
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <Edit className="w-4 h-4 text-blue-600" />
          <span>
            Click <span className="font-medium text-blue-600">Edit</span> on any
            row to update rates or rules
          </span>
        </div>
      </div>

      {/* Current Rates */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Current Room Rates
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Room Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Base Rate
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Weekend Rate
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Peak Season Rate
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentRates.map((rate) => (
                <Fragment key={rate.roomType}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {rate.roomType}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      ${rate.baseRate}/night
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      <span className="text-blue-600 font-medium">
                        ${rate.weekendRate}/night
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        (+
                        {Math.round(
                          ((rate.weekendRate - rate.baseRate) / rate.baseRate) *
                            100,
                        )}
                        %)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      <span className="text-orange-600 font-medium">
                        ${rate.peakRate}/night
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        (+
                        {Math.round(
                          ((rate.peakRate - rate.baseRate) / rate.baseRate) *
                            100,
                        )}
                        %)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingRate(
                            editingRate === rate.roomType
                              ? null
                              : rate.roomType,
                          )
                        }
                      >
                        {editingRate === rate.roomType ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Edit className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {editingRate === rate.roomType && (
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Base Rate ($/night)
                            </label>
                            <input
                              type="number"
                              defaultValue={rate.baseRate}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Weekend Rate ($/night)
                            </label>
                            <input
                              type="number"
                              defaultValue={rate.weekendRate}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Peak Season Rate ($/night)
                            </label>
                            <input
                              type="number"
                              defaultValue={rate.peakRate}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setEditingRate(null)}
                          >
                            <Save className="w-3 h-3 mr-1" /> Save Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRate(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pricing Rules */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Pricing Rules & Policies
          </h2>
        </div>
        <div className="space-y-4">
          {pricingRules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 border rounded-lg transition-colors ${editingRule === rule.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
            >
              {editingRule === rule.id ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Rule Name
                      </label>
                      <input
                        defaultValue={rule.name}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Period
                      </label>
                      <input
                        defaultValue={rule.period}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Price Multiplier
                      </label>
                      <input
                        defaultValue={rule.multiplier}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Affected Rooms
                      </label>
                      <input
                        defaultValue={rule.affectedRooms}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setEditingRule(null)}
                    >
                      <Save className="w-3 h-3 mr-1" /> Save Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingRule(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {rule.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rule.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {rule.status.charAt(0).toUpperCase() +
                          rule.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Period</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {rule.period}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Price Multiplier
                        </p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          {rule.multiplier}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Affected Rooms</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {rule.affectedRooms}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
