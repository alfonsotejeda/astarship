using System;

namespace Ejercicio12;

/// <summary>
/// Peticion de negocio, inmutable. Viaja en el ESTADO del visitante concreto y no
/// en la firma de Accept: asi la interfaz de los elementos no cambia nunca.
/// </summary>
public record Transaccion(string Id, TipoTransaccion Tipo, long MontoCentavos, string Referencia)
{
    /// <summary>
    /// C# no tiene el constructor compacto de los records de Java: la validacion de un
    /// parametro posicional se escribe como inicializador de su propiedad.
    /// </summary>
    public long MontoCentavos { get; } = MontoCentavos > 0
        ? MontoCentavos
        : throw new ArgumentOutOfRangeException(
            nameof(MontoCentavos), "El monto debe ser positivo");

    public static Transaccion Deposito(string id, long centavos) =>
        new(id, TipoTransaccion.Deposito, centavos, "-");

    public static Transaccion Retiro(string id, long centavos) =>
        new(id, TipoTransaccion.Retiro, centavos, "-");

    public static Transaccion Transferencia(string id, long centavos, string dest) =>
        new(id, TipoTransaccion.Transferencia, centavos, dest);

    public static Transaccion PagoServicios(string id, long centavos, string serv) =>
        new(id, TipoTransaccion.PagoServicios, centavos, serv);

    /// <summary>Signo del movimiento: los depositos entran, el resto sale.</summary>
    public long Delta => Tipo == TipoTransaccion.Deposito ? MontoCentavos : -MontoCentavos;
}
