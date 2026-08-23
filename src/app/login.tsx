import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { loginUser } from "./auth";

const BACKGROUND_IMAGES = [
  "https://wallpaperaccess.com/full/902518.jpg",
  "https://png.pngtree.com/background/20250124/original/pngtree-tropical-sunset-ocean-view-at-cozy-beach-resort-terrace-picture-image_16248681.jpg",
  "https://wallpaperaccess.com/full/259735.jpg",
];

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === BACKGROUND_IMAGES.length - 1 ? 0 : prevIndex + 1,
      );
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const user = await loginUser(email, password);
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950">
      {BACKGROUND_IMAGES.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 bg-cover bg-center transform transition-all duration-[2500ms] ease-in-out
            ${
              index === currentImageIndex
                ? "opacity-100 scale-100 mix-blend-normal"
                : "opacity-0 scale-105 pointer-events-none"
            }`}
          style={{ backgroundImage: `url('${image}')` }}
        />
      ))}

      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px] z-10"></div>
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 relative z-20 border border-white/20 transform transition-all duration-300">
        <h1 className="text-2xl font-bold text-white text-center tracking-tight drop-shadow-md">
          Resort Management System
        </h1>

        <p className="text-gray-200 text-center mt-1.5 mb-6 text-sm drop-shadow-sm">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm backdrop-blur-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2.5 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-gray-400 transition-all backdrop-blur-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2.5 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 bg-white/10 text-white placeholder-gray-400 transition-all backdrop-blur-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
