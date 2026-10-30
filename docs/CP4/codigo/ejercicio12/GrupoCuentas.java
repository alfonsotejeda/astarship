import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Composite: un grupo de cuentas (una sucursal, una division) es tambien un
 * ElementoContable, asi que el cliente lo visita con la misma llamada que una cuenta
 * suelta. El grupo no sabe que operacion se le aplica; solo propaga y combina.
 *
 * Es ademas Iterable sobre los movimientos de todas sus hojas, de modo que el
 * Iterator tambien es uniforme entre hoja y compuesto.
 */
public final class GrupoCuentas implements ElementoContable, Iterable<Movimiento> {

    private final String nombre;
    private final List<ElementoContable> hijos = new CopyOnWriteArrayList<>();

    public GrupoCuentas(String nombre) {
        this.nombre = nombre;
    }

    public String nombre() {
        return nombre;
    }

    public GrupoCuentas agregar(ElementoContable hijo) {
        hijos.add(hijo);
        return this;
    }

    public List<ElementoContable> hijos() {
        return List.copyOf(hijos);
    }

    /**
     * Propaga la visita a los hijos y combina los resultados parciales con el
     * combinador que publica el propio visitante. El grupo decide el RECORRIDO; el
     * visitante decide la OPERACION y como se agregan los resultados.
     */
    @Override
    public <R> R accept(VisitanteOperacion<R> v) {
        R acumulado = v.neutro();
        for (ElementoContable hijo : hijos) {
            R parcial = hijo.accept(v);
            acumulado = acumulado == null ? parcial : v.combinar(acumulado, parcial);
        }
        return acumulado;
    }

    @Override
    public Iterator<Movimiento> iterator() {
        return new IteradorMovimientosGrupo(this);
    }
}
