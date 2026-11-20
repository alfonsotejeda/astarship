using System.Globalization;

namespace Ejercicio7;

/// <summary>Componente 6 de 6.</summary>
public sealed class Luces : ComponenteBase
{
    public Luces()
        : base("luces")
    {
    }

    public int Intensidad { get; private set; } = 100;

    public void Atenuar(int porcentaje)
    {
        Intensidad = porcentaje;
        Registrar(
            "atenuadas al " + porcentaje.ToString(CultureInfo.InvariantCulture) + "%",
            porcentaje == 0 ? "apagadas" : "atenuadas");
    }

    public void Encender()
    {
        Intensidad = 100;
        Registrar("al 100%", "encendidas");
    }
}
