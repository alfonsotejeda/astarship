namespace Ejercicio12;

/// <summary>
/// Operacion 2 de 3: revertir. Busca el asiento por identificador y deshace el
/// efecto, con reglas propias de cada tipo de cuenta.
/// </summary>
public sealed class RevertirTransaccionVisitor : IVisitanteOperacion<ResultadoOperacion>
{
    private readonly string _idTransaccion;

    public RevertirTransaccionVisitor(string idTransaccion) => _idTransaccion = idTransaccion;

    /// <summary>Ahorro: devuelve el principal, reembolsa la comision y libera el retiro.</summary>
    public ResultadoOperacion VisitAhorro(CuentaAhorro c)
    {
        Movimiento? m = c.Buscar(_idTransaccion);
        if (m is null)
        {
            return ResultadoOperacion.Rechazada(c, "no existe el asiento");
        }

        c.Aplicar(-m.Delta + m.Cargos);
        if (m.Tipo == TipoTransaccion.Retiro)
        {
            c.ContarRetiro(-1);
        }

        c.Registrar(new Movimiento("rev:" + _idTransaccion, m.Tipo,
            -m.Delta, -m.Cargos, "reversion con reembolso"));
        return ResultadoOperacion.Ok(c, "revertida, comision reembolsada", -m.Cargos);
    }

    /// <summary>Corriente: devuelve el principal y reembolsa la comision de sobregiro.</summary>
    public ResultadoOperacion VisitCorriente(CuentaCorriente c)
    {
        Movimiento? m = c.Buscar(_idTransaccion);
        if (m is null)
        {
            return ResultadoOperacion.Rechazada(c, "no existe el asiento");
        }

        c.Aplicar(-m.Delta + m.Cargos);
        c.Registrar(new Movimiento("rev:" + _idTransaccion, m.Tipo,
            -m.Delta, -m.Cargos, "reversion con reembolso"));
        return ResultadoOperacion.Ok(c, "revertida, sobregiro reembolsado", -m.Cargos);
    }

    /// <summary>
    /// Inversion: devuelve el principal pero NO la penalizacion. El rollback no es
    /// el inverso exacto de la ejecucion, de ahi que convenga apoyarse en Memento.
    /// </summary>
    public ResultadoOperacion VisitInversion(CuentaInversion c)
    {
        Movimiento? m = c.Buscar(_idTransaccion);
        if (m is null)
        {
            return ResultadoOperacion.Rechazada(c, "no existe el asiento");
        }

        c.Aplicar(-m.Delta);
        c.Registrar(new Movimiento("rev:" + _idTransaccion, m.Tipo,
            -m.Delta, 0L, "reversion sin reembolso de penalizacion"));
        return ResultadoOperacion.Ok(c, "penalizacion de " + Dinero.F(m.Cargos) + " retenida", 0L);
    }

    /// <summary>Empresarial: la reversion misma exige la segunda autorizacion.</summary>
    public ResultadoOperacion VisitEmpresarial(CuentaEmpresarial c)
    {
        Movimiento? m = c.Buscar(_idTransaccion);
        if (m is null)
        {
            return ResultadoOperacion.Rechazada(c, "no existe el asiento");
        }

        if (!c.AutorizacionSecundaria)
        {
            return ResultadoOperacion.Rechazada(c, "la reversion exige doble firma");
        }

        c.Aplicar(-m.Delta + m.Cargos);
        c.Registrar(new Movimiento("rev:" + _idTransaccion, m.Tipo,
            -m.Delta, -m.Cargos, "reversion con doble firma"));
        return ResultadoOperacion.Ok(c, "revertida con traza de autorizacion", -m.Cargos);
    }
}
