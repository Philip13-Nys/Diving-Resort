import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

  const userDoc = await getDoc(doc(db, "Users", uid));

  if (!userDoc.exists()) {
    throw new Error("User profile not found.");
  }

  const data = userDoc.data();

  return {
    uid,
    name: data.name || "",
    email: data.email || email,
    role: data.role || "",
    status: data.status || "Active",
  };
}
