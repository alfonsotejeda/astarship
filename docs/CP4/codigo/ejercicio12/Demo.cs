using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;

namespace Ejercicio12;

/// <summary>
/// Demostracion del inciso (b): 4 tipos de cuenta, 3 operaciones, comportamiento
/// distinto en cada combinacion, y la restriccion de concurrencia comprobada.
/// </summary>
public static class Demo
{
    private const long Retiro = 30_000L;

    public static void Run()
    {
        CuentaAhorro ahorro = new("AHO-001", 100_000L);
        CuentaCorriente corriente = new("COR-001", 20_000L, 50_000L);
        CuentaInversion inversion = new("INV-001", 1_000_000L);
        CuentaEmpresarial empSinFirma = new("EMP-001", 20_000_000L, false);
        CuentaEmpresarial empConFirma = new("EMP-002", 20_000_000L, true);
        List<Cuenta> cuentas = new()
        {
            ahorro, corriente, inversion, empSinFirma, empConFirma
        };

        Titulo("1. Misma transaccion, cuatro comportamientos (EjecutarTransaccion)");
        Console.WriteLine("Retiro de " + Dinero.F(Retiro) + " sobre cada cuenta:");
        foreach (Cuenta c in cuentas)
        {
            IVisitanteOperacion<ResultadoOperacion> op = new VisitanteTransaccional<ResultadoOperacion>(
                new EjecutarTransaccionVisitor(Transaccion.Retiro("T1", Retiro)));
            Console.WriteLine("  " + c.Accept(op));
        }

        Titulo("2. Reglas propias de cada tipo");
        Console.WriteLine("Retiro de " + Dinero.F(6_000_000L) + " en empresarial:");
        foreach (CuentaEmpresarial c in new[] { empSinFirma, empConFirma })
        {
            Console.WriteLine("  " + c.Accept(new VisitanteTransaccional<ResultadoOperacion>(
                new EjecutarTransaccionVisitor(Transaccion.Retiro("T2", 6_000_000L)))));
        }

        Console.WriteLine("Tres retiros mas en ahorro (limite del mes: "
            + CuentaAhorro.LimiteRetirosMes + "):");
        for (int i = 0; i < 3; i++)
        {
            Console.WriteLine("  " + ahorro.Accept(new VisitanteTransaccional<ResultadoOperacion>(
                new EjecutarTransaccionVisitor(
                    Transaccion.Retiro("T3-" + i.ToString(CultureInfo.InvariantCulture), 10_000L)))));
        }

        Console.WriteLine("Pago de servicios de " + Dinero.F(1_500_000L) + " en empresarial:");
        Console.WriteLine("  " + empConFirma.Accept(new VisitanteTransaccional<ResultadoOperacion>(
            new EjecutarTransaccionVisitor(
                Transaccion.PagoServicios("T4", 1_500_000L, "energia")))));

        Titulo("3. RevertirTransaccion: tampoco se revierte igual en cada cuenta");
        foreach (Cuenta c in cuentas)
        {
            Console.WriteLine("  " + c.Accept(new VisitanteTransaccional<ResultadoOperacion>(
                new RevertirTransaccionVisitor("T1"))));
        }

        Titulo("4. AuditarTransaccion: visitante sin estado, informe inmutable");
        AuditarTransaccionVisitor auditor = new();
        foreach (Cuenta c in cuentas)
        {
            Console.WriteLine("  " + c.Accept(auditor));
        }

        Titulo("5. Operacion nueva sin tocar ninguna cuenta (Open/Closed)");
        CalcularInteresesVisitor intereses = new();
        foreach (Cuenta c in cuentas)
        {
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  {0,-11} {1,-11} interes anual = {2}",
                c.Id, c.Etiqueta, Dinero.F(c.Accept(intereses))));
        }

        Titulo("6. Transferencia: dos cerrojos en orden total por identificador");
        Console.WriteLine("  " + Transferencia.Ejecutar(corriente, ahorro, 5_000L, "T5"));
        Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
            "  origen {0} -> {1} | destino {2} -> {3}",
            corriente.Id, Dinero.F(corriente.Saldo), ahorro.Id, Dinero.F(ahorro.Saldo)));

        Titulo("7. Restriccion: concurrencia sobre la MISMA cuenta");
        const int hilos = 8;
        const int iteraciones = 250;
        const long esperado = (long)hilos * iteraciones * 1_000L;

        Cuenta conCerrojo = new CuentaAhorro("CONC-OK", 0L);
        long obtenido = Acumular(conCerrojo, true, hilos, iteraciones);
        Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
            "  con decorador transaccional: esperado {0}, obtenido {1}",
            Dinero.F(esperado), Dinero.F(obtenido)));
        Console.WriteLine("  atomico y consistente: " + (obtenido == esperado ? "true" : "false"));

        Cuenta sinCerrojo = new CuentaAhorro("CONC-NO", 0L);
        Cuenta.VentanaAmpliada = true;
        long perdido = Acumular(sinCerrojo, false, hilos, iteraciones);
        Cuenta.VentanaAmpliada = false;
        Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
            "  sin decorador:               esperado {0}, obtenido {1}",
            Dinero.F(esperado), Dinero.F(perdido)));
        Console.WriteLine("  actualizaciones perdidas:    " + Dinero.F(esperado - perdido));

        Titulo("8. Restriccion: paralelismo sobre cuentas DISTINTAS");
        List<Cuenta> lote = new()
        {
            new CuentaAhorro("PAR-AHO", 0L),
            new CuentaCorriente("PAR-COR", 0L, 0L),
            new CuentaInversion("PAR-INV", 0L),
            new CuentaEmpresarial("PAR-EMP", 0L, true)
        };
        long ms = AcumularEnLote(lote, 4, iteraciones);
        const long esperadoLote = 4L * iteraciones * 1_000L;
        foreach (Cuenta c in lote)
        {
            Console.WriteLine(string.Format(CultureInfo.InvariantCulture,
                "  {0,-11} saldo={1,11} correcto={2}",
                c.Id, Dinero.F(c.Saldo), c.Saldo == esperadoLote ? "true" : "false"));
        }

        Console.WriteLine("  16 hilos sobre 4 cuentas, sin contencion entre ellas: "
            + ms.ToString(CultureInfo.InvariantCulture) + " ms");
    }

    /// <summary>Depositos concurrentes sobre una sola cuenta.</summary>
    private static long Acumular(Cuenta c, bool conCerrojo, int hilos, int iter)
    {
        using ManualResetEventSlim arranque = new(false);
        Task[] tareas = new Task[hilos];
        for (int h = 0; h < hilos; h++)
        {
            int idHilo = h;
            tareas[h] = Task.Run(() =>
            {
                arranque.Wait();
                for (int i = 0; i < iter; i++)
                {
                    IVisitanteOperacion<ResultadoOperacion> op = new EjecutarTransaccionVisitor(
                        Transaccion.Deposito(
                            string.Format(CultureInfo.InvariantCulture, "d{0}-{1}", idHilo, i),
                            1_000L));
                    if (conCerrojo)
                    {
                        op = new VisitanteTransaccional<ResultadoOperacion>(op);
                    }

                    c.Accept(op);
                }
            });
        }

        arranque.Set();
        Task.WaitAll(tareas);
        return c.Saldo;
    }

    /// <summary>Depositos concurrentes sobre varias cuentas a la vez. Devuelve los ms.</summary>
    private static long AcumularEnLote(List<Cuenta> cuentas, int hilosPorCuenta, int iter)
    {
        using ManualResetEventSlim arranque = new(false);
        List<Task> tareas = new();
        foreach (Cuenta c in cuentas)
        {
            for (int h = 0; h < hilosPorCuenta; h++)
            {
                int idHilo = h;
                Cuenta cuenta = c;
                tareas.Add(Task.Run(() =>
                {
                    arranque.Wait();
                    for (int i = 0; i < iter; i++)
                    {
                        cuenta.Accept(new VisitanteTransaccional<ResultadoOperacion>(
                            new EjecutarTransaccionVisitor(Transaccion.Deposito(
                                string.Format(CultureInfo.InvariantCulture, "{0}-{1}-{2}",
                                    cuenta.Id, idHilo, i),
                                1_000L))));
                    }
                }));
            }
        }

        Stopwatch reloj = Stopwatch.StartNew();
        arranque.Set();
        Task.WaitAll(tareas.ToArray());
        reloj.Stop();
        return reloj.ElapsedMilliseconds;
    }

    private static void Titulo(string texto)
    {
        Console.WriteLine();
        Console.WriteLine(texto);
        Console.WriteLine(new string('-', Math.Min(texto.Length, 74)));
    }
}
