using System.Globalization;

namespace Ejercicio12;

/// <summary>Formato de importes. El dinero se guarda en centavos (long), nunca en double.</summary>
public static class Dinero
{
    public static string F(long centavos) =>
        (centavos / 100.0).ToString("N2", CultureInfo.InvariantCulture);
}
