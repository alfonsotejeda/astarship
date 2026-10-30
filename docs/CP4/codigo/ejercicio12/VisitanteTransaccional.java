import java.util.function.Supplier;

/**
 * Decorador de visitante: toma el cerrojo de la cuenta visitada, delega en el
 * visitante envuelto y lo libera. Separa el control de concurrencia de la logica
 * de negocio, de modo que ningun visitante concreto sabe de cerrojos.
 *
 * Como el cerrojo es por cuenta, dos cuentas distintas no se estorban.
 */
public final class VisitanteTransaccional<R> implements VisitanteOperacion<R> {

    private final VisitanteOperacion<R> interno;

    public VisitanteTransaccional(VisitanteOperacion<R> interno) {
        this.interno = interno;
    }

    @Override
    public R visitAhorro(CuentaAhorro c) {
        return bajoCerrojo(c, () -> interno.visitAhorro(c));
    }

    @Override
    public R visitCorriente(CuentaCorriente c) {
        return bajoCerrojo(c, () -> interno.visitCorriente(c));
    }

    @Override
    public R visitInversion(CuentaInversion c) {
        return bajoCerrojo(c, () -> interno.visitInversion(c));
    }

    @Override
    public R visitEmpresarial(CuentaEmpresarial c) {
        return bajoCerrojo(c, () -> interno.visitEmpresarial(c));
    }

    private R bajoCerrojo(Cuenta c, Supplier<R> accion) {
        c.cerrojo().lock();
        try {
            return accion.get();
        } finally {
            c.cerrojo().unlock();
        }
    }
}
