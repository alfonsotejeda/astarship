using System.Globalization;

namespace Ejercicio7;

/// <summary>Componente 1 de 6. El unico que participa en las tres actividades.</summary>
public sealed class Amplificador : ComponenteBase
{
    public Amplificador()
        : base("amplificador")
    {
    }

    public int Volumen { get; private set; }

    public void Encender() => Registrar("encendido", "encendido");

    public void Apagar() => Registrar("apagado", "apagado");

    public void Entrada(string fuente) =>
        Registrar("entrada -> " + fuente, "entrada:" + fuente);

    public void PonerVolumen(int nivel)
    {
        Volumen = nivel;
        Registrar("volumen " + nivel.ToString(CultureInfo.InvariantCulture), Estado);
    }

    public void ModoEnvolvente(bool activo) =>
        Registrar(activo ? "modo envolvente" : "modo estereo", Estado);
}
