import type { ReactNode } from "react";
import { NavLink, useNavigate, useParams } from "react-router";
import { useTheme } from "@/app/providers/theme/ThemeContext";
import { Button } from "@/components/Button/Button";
import { PillNav } from "@/components/PillNav/PillNav";
import { AppShellPreview } from "./previews/AppShellPreview";
import { BadgePreview } from "./previews/BadgePreview";
import { ButtonPreview } from "./previews/ButtonPreview";
import { EffortMeterPreview } from "./previews/EffortMeterPreview";
import { FieldPreview } from "./previews/FieldPreview";
import { IconPreview } from "./previews/IconPreview";
import { PageHeaderPreview } from "./previews/PageHeaderPreview";
import { PanelPreview } from "./previews/PanelPreview";
import { RatingPreview } from "./previews/RatingPreview";
import { StatusPillPreview } from "./previews/StatusPillPreview";
import { TabsPreview } from "./previews/TabsPreview";
import "./PreviewPage.css";

const PREVIEWS: Record<string, ReactNode> = {
  Icon: <IconPreview />,
  Button: <ButtonPreview />,
  Badge: <BadgePreview />,
  StatusPill: <StatusPillPreview />,
  EffortMeter: <EffortMeterPreview />,
  Rating: <RatingPreview />,
  PageHeader: <PageHeaderPreview />,
  Panel: <PanelPreview />,
  Tabs: <TabsPreview />,
  Field: <FieldPreview />,
  AppShell: <AppShellPreview />,
};

export function PreviewPage() {
  const { name = "Icon" } = useParams();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="preview">
      <aside className="preview__sidebar">
        <h1>Componentes</h1>
        <PillNav className="preview__nav" aria-label="Componentes">
          {Object.keys(PREVIEWS).map(key => (
            <NavLink key={key} to={`/preview/${key}`} className="preview__link">
              {key}
            </NavLink>
          ))}
        </PillNav>
        <Button variant="ghost" size="sm" icon={theme === "light" ? "moon" : "sun"} onClick={toggleTheme}>
          {theme === "light" ? "Tema oscuro" : "Tema claro"}
        </Button>
        <Button variant="ghost" size="sm" icon="logout" onClick={() => navigate("/login")}>
          Volver al login
        </Button>
      </aside>
      <main className="preview__main">
        <h1>{name}</h1>
        {PREVIEWS[name] ?? <p>No hay preview para «{name}».</p>}
      </main>
    </div>
  );
}
