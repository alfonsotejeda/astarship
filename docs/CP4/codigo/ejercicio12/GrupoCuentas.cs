using System.Collections;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;

namespace Ejercicio12;

/// <summary>
/// Composite: un grupo de cuentas (una sucursal, una division) es tambien un
/// IElementoContable, asi que el cliente lo visita con la misma llamada que una cuenta
/// suelta. El grupo no sabe que operacion se le aplica; solo propaga y combina.
///
/// Es ademas enumerable sobre los movimientos de todas sus hojas, de modo que el
/// Iterator tambien es uniforme entre hoja y compuesto.
/// </summary>
public sealed class GrupoCuentas : IElementoContable, IEnumerable<Movimiento>
{
    private ImmutableList<IElementoContable> _hijos = ImmutableList<IElementoContable>.Empty;

    public GrupoCuentas(string nombre) => Nombre = nombre;

    public string Nombre { get; }

    public GrupoCuentas Agregar(IElementoContable hijo)
    {
        ImmutableInterlocked.Update(ref _hijos, (lista, nuevo) => lista.Add(nuevo), hijo);
        return this;
    }

    public ImmutableList<IElementoContable> Hijos => Volatile.Read(ref _hijos);

    /// <summary>
    /// Propaga la visita a los hijos y combina los resultados parciales con el
    /// combinador que publica el propio visitante. El grupo decide el RECORRIDO; el
    /// visitante decide la OPERACION y como se agregan los resultados.
    /// </summary>
    public R Accept<R>(IVisitanteOperacion<R> v)
    {
        R acumulado = v.Neutro();
        foreach (IElementoContable hijo in Hijos)
        {
            R parcial = hijo.Accept(v);
            acumulado = acumulado is null ? parcial : v.Combinar(acumulado, parcial);
        }

        return acumulado;
    }

    public IEnumerator<Movimiento> GetEnumerator() => new IteradorMovimientosGrupo(this);

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
