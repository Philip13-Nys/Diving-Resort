import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { loginUser } from "./auth";

const BACKGROUND_VIDEOS = [
  "https://cdn.pixabay.com/video/2024/02/29/202391-918066363_large.mp4",
  "https://cdn.pixabay.com/video/2022/11/22/140111-774507949_large.mp4",
  "https://cdn.pixabay.com/video/2015/10/18/1084-142790263_medium.mp4",
  "https://cdn.pixabay.com/video/2019/04/23/23011-332483109_large.mp4",
];

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 5.2C11.05 5.07 11.52 5 12 5C18.5 5 22 12 22 12C22 12 20.72 14.55 18.45 16.45"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.55 7.55C3.68 9.45 2 12 2 12C2 12 5.5 19 12 19C13.48 19 14.82 18.65 16 18.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const firstVideo = videoRefs.current[0];

    if (firstVideo) {
      firstVideo.currentTime = 0;
      firstVideo.play().catch(() => {});
    }
  }, []);

  const handleVideoEnded = (index: number) => {
    if (index !== currentVideoIndex) return;

    const nextIndex = (index + 1) % BACKGROUND_VIDEOS.length;
    const currentVideo = videoRefs.current[index];
    const nextVideo = videoRefs.current[nextIndex];

    if (!nextVideo) return;

    nextVideo.currentTime = 0;

    nextVideo.play().catch(() => {});

    if (currentVideo) {
      currentVideo.style.opacity = "0";
    }

    nextVideo.style.opacity = "1";
    setCurrentVideoIndex(nextIndex);
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const user = await loginUser(cleanUsername, password);
      const role = String(user.role ?? "")
        .toLowerCase()
        .trim();

      switch (role) {
        case "administrator":
        case "admin":
          navigate("/admin", { replace: true });
          break;

        case "manager":
          navigate("/manager", { replace: true });
          break;

        case "receptionist":
          navigate("/receptionist", { replace: true });
          break;

        case "staff":
          navigate("/staff", { replace: true });
          break;

        default:
          setError(
            "Your account does not have a valid role. Please contact the administrator.",
          );
      }
    } catch (loginError: unknown) {
      const firebaseError = loginError as {
        code?: string;
        message?: string;
      };

      console.error("Login error:", loginError);

      if (
        firebaseError.code === "auth/invalid-credential" ||
        firebaseError.code === "auth/invalid-email" ||
        firebaseError.code === "auth/user-not-found" ||
        firebaseError.code === "auth/wrong-password"
      ) {
        setError("Invalid username or password. Please try again.");
      } else if (firebaseError.code === "username/not-found") {
        setError("Username not found. Please check your username.");
      } else {
        setError(
          firebaseError.message || "Unable to log in. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      {/* Background videos */}
      <div className="absolute inset-0 overflow-hidden">
        {BACKGROUND_VIDEOS.map((video, index) => (
          <video
            key={video}
            ref={(element) => {
              videoRefs.current[index] = element;
            }}
            src={video}
            muted
            playsInline
            preload="auto"
            onEnded={() => handleVideoEnded(index)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: index === currentVideoIndex ? 1 : 0,
              transition: "opacity 2.5s ease-in-out",
            }}
          />
        ))}
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-black/40" />

      {/* Login card */}
      <div className="relative z-20 w-full max-w-md transform rounded-2xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:p-8">
        <h1 className="text-center text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-[28px]">
          Resort Management System
        </h1>

        <p className="mb-7 mt-2 text-center text-sm text-gray-200 drop-shadow-sm sm:text-[15px]">
          Sign in to your account
        </p>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-400/40 bg-red-500/20 p-3 text-center text-sm text-red-100 backdrop-blur-md"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-200"
            >
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={loading}
              className="h-[52px] w-full rounded-lg border border-white/20 bg-white/10 px-4 text-white outline-none backdrop-blur-sm transition-all placeholder:text-gray-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-200"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                className="h-[52px] w-full rounded-lg border border-white/20 bg-white/10 py-3 pl-4 pr-12 text-white outline-none backdrop-blur-sm transition-all placeholder:text-gray-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((previous) => !previous)}
                disabled={loading}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-gray-200 transition-colors hover:text-white disabled:opacity-50"
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-[52px] w-full items-center justify-center rounded-lg bg-cyan-600 font-semibold text-white shadow-md transition-all duration-200 hover:bg-cyan-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-cyan-800"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-200/70">
          Secure Resort Management System
        </p>
      </div>
    </div>
  );
}
