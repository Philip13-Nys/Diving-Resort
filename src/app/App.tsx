import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { initPresence } from "./presence";

export default function App() {
  console.log(router);
  return <RouterProvider router={router} />;
}
