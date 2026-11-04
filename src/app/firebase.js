import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requiredEnv = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_API_KEYS",
  "VITE_FIREBASE_AUTH_DOMAINS",
  "VITE_FIREBASE_PROJECT_IDS",
];

const missingEnv = requiredEnv.filter((key) => !import.meta.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing Firebase configuration: ${missingEnv.join(", ")}`);
}

// ADMIN FIREBASE
const adminFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "admin-80f41.firebasestorage.app",
  messagingSenderId: "670887007684",
  appId: "1:670887007684:web:667d509694678590084091",
};

const adminApp =
  getApps().find((app) => app.name === "adminApp") ??
  initializeApp(adminFirebaseConfig, "adminApp");

export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);

// SECONDARY ADMIN AUTH
const secondaryApp =
  getApps().find((app) => app.name === "secondaryApp") ??
  initializeApp(adminFirebaseConfig, "secondaryApp");

export const secondaryAuth = getAuth(secondaryApp);

// CUSTOMER FIREBASE
const customerFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEYS,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAINS,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_IDS,
  storageBucket: "customeraccount-ce2ae.firebasestorage.app",
  messagingSenderId: "9548262291",
  appId: "1:9548262291:web:d2ace301dcba4638671666",
};

const customerApp =
  getApps().find((app) => app.name === "customerApp") ??
  initializeApp(customerFirebaseConfig, "customerApp");

export const customerDb = getFirestore(customerApp);
export const customerAuth = getAuth(customerApp);
