namespace Ejercicio7;

/// <summary>Componente 4 de 6.</summary>
public sealed class Proyector : ComponenteBase
{
    public Proyector()
        : base("proyector")
    {
    }

    public void Encender() => Registrar("encendido", "encendido");

    public void Apagar() => Registrar("apagado", "apagado");

    public void Entrada(string fuente) =>
        Registrar("entrada -> " + fuente, "entrada:" + fuente);

    public void Formato(string formato) => Registrar("formato " + formato, Estado);
}
