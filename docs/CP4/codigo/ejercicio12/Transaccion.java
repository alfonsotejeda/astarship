/**
 * Peticion de negocio, inmutable. Viaja en el ESTADO del visitante concreto y no
 * en la firma de accept: asi la interfaz de los elementos no cambia nunca.
 */
public record Transaccion(String id, TipoTransaccion tipo, long montoCentavos,
                          String referencia) {

    public Transaccion {
        if (montoCentavos <= 0) {
            throw new IllegalArgumentException("El monto debe ser positivo");
        }
    }

    public static Transaccion deposito(String id, long centavos) {
        return new Transaccion(id, TipoTransaccion.DEPOSITO, centavos, "-");
    }

    public static Transaccion retiro(String id, long centavos) {
        return new Transaccion(id, TipoTransaccion.RETIRO, centavos, "-");
    }

    public static Transaccion transferencia(String id, long centavos, String dest) {
        return new Transaccion(id, TipoTransaccion.TRANSFERENCIA, centavos, dest);
    }

    public static Transaccion pagoServicios(String id, long centavos, String serv) {
        return new Transaccion(id, TipoTransaccion.PAGO_SERVICIOS, centavos, serv);
    }

    /** Signo del movimiento: los depositos entran, el resto sale. */
    public long delta() {
        return tipo == TipoTransaccion.DEPOSITO ? montoCentavos : -montoCentavos;
    }
}
