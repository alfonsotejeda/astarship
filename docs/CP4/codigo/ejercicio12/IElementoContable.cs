namespace Ejercicio12;

/// <summary>
/// Elemento de la estructura visitada. Su interfaz NO crece cuando se agregan
/// operaciones: esa es la propiedad que justifica el patron.
/// </summary>
public interface IElementoContable
{
    R Accept<R>(IVisitanteOperacion<R> v);
}
