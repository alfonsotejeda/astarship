import java.util.List;

/**
 * Demostracion del inciso (c): Composite para grupos de cuentas e Iterator para
 * recorrer transacciones, y el efecto de ambos sobre las operaciones del inciso (b).
 *
 * Compilar y ejecutar:
 *   javac -d /tmp/ej12 *.java && java -cp /tmp/ej12 DemoComposite
 */
public final class DemoComposite {

    public static void main(String[] args) {
        CuentaAhorro aho = new CuentaAhorro("AHO-001", 500_000L);
        CuentaCorriente cor = new CuentaCorriente("COR-001", 20_000L, 50_000L);
        CuentaInversion inv = new CuentaInversion("INV-001", 2_000_000L);
        CuentaEmpresarial emp1 = new CuentaEmpresarial("EMP-001", 10_000_000L, true);
        CuentaEmpresarial emp2 = new CuentaEmpresarial("EMP-002", 30_000_000L, true);

        GrupoCuentas empresas = new GrupoCuentas("Banca de empresa")
                .agregar(emp1).agregar(emp2);
        GrupoCuentas centro = new GrupoCuentas("Sucursal Centro")
                .agregar(aho).agregar(cor).agregar(empresas);
        GrupoCuentas este = new GrupoCuentas("Sucursal Este").agregar(inv);
        GrupoCuentas banco = new GrupoCuentas("Banco").agregar(centro).agregar(este);

        aplicar(aho, Transaccion.retiro("R1", 30_000L));
        aplicar(cor, Transaccion.retiro("R2", 40_000L));
        aplicar(inv, Transaccion.retiro("R3", 100_000L));
        aplicar(emp1, Transaccion.pagoServicios("P1", 1_500_000L, "flota"));
        aplicar(emp2, Transaccion.retiro("R4", 6_000_000L));

        titulo("1. La estructura: hojas y compuestos tras la misma interfaz");
        imprimirArbol(banco, 2);

        titulo("2. Uniformidad: el mismo visitante sobre una hoja y sobre el arbol");
        AuditarTransaccionVisitor auditor = new AuditarTransaccionVisitor();
        System.out.println("  hoja  -> " + aho.accept(auditor));
        InformeAuditoria consolidado = banco.accept(auditor);
        System.out.printf("  grupo -> %s riesgo=%s asientos=%d%n", consolidado.cuenta(),
                consolidado.nivelRiesgo(), consolidado.movimientosRevisados());
        for (String hallazgo : consolidado.hallazgos()) {
            System.out.println("           " + hallazgo);
        }

        titulo("3. Reduccion: un solo visitante, cualquier nivel del arbol");
        CalcularInteresesVisitor intereses = new CalcularInteresesVisitor();
        for (GrupoCuentas g : List.of(empresas, centro, este, banco)) {
            System.out.printf("  %-18s interes anual = %s%n", g.nombre(),
                    Dinero.f(g.accept(intereses)));
        }
        long sumaHojas = 0L;
        for (Cuenta c : OperacionDeGrupo.hojas(banco)) {
            sumaHojas += c.accept(intereses);
        }
        System.out.println("  suma de las hojas por separado = " + Dinero.f(sumaHojas));

        titulo("4. Iterator: transacciones de una cuenta y de todo el arbol");
        System.out.println("  movimientos de " + emp1.id() + ":");
        for (Movimiento m : emp1) {
            System.out.printf("    %-10s %-15s %12s  %s%n", m.idTransaccion(),
                    m.tipo(), Dinero.f(m.delta()), m.concepto());
        }
        int total = 0;
        long salidas = 0L;
        for (Movimiento m : banco) {
            total++;
            if (m.delta() < 0) {
                salidas += -m.delta();
            }
        }
        System.out.println("  recorrido aplanado del arbol: " + total
                + " asientos, salidas por " + Dinero.f(salidas));

        titulo("5. Alcance de la atomicidad al operar sobre un grupo");
        List<Cuenta> hojas = OperacionDeGrupo.hojas(banco);
        long[] antes = saldos(hojas);
        banco.accept(new VisitanteTransaccional<>(
                new EjecutarTransaccionVisitor(Transaccion.retiro("GRP-1", 400_000L))));
        System.out.println("  retiro de 4,000.00 sobre el arbol, cuenta por cuenta:");
        imprimirCambios(hojas, antes);

        long[] antes2 = saldos(hojas);
        OperacionDeGrupo.atomica(banco, new EjecutarTransaccionVisitor(
                Transaccion.pagoServicios("GRP-2", 1_000L, "mantenimiento")));
        System.out.println("  comision de 10.00 con todos los cerrojos tomados:");
        imprimirCambios(hojas, antes2);

        titulo("6. Recorrido en paralelo del grupo con reduccion al final");
        System.out.println("  secuencial = " + Dinero.f(banco.accept(intereses)));
        System.out.println("  en paralelo = "
                + Dinero.f(OperacionDeGrupo.enParalelo(banco, intereses)));
    }

    private static void aplicar(Cuenta c, Transaccion t) {
        c.accept(new VisitanteTransaccional<>(new EjecutarTransaccionVisitor(t)));
    }

    private static long[] saldos(List<Cuenta> cuentas) {
        long[] valores = new long[cuentas.size()];
        for (int i = 0; i < cuentas.size(); i++) {
            valores[i] = cuentas.get(i).saldo();
        }
        return valores;
    }

    private static void imprimirCambios(List<Cuenta> cuentas, long[] antes) {
        for (int i = 0; i < cuentas.size(); i++) {
            Cuenta c = cuentas.get(i);
            boolean cambio = c.saldo() != antes[i];
            System.out.printf("    %-11s %12s -> %12s  %s%n", c.id(),
                    Dinero.f(antes[i]), Dinero.f(c.saldo()),
                    cambio ? "aplicada" : "RECHAZADA");
        }
    }

    private static void imprimirArbol(ElementoContable e, int sangria) {
        String margen = " ".repeat(sangria);
        if (e instanceof GrupoCuentas g) {
            System.out.println(margen + "+ " + g.nombre());
            for (ElementoContable hijo : g.hijos()) {
                imprimirArbol(hijo, sangria + 2);
            }
        } else {
            Cuenta c = (Cuenta) e;
            System.out.printf("%s- %-11s %-11s saldo=%12s%n", margen, c.id(),
                    c.etiqueta(), Dinero.f(c.saldo()));
        }
    }

    private static void titulo(String texto) {
        System.out.println();
        System.out.println(texto);
        System.out.println("-".repeat(Math.min(texto.length(), 74)));
    }
}
