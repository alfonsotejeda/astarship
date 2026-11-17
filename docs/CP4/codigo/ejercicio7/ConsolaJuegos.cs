namespace Ejercicio7;

/// <summary>
/// Componente 3 de 6. El enunciado nombra cinco componentes y pide seis: este es el
/// que hace falta para que JugarVideojuego sea una actividad distinta y no una
/// pelicula con otro nombre.
/// </summary>
public sealed class ConsolaJuegos : ComponenteBase
{
    public ConsolaJuegos()
        : base("consola")
    {
    }

    public void Encender() => Registrar("encendida", "encendida");

    public void Apagar() => Registrar("apagada", "apagado");

    public void CargarJuego(string juego) =>
        Registrar("cargando \"" + juego + "\"", "jugando");
}
