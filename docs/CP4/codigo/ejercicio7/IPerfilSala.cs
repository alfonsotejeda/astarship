namespace Ejercicio7;

/// <summary>
/// Inciso (c). La otra mitad de la pregunta: Strategy.
///
/// Strategy NO sirve para anadir actividades, sirve para variar COMO se hace una
/// actividad que ya existe. El perfil decide los parametros de la pelicula; la
/// secuencia de pasos sigue siendo la misma.
///
/// Es util ver las dos juntas: Command varia QUE se hace, Strategy varia COMO.
/// </summary>
public interface IPerfilSala
{
    string Nombre { get; }

    int LucesPelicula { get; }

    int VolumenPelicula { get; }

    bool EnvolventePelicula { get; }
}

/// <summary>Perfil por omision: es el que reproduce la salida del inciso (b).</summary>
public sealed class PerfilEstandar : IPerfilSala
{
    public string Nombre => "estandar";

    public int LucesPelicula => 10;

    public int VolumenPelicula => 7;

    public bool EnvolventePelicula => true;
}

/// <summary>Perfil nocturno: la misma pelicula, sin despertar a nadie.</summary>
public sealed class PerfilNocturno : IPerfilSala
{
    public string Nombre => "nocturno";

    public int LucesPelicula => 5;

    public int VolumenPelicula => 3;

    public bool EnvolventePelicula => false;
}
