/** No admite sobregiro y limita los retiros del mes. */
public final class CuentaAhorro extends Cuenta {

    public static final int LIMITE_RETIROS_MES = 3;
    public static final long COMISION_EXCESO = 150L;

    private int retirosDelMes;

    public CuentaAhorro(String id, long saldoInicial) {
        super(id, saldoInicial);
    }

    @Override
    public <R> R accept(VisitanteOperacion<R> v) {
        return v.visitAhorro(this);
    }

    @Override
    public String etiqueta() {
        return "Ahorro";
    }

    public int retirosDelMes() {
        return retirosDelMes;
    }

    void contarRetiro(int delta) {
        retirosDelMes += delta;
    }
}
