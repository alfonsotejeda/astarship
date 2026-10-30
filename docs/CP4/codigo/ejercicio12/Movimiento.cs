namespace Ejercicio12;

/// <summary>Asiento del historial de una cuenta. Lo recorre el Iterator del inciso (c).</summary>
public record Movimiento(
    string IdTransaccion,
    TipoTransaccion Tipo,
    long Delta,
    long Cargos,
    string Concepto);
