namespace Ejercicio12;

/// <summary>
/// Operacion polimorfica por tipo de cuenta. El parametro de tipo R permite que el
/// visitante devuelva su resultado en vez de acumularlo, que es lo que lo hace
/// utilizable en paralelo.
/// </summary>
public interface IVisitanteOperacion<R>
{
    R VisitAhorro(CuentaAhorro c);

    R VisitCorriente(CuentaCorriente c);

    R VisitInversion(CuentaInversion c);

    R VisitEmpresarial(CuentaEmpresarial c);

    /// <summary>
    /// Inciso (c). Al entrar el Composite como nuevo tipo de elemento hubo que tocar
    /// esta interfaz: es la medida exacta del coste que el inciso (d) cuantifica. Se
    /// hace con miembros de interfaz por defecto (C# 8) para no romper los visitantes
    /// ya escritos, igual que los metodos default de Java.
    ///
    /// Como se combinan los resultados de los hijos de un grupo. Debe ser asociativa
    /// para que el recorrido pueda paralelizarse.
    /// </summary>
    R Combinar(R acumulado, R siguiente) => siguiente;

    /// <summary>
    /// Resultado de un grupo vacio. default(R) es null en los tipos por referencia,
    /// que es el marcador de "sin resultado todavia"; los visitantes cuyo R es un tipo
    /// por valor lo redefinen con su neutro real.
    /// </summary>
    R Neutro() => default!;
}
