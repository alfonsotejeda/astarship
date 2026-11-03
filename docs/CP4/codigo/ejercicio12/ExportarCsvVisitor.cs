using System;

namespace Ejercicio12;

/// <summary>
/// Experimento controlado del inciso (d): una quinta operacion.
///
/// Esta clase se agrega en un commit propio para que la metrica sea verificable con
/// git show --stat: un archivo nuevo, cero archivos modificados. La misma operacion
/// escrita como metodo de los elementos habria tocado cinco archivos: las cuatro
/// cuentas y su interfaz comun.
/// </summary>
public sealed class ExportarCsvVisitor : IVisitanteOperacion<string>
{
    public string VisitAhorro(CuentaAhorro c) => Linea(c, "retiros=" + c.RetirosDelMes);

    public string VisitCorriente(CuentaCorriente c) =>
        Linea(c, "sobregiro=" + Dinero.F(c.LineaSobregiro));

    public string VisitInversion(CuentaInversion c) =>
        Linea(c, "penalizaciones=" + Dinero.F(c.PenalizacionesAcumuladas));

    public string VisitEmpresarial(CuentaEmpresarial c) =>
        Linea(c, "doble-firma=" + (c.AutorizacionSecundaria ? "true" : "false"));

    /// <summary>Sobre un grupo, concatena las lineas de sus hojas.</summary>
    public string Combinar(string acumulado, string siguiente) =>
        acumulado + Environment.NewLine + siguiente;

    private static string Linea(Cuenta c, string propio) =>
        string.Join(";", c.Id, c.Etiqueta, Dinero.F(c.Saldo), propio);
}
