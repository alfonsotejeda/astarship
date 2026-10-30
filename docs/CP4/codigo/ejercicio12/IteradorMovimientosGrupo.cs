using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;

namespace Ejercicio12;

/// <summary>
/// Iterator que aplana la jerarquia del Composite: recorre en profundidad los
/// movimientos de todas las cuentas del grupo, sin materializar una lista completa y
/// sin que el cliente sepa si debajo hay una cuenta o veinte subgrupos.
///
/// Esta escrito a mano, con pila explicita, porque asi se ve el patron Iterator del
/// catalogo. En C# lo normal seria un metodo con yield return, que el compilador
/// convierte en esta misma maquina de estados perezosa.
/// </summary>
public sealed class IteradorMovimientosGrupo : IEnumerator<Movimiento>
{
    private readonly Stack<IElementoContable> _pendientes = new();
    private IEnumerator<Movimiento> _actual = Enumerable.Empty<Movimiento>().GetEnumerator();

    public IteradorMovimientosGrupo(GrupoCuentas raiz) => _pendientes.Push(raiz);

    public Movimiento Current => _actual.Current;

    object IEnumerator.Current => Current;

    public bool MoveNext()
    {
        while (!_actual.MoveNext())
        {
            if (_pendientes.Count == 0)
            {
                return false;
            }

            IElementoContable elemento = _pendientes.Pop();
            if (elemento is GrupoCuentas grupo)
            {
                ImmutableList<IElementoContable> hijos = grupo.Hijos;
                for (int i = hijos.Count - 1; i >= 0; i--)
                {
                    _pendientes.Push(hijos[i]);
                }
            }
            else
            {
                _actual = ((Cuenta)elemento).GetEnumerator();
            }
        }

        return true;
    }

    public void Reset() => throw new NotSupportedException();

    public void Dispose() => _actual.Dispose();
}
