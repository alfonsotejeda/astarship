namespace Ejercicio12;

/// <summary>
/// Operacion 1 de 3: ejecutar. Lleva la transaccion en su estado y se comporta de
/// forma distinta en cada tipo de cuenta. No acumula nada: devuelve el resultado.
/// </summary>
public sealed class EjecutarTransaccionVisitor : IVisitanteOperacion<ResultadoOperacion>
{
    private readonly Transaccion _t;

    public EjecutarTransaccionVisitor(Transaccion t) => _t = t;

    /// <summary>Ahorro: sin sobregiro y con comision a partir del cuarto retiro del mes.</summary>
    public ResultadoOperacion VisitAhorro(CuentaAhorro c)
    {
        if (c.Saldo + _t.Delta < 0)
        {
            return ResultadoOperacion.Rechazada(c, "el ahorro no admite sobregiro");
        }

        long cargos = 0L;
        if (_t.Tipo == TipoTransaccion.Retiro)
        {
            c.ContarRetiro(1);
            if (c.RetirosDelMes > CuentaAhorro.LimiteRetirosMes)
            {
                cargos = CuentaAhorro.ComisionExceso;
            }
        }

        c.Aplicar(_t.Delta - cargos);
        c.Registrar(new Movimiento(_t.Id, _t.Tipo, _t.Delta, cargos,
            "retiros del mes: " + c.RetirosDelMes));
        return ResultadoOperacion.Ok(
            c, cargos > 0 ? "comision por exceso de retiros" : "sin cargos", cargos);
    }

    /// <summary>Corriente: admite sobregiro hasta la linea de credito y lo cobra.</summary>
    public ResultadoOperacion VisitCorriente(CuentaCorriente c)
    {
        if (c.Saldo + c.LineaSobregiro + _t.Delta < 0)
        {
            return ResultadoOperacion.Rechazada(c, "excede la linea de sobregiro");
        }

        long cargos = c.Saldo + _t.Delta < 0 ? CuentaCorriente.ComisionSobregiro : 0L;
        c.Aplicar(_t.Delta - cargos);
        c.Registrar(new Movimiento(_t.Id, _t.Tipo, _t.Delta, cargos,
            cargos > 0 ? "uso de sobregiro" : "dentro del saldo"));
        return ResultadoOperacion.Ok(
            c, cargos > 0 ? "comision por sobregiro" : "sin cargos", cargos);
    }

    /// <summary>Inversion: toda salida liquida participaciones y paga penalizacion.</summary>
    public ResultadoOperacion VisitInversion(CuentaInversion c)
    {
        if (c.Saldo + _t.Delta < 0)
        {
            return ResultadoOperacion.Rechazada(c, "liquidez insuficiente");
        }

        long cargos = 0L;
        if (_t.Tipo != TipoTransaccion.Deposito)
        {
            cargos = _t.MontoCentavos * CuentaInversion.PenalizacionBps / 10_000L;
            c.AcumularPenalizacion(cargos);
        }

        c.Aplicar(_t.Delta - cargos);
        c.Registrar(new Movimiento(_t.Id, _t.Tipo, _t.Delta, cargos,
            cargos > 0 ? "liquidacion anticipada" : "suscripcion"));
        return ResultadoOperacion.Ok(
            c, cargos > 0 ? "penalizacion del 2% no reembolsable" : "sin cargos", cargos);
    }

    /// <summary>Empresarial: doble autorizacion por monto y marca de reporte regulatorio.</summary>
    public ResultadoOperacion VisitEmpresarial(CuentaEmpresarial c)
    {
        if (_t.MontoCentavos >= CuentaEmpresarial.UmbralDobleAutorizacion
            && !c.AutorizacionSecundaria)
        {
            return ResultadoOperacion.Rechazada(c, "exige doble autorizacion");
        }

        if (c.Saldo + _t.Delta < 0)
        {
            return ResultadoOperacion.Rechazada(c, "saldo insuficiente");
        }

        long cargos = _t.Tipo == TipoTransaccion.PagoServicios
            ? CuentaEmpresarial.ComisionPago
            : 0L;
        bool reportable = _t.MontoCentavos >= CuentaEmpresarial.UmbralReporte;
        c.Aplicar(_t.Delta - cargos);
        c.Registrar(new Movimiento(_t.Id, _t.Tipo, _t.Delta, cargos,
            reportable ? "reportable al regulador" : "ordinaria"));
        return ResultadoOperacion.Ok(
            c, reportable ? "reportable al regulador" : "registrada", cargos);
    }
}
