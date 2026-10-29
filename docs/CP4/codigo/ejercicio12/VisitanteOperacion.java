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
}
