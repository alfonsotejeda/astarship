using System;
using System.Collections.Generic;

namespace Ejercicio7;

/// <summary>
/// Un paso leido del archivo, ya resuelto contra el catalogo. Guardar la accion
/// resuelta y no solo su nombre es lo que permite que un paso invalido se detecte
/// al cargar y no a mitad de la actividad.
/// </summary>
public sealed record PasoConfigurado(string Clave, string? Argumento, Action<string?> Accion)
{
    public void Ejecutar() => Accion(Argumento);
}

/// <summary>
/// Restriccion final: una actividad cuyos pasos vienen de un archivo.
///
/// Es la misma IActividad del inciso (c): para la fachada no hay diferencia entre
/// una actividad escrita en C# y una definida en YAML, y esa indiferencia es
/// exactamente lo que hace posible la restriccion. Si el inciso (c) no hubiera
/// convertido la actividad en un objeto, aqui no habria donde poner los pasos.
/// </summary>
public sealed class ActividadConfigurada : IActividad
{
    private readonly IReadOnlyList<PasoConfigurado> _pasos;
    private readonly IReadOnlyList<PasoConfigurado> _deshacer;

    public ActividadConfigurada(
        string nombre,
        IReadOnlyList<PasoConfigurado> pasos,
        IReadOnlyList<PasoConfigurado> deshacer)
    {
        Nombre = nombre;
        _pasos = pasos;
        _deshacer = deshacer;
    }

    public string Nombre { get; }

    public int CantidadDePasos => _pasos.Count;

    public void Ejecutar()
    {
        foreach (PasoConfigurado paso in _pasos)
        {
            paso.Ejecutar();
        }
    }

    public void Deshacer()
    {
        foreach (PasoConfigurado paso in _deshacer)
        {
            paso.Ejecutar();
        }
    }
}
