import { Card } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Edit, Mail, Phone, Calendar, X, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

import { db } from "../app/firebase";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  hireDate: string;
  status: "active" | "inactive";
  shift: string;
};

const departments = [
  "Front Desk",
  "Activities",
  "Maintenance",
  "Housekeeping",
  "Food & Beverage",
  "Security",
];
const shifts = [
  "Morning (7AM - 3PM)",
  "Afternoon (3PM - 11PM)",
  "Night (11PM - 7AM)",
  "Full Day (8AM - 5PM)",
  "Morning (6AM - 2PM)",
];

export default function StaffProfiles() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffMember | null>(null);

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({ ...member });
  };

  const saveEdit = async () => {
    if (!form) return;

    try {
      await updateDoc(doc(db, "staff", form.id), {
        name: form.name,
        role: form.role,
        email: form.email,
        phone: form.phone,
        department: form.department,
        shift: form.shift,
        status: form.status,
      });

      setStaff((prev) => prev.map((s) => (s.id === form.id ? form : s)));

      setEditing(null);
      setForm(null);
    } catch (error) {
      console.error("Error updating staff:", error);
      alert("Failed to update staff information.");
    }
  };
  useEffect(() => {
    const loadStaff = async () => {
      try {
        console.log("Loading users from Firestore...");
        const snapshot = await getDocs(collection(db, "Users"));

        console.log("Users found:", snapshot.size);

        const staffData: StaffMember[] = snapshot.docs.map((userDoc) => {
          const data = userDoc.data();

          console.log("User:", userDoc.id, data);

          return {
            id: userDoc.id,
            name: data.name || "",
            role: data.role || "",
            email: data.email || "",
            phone: data.phone || "",
            department: data.department || "",
            hireDate: data.hireDate || "",
            status: data.status === "inactive" ? "inactive" : "active",
            shift: data.shift || "",
          };
        });

        console.log("Staff data:", staffData);

        setStaff(staffData);
      } catch (error) {
        console.error("Error loading staff:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Staff Profiles Management
          </h1>
          <p className="text-gray-500 mt-2">
            View and manage staff information and work details
          </p>
        </div>
      </div>

      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {staff.length}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-500">Activities</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {staff.filter((s) => s.department === "Activities").length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">Active Today</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {staff.filter((s) => s.status === "active").length}
          </p>
        </Card>
      </div>

      {/* Staff Directory */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Staff Directory
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  "Staff ID",
                  "Name",
                  "Role",
                  "Department",
                  "Contact",
                  "Shift",
                  "Hire Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-sm font-medium text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {member.id}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {member.role}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {member.department}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="w-3 h-3" />
                        {member.phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {member.shift}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {member.hireDate}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${member.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {member.status.charAt(0).toUpperCase() +
                        member.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit staff member"
                      onClick={() => openEdit(member)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      {editing && form && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => {
            setEditing(null);
            setForm(null);
          }}
        >
          <Card
            className="w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Staff Member
              </h2>
              <button
                onClick={() => {
                  setEditing(null);
                  setForm(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Full Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Role / Title
                  </label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Department
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Shift
                  </label>
                  <select
                    value={form.shift}
                    onChange={(e) =>
                      setForm({ ...form, shift: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {shifts.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditing(null);
                  setForm(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={saveEdit}
              >
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
