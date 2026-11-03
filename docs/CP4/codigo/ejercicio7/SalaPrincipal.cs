using System;
using System.Threading;

namespace Ejercicio7;

/// <summary>
/// Inciso (d), Singleton: una sola sala en toda la aplicacion y un punto de acceso
/// global a ella.
///
/// Una decision que conviene declarar: el Singleton NO es la fachada, es este
/// titular. Hacer que HomeTheaterFacade tuviera constructor privado y propiedad
/// estatica daria la misma garantia y costaria mucho: la fachada dejaria de poderse
/// construir en una prueba, no habria forma de montar dos salas, y el inciso (a)
/// quedaria contradicho, porque ahi se rechazo el metodo estatico justamente por no
/// ser instanciable ni sustituible.
///
/// Con este arreglo, la aplicacion tiene una sola sala y la clase sigue siendo un
/// objeto normal. En un sistema real, el titular lo seria el contenedor de
/// inyeccion de dependencias, con services.AddSingleton&lt;HomeTheaterFacade&gt;().
/// </summary>
public static class SalaPrincipal
{
    private static int _construcciones;

    /// <summary>
    /// Lazy&lt;T&gt; con ExecutionAndPublication: la fabrica se ejecuta una sola vez
    /// aunque varios hilos pidan la instancia a la vez. La version ingenua con
    /// "if (instancia == null)" no da esa garantia.
    /// </summary>
    private static readonly Lazy<HomeTheaterFacade> Titular =
        new(Construir, LazyThreadSafetyMode.ExecutionAndPublication);

    public static HomeTheaterFacade Instancia => Titular.Value;

    /// <summary>Cuantas veces corrio la fabrica. Para la prueba del inciso (d).</summary>
    public static int Construcciones => Volatile.Read(ref _construcciones);

    private static HomeTheaterFacade Construir()
    {
        Interlocked.Increment(ref _construcciones);
        return new HomeTheaterFacade(
            new Amplificador(),
            new ReproductorDvd(),
            new ConsolaJuegos(),
            new Proyector(),
            new Pantalla(),
            new Luces());
    }
}
