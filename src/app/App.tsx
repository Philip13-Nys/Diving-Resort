import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

export default function App() {
  console.log(router);
  return <RouterProvider router={router} />;
}
