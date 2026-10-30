using System;
using System.Collections.Generic;

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
        string anterior = Estado;
        Estado = estadoNuevo;
        Console.WriteLine("    " + Nombre.PadRight(14) + accion);
        Notificar(new EventoComponente(
            Nombre, accion, anterior, estadoNuevo, EstaEncendido(estadoNuevo)));
    }

    /// <summary>
    /// Si el componente consume en ese estado. Va en el evento como un booleano y no
    /// se deduce del nombre del estado: adivinarlo comparando cadenas es lo que hace
    /// que una pantalla subida cuente como aparato encendido.
    /// </summary>
    protected virtual bool EstaEncendido(string estado) =>
        estado is not ("apagado" or "apagada" or "apagadas");

    /// <summary>
    /// Inciso (d), Observer. Esta es la UNICA modificacion que hubo que hacerle a un
    /// archivo existente para integrar el patron: lo demas son clases nuevas.
    ///
    /// La lista es propia de cada componente, no estatica: un registro global seria
    /// comodo y convertiria las pruebas en dependientes del orden.
    /// </summary>
    private readonly List<IObservadorComponente> _observadores = new();

    public void Suscribir(IObservadorComponente observador) => _observadores.Add(observador);

    public void Desuscribir(IObservadorComponente observador) => _observadores.Remove(observador);

    private void Notificar(EventoComponente evento)
    {
        // Se recorre una copia: un observador puede desuscribirse al recibir el aviso,
        // y modificar la lista mientras se recorre seria un error dificil de ver.
        foreach (IObservadorComponente o in _observadores.ToArray())
        {
            o.AlCambiarEstado(evento);
        }
    }
}
