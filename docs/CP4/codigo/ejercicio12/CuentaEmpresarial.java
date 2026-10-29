/** Exige doble autorizacion por encima de un umbral y reporta al regulador. */
public final class CuentaEmpresarial extends Cuenta {

    public static final long UMBRAL_DOBLE_AUTORIZACION = 5_000_000L;
    public static final long UMBRAL_REPORTE = 1_000_000L;
    public static final long COMISION_PAGO = 250L;

    private final boolean autorizacionSecundaria;

    public CuentaEmpresarial(String id, long saldoInicial, boolean autorizada) {
        super(id, saldoInicial);
        this.autorizacionSecundaria = autorizada;
    }

    @Override
    public <R> R accept(VisitanteOperacion<R> v) {
        return v.visitEmpresarial(this);
    }

    @Override
    public String etiqueta() {
        return "Empresarial";
    }

    public boolean autorizacionSecundaria() {
        return autorizacionSecundaria;
    }
}
