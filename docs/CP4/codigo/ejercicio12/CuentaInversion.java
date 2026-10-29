/**
 * Penaliza la liquidacion anticipada. La penalizacion no se reembolsa al revertir,
 * de modo que el rollback no es el inverso exacto de la ejecucion.
 */
public final class CuentaInversion extends Cuenta {

    /** Puntos base: 200 bps = 2,00 %. */
    public static final int PENALIZACION_BPS = 200;

    private long penalizacionesAcumuladas;

    public CuentaInversion(String id, long saldoInicial) {
        super(id, saldoInicial);
    }

    @Override
    public <R> R accept(VisitanteOperacion<R> v) {
        return v.visitInversion(this);
    }

    @Override
    public String etiqueta() {
        return "Inversion";
    }

    public long penalizacionesAcumuladas() {
        return penalizacionesAcumuladas;
    }

    void acumularPenalizacion(long centavos) {
        penalizacionesAcumuladas += centavos;
    }
}
