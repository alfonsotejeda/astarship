namespace Ejercicio12;

/// <summary>Exige doble autorizacion por encima de un umbral y reporta al regulador.</summary>
public sealed class CuentaEmpresarial : Cuenta
{
    public const long UmbralDobleAutorizacion = 5_000_000L;
    public const long UmbralReporte = 1_000_000L;
    public const long ComisionPago = 250L;

    public CuentaEmpresarial(string id, long saldoInicial, bool autorizada)
        : base(id, saldoInicial) => AutorizacionSecundaria = autorizada;

    public override R Accept<R>(IVisitanteOperacion<R> v) => v.VisitEmpresarial(this);

    public override string Etiqueta => "Empresarial";

    public bool AutorizacionSecundaria { get; }
}
