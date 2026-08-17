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
      await updateDoc(doc(db, "Users", form.id), {
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

      alert("Staff profile updated successfully!");
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
        console.log("Snapshot empty?", snapshot.empty, "size:", snapshot.size);

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
            status:
              String(data.status || "").toLowerCase() === "inactive"
                ? "inactive"
                : "active",
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

      {/* Staff Profiles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Staff Profiles
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View and manage resort staff information
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading staff profiles...
          </div>
        ) : staff.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-gray-500">No staff profiles found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {staff.map((member) => (
              <Card
                key={member.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                {/* Profile Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-700">
                        {member.name
                          ? member.name.charAt(0).toUpperCase()
                          : "S"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {member.name || "Unnamed Staff"}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {member.role || "Staff Member"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(member)}
                    title="Edit staff profile"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                {/* Department */}
                <div className="mt-5">
                  <span className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {member.department || "No Department"}
                  </span>
                </div>

                {/* Staff Information */}
                <div className="mt-5 space-y-3">
                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-400">Email</p>

                      <p className="text-sm text-gray-700 break-all">
                        {member.email || "No email"}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-400">Phone</p>

                      <p className="text-sm text-gray-700">
                        {member.phone || "No phone"}
                      </p>
                    </div>
                  </div>

                  {/* Shift */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-400">Shift</p>

                      <p className="text-sm text-gray-700">
                        {member.shift || "No shift assigned"}
                      </p>
                    </div>
                  </div>

                  {/* Hire Date */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-400">Hire Date</p>

                      <p className="text-sm text-gray-700">
                        {member.hireDate || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {member.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
