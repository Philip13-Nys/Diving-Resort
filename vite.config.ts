import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const required = [
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_API_KEYS",
      "VITE_FIREBASE_AUTH_DOMAINS",
      "VITE_FIREBASE_PROJECT_IDS",
    ];
    const missing = required.filter((name) => !env[name]?.trim());
    if (missing.length) {
      throw new Error(`Firebase build configuration is missing: ${missing.join(", ")}`);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    base: process.env.VITE_BASE_PATH || "/",
  };
});
