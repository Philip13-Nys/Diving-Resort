import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { auth, db } from "./firebase";
export type LoggedInUser = {
  uid: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  status?: string;
};

export async function loginUser(
  username: string,
  password: string,
): Promise<LoggedInUser> {
  const cleanUsername = username.trim();

  if (!cleanUsername || !password) {
    throw new Error("Please enter your username and password.");
  }

  const usersQuery = query(
    collection(db, "Users"),
    where("username", "==", cleanUsername),
    limit(1),
  );

  const usersSnapshot = await getDocs(usersQuery);

  if (usersSnapshot.empty) {
    const error = new Error("Username not found.") as Error & {
      code: string;
    };

    error.code = "username/not-found";
    throw error;
  }

  const matchedUserDoc = usersSnapshot.docs[0];
  const matchedUserData = matchedUserDoc.data();

  const email = String(matchedUserData.email ?? "").trim();

  if (!email) {
    throw new Error(
      "This account has no email associated with it. Please contact your administrator.",
    );
  }

  const result = await signInWithEmailAndPassword(auth, email, password);

  const uid = result.user.uid;

  if (uid !== matchedUserDoc.id) {
    await signOut(auth);
    throw new Error("The username is not linked to the authenticated account.");
  }

  const userRef = doc(db, "Users", uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await signOut(auth);
    throw new Error("User profile not found.");
  }

  const data = userDoc.data();

  if (!accountAllowed(data) || !roleHome(data.role)) {
    await signOut(auth);
    throw new Error(
      "This account has no enabled system role. Contact your administrator.",
    );
  }

  await updateDoc(userRef, {
    status: "Active",
    lastActive: serverTimestamp(),
  });

  return {
    uid,
    name: data.name || "",
    email: data.email || email,
    username: data.username || cleanUsername,
    role: data.role || "",
    status: "Active",
  };
}

export async function logoutUser(): Promise<void> {
  const currentUser = auth.currentUser;

  if (currentUser) {
    const userRef = doc(db, "Users", currentUser.uid);

    try {
      await updateDoc(userRef, {
        status: "Inactive",
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update logout status:", error);
    }
  }

  await signOut(auth);
}

export function roleHome(role: unknown): string | null {
  switch (
    String(role ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "administrator":
    case "admin":
      return "/admin";
    case "manager":
      return "/manager";
    case "receptionist":
      return "/receptionist";
    default:
      return null;
  }
}
export function accountAllowed(profile: Record<string, any>) {
  // status is existing login presence (Active/Inactive), not account access.
  return (
    profile.disabled !== true &&
    !["disabled", "suspended", "deleted"].includes(
      String(profile.accountStatus ?? profile.status ?? "").toLowerCase(),
    )
  );
}
export function canEnter(role: unknown, area: string) {
  const home = roleHome(role);
  return (
    home === "/admin" ||
    home === `/${area}` ||
    (home === "/manager" && area === "receptionist")
  );
}

// Client defense in depth. Deployed Firestore rules must enforce server access.
export async function requireAccess(area = "receptionist") {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const profile = await getDoc(doc(db, "Users", user.uid));
  if (
    !profile.exists() ||
    !accountAllowed(profile.data()) ||
    !canEnter(profile.data().role, area)
  )
    throw new Error("Your account does not have permission for this action.");
  return {
    uid: user.uid,
    name: String(profile.data().name || user.displayName || "Staff"),
  };
}
