import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNxMFR823z2mxZkVb5_jjc_VaYBdb8c5A",
  authDomain: "resort-management-system-f85bb.firebaseapp.com",
  projectId: "resort-management-system-f85bb",
  storageBucket: "resort-management-system-f85bb.firebasestorage.app",
  messagingSenderId: "747470335081",
  appId: "1:747470335081:web:7795586d5d2ff240d886f8",
  measurementId: "G-JZB3SZBS86",
};

const adminApp =
  getApps().find((app) => app.name === "adminApp") ??
  initializeApp(firebaseConfig, "adminApp");

export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);

const secondaryApp =
  getApps().find((existingApp) => existingApp.name === "secondaryApp") ??
  initializeApp(firebaseConfig, "secondaryApp");

export const secondaryAuth = getAuth(secondaryApp);

const customerFirebaseConfig = {
  apiKey: "AIzaSyDNxMFR823z2mxZkVb5_jjc_VaYBdb8c5A",
  authDomain: "resort-management-system-f85bb.firebaseapp.com",
  projectId: "resort-management-system-f85bb",
  storageBucket: "resort-management-system-f85bb.firebasestorage.app",
  messagingSenderId: "747470335081",
  appId: "1:747470335081:web:644b5725a1884660d886f8",
  measurementId: "G-6EREM6JK0K",
};
const customerApp =
  getApps().find((app) => app.name === "customerApp") ||
  initializeApp(customerFirebaseConfig, "customerApp");

export const customerDb = getFirestore(customerApp);
export const customerAuth = getAuth(customerApp);
