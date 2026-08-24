import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const adminFirebaseConfig = {
  apiKey: "AIzaSyCIjTHJOa3nWNz6nCib6AYZJ8MYmvgRsPA",
  authDomain: "admin-80f41.firebaseapp.com",
  projectId: "admin-80f41",
  storageBucket: "admin-80f41.firebasestorage.app",
  messagingSenderId: "670887007684",
  appId: "1:670887007684:web:667d509694678590084091",
};

const adminApp =
  getApps().find((app) => app.name === "adminApp") ??
  initializeApp(adminFirebaseConfig, "adminApp");

export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);

const secondaryApp =
  getApps().find((existingApp) => existingApp.name === "secondaryApp") ??
  initializeApp(adminFirebaseConfig, "secondaryApp");

export const secondaryAuth = getAuth(secondaryApp);

const customerFirebaseConfig = {
  apiKey: "AIzaSyCK-OcxL1VnKr_b3Cps5B7_8GvuChQClCw",
  authDomain: "customeraccount-ce2ae.firebaseapp.com",
  projectId: "customeraccount-ce2ae",
  storageBucket: "customeraccount-ce2ae.firebasestorage.app",
  messagingSenderId: "9548262291",
  appId: "1:9548262291:web:d2ace301dcba4638671666",
};

const customerApp =
  getApps().find((app) => app.name === "customerApp") ||
  initializeApp(customerFirebaseConfig, "customerApp");

export const customerDb = getFirestore(customerApp);
export const customerAuth = getAuth(customerApp);
