/**
 * Una transferencia toca DOS cuentas, asi que necesita los dos cerrojos y aparece
 * riesgo de interbloqueo. Se evita con un orden total de adquisicion: siempre por
 * identificador ascendente, nunca en el orden en que llegan los argumentos.
 */
public final class Transferencia {

    private Transferencia() {
    }

    public static ResultadoOperacion ejecutar(Cuenta origen, Cuenta destino,
                                              long centavos, String id) {
        Cuenta primera = origen.id().compareTo(destino.id()) <= 0 ? origen : destino;
        Cuenta segunda = primera == origen ? destino : origen;

        primera.cerrojo().lock();
        try {
            segunda.cerrojo().lock();
            try {
                ResultadoOperacion salida = origen.accept(new EjecutarTransaccionVisitor(
                        Transaccion.transferencia(id, centavos, destino.id())));
                if (!salida.aplicada()) {
                    return salida;
                }
                destino.accept(new EjecutarTransaccionVisitor(
                        Transaccion.deposito(id + ":in", centavos)));
                return salida;
            } finally {
                segunda.cerrojo().unlock();
            }
        } finally {
            primera.cerrojo().unlock();
        }
    }
}
