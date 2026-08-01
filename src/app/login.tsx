import { useState } from "react";
import { useNavigate } from "react-router";
import { loginUser } from "./auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const user = await loginUser(email, password);

      // Convert role to lowercase so "Administrator"
      // and "administrator" can be handled consistently.
      const role = String(user.role).toLowerCase();

      if (role === "administrator" || role === "admin") {
        navigate("/admin");
      } else if (role === "manager") {
        navigate("/manager");
      } else if (role === "receptionist") {
        navigate("/receptionist");
      } else if (role === "staff") {
        navigate("/staff");
      } else {
        setError("Your account does not have a valid role.");
      }
    } catch (error: any) {
      console.error(error);

      setError(error.message || error.code || "Unknown error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center">
          Resort Management System
        </h1>

        <p className="text-gray-500 text-center mt-2 mb-6">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-lg font-medium"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
