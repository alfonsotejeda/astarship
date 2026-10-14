import { Navigate, NavLink, Outlet } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { ROLE_LABEL } from "@/app/providers/auth/roles";
import { useTheme } from "@/app/providers/theme/ThemeContext";
import { NAV_BY_ROLE } from "@/app/router/navigation";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import { PillNav } from "@/components/PillNav/PillNav";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./AppShell.css";

interface AppShellProps {
  counts?: Record<string, number>;
}

function initials(name: string) {
  return name.split(" ").map(word => word[0]).slice(0, 2).join("");
}

export function AppShell({ counts = {} }: AppShellProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const mobile = useMediaQuery("(max-width: 480px)");

  if (!user) return <Navigate to="/login" replace />;

  const nav = NAV_BY_ROLE[user.role];

  const brand = (
    <div className="app-shell__brand">
      <img src="/favicon.svg" alt="" width={28} height={28} />
      <span>Astarship</span>
    </div>
  );

  const themeButton = (
    <Button
      variant="ghost"
      size="sm"
      icon={theme === "dark" ? "sun" : "moon"}
      aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema oscuro"}
      onClick={toggleTheme}
    />
  );

  const logoutButton = (
    <Button variant="ghost" size="sm" icon="logout" aria-label="Cerrar sesión" onClick={logout} />
  );

  const avatar = <span className="app-shell__avatar" aria-hidden="true">{initials(user.name)}</span>;

  const navigation = (
    <PillNav className={mobile ? "app-shell__tabbar" : "app-shell__nav"} aria-label="Navegación principal">
      {(mobile ? nav.slice(0, 5) : nav).map(item => (
        <NavLink key={item.key} to={item.to} end className="app-shell__nav-item">
          <Icon name={item.icon} size={20} />
          <span className="app-shell__nav-label">{item.label}</span>
          {counts[item.key] ? <span className="app-shell__count">{counts[item.key]}</span> : null}
        </NavLink>
      ))}
    </PillNav>
  );

  if (mobile) {
    return (
      <div className="app-shell app-shell--mobile">
        <header className="app-shell__topbar">
          {brand}
          <div className="app-shell__topbar-end">
            {themeButton}
            {logoutButton}
            {avatar}
          </div>
        </header>
        <main className="app-shell__main"><Outlet /></main>
        {navigation}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        {brand}
        {navigation}
        <div className="app-shell__user">
          {avatar}
          <div className="app-shell__user-text">
            <div className="app-shell__user-name">{user.name}</div>
            <div className="app-shell__user-role">{ROLE_LABEL[user.role]}</div>
          </div>
          {themeButton}
          {logoutButton}
        </div>
      </aside>
      <main className="app-shell__main"><Outlet /></main>
    </div>
  );
}
