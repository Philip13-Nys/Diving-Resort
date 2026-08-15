import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

import { db } from "../app/firebase";

interface ReceptionistActivity {
  id: string;
  receptionist: string;
  action: string;
  guest: string;
  room: string;
  time: string;
  status: string;
}

interface TransactionSummary {
  receptionist: string;
  checkIns: number;
  checkOuts: number;
  reservations: number;
  totalSales: number;
}

export default function ReceptionistDashboard() {
  const navigate = useNavigate();

  const [receptionistActivities, setReceptionistActivities] = useState<
    ReceptionistActivity[]
  >([]);

  const [transactionSummary, setTransactionSummary] = useState<
    TransactionSummary[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const activitiesRef = collection(db, "ActivityLogs");

        const activitiesQuery = query(
          activitiesRef,
          orderBy("timestamp", "desc"),
          limit(10),
        );

        const snapshot = await getDocs(activitiesQuery);

        const activities: ReceptionistActivity[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            receptionist: data.receptionist || "Unknown",
            action: data.action || "Unknown",
            guest: data.guest || "Unknown",
            room: data.room || "N/A",
            time: data.timestamp
              ? data.timestamp.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A",
            status: data.status || "pending",
          };
        });

        setReceptionistActivities(activities);
      } catch (error) {
        console.error("Error fetching receptionist activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Receptionist Dashboard
          </h1>
          <p className="text-gray-500 mt-2">
            Monitor receptionist activities and performance
          </p>
        </div>

        <Button
          onClick={() => navigate("/manager/activity-logs")}
          className=" w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
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
                  ₱{summary.totalSales.toLocaleString()}
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Loading activities...
                  </td>
                </tr>
              ) : receptionistActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No receptionist activities found.
                  </td>
                </tr>
              ) : (
                receptionistActivities.map((activity) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
