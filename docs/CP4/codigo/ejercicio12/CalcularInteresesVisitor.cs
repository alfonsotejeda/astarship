namespace Ejercicio12;

/// <summary>
/// Cuarta operacion, agregada DESPUES de cerrar las cuentas: una clase nueva y cero
/// modificaciones en CuentaAhorro, CuentaCorriente, CuentaInversion y
/// CuentaEmpresarial. Es la evidencia empirica del argumento del inciso (a).
///
/// Nota honesta: esto vale porque la operacion se calcula a partir del estado que
/// las cuentas ya exponen. Una operacion que necesitara un atributo nuevo (por
/// ejemplo "congelada") si obligaria a tocar los elementos: Visitor protege frente
/// a comportamiento nuevo, no frente a estado nuevo.
/// </summary>
public sealed class CalcularInteresesVisitor : IVisitanteOperacion<long>
{
    public long VisitAhorro(CuentaAhorro c) => c.Saldo * 50 / 10_000L;

    public long VisitCorriente(CuentaCorriente c) => 0L;

    public long VisitInversion(CuentaInversion c) => c.Saldo * 400 / 10_000L;

    public long VisitEmpresarial(CuentaEmpresarial c) => c.Saldo * 120 / 10_000L;

    /// <summary>Monoide (0, +): asociativo, luego el recorrido del grupo es paralelizable.</summary>
    public long Neutro() => 0L;

    public long Combinar(long acumulado, long siguiente) => acumulado + siguiente;
}
