import { Edit, Trash2, Plus, Search, X, Check } from "lucide-react";
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
  username?: string;
  email?: string;
  role: string;
  status: string;
  lastActive: any;
};

const emptyForm = {
  name: "",
  username: "",
  password: "",
  role: "Staff",
  status: "Inactive",
};

type FormState = typeof emptyForm;

export default function UserRoleManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [users, setUsers] = useState<User[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!auth.currentUser) return;

      try {
        const userRef = doc(db, "Users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserName(
            data.name ||
              data.username ||
              auth.currentUser.displayName ||
              "User",
          );
        } else {
          setUserName(auth.currentUser.displayName || "User");
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    void loadUserProfile();
  }, []);

  const roles = [
    {
      name: "Administrator",
      count: users.filter(
        (user) => user.role?.toLowerCase() === "administrator",
      ).length,
    },
    {
      name: "Manager",
      count: users.filter((user) => user.role?.toLowerCase() === "manager")
        .length,
    },
    {
      name: "Receptionist",
      count: users.filter((user) => user.role?.toLowerCase() === "receptionist")
        .length,
    },
    {
      name: "Staff",
      count: staffCount,
    },
  ];

  async function loadUsers() {
    try {
      const [userSnapshot, staffSnapshot] = await Promise.all([
        getDocs(collection(db, "Users")),
        getDocs(collection(db, "Staff")),
      ]);

      const userData = userSnapshot.docs.map((userDoc) => {
        const data = userDoc.data();

        return {
          id: userDoc.id,
          name: data.name || "",
          username: data.username || "",
          email: data.email || "",
          role: data.role || "Staff",
          status: data.status || "Inactive",
          lastActive: data.lastActive ?? null,
        };
      });

      setUsers(userData);
      setStaffCount(staffSnapshot.size);
    } catch (error) {
      console.error("Failed to load users and staff:", error);
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = users.filter((user) =>
    [user.name, user.username || "", user.role, user.status].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  );

  function openAdd() {
    setEditUser(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditUser(user);

    setForm({
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "Staff",
      status: user.status || "Inactive",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditUser(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = form.name.trim();
    const username = form.username.trim();

    if (!name || !username) {
      alert("Please enter both a full name and username.");
      return;
    }

    if (/\s/.test(username)) {
      alert("Username must not contain spaces.");
      return;
    }

    setSaving(true);

    try {
      if (editUser) {
        await updateDoc(doc(db, "Users", editUser.id), {
          name,
          username,
          role: form.role,
          status: form.status,
        });

        setSuccess("User updated successfully.");
      } else {
        if (!form.password || form.password.length < 8) {
          alert("Password must be at least 8 characters.");
          return;
        }

        /*
         * Firebase email/password authentication requires an email.
         *
         * This creates a synthetic email for the account. Users cannot
         * receive email at this address. Replace this with your trusted
         * account-creation flow if you require real email addresses or
         * username-based login.
         */
        const normalizedUsername = username.toLowerCase();
        const internalEmail = `${normalizedUsername}@accounts.sabang-resort.invalid`;

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          internalEmail,
          form.password,
        );

        const newUser = userCredential.user;

        await updateProfile(newUser, {
          displayName: name,
        });

        await setDoc(doc(db, "Users", newUser.uid), {
          name,
          username,
          email: internalEmail,
          role: form.role,
          status: form.status,
          lastActive: null,
          uid: newUser.uid,
        });

        await secondaryAuth.signOut();

        setSuccess("User account created successfully.");
      }

      await loadUsers();

      setShowModal(false);
      setEditUser(null);
      setForm(emptyForm);

      window.setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error("Failed to save user:", error);

      let message = "Failed to save user.";

      if (error?.code === "auth/email-already-in-use") {
        message =
          "This username may already be registered. Try a different username.";
      } else if (error?.code === "auth/invalid-email") {
        message =
          "Firebase rejected the generated account email. Use a trusted account-creation flow with a valid email address.";
      } else if (error?.code === "auth/weak-password") {
        message = "The password is too weak.";
      } else if (error?.code === "permission-denied") {
        message = "You do not have permission to save this user.";
      } else if (error?.message) {
        message = error.message;
      }

      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, "Users", id));

      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== id));

      setDeleteConfirm(null);
      setSuccess("User record deleted successfully.");

      window.setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user record.");
    }
  }

  function formatLastActive(lastActive: any) {
    if (!lastActive) return "Never";

    const date =
      typeof lastActive?.toDate === "function"
        ? lastActive.toDate()
        : new Date(lastActive);

    if (Number.isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleString();
  }

  return (
    <div className="min-w-0 space-y-6">
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <Check className="size-5 shrink-0 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            User Role and Access Management
          </h1>
          <p className="mt-1 text-gray-600">
            Create, update, and manage user accounts.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white transition-colors hover:bg-cyan-700"
        >
          <Plus className="size-4" />
          Add New User
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => (
          <div
            key={role.name}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-600">{role.name}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {role.count}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {["User", "Role", "Status", "Last Active", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 font-semibold text-cyan-700">
                        {(user.name || user.username || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name || "Unnamed User"}
                        </p>
                        <p className="text-sm text-gray-500">
                          @{user.username || "no-username"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {user.role.charAt(0).toUpperCase() +
                        user.role.slice(1).toLowerCase()}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        user.status.toLowerCase() === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatLastActive(user.lastActive)}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    {deleteConfirm === user.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleDelete(user.id)}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs transition-colors hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                          title="Edit user"
                          aria-label={`Edit ${user.username || user.name}`}
                        >
                          <Edit className="size-4 text-gray-600" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="rounded-lg p-2 transition-colors hover:bg-red-50"
                          title="Delete user"
                          aria-label={`Delete ${user.username || user.name}`}
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
                    className="px-6 py-8 text-center text-sm text-gray-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editUser ? "Edit User" : "Add New User"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-white/80 transition-colors hover:text-white disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. John Smith"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      username: e.target.value.replace(/\s/g, ""),
                    }))
                  }
                  placeholder="e.g. johnsmith"
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use a username without spaces.
                </p>
              </div>

              {!editUser && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Enter password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum 8 characters.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        role: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Administrator</option>
                    <option>Manager</option>
                    <option>Receptionist</option>
                    <option>Staff</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        status: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {saving
                    ? "Saving..."
                    : editUser
                      ? "Save Changes"
                      : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
