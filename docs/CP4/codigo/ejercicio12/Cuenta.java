import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Elemento visitado y unidad de consistencia del dominio: cada cuenta lleva su
 * propio cerrojo, de modo que cuentas distintas progresan en paralelo y las
 * operaciones sobre la misma cuenta se serializan.
 *
 * El cerrojo vive aqui y no en el visitante porque la que debe proteger sus
 * invariantes es la cuenta, no la operacion.
 */
public abstract class Cuenta implements ElementoContable, Iterable<Movimiento> {

    /**
     * Solo para la demostracion de la carrera: amplia a proposito la ventana entre
     * leer y escribir el saldo. En produccion no existiria.
     */
    static volatile boolean ventanaAmpliada = false;

    private final String id;
    private long saldoCentavos;
    private final ReentrantLock cerrojo = new ReentrantLock();
    private final List<Movimiento> historial = new CopyOnWriteArrayList<>();

    protected Cuenta(String id, long saldoInicial) {
        this.id = id;
        this.saldoCentavos = saldoInicial;
    }

    public String id() {
        return id;
    }

    public long saldo() {
        return saldoCentavos;
    }

    public ReentrantLock cerrojo() {
        return cerrojo;
    }

    /** Nombre del tipo de cuenta, para los informes. */
    public abstract String etiqueta();

    /** Lectura-modificacion-escritura: debe ejecutarse con el cerrojo tomado. */
    void aplicar(long delta) {
        long actual = saldoCentavos;
        if (ventanaAmpliada) {
            Thread.yield();
        }
        saldoCentavos = actual + delta;
    }

    void registrar(Movimiento m) {
        historial.add(m);
    }

    public List<Movimiento> historial() {
        return List.copyOf(historial);
    }

    /**
     * Inciso (c). Iterator sobre las transacciones de la cuenta: el cliente recorre
     * sin conocer la estructura interna. Al ser una lista copy-on-write, el iterador
     * trabaja sobre una instantanea: no lanza ConcurrentModificationException aunque
     * otro hilo siga registrando asientos, y no bloquea a quien escribe.
     */
    @Override
    public Iterator<Movimiento> iterator() {
        return historial.iterator();
    }

    Movimiento buscar(String idTransaccion) {
        for (Movimiento m : historial) {
            if (m.idTransaccion().equals(idTransaccion)) {
                return m;
            }
        }
        return null;
    }
}
