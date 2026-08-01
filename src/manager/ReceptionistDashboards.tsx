import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";

const receptionistActivities = [
  {
    id: 1,
    receptionist: "Maria Santos",
    action: "Check-in",
    guest: "John Martinez",
    room: "101",
    time: "09:15 AM",
    status: "completed",
  },
  {
    id: 2,
    receptionist: "Carlos Reyes",
    action: "Check-out",
    guest: "Emily Brown",
    room: "205",
    time: "11:30 AM",
    status: "completed",
  },
  {
    id: 3,
    receptionist: "Maria Santos",
    action: "Reservation",
    guest: "David Lee",
    room: "308",
    time: "01:45 PM",
    status: "pending",
  },
  {
    id: 4,
    receptionist: "Lisa Garcia",
    action: "Payment",
    guest: "Sarah Chen",
    room: "412",
    time: "02:20 PM",
    status: "completed",
  },
  {
    id: 5,
    receptionist: "Carlos Reyes",
    action: "Room Change",
    guest: "Mike Johnson",
    room: "203",
    time: "03:00 PM",
    status: "in_progress",
  },
];

const transactionSummary = [
  {
    receptionist: "Maria Santos",
    checkIns: 8,
    checkOuts: 5,
    reservations: 12,
    totalSales: "$3,450",
  },
  {
    receptionist: "Carlos Reyes",
    checkIns: 6,
    checkOuts: 7,
    reservations: 9,
    totalSales: "$2,890",
  },
  {
    receptionist: "Lisa Garcia",
    checkIns: 5,
    checkOuts: 4,
    reservations: 8,
    totalSales: "$2,340",
  },
];

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Receptionist Dashboard
          </h1>
          <p className="text-gray-500 mt-2">
            Monitor receptionist activities and performance
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => navigate("/manager/activity-logs")}
        >
          View Full Activity Log
        </Button>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {transactionSummary.map((summary) => (
          <Card key={summary.receptionist} className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {summary.receptionist}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Check-ins</span>
                <span className="font-medium text-gray-900">
                  {summary.checkIns}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Check-outs</span>
                <span className="font-medium text-gray-900">
                  {summary.checkOuts}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reservations</span>
                <span className="font-medium text-gray-900">
                  {summary.reservations}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-900">
                  Total Sales
                </span>
                <span className="font-bold text-green-600">
                  {summary.totalSales}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activities
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Time
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Receptionist
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Guest
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Room
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {receptionistActivities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {activity.time}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {activity.receptionist}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {activity.action}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {activity.guest}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    Room {activity.room}
                  </td>
                  <td className="py-3 px-4">
                    {activity.status === "completed" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Completed</span>
                      </span>
                    )}
                    {activity.status === "pending" && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">Pending</span>
                      </span>
                    )}
                    {activity.status === "in_progress" && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">In Progress</span>
                      </span>
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
