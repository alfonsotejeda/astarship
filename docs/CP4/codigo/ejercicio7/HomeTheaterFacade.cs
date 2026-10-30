using System;
using System.Collections.Generic;

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

    /// <summary>
    /// Inciso (c). El registro de actividades: la UNICA modificacion que hubo que
    /// hacerle a esta clase para que admita actividades nuevas. A partir de aqui, una
    /// actividad mas cuesta un archivo nuevo y cero modificaciones.
    /// </summary>
    private readonly Dictionary<string, IActividad> _actividades =
        new(StringComparer.OrdinalIgnoreCase);

    private IActividad? _ultima;

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

    /// <summary>
    /// Inciso (c), Strategy: el perfil decide los parametros de la pelicula, no su
    /// secuencia. Cambiar de perfil no anade ni quita pasos; cambia el como.
    /// </summary>
    public IPerfilSala Perfil { get; set; } = new PerfilEstandar();

    /// <summary>Actividad 1 de 3. Once pasos que el cliente no tiene que conocer.</summary>
    public void VerPelicula(string titulo)
    {
        _luces.Atenuar(Perfil.LucesPelicula);
        _pantalla.Bajar();
        _proyector.Encender();
        _proyector.Entrada("dvd");
        _proyector.Formato("16:9");
        _amplificador.Encender();
        _amplificador.Entrada("dvd");
        _amplificador.ModoEnvolvente(Perfil.EnvolventePelicula);
        _amplificador.PonerVolumen(Perfil.VolumenPelicula);
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

    /// <summary>
    /// Inciso (c). Registra una actividad escrita fuera de esta clase. El cliente que
    /// la escribe decide su nombre; la fachada solo la guarda.
    /// </summary>
    public void Registrar(IActividad actividad) => _actividades[actividad.Nombre] = actividad;

    /// <summary>Lo que la sala sabe hacer ahora mismo, sin recompilar la fachada.</summary>
    public IEnumerable<string> Actividades => _actividades.Keys;

    /// <summary>
    /// Ejecuta una actividad registrada. Falla fuerte y claro si no existe: un nombre
    /// mal escrito es un error del cliente, no una actividad que no hace nada.
    /// </summary>
    public void Ejecutar(string nombre)
    {
        if (!_actividades.TryGetValue(nombre, out IActividad? actividad))
        {
            throw new KeyNotFoundException(
                "No hay ninguna actividad registrada con el nombre \"" + nombre + "\"");
        }

        _ultima = actividad;
        actividad.Ejecutar();
    }

    /// <summary>Lo que Command aporta sobre una lambda: deshacer lo ultimo hecho.</summary>
    public void DeshacerUltima()
    {
        _ultima?.Deshacer();
        _ultima = null;
    }
}
