import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Demostracion del inciso (b): 4 tipos de cuenta, 3 operaciones, comportamiento
 * distinto en cada combinacion, y la restriccion de concurrencia comprobada.
 *
 * Compilar y ejecutar:
 *   javac -d /tmp/ej12 *.java && java -cp /tmp/ej12 Demo
 */
public final class Demo {

    private static final long RETIRO = 30_000L;

    public static void main(String[] args) throws InterruptedException {
        CuentaAhorro ahorro = new CuentaAhorro("AHO-001", 100_000L);
        CuentaCorriente corriente = new CuentaCorriente("COR-001", 20_000L, 50_000L);
        CuentaInversion inversion = new CuentaInversion("INV-001", 1_000_000L);
        CuentaEmpresarial empSinFirma =
                new CuentaEmpresarial("EMP-001", 20_000_000L, false);
        CuentaEmpresarial empConFirma =
                new CuentaEmpresarial("EMP-002", 20_000_000L, true);
        List<Cuenta> cuentas =
                List.of(ahorro, corriente, inversion, empSinFirma, empConFirma);

        titulo("1. Misma transaccion, cuatro comportamientos (EjecutarTransaccion)");
        System.out.println("Retiro de " + Dinero.f(RETIRO) + " sobre cada cuenta:");
        for (Cuenta c : cuentas) {
            VisitanteOperacion<ResultadoOperacion> op = new VisitanteTransaccional<>(
                    new EjecutarTransaccionVisitor(Transaccion.retiro("T1", RETIRO)));
            System.out.println("  " + c.accept(op));
        }

        titulo("2. Reglas propias de cada tipo");
        System.out.println("Retiro de " + Dinero.f(6_000_000L) + " en empresarial:");
        for (CuentaEmpresarial c : List.of(empSinFirma, empConFirma)) {
            System.out.println("  " + c.accept(new VisitanteTransaccional<>(
                    new EjecutarTransaccionVisitor(
                            Transaccion.retiro("T2", 6_000_000L)))));
        }
        System.out.println("Tres retiros mas en ahorro (limite del mes: "
                + CuentaAhorro.LIMITE_RETIROS_MES + "):");
        for (int i = 0; i < 3; i++) {
            System.out.println("  " + ahorro.accept(new VisitanteTransaccional<>(
                    new EjecutarTransaccionVisitor(
                            Transaccion.retiro("T3-" + i, 10_000L)))));
        }
        System.out.println("Pago de servicios de " + Dinero.f(1_500_000L)
                + " en empresarial:");
        System.out.println("  " + empConFirma.accept(new VisitanteTransaccional<>(
                new EjecutarTransaccionVisitor(
                        Transaccion.pagoServicios("T4", 1_500_000L, "energia")))));

        titulo("3. RevertirTransaccion: tampoco se revierte igual en cada cuenta");
        for (Cuenta c : cuentas) {
            System.out.println("  " + c.accept(new VisitanteTransaccional<>(
                    new RevertirTransaccionVisitor("T1"))));
        }

        titulo("4. AuditarTransaccion: visitante sin estado, informe inmutable");
        AuditarTransaccionVisitor auditor = new AuditarTransaccionVisitor();
        for (Cuenta c : cuentas) {
            System.out.println("  " + c.accept(auditor));
        }

        titulo("5. Operacion nueva sin tocar ninguna cuenta (Open/Closed)");
        CalcularInteresesVisitor intereses = new CalcularInteresesVisitor();
        for (Cuenta c : cuentas) {
            System.out.printf("  %-11s %-11s interes anual = %s%n",
                    c.id(), c.etiqueta(), Dinero.f(c.accept(intereses)));
        }

        titulo("6. Transferencia: dos cerrojos en orden total por identificador");
        System.out.println("  " + Transferencia.ejecutar(corriente, ahorro, 5_000L, "T5"));
        System.out.printf("  origen %s -> %s | destino %s -> %s%n",
                corriente.id(), Dinero.f(corriente.saldo()),
                ahorro.id(), Dinero.f(ahorro.saldo()));

        titulo("7. Restriccion: concurrencia sobre la MISMA cuenta");
        int hilos = 8;
        int iteraciones = 250;
        long esperado = (long) hilos * iteraciones * 1_000L;

        Cuenta conCerrojo = new CuentaAhorro("CONC-OK", 0L);
        long obtenido = acumular(conCerrojo, true, hilos, iteraciones);
        System.out.printf("  con decorador transaccional: esperado %s, obtenido %s%n",
                Dinero.f(esperado), Dinero.f(obtenido));
        System.out.println("  atomico y consistente: " + (obtenido == esperado));

        Cuenta sinCerrojo = new CuentaAhorro("CONC-NO", 0L);
        Cuenta.ventanaAmpliada = true;
        long perdido = acumular(sinCerrojo, false, hilos, iteraciones);
        Cuenta.ventanaAmpliada = false;
        System.out.printf("  sin decorador:               esperado %s, obtenido %s%n",
                Dinero.f(esperado), Dinero.f(perdido));
        System.out.println("  actualizaciones perdidas:    "
                + Dinero.f(esperado - perdido));

        titulo("8. Restriccion: paralelismo sobre cuentas DISTINTAS");
        List<Cuenta> lote = List.of(
                new CuentaAhorro("PAR-AHO", 0L),
                new CuentaCorriente("PAR-COR", 0L, 0L),
                new CuentaInversion("PAR-INV", 0L),
                new CuentaEmpresarial("PAR-EMP", 0L, true));
        long ms = acumularEnLote(lote, 4, iteraciones);
        long esperadoLote = 4L * iteraciones * 1_000L;
        for (Cuenta c : lote) {
            System.out.printf("  %-11s saldo=%11s correcto=%s%n", c.id(),
                    Dinero.f(c.saldo()), c.saldo() == esperadoLote);
        }
        System.out.println("  16 hilos sobre 4 cuentas, sin contencion entre ellas: "
                + ms + " ms");
    }

