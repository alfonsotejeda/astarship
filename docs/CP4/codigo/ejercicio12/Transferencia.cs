using System;

namespace Ejercicio12;

/// <summary>
/// Una transferencia toca DOS cuentas, asi que necesita los dos cerrojos y aparece
/// riesgo de interbloqueo. Se evita con un orden total de adquisicion: siempre por
/// identificador ascendente, nunca en el orden en que llegan los argumentos.
/// </summary>
public static class Transferencia
{
    public static ResultadoOperacion Ejecutar(
        Cuenta origen, Cuenta destino, long centavos, string id)
    {
        Cuenta primera = string.CompareOrdinal(origen.Id, destino.Id) <= 0 ? origen : destino;
        Cuenta segunda = ReferenceEquals(primera, origen) ? destino : origen;

        lock (primera.Cerrojo)
        {
            lock (segunda.Cerrojo)
            {
                ResultadoOperacion salida = origen.Accept(new EjecutarTransaccionVisitor(
                    Transaccion.Transferencia(id, centavos, destino.Id)));
                if (!salida.Aplicada)
                {
                    return salida;
                }

                destino.Accept(new EjecutarTransaccionVisitor(
                    Transaccion.Deposito(id + ":in", centavos)));
                return salida;
            }
        }
    }
}
