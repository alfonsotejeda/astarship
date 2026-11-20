using System;
using System.Collections.Generic;
using System.Globalization;

namespace Ejercicio12;

/// <summary>
/// Comprobacion del inciso (d): las cinco operaciones escritas hasta ahora corren
/// sobre la misma jerarquia de cuentas, que no ha cambiado desde el inciso (b).
///
/// La quinta, ExportarCsvVisitor, se agrego en un commit propio sin tocar ningun
/// elemento: ese commit es la medida del "numero de cambios por nueva operacion".
/// </summary>
public static class DemoMetricas
{
    public static void Run()
    {
        CuentaAhorro aho = new("AHO-001", 500_000L);
        CuentaCorriente cor = new("COR-001", 20_000L, 50_000L);
        CuentaInversion inv = new("INV-001", 2_000_000L);
        CuentaEmpresarial emp = new("EMP-001", 10_000_000L, true);

        GrupoCuentas banco = new GrupoCuentas("Banco")
            .Agregar(aho).Agregar(cor).Agregar(inv).Agregar(emp);

        foreach (Cuenta c in new Cuenta[] { aho, cor, inv, emp })
        {
            c.Accept(new VisitanteTransaccional<ResultadoOperacion>(
                new EjecutarTransaccionVisitor(Transaccion.Retiro("R-" + c.Id, 50_000L))));
        }

        Console.WriteLine("Operacion 5 (agregada sin tocar las cuentas):");
        Console.WriteLine(banco.Accept(new ExportarCsvVisitor()));

        Console.WriteLine();
        Console.WriteLine("Las cinco operaciones sobre el mismo arbol:");
        Console.WriteLine("  1 ejecutar   -> " + banco.Accept(
            new VisitanteTransaccional<ResultadoOperacion>(
                new EjecutarTransaccionVisitor(Transaccion.Deposito("D-1", 10_000L)))).CuentaId);
        Console.WriteLine("  2 revertir   -> " + banco.Accept(
            new VisitanteTransaccional<ResultadoOperacion>(
                new RevertirTransaccionVisitor("D-1"))).Aplicada.ToString().ToLowerInvariant());
        Console.WriteLine("  3 auditar    -> riesgo "
            + banco.Accept(new AuditarTransaccionVisitor()).NivelRiesgo);
        Console.WriteLine("  4 intereses  -> "
            + Dinero.F(banco.Accept(new CalcularInteresesVisitor())));
        Console.WriteLine("  5 exportar   -> "
            + banco.Accept(new ExportarCsvVisitor())
                .Split(Environment.NewLine).Length.ToString(CultureInfo.InvariantCulture)
            + " lineas");
        Console.WriteLine();
        Console.WriteLine("Archivos de elemento modificados para lograrlo: 0");
    }
}
