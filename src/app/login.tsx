import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { loginUser } from "./auth";

/* =========================================================
   BACKGROUND VIDEOS
========================================================= */

const BACKGROUND_VIDEOS = [
"https://cdn.pixabay.com/video/2025/03/15/265145_large.mp4",
"https://cdn.pixabay.com/video/2015/10/18/1084-142790263_medium.mp4",
"https://cdn.pixabay.com/video/2019/04/23/23011-332483109_large.mp4",
"https://cdn.pixabay.com/video/2022/11/22/140111-774507949_large.mp4",
"https://cdn.pixabay.com/video/2024/02/29/202391-918066363_large.mp4",
];

/* =========================================================
   EYE ICON
========================================================= */

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
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

        <circle
          cx="12"
          cy="12"
          r="3"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
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

/* =========================================================
   LOGIN PAGE
========================================================= */

export default function Login() {
  const navigate = useNavigate();

  /* =======================================================
     LOGIN STATES
  ======================================================= */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* =======================================================
     VIDEO STATES
  ======================================================= */

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  /* =======================================================
     START FIRST VIDEO
  ======================================================= */

  useEffect(() => {
    const firstVideo = videoRefs.current[0];

    if (firstVideo) {
      firstVideo.currentTime = 0;

      firstVideo.play().catch(() => {
        console.log("Autoplay was blocked by the browser.");
      });
    }
  }, []);

  /* =======================================================
     VIDEO TRANSITION
  ======================================================= */

  const handleVideoEnded = (index: number) => {
    if (index !== currentVideoIndex) {
      return;
    }

    const nextIndex =
      (currentVideoIndex + 1) % BACKGROUND_VIDEOS.length;

    const currentVideo =
      videoRefs.current[currentVideoIndex];

    const nextVideo = videoRefs.current[nextIndex];

    if (!nextVideo) {
      return;
    }

    nextVideo.currentTime = 0;

    nextVideo.play().catch(() => {
      console.log("Next video could not play.");
    });

    if (currentVideo) {
      currentVideo.style.opacity = "0";
    }

    nextVideo.style.opacity = "1";

    setCurrentVideoIndex(nextIndex);
  };

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    /* Validate email */

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    /* Validate password */

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      /* Firebase login */

      const user = await loginUser(
        email.trim(),
        password,
      );

      /* Get role */

      const role = String(user.role).toLowerCase().trim();

      /* ===================================================
         ROLE-BASED REDIRECT
      =================================================== */

      if (
        role === "administrator" ||
        role === "admin"
      ) {
        navigate("/admin");
      } else if (role === "manager") {
        navigate("/manager");
      } else if (role === "receptionist") {
        navigate("/receptionist");
      } else if (role === "staff") {
        navigate("/staff");
      } else {
        setError(
          "Your account does not have a valid role.",
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);

      /* Firebase-friendly error messages */

      if (
        error?.code === "auth/invalid-credential" ||
        error?.code === "auth/invalid-email" ||
        error?.code === "auth/user-not-found" ||
        error?.code === "auth/wrong-password"
      ) {
        setError(
          "Invalid email or password. Please try again.",
        );
      } else {
        setError(
          error?.message ||
            error?.code ||
            "Unable to log in. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950">

      {/* =================================================
    BACKGROUND VIDEOS
================================================= */}

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
      className="absolute inset-0 w-full h-full object-cover"
      style={{
        opacity:
          index === currentVideoIndex ? 1 : 0,
        transition: "opacity 2.5s ease-in-out",
      }}
    />
  ))}

</div>

{/* DARK OVERLAY — NO BLUR */}

<div className="absolute inset-0 bg-black/40 z-10" />

      {/* =================================================
          LOGIN CARD
      ================================================= */}

      <div className="w-[calc(100%-32px)] max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-7 sm:p-8 relative z-20 border border-white/20 transform transition-all duration-300">

        {/* =================================================
            TITLE
        ================================================= */}

        <h1 className="text-2xl sm:text-[28px] font-bold text-white text-center tracking-tight drop-shadow-md">
          Resort Management System
        </h1>

        <p className="text-gray-200 text-center mt-2 mb-7 text-sm sm:text-[15px] drop-shadow-sm">
          Sign in to your account
        </p>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm backdrop-blur-md text-center">
            {error}
          </div>
        )}

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* =================================================
              EMAIL
          ================================================= */}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              className="w-full h-[52px] px-4 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 bg-white/10 text-white placeholder-gray-400 transition-all backdrop-blur-sm disabled:opacity-60"
            />
          </div>

          {/* =================================================
              PASSWORD
          ================================================= */}

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2"
            >
              Password
            </label>

            <div className="relative">

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full h-[52px] pl-4 pr-12 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 bg-white/10 text-white placeholder-gray-400 transition-all backdrop-blur-sm disabled:opacity-60"
              />

              {/* =================================================
                  SHOW / HIDE PASSWORD
              ================================================= */}

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous,
                  )
                }
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              >
                <EyeIcon
                  visible={showPassword}
                />
              </button>

            </div>
          </div>

          {/* =================================================
              LOGIN BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>

        </form>

        {/* =================================================
            FOOTER
        ================================================= */}

        <p className="text-center text-gray-400/70 text-xs mt-6">
          Secure Resort Management System
        </p>

      </div>

    </div>
  );
}