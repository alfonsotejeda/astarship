namespace Ejercicio7;

/// <summary>
/// Actividad nueva, escrita DESPUES de cerrar la fachada y sin tocarla.
///
/// Recibe los componentes que necesita, no la fachada: una actividad no necesita
/// saber que existe una fachada, y asi no se crea un ciclo entre las dos.
/// </summary>
public sealed class ActividadKaraoke : IActividad
{
    private readonly Amplificador _amplificador;
    private readonly ReproductorDvd _dvd;
    private readonly Proyector _proyector;
    private readonly Pantalla _pantalla;
    private readonly Luces _luces;

    public ActividadKaraoke(
        Amplificador amplificador,
        ReproductorDvd dvd,
        Proyector proyector,
        Pantalla pantalla,
        Luces luces)
    {
        _amplificador = amplificador;
        _dvd = dvd;
        _proyector = proyector;
        _pantalla = pantalla;
        _luces = luces;
    }

    public string Nombre => "karaoke";

    public void Ejecutar()
    {
        _luces.Atenuar(70);
        _pantalla.Bajar();
        _proyector.Encender();
        _proyector.Entrada("dvd");
        _amplificador.Encender();
        _amplificador.Entrada("dvd");
        _amplificador.ModoEnvolvente(false);
        _amplificador.PonerVolumen(8);
        _dvd.Encender();
        _dvd.Reproducir("Lista de karaoke");
    }

    public void Deshacer()
    {
        _dvd.Detener();
        _dvd.Apagar();
        _amplificador.Apagar();
        _proyector.Apagar();
        _pantalla.Subir();
        _luces.Encender();
    }
}
