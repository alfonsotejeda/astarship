import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Lo que el Composite NO resuelve por si solo: el alcance de la atomicidad.
 *
 * Si se visita un grupo con el decorador transaccional, cada cuenta es atomica por
 * separado, pero el grupo entero no lo es: un fallo a mitad deja cuentas aplicadas y
 * cuentas sin aplicar. Esta clase ofrece las dos salidas y deja ver su coste.
 */
public final class OperacionDeGrupo {

    private OperacionDeGrupo() {
    }

    /** Hojas del arbol en orden total por identificador. */
    public static List<Cuenta> hojas(ElementoContable raiz) {
        List<Cuenta> acumulado = new ArrayList<>();
        recolectar(raiz, acumulado);
        acumulado.sort(Comparator.comparing(Cuenta::id));
        return acumulado;
    }

    private static void recolectar(ElementoContable e, List<Cuenta> acumulado) {
        if (e instanceof GrupoCuentas grupo) {
            for (ElementoContable hijo : grupo.hijos()) {
                recolectar(hijo, acumulado);
            }
        } else {
            acumulado.add((Cuenta) e);
        }
    }

    /**
     * Atomicidad para el grupo completo: toma TODOS los cerrojos en orden total por
     * identificador (lo que evita el interbloqueo), ejecuta y los libera en orden
     * inverso. El precio es que mientras dura, nadie mas opera en esas cuentas.
     */
    public static <R> R atomica(GrupoCuentas grupo, VisitanteOperacion<R> v) {
        List<Cuenta> cuentas = hojas(grupo);
        int tomados = 0;
        try {
            for (Cuenta c : cuentas) {
                c.cerrojo().lock();
                tomados++;
            }
            return grupo.accept(v);
        } finally {
            for (int i = tomados - 1; i >= 0; i--) {
                cuentas.get(i).cerrojo().unlock();
            }
        }
    }

    /**
     * Recorrido en paralelo con reduccion al final. Solo es correcto porque el
     * visitante es puro y devuelve su resultado, y porque combinar es asociativa.
     * Con un visitante que acumulara en un campo, esto seria una carrera.
     */
    public static <R> R enParalelo(GrupoCuentas grupo, VisitanteOperacion<R> v) {
        List<R> parciales = hojas(grupo).parallelStream()
                .map(c -> c.accept(v))
                .toList();
        R acumulado = v.neutro();
        for (R parcial : parciales) {
            acumulado = acumulado == null ? parcial : v.combinar(acumulado, parcial);
        }
        return acumulado;
    }
}
