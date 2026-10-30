import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Iterator que aplana la jerarquia del Composite: recorre en profundidad los
 * movimientos de todas las cuentas del grupo, sin materializar una lista completa y
 * sin que el cliente sepa si debajo hay una cuenta o veinte subgrupos.
 */
public final class IteradorMovimientosGrupo implements Iterator<Movimiento> {

    private final Deque<ElementoContable> pendientes = new ArrayDeque<>();
    private Iterator<Movimiento> actual = Collections.emptyIterator();

    public IteradorMovimientosGrupo(GrupoCuentas raiz) {
        pendientes.push(raiz);
    }

    @Override
    public boolean hasNext() {
        while (!actual.hasNext() && !pendientes.isEmpty()) {
            ElementoContable elemento = pendientes.pop();
            if (elemento instanceof GrupoCuentas grupo) {
                List<ElementoContable> hijos = grupo.hijos();
                for (int i = hijos.size() - 1; i >= 0; i--) {
                    pendientes.push(hijos.get(i));
                }
            } else {
                actual = ((Cuenta) elemento).iterator();
            }
        }
        return actual.hasNext();
    }

    @Override
    public Movimiento next() {
        if (!hasNext()) {
            throw new NoSuchElementException();
        }
        return actual.next();
    }
}
