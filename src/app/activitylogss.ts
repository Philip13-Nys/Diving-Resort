import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth, customerDb } from "./firebase";

// Shared customer notification persistence; callers retain their existing
// error handling and destination rather than duplicating database writes.
export function customerNotifier(
  type: "booking" | "payment" | "inquiry",
  throwOnError = false,
) {
  return async ({
    customerId,
    eventId,
    title,
    message,
    targetPath = "/inquiries",
  }: {
    customerId?: string;
    eventId: string;
    title: string;
    message: string;
    targetPath?: string;
  }): Promise<boolean> => {
    const uid = String(customerId || "").trim();
    if (!uid) return false;
    const safeEventId = encodeURIComponent(eventId).replace(/\./g, "%2E");
    try {
      await setDoc(
        doc(customerDb, "Notifications", `${uid}_${safeEventId}`),
        {
          userId: uid,
          role: "customer",
          eventId,
          type,
          title,
          message,
          targetPath,
          read: false,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      return true;
    } catch (error) {
      if (throwOnError) throw error;
      console.error("Customer notification could not be saved", error);
      return false;
    }
  };
}

type ActivityLogData = {
  action: string;
  details: string;
  status?: "success";
};

export const createActivityLog = async ({
  action,
  details,
  status = "success",
}: ActivityLogData) => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error("No logged-in user found.");
      return;
    }

    const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    await addDoc(collection(db, "ActivityLogs"), {
      timestamp: serverTimestamp(),
      userId: currentUser.uid,
      user: userData.name || currentUser.email || "Unknown User",
      role: userData.role || "Unknown Role",
      action,
      details,
      status,
    });
  } catch (error) {
    console.error("Error creating activity log:", error);
  }
};
