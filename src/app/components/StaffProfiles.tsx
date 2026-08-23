import { User, Mail, Phone, Calendar, Plus, Search, Filter, X, Check, Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
 updateDoc,
 deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";

type StaffMember = {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  status: string;
  certifications: string[];
};


const departmentOptions = ['Water Sports', 'Restaurant', 'Facilities', 'Spa & Wellness', 'Guest Services'];

const emptyForm = {
  name: '',
  position: '',
  department: 'Water Sports',
  email: '',
  phone: '',
  joinDate: new Date().toISOString().split('T')[0],
  status: 'Active',
  certifications: '',
};

type FormState = typeof emptyForm;

export default function StaffProfiles() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [success, setSuccess] = useState('');
 const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const departments = departmentOptions.map((name) => ({
    name,
    count: staff.filter((s) => s.department === name).length,
  }));
  useEffect(() => {
  loadStaff();
}, []);

const loadStaff = async () => {
  try {
    const snapshot = await getDocs(collection(db, "Staff"));

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StaffMember[];

    setStaff(data);
  } catch (error) {
    console.error(error);
  }
};

  const filtered = staff.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === 'All' || s.department === filterDept;
    return matchSearch && matchDept;
  });

  function openAdd() {
    setEditStaff(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(member: StaffMember) {
    setEditStaff(member);
    setForm({
      name: member.name,
      position: member.position,
      department: member.department,
      email: member.email,
      phone: member.phone,
      joinDate: member.joinDate,
      status: member.status,
      certifications: member.certifications.join(', '),
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditStaff(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!form.name || !form.email || !form.position) return;

  const certifications = form.certifications
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  try {
    if (editStaff) {
      await updateDoc(doc(db, "Staff", editStaff.id), {
        name: form.name,
        position: form.position,
        department: form.department,
        email: form.email,
        phone: form.phone,
        joinDate: form.joinDate,
        status: form.status,
        certifications,
      });

      setSuccess("Staff updated successfully.");
    } else {
      await addDoc(collection(db, "Staff"), {
        name: form.name,
        position: form.position,
        department: form.department,
        email: form.email,
        phone: form.phone,
        joinDate: form.joinDate,
        status: form.status,
        certifications,
      });

      setSuccess("Staff added successfully.");
    }

    await loadStaff();
    closeModal();

    setTimeout(() => setSuccess(""), 3000);
  } catch (error) {
    console.error(error);
  }
}

 async function handleDelete(id: string) {
  try {
    await deleteDoc(doc(db, "Staff", id));

    await loadStaff();

    setDeleteConfirm(null);

    setSuccess("Staff deleted.");

    setTimeout(() => setSuccess(""), 3000);
  } catch (error) {
    console.error(error);
  }
}
  return (
    <div className="space-y-6">
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <Check className="size-5 text-green-600 shrink-0" />
          {success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Profiles Management</h1>
          <p className="text-gray-600 mt-1">View, add, update, and maintain staff records and information</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <Plus className="size-4" />
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {departments.map((dept) => (
          <div key={dept.name} className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">{dept.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{dept.count}</p>
            <p className="text-xs text-gray-500 mt-1">staff members</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff by name, position, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="size-4" />
                {filterDept === 'All' ? 'Filter' : filterDept}
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-40">
                  {['All', ...departmentOptions].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => { setFilterDept(dept); setShowFilter(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        filterDept === dept ? 'text-cyan-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {filtered.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="size-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.position}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          member.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="size-3.5 shrink-0" />
                      <span>{member.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="size-3.5 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="size-3.5 shrink-0" />
                      <span>Joined {new Date(member.joinDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Certifications:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.certifications.map((cert) => (
                        <span key={cert} className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(member)}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-cyan-700 px-2 py-1 rounded hover:bg-cyan-50 transition-colors"
                    >
                      <Edit className="size-3.5" />
                      Edit
                    </button>
                    {deleteConfirm === member.id ? (
                      <>
                        <button
                          onClick={() => setDeleteConfirm(member.id)}
                          className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-600 border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
                       >
                        Confirm Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 py-10 text-center text-gray-500 text-sm">
              No staff members match your search.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {editStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button onClick={closeModal} className="text-white/80 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                  <input
                    type="text"
                    required
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    placeholder="e.g. Diving Instructor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {departmentOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. alex.j@resort.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Active</option>
                    <option>On Leave</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certifications <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={form.certifications}
                    onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
                    placeholder="e.g. PADI Master, First Aid, Food Safety"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                >
                  {editStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
