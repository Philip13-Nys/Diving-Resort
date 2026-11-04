import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_API_KEYS",
  "VITE_FIREBASE_AUTH_DOMAINS",
  "VITE_FIREBASE_PROJECT_IDS",
];
const missing = required.filter(
  (key) => !String(import.meta.env[key] || "").trim(),
);
if (missing.length) {
  root.render(
    <div role="alert" className="p-8 text-red-700">
      Application configuration is missing: {missing.join(", ")}. Set these
      build environment variables and rebuild the site.
    </div>,
  );
} else {
  import("./app/App.tsx")
    .then(({ default: App }) =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    )
    .catch((error) => {
      console.error("Application startup failed", error);
      root.render(
        <div role="alert" className="p-8 text-red-700">
          The application could not start. Check its Firebase configuration and
          reload.
        </div>,
      );
    });
}
