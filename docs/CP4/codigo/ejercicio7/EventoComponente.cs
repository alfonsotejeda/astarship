namespace Ejercicio7;

/// <summary>
/// Inciso (d). Lo que un componente cuenta cuando cambia de estado.
///
/// Es inmutable a proposito: un evento que el observador pudiera modificar
/// afectaria a los demas observadores, y el orden de notificacion dejaria de ser un
/// detalle para convertirse en parte del contrato.
/// </summary>
public record EventoComponente(
    string Componente,
    string Accion,
    string EstadoAnterior,
    string EstadoNuevo,
    bool Encendido)
{
    public bool HuboCambioDeEstado => EstadoAnterior != EstadoNuevo;
}
