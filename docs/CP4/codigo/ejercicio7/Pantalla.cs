namespace Ejercicio7;

/// <summary>Componente 5 de 6.</summary>
public sealed class Pantalla : ComponenteBase
{
    public Pantalla()
        : base("pantalla")
    {
    }

    public void Bajar() => Registrar("bajada", "bajada");

    public void Subir() => Registrar("subida", "subida");

    /// <summary>Una pantalla motorizada no consume una vez colocada.</summary>
    protected override bool EstaEncendido(string estado) => false;
}
