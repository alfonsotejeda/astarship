namespace Ejercicio7;

/// <summary>
/// Inciso (d). Observer: el componente avisa sin saber a quien.
///
/// En C# lo idiomatico seria un event con EventHandler, o IObservable con
/// IObserver. Se escribe la interfaz a mano por lo mismo que el ejercicio 12
/// escribe su iterador a mano: para que el patron se vea. La nota esta en el
/// documento.
/// </summary>
public interface IObservadorComponente
{
    void AlCambiarEstado(EventoComponente evento);
}
