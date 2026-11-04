import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(document.getElementById("root")!);

// Explicitly read environment variables for Vite production builds
const firebaseEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,

  VITE_FIREBASE_API_KEYS: import.meta.env.VITE_FIREBASE_API_KEYS,
  VITE_FIREBASE_AUTH_DOMAINS: import.meta.env.VITE_FIREBASE_AUTH_DOMAINS,
  VITE_FIREBASE_PROJECT_IDS: import.meta.env.VITE_FIREBASE_PROJECT_IDS,
};

const missing = Object.entries(firebaseEnv)
  .filter(([, value]) => !String(value ?? "").trim())
  .map(([key]) => key);

if (missing.length > 0) {
  console.error("Missing Firebase environment variables:", missing);

  root.render(
    <div role="alert" className="p-8 text-red-700">
      Application configuration is missing: {missing.join(", ")}. Please check
      your Firebase environment variables and rebuild.
    </div>,
  );
} else {
  import("./app/App.tsx")
    .then(({ default: App }) => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((error) => {
      console.error("Application startup failed:", error);

      root.render(
        <div role="alert" className="p-8 text-red-700">
          The application could not start. Check the browser console for
          details.
        </div>,
      );
    });
}
