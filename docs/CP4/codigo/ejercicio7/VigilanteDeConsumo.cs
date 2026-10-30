using System;
using System.Collections.Generic;
using System.Globalization;

namespace Ejercicio7;

/// <summary>
/// Observador 2 de 2: cuenta cuantos componentes estan encendidos y avisa al pasar
/// del umbral.
///
/// Es el caso que justifica el patron: esta regla no pertenece a ningun componente
/// ni a la fachada, y sin Observer habria que meterla en una de las dos.
/// </summary>
public sealed class VigilanteDeConsumo : IObservadorComponente
{
    private readonly HashSet<string> _encendidos = new(StringComparer.Ordinal);
    private readonly int _umbral;

    public VigilanteDeConsumo(int umbral) => _umbral = umbral;

    public void AlCambiarEstado(EventoComponente evento)
    {
        if (!evento.HuboCambioDeEstado)
        {
            return;
        }

        if (evento.Encendido)
        {
            _encendidos.Add(evento.Componente);
        }
        else
        {
            _encendidos.Remove(evento.Componente);
        }

        if (_encendidos.Count > _umbral)
        {
            Console.WriteLine("    [vigilante]  "
                + _encendidos.Count.ToString(CultureInfo.InvariantCulture)
                + " componentes activos, por encima del umbral de "
                + _umbral.ToString(CultureInfo.InvariantCulture));
        }
    }

    public int Activos => _encendidos.Count;
}
