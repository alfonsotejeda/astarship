/**
 * Cuarta operacion, agregada DESPUES de cerrar las cuentas: una clase nueva y cero
 * modificaciones en CuentaAhorro, CuentaCorriente, CuentaInversion y
 * CuentaEmpresarial. Es la evidencia empirica del argumento del inciso (a).
 *
 * Nota honesta: esto vale porque la operacion se calcula a partir del estado que
 * las cuentas ya exponen. Una operacion que necesitara un atributo nuevo (por
 * ejemplo "congelada") si obligaria a tocar los elementos: Visitor protege frente
 * a comportamiento nuevo, no frente a estado nuevo.
 */
public final class CalcularInteresesVisitor implements VisitanteOperacion<Long> {

    @Override
    public Long visitAhorro(CuentaAhorro c) {
        return c.saldo() * 50 / 10_000L;
    }

    @Override
    public Long visitCorriente(CuentaCorriente c) {
        return 0L;
    }

    @Override
    public Long visitInversion(CuentaInversion c) {
        return c.saldo() * 400 / 10_000L;
    }

    @Override
    public Long visitEmpresarial(CuentaEmpresarial c) {
        return c.saldo() * 120 / 10_000L;
    }

    /** Monoide (0, +): asociativo, luego el recorrido del grupo es paralelizable. */
    @Override
    public Long neutro() {
        return 0L;
    }

    @Override
    public Long combinar(Long acumulado, Long siguiente) {
        return acumulado + siguiente;
    }
}
