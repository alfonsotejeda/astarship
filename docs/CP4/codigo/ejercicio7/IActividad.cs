namespace Ejercicio7;

/// <summary>
/// Inciso (c). Una actividad como objeto: es el patron Command.
///
/// Con esto, anadir una actividad deja de ser anadir un metodo a la fachada y pasa
/// a ser escribir una clase y registrarla. La fachada se modifica UNA vez, la que
/// la abre; a partir de ahi, cero.
///
/// Deshacer no es decorativo: es lo que Command aporta sobre una simple lambda, y
/// en este dominio tiene sentido literal, porque apagar el cine es deshacer la
/// actividad que se encendio.
/// </summary>
public interface IActividad
{
    string Nombre { get; }

    void Ejecutar();

    void Deshacer();
}
