using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;

namespace Ejercicio12;

/// <summary>Salida inmutable de la auditoria. Permite combinar informes por reduccion.</summary>
public record InformeAuditoria(
    string CuentaId,
    string Tipo,
    string NivelRiesgo,
    int MovimientosRevisados,
    ImmutableList<string> Hallazgos)
{
    private static readonly ImmutableArray<string> Escala =
        ImmutableArray.Create("BAJO", "MEDIO", "ALTO");

    /// <summary>
    /// Inciso (c). Combinacion de informes para el Composite: suma los asientos
    /// revisados, concatena los hallazgos etiquetados con su cuenta y se queda con el
    /// peor riesgo. Es asociativa, que es lo que permite recorrer el grupo en paralelo.
    /// </summary>
    public static InformeAuditoria Consolidar(InformeAuditoria a, InformeAuditoria b) =>
        new(
            "GRUPO",
            "Consolidado",
            Peor(a.NivelRiesgo, b.NivelRiesgo),
            a.MovimientosRevisados + b.MovimientosRevisados,
            Etiquetar(a).AddRange(Etiquetar(b)));

    private static ImmutableList<string> Etiquetar(InformeAuditoria i)
    {
        if (i.CuentaId == "GRUPO")
        {
            return i.Hallazgos;
        }

        ImmutableList<string>.Builder salida = ImmutableList.CreateBuilder<string>();
        foreach (string h in i.Hallazgos)
        {
            salida.Add(i.CuentaId + ": " + h);
        }

        return salida.ToImmutable();
    }

    private static string Peor(string x, string y) =>
        Escala.IndexOf(x) >= Escala.IndexOf(y) ? x : y;

    public override string ToString() => string.Format(
        CultureInfo.InvariantCulture,
        "{0,-11} {1,-11} riesgo={2,-6} asientos={3,3}  {4}",
        CuentaId,
        Tipo,
        NivelRiesgo,
        MovimientosRevisados,
        Hallazgos.Count == 0 ? "sin hallazgos" : string.Join("; ", Hallazgos));
}
