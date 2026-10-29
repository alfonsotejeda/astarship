/** Admite sobregiro hasta su linea de credito y lo cobra. */
public final class CuentaCorriente extends Cuenta {

    public static final long COMISION_SOBREGIRO = 500L;

    private final long lineaSobregiro;

    public CuentaCorriente(String id, long saldoInicial, long lineaSobregiro) {
        super(id, saldoInicial);
        this.lineaSobregiro = lineaSobregiro;
    }

    @Override
    public <R> R accept(VisitanteOperacion<R> v) {
        return v.visitCorriente(this);
    }

    @Override
    public String etiqueta() {
        return "Corriente";
    }

    public long lineaSobregiro() {
        return lineaSobregiro;
    }
}
