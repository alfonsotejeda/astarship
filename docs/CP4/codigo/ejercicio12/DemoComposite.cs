using System;
using System.Collections.Generic;
using System.Globalization;

namespace Ejercicio12;

/// <summary>
/// Demostracion del inciso (c): Composite para grupos de cuentas e Iterator para
/// recorrer transacciones, y el efecto de ambos sobre las operaciones del inciso (b).
/// </summary>
public static class DemoComposite
{
    public static void Run()
    {
        CuentaAhorro aho = new("AHO-001", 500_000L);
        CuentaCorriente cor = new("COR-001", 20_000L, 50_000L);
        CuentaInversion inv = new("INV-001", 2_000_000L);
        CuentaEmpresarial emp1 = new("EMP-001", 10_000_000L, true);
        CuentaEmpresarial emp2 = new("EMP-002", 30_000_000L, true);

        GrupoCuentas empresas = new GrupoCuentas("Banca de empresa")
            .Agregar(emp1).Agregar(emp2);
        GrupoCuentas centro = new GrupoCuentas("Sucursal Centro")
            .Agregar(aho).Agregar(cor).Agregar(empresas);
        GrupoCuentas este = new GrupoCuentas("Sucursal Este").Agregar(inv);
        GrupoCuentas banco = new GrupoCuentas("Banco").Agregar(centro).Agregar(este);

        Aplicar(aho, Transaccion.Retiro("R1", 30_000L));
        Aplicar(cor, Transaccion.Retiro("R2", 40_000L));
        Aplicar(inv, Transaccion.Retiro("R3", 100_000L));
        Aplicar(emp1, Transaccion.PagoServicios("P1", 1_500_000L, "flota"));
        Aplicar(emp2, Transaccion.Retiro("R4", 6_000_000L));

        Titulo("1. La estructura: hojas y compuestos tras la misma interfaz");
        ImprimirArbol(banco, 2);

        Titulo("2. Uniformidad: el mismo visitante sobre una hoja y sobre el arbol");
        AuditarTransaccionVisitor auditor = new();
        Console.WriteLine("  hoja  -> " + aho.Accept(auditor));
        InformeAuditoria consolidado = banco.Accept(auditor);
        Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
            "  grupo -> {0} riesgo={1} asientos={2}",
            consolidado.CuentaId, consolidado.NivelRiesgo, consolidado.MovimientosRevisados));
        foreach (string hallazgo in consolidado.Hallazgos)
        {
            Console.WriteLine("           " + hallazgo);
        }

        Titulo("3. Reduccion: un solo visitante, cualquier nivel del arbol");
        CalcularInteresesVisitor intereses = new();
        foreach (GrupoCuentas g in new[] { empresas, centro, este, banco })
        {
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  {0,-18} interes anual = {1}", g.Nombre, Dinero.F(g.Accept(intereses))));
        }

        long sumaHojas = 0L;
        foreach (Cuenta c in OperacionDeGrupo.Hojas(banco))
        {
            sumaHojas += c.Accept(intereses);
        }

        Console.WriteLine("  suma de las hojas por separado = " + Dinero.F(sumaHojas));

        Titulo("4. Iterator: transacciones de una cuenta y de todo el arbol");
        Console.WriteLine("  movimientos de " + emp1.Id + ":");
        foreach (Movimiento m in emp1)
        {
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "    {0,-10} {1,-15} {2,12}  {3}",
                m.IdTransaccion, m.Tipo, Dinero.F(m.Delta), m.Concepto));
        }

        int total = 0;
        long salidas = 0L;
        foreach (Movimiento m in banco)
        {
            total++;
            if (m.Delta < 0)
            {
                salidas += -m.Delta;
            }
        }

        Console.WriteLine("  recorrido aplanado del arbol: "
            + total.ToString(CultureInfo.InvariantCulture)
            + " asientos, salidas por " + Dinero.F(salidas));

        Titulo("5. Alcance de la atomicidad al operar sobre un grupo");
        List<Cuenta> hojas = OperacionDeGrupo.Hojas(banco);
        long[] antes = Saldos(hojas);
        banco.Accept(new VisitanteTransaccional<ResultadoOperacion>(
            new EjecutarTransaccionVisitor(Transaccion.Retiro("GRP-1", 400_000L))));
        Console.WriteLine("  retiro de 4,000.00 sobre el arbol, cuenta por cuenta:");
        ImprimirCambios(hojas, antes);

        long[] antes2 = Saldos(hojas);
        OperacionDeGrupo.Atomica(banco, new EjecutarTransaccionVisitor(
            Transaccion.PagoServicios("GRP-2", 1_000L, "mantenimiento")));
        Console.WriteLine("  comision de 10.00 con todos los cerrojos tomados:");
        ImprimirCambios(hojas, antes2);

        Titulo("6. Recorrido en paralelo del grupo con reduccion al final");
        Console.WriteLine("  secuencial = " + Dinero.F(banco.Accept(intereses)));
        Console.WriteLine("  en paralelo = "
            + Dinero.F(OperacionDeGrupo.EnParalelo(banco, intereses)));
    }

    private static void Aplicar(Cuenta c, Transaccion t) =>
        c.Accept(new VisitanteTransaccional<ResultadoOperacion>(
            new EjecutarTransaccionVisitor(t)));

    private static long[] Saldos(List<Cuenta> cuentas)
    {
        long[] valores = new long[cuentas.Count];
        for (int i = 0; i < cuentas.Count; i++)
        {
            valores[i] = cuentas[i].Saldo;
        }

        return valores;
    }

    private static void ImprimirCambios(List<Cuenta> cuentas, long[] antes)
    {
        for (int i = 0; i < cuentas.Count; i++)
        {
            Cuenta c = cuentas[i];
            bool cambio = c.Saldo != antes[i];
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "    {0,-11} {1,12} -> {2,12}  {3}",
                c.Id, Dinero.F(antes[i]), Dinero.F(c.Saldo),
                cambio ? "aplicada" : "RECHAZADA"));
        }
    }

    private static void ImprimirArbol(IElementoContable e, int sangria)
    {
        string margen = new(' ', sangria);
        if (e is GrupoCuentas g)
        {
            Console.WriteLine(margen + "+ " + g.Nombre);
            foreach (IElementoContable hijo in g.Hijos)
            {
                ImprimirArbol(hijo, sangria + 2);
            }
        }
        else
        {
            Cuenta c = (Cuenta)e;
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "{0}- {1,-11} {2,-11} saldo={3,12}",
                margen, c.Id, c.Etiqueta, Dinero.F(c.Saldo)));
        }
    }

    private static void Titulo(string texto)
    {
        Console.WriteLine();
        Console.WriteLine(texto);
        Console.WriteLine(new string('-', Math.Min(texto.Length, 74)));
    }
}
