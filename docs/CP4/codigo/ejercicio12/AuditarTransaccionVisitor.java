import java.util.ArrayList;
import java.util.List;

/**
 * Operacion 3 de 3: auditar. Visitante SIN ESTADO: no guarda nada entre visitas,
 * devuelve un informe inmutable. Por eso una sola instancia puede compartirse
 * entre hilos sin sincronizacion.
 */
public final class AuditarTransaccionVisitor
        implements VisitanteOperacion<InformeAuditoria> {

    /** Ahorro: vigila el limite de retiros del mes. */
    @Override
    public InformeAuditoria visitAhorro(CuentaAhorro c) {
        List<String> hallazgos = new ArrayList<>();
        if (c.retirosDelMes() > CuentaAhorro.LIMITE_RETIROS_MES) {
            hallazgos.add("excede el limite de retiros del mes ("
                    + c.retirosDelMes() + ")");
        }
        return new InformeAuditoria(c.id(), c.etiqueta(),
                hallazgos.isEmpty() ? "BAJO" : "MEDIO",
                c.historial().size(), hallazgos);
    }

    /** Corriente: vigila el sobregiro y su profundidad. */
    @Override
    public InformeAuditoria visitCorriente(CuentaCorriente c) {
        List<String> hallazgos = new ArrayList<>();
        String riesgo = "BAJO";
        if (c.saldo() < 0) {
            hallazgos.add("sobregiro activo por " + Dinero.f(-c.saldo()));
            riesgo = -c.saldo() * 2 > c.lineaSobregiro() ? "ALTO" : "MEDIO";
        }
        return new InformeAuditoria(c.id(), c.etiqueta(), riesgo,
                c.historial().size(), hallazgos);
    }

    /** Inversion: mide el peso de las penalizaciones sobre el saldo. */
    @Override
    public InformeAuditoria visitInversion(CuentaInversion c) {
        List<String> hallazgos = new ArrayList<>();
        String riesgo = "BAJO";
        if (c.penalizacionesAcumuladas() > 0) {
            hallazgos.add("penalizaciones acumuladas: "
                    + Dinero.f(c.penalizacionesAcumuladas()));
            riesgo = c.penalizacionesAcumuladas() * 100 > c.saldo() ? "ALTO" : "MEDIO";
        }
        return new InformeAuditoria(c.id(), c.etiqueta(), riesgo,
                c.historial().size(), hallazgos);
    }

    /** Empresarial: lista las operaciones que superan el umbral de reporte. */
    @Override
    public InformeAuditoria visitEmpresarial(CuentaEmpresarial c) {
        List<String> hallazgos = new ArrayList<>();
        int reportables = 0;
        for (Movimiento m : c.historial()) {
            if (Math.abs(m.delta()) >= CuentaEmpresarial.UMBRAL_REPORTE) {
                reportables++;
            }
        }
        if (reportables > 0) {
            hallazgos.add(reportables + " operaciones reportables");
        }
        return new InformeAuditoria(c.id(), c.etiqueta(),
                reportables > 0 ? "ALTO" : "BAJO",
                c.historial().size(), hallazgos);
    }
}