    /** Depositos concurrentes sobre una sola cuenta. */
    private static long acumular(Cuenta c, boolean conCerrojo, int hilos, int iter)
            throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch arranque = new CountDownLatch(1);
        for (int h = 0; h < hilos; h++) {
            final int idHilo = h;
            pool.execute(() -> {
                esperar(arranque);
                for (int i = 0; i < iter; i++) {
                    VisitanteOperacion<ResultadoOperacion> op =
                            new EjecutarTransaccionVisitor(
                                    Transaccion.deposito("d" + idHilo + "-" + i, 1_000L));
                    if (conCerrojo) {
                        op = new VisitanteTransaccional<>(op);
                    }
                    c.accept(op);
                }
            });
        }
        arranque.countDown();
        pool.shutdown();
        pool.awaitTermination(60, TimeUnit.SECONDS);
        return c.saldo();
    }

    /** Depositos concurrentes sobre varias cuentas a la vez. Devuelve los ms. */
    private static long acumularEnLote(List<Cuenta> cuentas, int hilosPorCuenta,
                                       int iter) throws InterruptedException {
        ExecutorService pool =
                Executors.newFixedThreadPool(cuentas.size() * hilosPorCuenta);
        CountDownLatch arranque = new CountDownLatch(1);
        for (Cuenta c : cuentas) {
            for (int h = 0; h < hilosPorCuenta; h++) {
                final int idHilo = h;
                pool.execute(() -> {
                    esperar(arranque);
                    for (int i = 0; i < iter; i++) {
                        c.accept(new VisitanteTransaccional<>(
                                new EjecutarTransaccionVisitor(Transaccion.deposito(
                                        c.id() + "-" + idHilo + "-" + i, 1_000L))));
                    }
                });
            }
        }
        long t0 = System.nanoTime();
        arranque.countDown();
        pool.shutdown();
        pool.awaitTermination(60, TimeUnit.SECONDS);
        return (System.nanoTime() - t0) / 1_000_000L;
    }

    private static void esperar(CountDownLatch arranque) {
        try {
            arranque.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void titulo(String texto) {
        System.out.println();
        System.out.println(texto);
        System.out.println("-".repeat(Math.min(texto.length(), 74)));
    }
}
