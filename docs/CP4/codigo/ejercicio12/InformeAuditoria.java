import java.util.ArrayList;
import java.util.List;

/** Salida inmutable de la auditoria. Permite combinar informes por reduccion. */
public record InformeAuditoria(String cuenta, String tipo, String nivelRiesgo,
                               int movimientosRevisados, List<String> hallazgos) {

    private static final List<String> ESCALA = List.of("BAJO", "MEDIO", "ALTO");

    public InformeAuditoria {
        hallazgos = List.copyOf(hallazgos);
    }

    /**
     * Inciso (c). Combinacion de informes para el Composite: suma los asientos
     * revisados, concatena los hallazgos etiquetados con su cuenta y se queda con el
     * peor riesgo. Es asociativa, que es lo que permite recorrer el grupo en paralelo.
     */
    public static InformeAuditoria consolidar(InformeAuditoria a, InformeAuditoria b) {
        List<String> todos = new ArrayList<>(etiquetar(a));
        todos.addAll(etiquetar(b));
        return new InformeAuditoria("GRUPO", "Consolidado",
                peor(a.nivelRiesgo(), b.nivelRiesgo()),
                a.movimientosRevisados() + b.movimientosRevisados(), todos);
    }

    private static List<String> etiquetar(InformeAuditoria i) {
        if (i.cuenta().equals("GRUPO")) {
            return i.hallazgos();
        }
        List<String> salida = new ArrayList<>();
        for (String h : i.hallazgos()) {
            salida.add(i.cuenta() + ": " + h);
        }
        return salida;
    }

    private static String peor(String x, String y) {
        return ESCALA.indexOf(x) >= ESCALA.indexOf(y) ? x : y;
    }

    @Override
    public String toString() {
        return String.format("%-11s %-11s riesgo=%-6s asientos=%3d  %s",
                cuenta, tipo, nivelRiesgo, movimientosRevisados,
                hallazgos.isEmpty() ? "sin hallazgos" : String.join("; ", hallazgos));
    }
}
