using System;

namespace Ejercicio7;

/// <summary>
/// Demostracion del inciso (c): anadir una actividad sin modificar la fachada, con
/// Command, y variar como se hace una actividad existente, con Strategy.
/// </summary>
public static class DemoExtension
{
    public static void Run()
    {
        Amplificador amplificador = new();
        ReproductorDvd dvd = new();
        ConsolaJuegos consola = new();
        Proyector proyector = new();
        Pantalla pantalla = new();
        Luces luces = new();

        HomeTheaterFacade cine = new(amplificador, dvd, consola, proyector, pantalla, luces);

        Titulo("1. Command: una actividad nueva, escrita sin tocar la fachada");
        Console.WriteLine("  cine.Registrar(new ActividadKaraoke(...));");
        cine.Registrar(new ActividadKaraoke(amplificador, dvd, proyector, pantalla, luces));
        Console.WriteLine("  actividades registradas: " + string.Join(", ", cine.Actividades));
        Console.WriteLine();
        Console.WriteLine("  cine.Ejecutar(\"karaoke\");");
        cine.Ejecutar("karaoke");

        Titulo("2. Deshacer: lo que Command aporta sobre una simple lambda");
        Console.WriteLine("  cine.DeshacerUltima();");
        cine.DeshacerUltima();

        Titulo("3. Un nombre que no existe falla fuerte, no en silencio");
        try
        {
            cine.Ejecutar("ver-la-tele");
        }
        catch (System.Collections.Generic.KeyNotFoundException e)
        {
            Console.WriteLine("  " + e.Message);
        }

        Titulo("4. Strategy: la MISMA actividad, otros parametros");
        Console.WriteLine("  perfil estandar (el del inciso b):");
        cine.VerPelicula("Blade Runner");
        cine.TerminarPelicula();
        Console.WriteLine();
        Console.WriteLine("  cine.Perfil = new PerfilNocturno();");
        cine.Perfil = new PerfilNocturno();
        cine.VerPelicula("Blade Runner");
        cine.TerminarPelicula();

        Titulo("5. Las dos preguntas no son la misma");
        Console.WriteLine("  Command cambio QUE sabe hacer la sala: karaoke no existia.");
        Console.WriteLine("  Strategy cambio COMO hace algo que ya sabia: la pelicula");
        Console.WriteLine("  sigue teniendo los mismos once pasos, con otros valores.");
    }

    private static void Titulo(string texto)
    {
        Console.WriteLine();
        Console.WriteLine(texto);
        Console.WriteLine(new string('-', Math.Min(texto.Length, 74)));
    }
}
