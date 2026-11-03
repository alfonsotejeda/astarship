namespace Ejercicio7;

/// <summary>
/// Componente del subsistema. La fachada NO lo oculta ni lo encapsula: lo coordina.
/// Un cliente con una necesidad rara sigue pudiendo usarlo directamente, y eso es
/// una propiedad del patron, no un descuido.
/// </summary>
public interface IComponente
{
    string Nombre { get; }

    /// <summary>Estado legible, para la traza y para el Observer del inciso (d).</summary>
    string Estado { get; }
}
