/** Asiento del historial de una cuenta. Lo recorre el Iterator del inciso (c). */
public record Movimiento(String idTransaccion, TipoTransaccion tipo, long delta,
                         long cargos, String concepto) {
}
