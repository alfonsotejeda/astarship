using System;
using System.Collections.Generic;
using System.Globalization;

namespace Ejercicio7;

/// <summary>
/// Restriccion final. La frontera entre el mundo tipado y el archivo de
/// configuracion, que es necesariamente de cadenas.
///
/// El catalogo se construye a mano y sin reflexion, a proposito: asi la lista de
/// acciones invocables desde el YAML es explicita y revisable, y nadie puede
/// alcanzar un metodo que no se quiso exponer escribiendo su nombre en un archivo.
/// </summary>
public sealed class CatalogoAcciones
{
    private readonly Dictionary<string, Action<string?>> _acciones =
        new(StringComparer.OrdinalIgnoreCase);

    public CatalogoAcciones(
        Amplificador amplificador,
        ReproductorDvd dvd,
        ConsolaJuegos consola,
        Proyector proyector,
        Pantalla pantalla,
        Luces luces)
    {
        _acciones["amplificador.encender"] = _ => amplificador.Encender();
        _acciones["amplificador.apagar"] = _ => amplificador.Apagar();
        _acciones["amplificador.entrada"] = v => amplificador.Entrada(Texto("amplificador.entrada", v));
        _acciones["amplificador.volumen"] = v => amplificador.PonerVolumen(Entero("amplificador.volumen", v));
        _acciones["amplificador.envolvente"] = v => amplificador.ModoEnvolvente(Booleano("amplificador.envolvente", v));

        _acciones["dvd.encender"] = _ => dvd.Encender();
        _acciones["dvd.apagar"] = _ => dvd.Apagar();
        _acciones["dvd.reproducir"] = v => dvd.Reproducir(Texto("dvd.reproducir", v));
        _acciones["dvd.detener"] = _ => dvd.Detener();

        _acciones["consola.encender"] = _ => consola.Encender();
        _acciones["consola.apagar"] = _ => consola.Apagar();
        _acciones["consola.juego"] = v => consola.CargarJuego(Texto("consola.juego", v));

        _acciones["proyector.encender"] = _ => proyector.Encender();
        _acciones["proyector.apagar"] = _ => proyector.Apagar();
        _acciones["proyector.entrada"] = v => proyector.Entrada(Texto("proyector.entrada", v));
        _acciones["proyector.formato"] = v => proyector.Formato(Texto("proyector.formato", v));

        _acciones["pantalla.bajar"] = _ => pantalla.Bajar();
        _acciones["pantalla.subir"] = _ => pantalla.Subir();

        _acciones["luces.atenuar"] = v => luces.Atenuar(Entero("luces.atenuar", v));
        _acciones["luces.encender"] = _ => luces.Encender();
    }

    public bool Existe(string clave) => _acciones.ContainsKey(clave);

    public Action<string?> Obtener(string clave) => _acciones[clave];

    /// <summary>Las acciones invocables, para poder listarlas en un mensaje de error.</summary>
    public IEnumerable<string> Claves => _acciones.Keys;

    private static string Texto(string clave, string? valor) =>
        valor ?? throw new FormatException("El paso " + clave + " necesita un valor");

    private static int Entero(string clave, string? valor)
    {
        string texto = Texto(clave, valor);
        if (!int.TryParse(texto, NumberStyles.Integer, CultureInfo.InvariantCulture, out int n))
        {
            throw new FormatException(
                "El paso " + clave + " esperaba un numero y recibio \"" + texto + "\"");
        }

        return n;
    }

    private static bool Booleano(string clave, string? valor)
    {
        string texto = Texto(clave, valor);
        return texto.ToLowerInvariant() switch
        {
            "si" or "true" or "1" => true,
            "no" or "false" or "0" => false,
            _ => throw new FormatException(
                "El paso " + clave + " esperaba si o no y recibio \"" + texto + "\""),
        };
    }
}
