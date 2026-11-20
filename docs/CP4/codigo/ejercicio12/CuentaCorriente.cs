namespace Ejercicio12;

/// <summary>Admite sobregiro hasta su linea de credito y lo cobra.</summary>
public sealed class CuentaCorriente : Cuenta
{
    public const long ComisionSobregiro = 500L;

    public CuentaCorriente(string id, long saldoInicial, long lineaSobregiro)
        : base(id, saldoInicial) => LineaSobregiro = lineaSobregiro;

    public override R Accept<R>(IVisitanteOperacion<R> v) => v.VisitCorriente(this);

    public override string Etiqueta => "Corriente";

    public long LineaSobregiro { get; }
}
