import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { useEffect, useState } from "react";

export default function App() {
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    const handle = (event: Event) =>
      setSyncError((event as CustomEvent).detail);
    window.addEventListener("record-sync-error", handle);
    return () => window.removeEventListener("record-sync-error", handle);
  }, []);
  return (
    <>
      {syncError && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-[100] bg-amber-50 text-amber-900 p-3"
        >
          {syncError}{" "}
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}
      <RouterProvider router={router} />
    </>
  );
}
