import java.util.List;

/** Salida inmutable de la auditoria. Permite combinar informes por reduccion. */
public record InformeAuditoria(String cuenta, String tipo, String nivelRiesgo,
                               int movimientosRevisados, List<String> hallazgos) {

    public InformeAuditoria {
        hallazgos = List.copyOf(hallazgos);
    }

    @Override
    public String toString() {
        return String.format("%-11s %-11s riesgo=%-6s asientos=%3d  %s",
                cuenta, tipo, nivelRiesgo, movimientosRevisados,
                hallazgos.isEmpty() ? "sin hallazgos" : String.join("; ", hallazgos));
    }
}
