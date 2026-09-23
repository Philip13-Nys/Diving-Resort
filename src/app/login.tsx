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
        width="21"
        height="21"
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
      width="21"
      height="21"
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
     AUTOMATIC VIDEO TRANSITION
  ======================================================= */

  const handleVideoEnded = (index: number) => {
    if (index !== currentVideoIndex) {
      return;
    }

    const nextIndex =
      (currentVideoIndex + 1) % BACKGROUND_VIDEOS.length;

    const currentVideo = videoRefs.current[currentVideoIndex];

    const nextVideo = videoRefs.current[nextIndex];

    if (!nextVideo) {
      return;
    }

    /* Prepare next video */

    nextVideo.currentTime = 0;

    nextVideo.play().catch(() => {
      console.log("Next video could not play.");
    });

    /* Fade current video out */

    if (currentVideo) {
      currentVideo.style.opacity = "0";
    }

    /* Fade next video in */

    nextVideo.style.opacity = "1";

    /* Update active video */

    setCurrentVideoIndex(nextIndex);
  };

  /* =======================================================
     LOGIN FUNCTION
  ======================================================= */

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");

    /* Check email */

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    /* Check password */

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      /* Firebase authentication */

      await loginUser(email.trim(), password);

      /* Successful login */

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div style={styles.page}>

      {/* =================================================
          BACKGROUND VIDEO
      ================================================= */}

      <div style={styles.videoContainer}>

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
            style={{
              ...styles.backgroundVideo,
              opacity:
                index === currentVideoIndex ? 1 : 0,
            }}
          />
        ))}

        {/* Dark overlay */}

        <div style={styles.overlay} />

      </div>

      {/* =================================================
          LOGIN CONTENT
      ================================================= */}

      <main style={styles.content}>

        <section style={styles.loginCard}>

          {/* =================================================
              TITLE
          ================================================= */}

          <h1 style={styles.title}>
            Resort Management System
          </h1>

          <p style={styles.subtitle}>
            Sign in to your account
          </p>

          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <form
            onSubmit={handleLogin}
            style={styles.form}
          >

            {/* EMAIL */}

            <div style={styles.inputGroup}>

              <label
                htmlFor="email"
                style={styles.label}
              >
                EMAIL ADDRESS
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                style={styles.input}
              />

            </div>

            {/* PASSWORD */}

            <div style={styles.inputGroup}>

              <label
                htmlFor="password"
                style={styles.label}
              >
                PASSWORD
              </label>

              <div style={styles.passwordContainer}>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={styles.passwordInput}
                />

                {/* EYE BUTTON */}

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  style={styles.eyeButton}
                >
                  <EyeIcon
                    visible={showPassword}
                  />
                </button>

              </div>

            </div>

            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            {/* =================================================
                LOGIN BUTTON
            ================================================= */}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                opacity: loading ? 0.65 : 1,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          {/* =================================================
              FOOTER
          ================================================= */}

          <p style={styles.footerText}>
            Secure Resort Management System
          </p>

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles: {
  [key: string]: React.CSSProperties;
} = {

  /* =======================================================
     PAGE
  ======================================================= */

  page: {
    width: "100%",
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#07131d",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  /* =======================================================
     VIDEO CONTAINER
  ======================================================= */

  videoContainer: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    zIndex: 0,
    backgroundColor: "#07131d",
  },

  /* =======================================================
     VIDEO
  ======================================================= */

  backgroundVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",

    /*
     * Smooth crossfade
     */

    transition:
      "opacity 1.8s ease-in-out",

    transform: "scale(1.05)",
  },

  /* =======================================================
     DARK OVERLAY
  ======================================================= */

  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 2,

    background:
      "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.40), rgba(0,0,0,0.75))",
  },

  /* =======================================================
     MAIN CONTENT
  ======================================================= */

  content: {
    position: "relative",
    zIndex: 10,

    minHeight: "100vh",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "20px",
  },

  /* =======================================================
     LOGIN CARD
  ======================================================= */

  loginCard: {
    width: "100%",
    maxWidth: "430px",

    padding: "38px 34px",

    borderRadius: "22px",

    background:
      "rgba(20, 31, 43, 0.76)",

    border:
      "1px solid rgba(255,255,255,0.25)",

    backdropFilter:
      "blur(18px)",

    WebkitBackdropFilter:
      "blur(18px)",

    boxShadow:
      "0 25px 65px rgba(0,0,0,0.55)",
  },

  /* =======================================================
     TITLE
  ======================================================= */

  title: {
    margin: 0,

    textAlign: "center",

    color: "#ffffff",

    fontSize: "30px",

    lineHeight: 1.25,

    fontWeight: 700,

    textShadow:
      "0 3px 15px rgba(0,0,0,0.5)",
  },

  /* =======================================================
     SUBTITLE
  ======================================================= */

  subtitle: {
    marginTop: "9px",
    marginBottom: "30px",

    textAlign: "center",

    color:
      "rgba(255,255,255,0.82)",

    fontSize: "17px",
  },

  /* =======================================================
     FORM
  ======================================================= */

  form: {
    width: "100%",
  },

  /* =======================================================
     INPUT GROUP
  ======================================================= */

  inputGroup: {
    marginBottom: "20px",
  },

  /* =======================================================
     LABEL
  ======================================================= */

  label: {
    display: "block",

    marginBottom: "8px",

    color: "#ffffff",

    fontSize: "12px",

    fontWeight: 700,

    letterSpacing: "0.5px",
  },

  /* =======================================================
     EMAIL INPUT
  ======================================================= */

  input: {
    width: "100%",

    height: "54px",

    padding: "0 16px",

    boxSizing: "border-box",

    borderRadius: "11px",

    border:
      "1px solid rgba(255,255,255,0.30)",

    outline: "none",

    background:
      "rgba(255,255,255,0.18)",

    color: "#ffffff",

    fontSize: "15px",
  },

  /* =======================================================
     PASSWORD CONTAINER
  ======================================================= */

  passwordContainer: {
    position: "relative",

    width: "100%",
  },

  /* =======================================================
     PASSWORD INPUT
  ======================================================= */

  passwordInput: {
    width: "100%",

    height: "54px",

    padding:
      "0 52px 0 16px",

    boxSizing: "border-box",

    borderRadius: "11px",

    border:
      "1px solid rgba(255,255,255,0.30)",

    outline: "none",

    background:
      "rgba(255,255,255,0.18)",

    color: "#ffffff",

    fontSize: "15px",
  },

  /* =======================================================
     EYE BUTTON
  ======================================================= */

  eyeButton: {
    position: "absolute",

    right: "10px",
    top: "50%",

    transform:
      "translateY(-50%)",

    width: "34px",
    height: "34px",

    display: "flex",

    alignItems: "center",
    justifyContent: "center",

    padding: 0,

    border: "none",

    background: "transparent",

    color:
      "rgba(255,255,255,0.70)",

    cursor: "pointer",

    transition:
      "color 0.2s ease",
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorBox: {
    padding: "11px 13px",

    marginBottom: "16px",

    borderRadius: "8px",

    background:
      "rgba(255,70,70,0.15)",

    border:
      "1px solid rgba(255,90,90,0.35)",

    color: "#ffb5b5",

    textAlign: "center",

    fontSize: "13px",
  },

  /* =======================================================
     LOGIN BUTTON
  ======================================================= */

  loginButton: {
    width: "100%",

    height: "54px",

    border: "none",

    borderRadius: "11px",

    background:
      "linear-gradient(90deg, #00a8ff, #00d4ff)",

    color: "#ffffff",

    fontSize: "17px",

    fontWeight: 700,

    boxShadow:
      "0 8px 22px rgba(0,174,255,0.32)",

    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footerText: {
    marginTop: "22px",

    marginBottom: 0,

    textAlign: "center",

    color:
      "rgba(255,255,255,0.50)",

    fontSize: "12px",
  },
};
