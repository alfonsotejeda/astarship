namespace Ejercicio12;

/// <summary>
/// Penaliza la liquidacion anticipada. La penalizacion no se reembolsa al revertir,
/// de modo que el rollback no es el inverso exacto de la ejecucion.
/// </summary>
public sealed class CuentaInversion : Cuenta
{
    /// <summary>Puntos base: 200 bps = 2,00 %.</summary>
    public const int PenalizacionBps = 200;

    public CuentaInversion(string id, long saldoInicial)
        : base(id, saldoInicial)
    {
    }

    public override R Accept<R>(IVisitanteOperacion<R> v) => v.VisitInversion(this);

    public override string Etiqueta => "Inversion";

    public long PenalizacionesAcumuladas { get; private set; }

    internal void AcumularPenalizacion(long centavos) => PenalizacionesAcumuladas += centavos;
}
