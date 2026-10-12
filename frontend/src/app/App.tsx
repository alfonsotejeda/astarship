import { RouterProvider } from "react-router";
import { AuthProvider } from "@/app/providers/auth/AuthProvider";
import { ThemeProvider } from "@/app/providers/theme/ThemeProvider";
import { router } from "@/app/router/routes";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
