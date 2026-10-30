using System;

namespace Ejercicio7;

/// <summary>
/// Lo comun a los seis componentes: nombre, estado y la traza de lo que hacen.
///
/// En el inciso (b) la traza se escribe directamente en la consola. El inciso (d)
/// sustituye esa linea por una notificacion a observadores, y ese cambio de una sola
/// clase es la medida de lo que cuesta integrar Observer.
/// </summary>
public abstract class ComponenteBase : IComponente
{
    protected ComponenteBase(string nombre) => Nombre = nombre;

    public string Nombre { get; }

    public string Estado { get; private set; } = "apagado";

    /// <summary>
    /// Registra una accion y deja el componente en el estado indicado. Es el unico
    /// punto por el que un componente cuenta lo que le pasa.
    /// </summary>
    protected void Registrar(string accion, string estadoNuevo)
    {
        Estado = estadoNuevo;
        Console.WriteLine("    " + Nombre.PadRight(14) + accion);
    }
}
