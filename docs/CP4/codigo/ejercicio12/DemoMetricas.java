import java.util.List;

/**
 * Comprobacion del inciso (d): las cinco operaciones escritas hasta ahora corren
 * sobre la misma jerarquia de cuentas, que no ha cambiado desde el inciso (b).
 *
 * La quinta, ExportarCsvVisitor, se agrego en el commit anterior sin tocar ningun
 * elemento: ese commit es la medida del "numero de cambios por nueva operacion".
 *
 * Compilar y ejecutar:
 *   javac -d /tmp/ej12 *.java && java -cp /tmp/ej12 DemoMetricas
 */
public final class DemoMetricas {

    public static void main(String[] args) {
        CuentaAhorro aho = new CuentaAhorro("AHO-001", 500_000L);
        CuentaCorriente cor = new CuentaCorriente("COR-001", 20_000L, 50_000L);
        CuentaInversion inv = new CuentaInversion("INV-001", 2_000_000L);
        CuentaEmpresarial emp = new CuentaEmpresarial("EMP-001", 10_000_000L, true);

        GrupoCuentas banco = new GrupoCuentas("Banco")
                .agregar(aho).agregar(cor).agregar(inv).agregar(emp);

        for (Cuenta c : List.of(aho, cor, inv, emp)) {
            c.accept(new VisitanteTransaccional<>(new EjecutarTransaccionVisitor(
                    Transaccion.retiro("R-" + c.id(), 50_000L))));
        }

        System.out.println("Operacion 5 (agregada sin tocar las cuentas):");
        System.out.println(banco.accept(new ExportarCsvVisitor()));

        System.out.println();
        System.out.println("Las cinco operaciones sobre el mismo arbol:");
        System.out.println("  1 ejecutar   -> " + banco.accept(
                new VisitanteTransaccional<>(new EjecutarTransaccionVisitor(
                        Transaccion.deposito("D-1", 10_000L)))).cuenta());
        System.out.println("  2 revertir   -> " + banco.accept(
                new VisitanteTransaccional<>(
                        new RevertirTransaccionVisitor("D-1"))).aplicada());
        System.out.println("  3 auditar    -> riesgo "
                + banco.accept(new AuditarTransaccionVisitor()).nivelRiesgo());
        System.out.println("  4 intereses  -> "
                + Dinero.f(banco.accept(new CalcularInteresesVisitor())));
        System.out.println("  5 exportar   -> "
                + banco.accept(new ExportarCsvVisitor()).lines().count()
                + " lineas");
        System.out.println();
        System.out.println("Archivos de elemento modificados para lograrlo: 0");
    }
}
