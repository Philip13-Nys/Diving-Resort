import { useState } from 'react';
import { Shield, Edit, Trash2, Plus, Search, X, Check } from 'lucide-react';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  lastActive: string;
};

const initialUsers: User[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@resort.com',
    role: 'Manager',
    status: 'Active',
    permissions: ['View Reports', 'Manage Bookings', 'Staff Management'],
    lastActive: '2 hours ago',
  },
  {
    id: 2,
    name: 'Mike Chen',
    email: 'mike.c@resort.com',
    role: 'Manager',
    status: 'Active',
    permissions: ['View Reports', 'Manage Bookings', 'Financial Access'],
    lastActive: '30 mins ago',
  },
  {
    id: 3,
    name: 'Emma Williams',
    email: 'emma.w@resort.com',
    role: 'Receptionist',
    status: 'Active',
    permissions: ['Check-in/out', 'Booking Management', 'Payment Processing'],
    lastActive: '5 mins ago',
  },
  {
    id: 4,
    name: 'David Brown',
    email: 'david.b@resort.com',
    role: 'Receptionist',
    status: 'Active',
    permissions: ['Check-in/out', 'Booking Management'],
    lastActive: '1 hour ago',
  },
  {
    id: 5,
    name: 'Lisa Martinez',
    email: 'lisa.m@resort.com',
    role: 'Staff',
    status: 'Inactive',
    permissions: ['View Schedule', 'Update Availability'],
    lastActive: '2 days ago',
  },
];

const roles = [
  { name: 'Administrator', count: 2, color: 'bg-red-100 text-red-700' },
  { name: 'Manager', count: 8, color: 'bg-blue-100 text-blue-700' },
  { name: 'Receptionist', count: 12, color: 'bg-green-100 text-green-700' },
  { name: 'Staff', count: 25, color: 'bg-purple-100 text-purple-700' },
];

const allPermissions = [
  'View Reports',
  'Manage Bookings',
  'Staff Management',
  'Financial Access',
  'Check-in/out',
  'Booking Management',
  'Payment Processing',
  'View Schedule',
  'Update Availability',
];

const emptyForm = {
  name: '',
  email: '',
  role: 'Staff',
  status: 'Active',
  permissions: [] as string[],
};

type FormState = typeof emptyForm;

export default function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openAdd() {
    setEditUser(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, permissions: [...user.permissions] });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditUser(null);
    setForm(emptyForm);
  }

  function togglePermission(perm: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    if (editUser) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, ...form, lastActive: 'Just now' } : u))
      );
      setSuccess(`User "${form.name}" updated successfully.`);
    } else {
      const newUser: User = {
        id: Date.now(),
        ...form,
        lastActive: 'Just now',
      };
      setUsers((prev) => [...prev, newUser]);
      setSuccess(`User "${form.name}" added successfully.`);
    }
    closeModal();
    setTimeout(() => setSuccess(''), 3500);
  }

  function handleDelete(id: number) {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteConfirm(null);
    setSuccess(`User "${user?.name}" removed.`);
    setTimeout(() => setSuccess(''), 3500);
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
          <h1 className="text-2xl font-bold text-gray-900">User Role and Access Management</h1>
          <p className="text-gray-600 mt-1">Create, update, and manage user accounts and permissions</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <Plus className="size-4" />
          Add New User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map((role) => (
          <div key={role.name} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{role.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{role.count}</p>
              </div>
              <div className={`size-10 rounded-full ${role.color} flex items-center justify-center`}>
                <Shield className="size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.slice(0, 2).map((perm) => (
                        <span key={perm} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          {perm}
                        </span>
                      ))}
                      {user.permissions.length > 2 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          +{user.permissions.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.lastActive}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deleteConfirm === user.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit className="size-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={closeModal} className="text-white/80 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. John Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. john.s@resort.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Administrator</option>
                    <option>Manager</option>
                    <option>Receptionist</option>
                    <option>Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allPermissions.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">{perm}</span>
                      </label>
                    ))}
                  </div>
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
                  {editUser ? 'Save Changes' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
