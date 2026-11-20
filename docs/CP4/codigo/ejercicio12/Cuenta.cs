using System.Collections;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;

namespace Ejercicio12;

/// <summary>
/// Elemento visitado y unidad de consistencia del dominio: cada cuenta lleva su
/// propio cerrojo, de modo que cuentas distintas progresan en paralelo y las
/// operaciones sobre la misma cuenta se serializan.
///
/// El cerrojo vive aqui y no en el visitante porque la que debe proteger sus
/// invariantes es la cuenta, no la operacion.
/// </summary>
public abstract class Cuenta : IElementoContable, IEnumerable<Movimiento>
{
    /// <summary>
    /// Solo para la demostracion de la carrera: amplia a proposito la ventana entre
    /// leer y escribir el saldo. En produccion no existiria.
    /// </summary>
    internal static volatile bool VentanaAmpliada;

    private long _saldoCentavos;
    private readonly object _cerrojo = new();

    /// <summary>
    /// Historial copy-on-write: se publica por reemplazo atomico de la referencia a
    /// una lista inmutable. Es el equivalente de CopyOnWriteArrayList y da la misma
    /// garantia: quien recorre trabaja sobre una instantanea y no estorba a quien
    /// escribe.
    /// </summary>
    private ImmutableList<Movimiento> _historial = ImmutableList<Movimiento>.Empty;

    protected Cuenta(string id, long saldoInicial)
    {
        Id = id;
        _saldoCentavos = saldoInicial;
    }

    public string Id { get; }

    public long Saldo => _saldoCentavos;

    public object Cerrojo => _cerrojo;

    /// <summary>Nombre del tipo de cuenta, para los informes.</summary>
    public abstract string Etiqueta { get; }

    public abstract R Accept<R>(IVisitanteOperacion<R> v);

    /// <summary>Lectura-modificacion-escritura: debe ejecutarse con el cerrojo tomado.</summary>
    internal void Aplicar(long delta)
    {
        long actual = _saldoCentavos;
        if (VentanaAmpliada)
        {
            Thread.Yield();
        }

        _saldoCentavos = actual + delta;
    }

    internal void Registrar(Movimiento m) =>
        ImmutableInterlocked.Update(ref _historial, (lista, asiento) => lista.Add(asiento), m);

    public ImmutableList<Movimiento> Historial => Volatile.Read(ref _historial);

    /// <summary>
    /// Inciso (c). Iterator sobre las transacciones de la cuenta: el cliente recorre
    /// sin conocer la estructura interna. Al ser una instantanea inmutable, el
    /// recorrido no lanza excepcion por modificacion concurrente aunque otro hilo siga
    /// registrando asientos, y no bloquea a quien escribe.
    /// </summary>
    public IEnumerator<Movimiento> GetEnumerator() =>
        ((IEnumerable<Movimiento>)Historial).GetEnumerator();

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

    internal Movimiento? Buscar(string idTransaccion)
    {
        foreach (Movimiento m in Historial)
        {
            if (m.IdTransaccion == idTransaccion)
            {
                return m;
            }
        }

        return null;
    }
}
