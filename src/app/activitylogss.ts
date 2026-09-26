import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";

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

    console.log("Activity Log Auth UID:", currentUser.uid);
    const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    console.log("Activity Log User Data:", userData);

    await addDoc(collection(db, "ActivityLogs"), {
      timestamp: serverTimestamp(),
      user: userData.name || currentUser.email || "Unknown User",
      role: userData.role || "Unknown Role",
      action,
      details,
      status,
    });

    console.log("Activity log created successfully.");
  } catch (error) {
    console.error("Error creating activity log:", error);
  }
};
