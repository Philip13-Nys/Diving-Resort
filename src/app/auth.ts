import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export type LoggedInUser = {
  uid: string;
  name: string;
  email: string;
  role: string;
  status?: string;
};

export async function loginUser(
  email: string,
  password: string,
): Promise<LoggedInUser> {
  console.log("Project:", auth.app.options.projectId);
  console.log("Email:", `"${email}"`);
  console.log("Password length:", password.length);

  const result = await signInWithEmailAndPassword(auth, email.trim(), password);

  const uid = result.user.uid;

  const userRef = doc(db, "Users", uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error("User profile not found.");
  }

  const data = userDoc.data();

  await updateDoc(userRef, {
    status: "Active",
    lastActive: serverTimestamp(),
  });

  console.log("User status updated to Active:", uid);

  return {
    uid,
    name: data.name || "",
    email: data.email || email,
    role: data.role || "",
    status: "Active",
  };
}

export async function logoutUser() {
  const currentUser = auth.currentUser;

  if (currentUser) {
    const userRef = doc(db, "Users", currentUser.uid);

    try {
      await updateDoc(userRef, {
        status: "Inactive",
        lastActive: serverTimestamp(),
      });

      console.log("User status updated to Inactive:", currentUser.uid);
    } catch (error) {
      console.error("Failed to update logout status:", error);
    }
  }

  await signOut(auth);
}
