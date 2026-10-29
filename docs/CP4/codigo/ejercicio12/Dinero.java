import java.util.Locale;

/** Formato de importes. El dinero se guarda en centavos (long), nunca en double. */
public final class Dinero {

    private Dinero() {
    }

    public static String f(long centavos) {
        return String.format(Locale.US, "%,.2f", centavos / 100.0);
    }
}
