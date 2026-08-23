import { Shield, Edit, Trash2, Plus, Search, X, Check } from "lucide-react";
import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db, secondaryAuth } from "../firebase";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "Staff",
  status: "Active",
};

type FormState = typeof emptyForm;

export default function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userName, setUserName] = useState("Receptionist");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!auth.currentUser) return;

      try {
        const userRef = doc(db, "Users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setUserName(data.name || "Receptionist");
          setUserEmail(data.email || auth.currentUser.email || "");
        } else {
          setUserEmail(auth.currentUser.email || "");
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  const roles = [
    {
      name: "Administrator",
      count: users.filter((u) => u.role?.toLowerCase() === "administrator")
        .length,
      color: "bg-red-100 text-red-700",
    },
    {
      name: "Manager",
      count: users.filter((u) => u.role?.toLowerCase() === "manager").length,
      color: "bg-blue-100 text-blue-700",
    },
    {
      name: "Receptionist",
      count: users.filter((u) => u.role?.toLowerCase() === "receptionist")
        .length,
      color: "bg-green-100 text-green-700",
    },
    {
      name: "Staff",
      count: users.filter((u) => u.role?.toLowerCase() === "staff").length,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "Users"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  function openAdd() {
    setEditUser(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditUser(user);

    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditUser(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      return;
    }

    try {
      // ============================================
      // EDIT EXISTING USER
      // ============================================

      if (editUser) {
        await updateDoc(doc(db, "Users", editUser.id), {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
          lastActive: "Just now",
        });

        setSuccess("User updated successfully.");
      }

      // ============================================
      // CREATE NEW USER
      // ============================================
      else {
        if (!form.password || form.password.length < 6) {
          alert("Password must be at least 6 characters.");
          return;
        }

        // Create Firebase Authentication account
        // using SECONDARY auth instance.
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          form.email.trim(),
          form.password,
        );

        const newUser = userCredential.user;

        // Set display name in Firebase Authentication
        await updateProfile(newUser, {
          displayName: form.name.trim(),
        });

        // Create Firestore profile using the SAME UID
        await setDoc(doc(db, "Users", newUser.uid), {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
          lastActive: "Never",
          uid: newUser.uid,
        });

        setSuccess("User account created successfully.");
      }

      await loadUsers();

      closeModal();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error: any) {
      console.error("Failed to save user:", error);

      let message = "Failed to save user.";

      if (error?.code === "auth/email-already-in-use") {
        message = "This email address is already registered.";
      } else if (error?.code === "auth/invalid-email") {
        message = "The email address is invalid.";
      } else if (error?.code === "auth/weak-password") {
        message = "The password is too weak.";
      } else if (error?.code === "permission-denied") {
        message = "You do not have permission to create this user.";
      } else if (error?.message) {
        message = error.message;
      }

      alert(message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, "Users", id));

      loadUsers();

      setDeleteConfirm(null);

      setSuccess("User deleted.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);
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
          <h1 className="text-2xl font-bold text-gray-900">
            User Role and Access Management
          </h1>
          <p className="text-gray-600 mt-1">
            Create, update, and manage user accounts
          </p>
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
          <div
            key={role.name}
            className="bg-white rounded-xl p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{role.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {role.count}
                </p>
              </div>
              <div
                className={`size-10 rounded-full ${role.color} flex items-center justify-center`}
              >
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
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
                      {user.role.charAt(0).toUpperCase() +
                        user.role.slice(1).toLowerCase()}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive}
                  </td>
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
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 text-sm"
                  >
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
                {editUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={closeModal}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. John Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>

                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="e.g. john.s@resort.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!editUser && "*"}
                  </label>

                  <input
                    type="password"
                    required={!editUser}
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        password: e.target.value,
                      }))
                    }
                    placeholder={
                      editUser
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />

                  {!editUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 8 characters.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Administrator</option>
                    <option>Manager</option>
                    <option>Receptionist</option>
                    <option>Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
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
                  {editUser ? "Save Changes" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
