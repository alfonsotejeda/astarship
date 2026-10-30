using System.Collections.Generic;
using System.Collections.Immutable;

namespace Ejercicio7;

/// <summary>
/// Observador 1 de 2: guarda la traza. Es el que demuestra que la fachada no tiene
/// que enterarse de nada para que alguien lleve el registro.
/// </summary>
public sealed class RegistroDeEventos : IObservadorComponente
{
    private readonly List<EventoComponente> _eventos = new();

    public void AlCambiarEstado(EventoComponente evento) => _eventos.Add(evento);

    public ImmutableList<EventoComponente> Eventos => _eventos.ToImmutableList();

    public int CambiosDeEstado
    {
        get
        {
            int n = 0;
            foreach (EventoComponente e in _eventos)
            {
                if (e.HuboCambioDeEstado)
                {
                    n++;
                }
            }

            return n;
        }
    }
}
