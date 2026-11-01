import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { accountAllowed, canEnter, roleHome } from "./auth";

export default function RequireRole({
  area,
  children,
}: {
  area: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    role?: string;
    error?: string;
    signedIn?: boolean;
  }>({ loading: true });
  useEffect(() => {
    let stopProfile = () => {};
    const stop = onAuthStateChanged(auth, (user) => {
      stopProfile();
      if (!user) {
        setState({ loading: false, signedIn: false });
        return;
      }
      setState({ loading: true });
      stopProfile = onSnapshot(
        doc(db, "Users", user.uid),
        (snapshot) => {
          const profile = snapshot.data();
          if (!profile || !accountAllowed(profile) || !roleHome(profile.role)) {
            setState({
              loading: false,
              error:
                "This account does not have access. Contact your administrator.",
            });
          } else
            setState({ loading: false, signedIn: true, role: profile.role });
        },
        () =>
          setState({
            loading: false,
            error:
              "Unable to verify account access. Check your connection and reload.",
          }),
      );
    });
    return () => {
      stop();
      stopProfile();
    };
  }, []);
  if (state.loading)
    return (
      <div role="status" className="p-8 text-gray-500">
        Loading account…
      </div>
    );
  if (state.error)
    return (
      <div role="alert" className="p-8 text-red-700">
        {state.error} <a href="#/login">Return to login</a>
      </div>
    );
  if (!state.signedIn) return <Navigate to="/login" replace />;
  if (!canEnter(state.role, area))
    return <Navigate to={roleHome(state.role)!} replace />;
  return children;
}
