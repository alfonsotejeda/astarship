import { ThemeProvider } from "@/providers/ThemeProvider";

/** Raíz de la aplicación: monta los providers y el contenido. */
export function App() {
  return (
    <ThemeProvider>
      <main>
        <h1>Astarship</h1>
      </main>
    </ThemeProvider>
  );
}
