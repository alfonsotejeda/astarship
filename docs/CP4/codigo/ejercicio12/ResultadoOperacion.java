/**
 * Resultado inmutable de una operacion. Los visitantes DEVUELVEN su resultado en
 * lugar de acumularlo en un campo: por eso son seguros al ejecutarse en paralelo.
 */
public record ResultadoOperacion(boolean aplicada, String cuenta, String detalle,
                                 long saldoFinal, long cargos) {

    public static ResultadoOperacion ok(Cuenta c, String detalle, long cargos) {
        return new ResultadoOperacion(true, c.id(), detalle, c.saldo(), cargos);
    }

    public static ResultadoOperacion rechazada(Cuenta c, String motivo) {
        return new ResultadoOperacion(false, c.id(), motivo, c.saldo(), 0L);
    }

    @Override
    public String toString() {
        return String.format("%-11s %-9s saldo=%11s cargos=%6s  %s",
                cuenta, aplicada ? "APLICADA" : "RECHAZADA",
                Dinero.f(saldoFinal), Dinero.f(cargos), detalle);
    }
}
