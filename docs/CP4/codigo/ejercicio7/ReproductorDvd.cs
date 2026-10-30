namespace Ejercicio7;

/// <summary>Componente 2 de 6.</summary>
public sealed class ReproductorDvd : ComponenteBase
{
    public ReproductorDvd()
        : base("dvd")
    {
    }

    public void Encender() => Registrar("encendido", "encendido");

    public void Apagar() => Registrar("apagado", "apagado");

    public void Reproducir(string titulo) =>
        Registrar("reproduciendo \"" + titulo + "\"", "reproduciendo");

    public void Detener() => Registrar("detenido", "encendido");
}
