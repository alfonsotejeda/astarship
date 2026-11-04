namespace Ejercicio7;

/// <summary>
/// Experimento controlado del inciso (c): la SEGUNDA actividad escrita despues de
/// abrir la fachada.
///
/// Esta clase se agrega en un commit propio para que la medida sea verificable con
/// git show --stat: un archivo nuevo, cero archivos modificados. La fachada se
/// modifico una sola vez, en el commit anterior, y ya no vuelve a modificarse por
/// mucho que crezca el catalogo de actividades.
/// </summary>
public sealed class ActividadModoFiesta : IActividad
{
    private readonly Amplificador _amplificador;
    private readonly ReproductorDvd _dvd;
    private readonly Luces _luces;

    public ActividadModoFiesta(Amplificador amplificador, ReproductorDvd dvd, Luces luces)
    {
        _amplificador = amplificador;
        _dvd = dvd;
        _luces = luces;
    }

    public string Nombre => "modo-fiesta";

    public void Ejecutar()
    {
        _luces.Atenuar(80);
        _amplificador.Encender();
        _amplificador.Entrada("dvd");
        _amplificador.ModoEnvolvente(true);
        _amplificador.PonerVolumen(10);
        _dvd.Encender();
        _dvd.Reproducir("Lista de fiesta");
    }

    public void Deshacer()
    {
        _dvd.Detener();
        _dvd.Apagar();
        _amplificador.Apagar();
        _luces.Encender();
    }
}
