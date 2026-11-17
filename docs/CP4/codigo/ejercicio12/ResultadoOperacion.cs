using System.Globalization;

namespace Ejercicio12;

/// <summary>
/// Resultado inmutable de una operacion. Los visitantes DEVUELVEN su resultado en
/// lugar de acumularlo en un campo: por eso son seguros al ejecutarse en paralelo.
/// </summary>
public record ResultadoOperacion(
    bool Aplicada,
    string CuentaId,
    string Detalle,
    long SaldoFinal,
    long Cargos)
{
    public static ResultadoOperacion Ok(Cuenta c, string detalle, long cargos) =>
        new(true, c.Id, detalle, c.Saldo, cargos);

    public static ResultadoOperacion Rechazada(Cuenta c, string motivo) =>
        new(false, c.Id, motivo, c.Saldo, 0L);

    public override string ToString() => string.Format(
        CultureInfo.InvariantCulture,
        "{0,-11} {1,-9} saldo={2,11} cargos={3,6}  {4}",
        CuentaId,
        Aplicada ? "APLICADA" : "RECHAZADA",
        Dinero.F(SaldoFinal),
        Dinero.F(Cargos),
        Detalle);
}
