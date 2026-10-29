/**
 * Operacion 2 de 3: revertir. Busca el asiento por identificador y deshace el
 * efecto, con reglas propias de cada tipo de cuenta.
 */
public final class RevertirTransaccionVisitor
        implements VisitanteOperacion<ResultadoOperacion> {

    private final String idTransaccion;

    public RevertirTransaccionVisitor(String idTransaccion) {
        this.idTransaccion = idTransaccion;
    }

    /** Ahorro: devuelve el principal, reembolsa la comision y libera el retiro. */
    @Override
    public ResultadoOperacion visitAhorro(CuentaAhorro c) {
        Movimiento m = c.buscar(idTransaccion);
        if (m == null) {
            return ResultadoOperacion.rechazada(c, "no existe el asiento");
        }
        c.aplicar(-m.delta() + m.cargos());
        if (m.tipo() == TipoTransaccion.RETIRO) {
            c.contarRetiro(-1);
        }
        c.registrar(new Movimiento("rev:" + idTransaccion, m.tipo(),
                -m.delta(), -m.cargos(), "reversion con reembolso"));
        return ResultadoOperacion.ok(c, "revertida, comision reembolsada", -m.cargos());
    }

    /** Corriente: devuelve el principal y reembolsa la comision de sobregiro. */
    @Override
    public ResultadoOperacion visitCorriente(CuentaCorriente c) {
        Movimiento m = c.buscar(idTransaccion);
        if (m == null) {
            return ResultadoOperacion.rechazada(c, "no existe el asiento");
        }
        c.aplicar(-m.delta() + m.cargos());
        c.registrar(new Movimiento("rev:" + idTransaccion, m.tipo(),
                -m.delta(), -m.cargos(), "reversion con reembolso"));
        return ResultadoOperacion.ok(c, "revertida, sobregiro reembolsado", -m.cargos());
    }

    /**
     * Inversion: devuelve el principal pero NO la penalizacion. El rollback no es
     * el inverso exacto de la ejecucion, de ahi que convenga apoyarse en Memento.
     */
    @Override
    public ResultadoOperacion visitInversion(CuentaInversion c) {
        Movimiento m = c.buscar(idTransaccion);
        if (m == null) {
            return ResultadoOperacion.rechazada(c, "no existe el asiento");
        }
        c.aplicar(-m.delta());
        c.registrar(new Movimiento("rev:" + idTransaccion, m.tipo(),
                -m.delta(), 0L, "reversion sin reembolso de penalizacion"));
        return ResultadoOperacion.ok(c, "penalizacion de "
                + Dinero.f(m.cargos()) + " retenida", 0L);
    }

    /** Empresarial: la reversion misma exige la segunda autorizacion. */
    @Override
    public ResultadoOperacion visitEmpresarial(CuentaEmpresarial c) {
        Movimiento m = c.buscar(idTransaccion);
        if (m == null) {
            return ResultadoOperacion.rechazada(c, "no existe el asiento");
        }
        if (!c.autorizacionSecundaria()) {
            return ResultadoOperacion.rechazada(c, "la reversion exige doble firma");
        }
        c.aplicar(-m.delta() + m.cargos());
        c.registrar(new Movimiento("rev:" + idTransaccion, m.tipo(),
                -m.delta(), -m.cargos(), "reversion con doble firma"));
        return ResultadoOperacion.ok(c, "revertida con traza de autorizacion",
                -m.cargos());
    }
}
