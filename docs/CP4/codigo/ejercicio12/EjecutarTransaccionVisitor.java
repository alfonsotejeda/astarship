/**
 * Operacion 1 de 3: ejecutar. Lleva la transaccion en su estado y se comporta de
 * forma distinta en cada tipo de cuenta. No acumula nada: devuelve el resultado.
 */
public final class EjecutarTransaccionVisitor
        implements VisitanteOperacion<ResultadoOperacion> {

    private final Transaccion t;

    public EjecutarTransaccionVisitor(Transaccion t) {
        this.t = t;
    }

    /** Ahorro: sin sobregiro y con comision a partir del cuarto retiro del mes. */
    @Override
    public ResultadoOperacion visitAhorro(CuentaAhorro c) {
        if (c.saldo() + t.delta() < 0) {
            return ResultadoOperacion.rechazada(c, "el ahorro no admite sobregiro");
        }
        long cargos = 0L;
        if (t.tipo() == TipoTransaccion.RETIRO) {
            c.contarRetiro(1);
            if (c.retirosDelMes() > CuentaAhorro.LIMITE_RETIROS_MES) {
                cargos = CuentaAhorro.COMISION_EXCESO;
            }
        }
        c.aplicar(t.delta() - cargos);
        c.registrar(new Movimiento(t.id(), t.tipo(), t.delta(), cargos,
                "retiros del mes: " + c.retirosDelMes()));
        return ResultadoOperacion.ok(c, cargos > 0
                ? "comision por exceso de retiros"
                : "sin cargos", cargos);
    }

    /** Corriente: admite sobregiro hasta la linea de credito y lo cobra. */
    @Override
    public ResultadoOperacion visitCorriente(CuentaCorriente c) {
        if (c.saldo() + c.lineaSobregiro() + t.delta() < 0) {
            return ResultadoOperacion.rechazada(c, "excede la linea de sobregiro");
        }
        long cargos = c.saldo() + t.delta() < 0 ? CuentaCorriente.COMISION_SOBREGIRO : 0L;
        c.aplicar(t.delta() - cargos);
        c.registrar(new Movimiento(t.id(), t.tipo(), t.delta(), cargos,
                cargos > 0 ? "uso de sobregiro" : "dentro del saldo"));
        return ResultadoOperacion.ok(c, cargos > 0
                ? "comision por sobregiro"
                : "sin cargos", cargos);
    }

    /** Inversion: toda salida liquida participaciones y paga penalizacion. */
    @Override
    public ResultadoOperacion visitInversion(CuentaInversion c) {
        if (c.saldo() + t.delta() < 0) {
            return ResultadoOperacion.rechazada(c, "liquidez insuficiente");
        }
        long cargos = 0L;
        if (t.tipo() != TipoTransaccion.DEPOSITO) {
            cargos = t.montoCentavos() * CuentaInversion.PENALIZACION_BPS / 10_000L;
            c.acumularPenalizacion(cargos);
        }
        c.aplicar(t.delta() - cargos);
        c.registrar(new Movimiento(t.id(), t.tipo(), t.delta(), cargos,
                cargos > 0 ? "liquidacion anticipada" : "suscripcion"));
        return ResultadoOperacion.ok(c, cargos > 0
                ? "penalizacion del 2% no reembolsable"
                : "sin cargos", cargos);
    }

    /** Empresarial: doble autorizacion por monto y marca de reporte regulatorio. */
    @Override
    public ResultadoOperacion visitEmpresarial(CuentaEmpresarial c) {
        if (t.montoCentavos() >= CuentaEmpresarial.UMBRAL_DOBLE_AUTORIZACION
                && !c.autorizacionSecundaria()) {
            return ResultadoOperacion.rechazada(c, "exige doble autorizacion");
        }
        if (c.saldo() + t.delta() < 0) {
            return ResultadoOperacion.rechazada(c, "saldo insuficiente");
        }
        long cargos = t.tipo() == TipoTransaccion.PAGO_SERVICIOS
                ? CuentaEmpresarial.COMISION_PAGO : 0L;
        boolean reportable = t.montoCentavos() >= CuentaEmpresarial.UMBRAL_REPORTE;
        c.aplicar(t.delta() - cargos);
        c.registrar(new Movimiento(t.id(), t.tipo(), t.delta(), cargos,
                reportable ? "reportable al regulador" : "ordinaria"));
        return ResultadoOperacion.ok(c, reportable
                ? "reportable al regulador"
                : "registrada", cargos);
    }
}
