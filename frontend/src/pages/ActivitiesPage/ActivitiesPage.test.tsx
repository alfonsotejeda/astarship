import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivitiesPage } from "./ActivitiesPage";

const auth = vi.hoisted(() => ({ user: { name: "Laura Pérez", role: "guide" } as { name: string; role: string } }));

vi.mock("@/app/providers/auth/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, logout: () => {} }),
}));

// ResizeObserver is used by Tabs to place its indicator
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAs(name: string, role: string) {
  auth.user = { name, role };
  return render(<ActivitiesPage />);
}

describe("ActivitiesPage as a guide", () => {
  it("lets the guide edit only their own activities (RN-01)", () => {
    renderAs("Laura Pérez", "guide");
    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(4);
    expect(screen.getAllByText("Solo lectura")).toHaveLength(6);
  });

  it("has no Duplicados tab", () => {
    renderAs("Laura Pérez", "guide");
    expect(screen.queryByRole("tab", { name: /Duplicados/ })).toBeNull();
  });

  it("filters to the guide's own activities", async () => {
    renderAs("Laura Pérez", "guide");
    await userEvent.click(screen.getByLabelText("Solo las mías"));
    expect(screen.getByText("4 de 10 actividades")).toBeTruthy();
    expect(screen.queryByText("Solo lectura")).toBeNull();
  });

  it("searches by activity or attraction, ignoring accents", async () => {
    renderAs("Laura Pérez", "guide");
    await userEvent.type(screen.getByLabelText("Buscar"), "malecon");
    expect(screen.getByText("1 de 10 actividades")).toBeTruthy();
    expect(screen.getAllByText("Paseo en bici por el Malecón").length).toBeGreaterThan(0);
  });

  it("warns about a possible duplicate in the new activity panel", async () => {
    renderAs("Laura Pérez", "guide");
    await userEvent.click(screen.getByRole("button", { name: "Nueva actividad" }));

    const panel = screen.getByRole("region", { name: "Nueva actividad" });
    expect(within(panel).queryByText("Posible duplicado")).toBeNull();

    await userEvent.type(within(panel).getByLabelText(/Nombre/), "Recorrido por la Plaza Vieja");
    expect(within(panel).getByText("Posible duplicado")).toBeTruthy();
    expect(within(panel).getByText(/Ruta a pie por la Habana Vieja/)).toBeTruthy();
  });

  it("requires a name and then adds the activity as the guide's own", async () => {
    renderAs("Laura Pérez", "guide");
    await userEvent.click(screen.getByRole("button", { name: "Nueva actividad" }));
    const panel = screen.getByRole("region", { name: "Nueva actividad" });

    await userEvent.click(within(panel).getByRole("button", { name: "Guardar actividad" }));
    expect(within(panel).getByText("Escribe el nombre de la actividad.")).toBeTruthy();

    await userEvent.type(within(panel).getByLabelText(/Nombre/), "Cata de ron");
    await userEvent.click(within(panel).getByRole("button", { name: "Guardar actividad" }));

    expect(screen.queryByRole("region", { name: "Nueva actividad" })).toBeNull();
    expect(screen.getByText("11 actividades")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar Cata de ron" })).toBeTruthy();
  });
});

describe("ActivitiesPage as an administrator", () => {
  it("can edit every activity", () => {
    renderAs("Raúl Medina", "admin");
    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(10);
  });

  it("shows the pending duplicates in the Duplicados tab", async () => {
    renderAs("Raúl Medina", "admin");
    const tab = screen.getByRole("tab", { name: /Duplicados/ });
    expect(within(tab).getByText("2")).toBeTruthy();

    await userEvent.click(tab);
    expect(screen.getByText(/92 % de parecido/)).toBeTruthy();
    expect(screen.getByText(/87 % de parecido/)).toBeTruthy();
  });

  it("tells how many uses move to the activity that stays", async () => {
    renderAs("Raúl Medina", "admin");
    await userEvent.click(screen.getByRole("tab", { name: /Duplicados/ }));

    // Pair 1 keeps A by default: B has 1 use
    expect(screen.getByText("Su 1 uso pasará a la que conservas.")).toBeTruthy();
    // Keeping B instead moves the 12 uses of A
    const [firstKeep] = screen.getAllByRole("tablist", { name: "Conservar" });
    await userEvent.click(within(firstKeep).getByRole("tab", { name: "B" }));
    expect(screen.getByText("Sus 12 usos pasarán a la que conservas.")).toBeTruthy();
  });

  it("merges a pair: the uses move and the pair is resolved (RF-06, RN-03)", async () => {
    renderAs("Raúl Medina", "admin");
    await userEvent.click(screen.getByRole("tab", { name: /Duplicados/ }));

    const [firstMerge] = screen.getAllByRole("button", { name: "Fusionar en una" });
    await userEvent.click(firstMerge);

    expect(screen.getByText(/Fusionadas en «Ruta a pie por la Habana Vieja»/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Fusionar en una" })).toHaveLength(1);

    await userEvent.click(screen.getByRole("tab", { name: /Actividades/ }));
    const row = screen.getByText("Ruta a pie por la Habana Vieja").closest("tr") as HTMLElement;
    expect(within(row).getByText("13")).toBeTruthy();
  });

  it("dismisses a pair and shows the empty state when none are left", async () => {
    renderAs("Raúl Medina", "admin");
    await userEvent.click(screen.getByRole("tab", { name: /Duplicados/ }));

    for (const button of screen.getAllByRole("button", { name: "No son duplicados" })) {
      await userEvent.click(button);
    }
    expect(screen.getByText("No quedan duplicados por revisar")).toBeTruthy();
  });
});
