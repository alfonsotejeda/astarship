using System;
using System.Collections.Immutable;

namespace Ejercicio12;

/// <summary>
/// Operacion 3 de 3: auditar. Visitante SIN ESTADO: no guarda nada entre visitas,
/// devuelve un informe inmutable. Por eso una sola instancia puede compartirse
/// entre hilos sin sincronizacion.
/// </summary>
public sealed class AuditarTransaccionVisitor : IVisitanteOperacion<InformeAuditoria>
{
    /// <summary>Ahorro: vigila el limite de retiros del mes.</summary>
    public InformeAuditoria VisitAhorro(CuentaAhorro c)
    {
        ImmutableList<string>.Builder hallazgos = ImmutableList.CreateBuilder<string>();
        if (c.RetirosDelMes > CuentaAhorro.LimiteRetirosMes)
        {
            hallazgos.Add("excede el limite de retiros del mes (" + c.RetirosDelMes + ")");
        }

        return new InformeAuditoria(c.Id, c.Etiqueta,
            hallazgos.Count == 0 ? "BAJO" : "MEDIO",
            c.Historial.Count, hallazgos.ToImmutable());
    }

    /// <summary>Corriente: vigila el sobregiro y su profundidad.</summary>
    public InformeAuditoria VisitCorriente(CuentaCorriente c)
    {
        ImmutableList<string>.Builder hallazgos = ImmutableList.CreateBuilder<string>();
        string riesgo = "BAJO";
        if (c.Saldo < 0)
        {
            hallazgos.Add("sobregiro activo por " + Dinero.F(-c.Saldo));
            riesgo = -c.Saldo * 2 > c.LineaSobregiro ? "ALTO" : "MEDIO";
        }

        return new InformeAuditoria(c.Id, c.Etiqueta, riesgo,
            c.Historial.Count, hallazgos.ToImmutable());
    }

    /// <summary>Inversion: mide el peso de las penalizaciones sobre el saldo.</summary>
    public InformeAuditoria VisitInversion(CuentaInversion c)
    {
        ImmutableList<string>.Builder hallazgos = ImmutableList.CreateBuilder<string>();
        string riesgo = "BAJO";
        if (c.PenalizacionesAcumuladas > 0)
        {
            hallazgos.Add("penalizaciones acumuladas: " + Dinero.F(c.PenalizacionesAcumuladas));
            riesgo = c.PenalizacionesAcumuladas * 100 > c.Saldo ? "ALTO" : "MEDIO";
        }

        return new InformeAuditoria(c.Id, c.Etiqueta, riesgo,
            c.Historial.Count, hallazgos.ToImmutable());
    }

    /// <summary>Empresarial: lista las operaciones que superan el umbral de reporte.</summary>
    public InformeAuditoria VisitEmpresarial(CuentaEmpresarial c)
    {
        ImmutableList<string>.Builder hallazgos = ImmutableList.CreateBuilder<string>();
        int reportables = 0;
        foreach (Movimiento m in c.Historial)
        {
            if (Math.Abs(m.Delta) >= CuentaEmpresarial.UmbralReporte)
            {
                reportables++;
            }
        }

        if (reportables > 0)
        {
            hallazgos.Add(reportables
                + (reportables == 1 ? " operacion reportable" : " operaciones reportables"));
        }

        return new InformeAuditoria(c.Id, c.Etiqueta,
            reportables > 0 ? "ALTO" : "BAJO",
            c.Historial.Count, hallazgos.ToImmutable());
    }

    /// <summary>Inciso (c): asi se consolida la auditoria de un grupo de cuentas.</summary>
    public InformeAuditoria Combinar(InformeAuditoria acumulado, InformeAuditoria siguiente) =>
        InformeAuditoria.Consolidar(acumulado, siguiente);
}
