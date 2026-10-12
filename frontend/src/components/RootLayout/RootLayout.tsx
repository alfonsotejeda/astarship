import { Navigate, NavLink, Outlet } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { ROLE_LABEL } from "@/app/providers/auth/roles";
import { useTheme } from "@/app/providers/theme/ThemeContext";
import { NAV_BY_ROLE } from "@/app/router/navigation";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import "./RootLayout.css";

// Temporary until AppShell exists (#72), which will take NAV_BY_ROLE as `nav`.
export function RootLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className="shell__side">
        <p className="shell__user">
          {user.name}
          <span>{ROLE_LABEL[user.role]}</span>
        </p>
        <nav className="shell__nav">
          {NAV_BY_ROLE[user.role].map(item => (
            <NavLink key={item.to} to={item.to} className="shell__link">
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" icon={theme === "light" ? "moon" : "sun"} onClick={toggleTheme}>
          {theme === "light" ? "Tema oscuro" : "Tema claro"}
        </Button>
        <Button variant="ghost" icon="logout" onClick={logout}>
          Cerrar sesión
        </Button>
      </aside>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
