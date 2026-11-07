namespace Ejercicio12;

/// <summary>No admite sobregiro y limita los retiros del mes.</summary>
public sealed class CuentaAhorro : Cuenta
{
    public const int LimiteRetirosMes = 3;
    public const long ComisionExceso = 150L;

    public CuentaAhorro(string id, long saldoInicial)
        : base(id, saldoInicial)
    {
    }

    public override R Accept<R>(IVisitanteOperacion<R> v) => v.VisitAhorro(this);

    public override string Etiqueta => "Ahorro";

    public int RetirosDelMes { get; private set; }

    internal void ContarRetiro(int delta) => RetirosDelMes += delta;
}
