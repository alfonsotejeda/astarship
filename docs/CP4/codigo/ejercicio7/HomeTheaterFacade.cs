namespace Ejercicio7;

/// <summary>
/// La fachada. Su valor no es tecnico sino de vocabulario: traduce tres frases que
/// el usuario entiende ("ver una pelicula") a las secuencias de nueve o diez pasos
/// que el subsistema exige, en el orden correcto.
///
/// Tres propiedades del patron que conviene tener presentes al leer esta clase:
///
///   1. No encapsula. Los seis componentes siguen siendo publicos y usables por
///      separado; la fachada es un atajo, no una aduana.
///   2. No anade comportamiento. Cada paso ya existia; lo que aporta es el orden,
///      que es justamente el conocimiento que el cliente no deberia tener.
///   3. Conoce al subsistema, y el subsistema no la conoce a ella. La dependencia
///      va en una sola direccion, y por eso los componentes no se modifican.
/// </summary>
public sealed class HomeTheaterFacade
{
    private readonly Amplificador _amplificador;
    private readonly ReproductorDvd _dvd;
    private readonly ConsolaJuegos _consola;
    private readonly Proyector _proyector;
    private readonly Pantalla _pantalla;
    private readonly Luces _luces;

    public HomeTheaterFacade(
        Amplificador amplificador,
        ReproductorDvd dvd,
        ConsolaJuegos consola,
        Proyector proyector,
        Pantalla pantalla,
        Luces luces)
    {
        _amplificador = amplificador;
        _dvd = dvd;
        _consola = consola;
        _proyector = proyector;
        _pantalla = pantalla;
        _luces = luces;
    }

    /// <summary>Actividad 1 de 3. Diez pasos que el cliente no tiene que conocer.</summary>
    public void VerPelicula(string titulo)
    {
        _luces.Atenuar(10);
        _pantalla.Bajar();
        _proyector.Encender();
        _proyector.Entrada("dvd");
        _proyector.Formato("16:9");
        _amplificador.Encender();
        _amplificador.Entrada("dvd");
        _amplificador.ModoEnvolvente(true);
        _amplificador.PonerVolumen(7);
        _dvd.Encender();
        _dvd.Reproducir(titulo);
    }

    /// <summary>El apagado importa tanto como el encendido, y en orden inverso.</summary>
    public void TerminarPelicula()
    {
        _dvd.Detener();
        _dvd.Apagar();
        _amplificador.Apagar();
        _proyector.Apagar();
        _pantalla.Subir();
        _luces.Encender();
    }

    /// <summary>Actividad 2 de 3. Ni proyector ni pantalla: no toda actividad usa todo.</summary>
    public void EscucharMusica(string lista)
    {
        _luces.Atenuar(40);
        _amplificador.Encender();
        _amplificador.Entrada("dvd");
        _amplificador.ModoEnvolvente(false);
        _amplificador.PonerVolumen(5);
        _dvd.Encender();
        _dvd.Reproducir(lista);
    }

    /// <summary>Actividad 3 de 3. Mismo subsistema, otro orden y otros parametros.</summary>
    public void JugarVideojuego(string juego)
    {
        _luces.Atenuar(60);
        _pantalla.Bajar();
        _proyector.Encender();
        _proyector.Entrada("consola");
        _proyector.Formato("16:9");
        _amplificador.Encender();
        _amplificador.Entrada("consola");
        _amplificador.PonerVolumen(9);
        _consola.Encender();
        _consola.CargarJuego(juego);
    }
}
