/**
 * Operacion polimorfica por tipo de cuenta. El parametro de tipo R permite que el
 * visitante devuelva su resultado en vez de acumularlo, que es lo que lo hace
 * utilizable en paralelo.
 */
public interface VisitanteOperacion<R> {

    R visitAhorro(CuentaAhorro c);

    R visitCorriente(CuentaCorriente c);

    R visitInversion(CuentaInversion c);

    R visitEmpresarial(CuentaEmpresarial c);

    /**
     * Inciso (c). Al entrar el Composite como nuevo tipo de elemento hubo que tocar
     * esta interfaz: es la medida exacta del coste que el inciso (d) cuantifica. Se
     * hace con metodos default para no romper los visitantes ya escritos.
     *
     * Como se combinan los resultados de los hijos de un grupo. Debe ser asociativa
     * para que el recorrido pueda paralelizarse.
     */
    default R combinar(R acumulado, R siguiente) {
        return siguiente;
    }

    /** Resultado de un grupo vacio. Null significa "sin resultado todavia". */
    default R neutro() {
        return null;
    }
}
