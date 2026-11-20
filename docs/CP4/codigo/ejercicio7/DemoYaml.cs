using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace Ejercicio7;

/// <summary>
/// Demostracion de la restriccion final: la fachada se configura desde un archivo.
/// </summary>
public static class DemoYaml
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
        CatalogoAcciones catalogo = new(
            amplificador, dvd, consola, proyector, pantalla, luces);

        string ruta = Path.Combine(AppContext.BaseDirectory, "actividades.yaml");

        Titulo("1. El archivo que define las secuencias");
        Console.WriteLine("  " + Path.GetFileName(ruta) + ", copiado junto al ejecutable");
        Console.WriteLine("  acciones invocables publicadas por el catalogo: "
            + CuantasAcciones(catalogo).ToString(CultureInfo.InvariantCulture));

        Titulo("2. Cargar y registrar lo que diga el archivo");
        IReadOnlyList<ActividadConfigurada> actividades =
            LectorActividadesYaml.CargarArchivo(ruta, catalogo);
        foreach (ActividadConfigurada a in actividades)
        {
            cine.Registrar(a);
            Console.WriteLine("  " + a.Nombre.PadRight(20)
                + a.CantidadDePasos.ToString(CultureInfo.InvariantCulture) + " pasos");
        }

        Console.WriteLine();
        Console.WriteLine("  la fachada no se recompilo ni se modifico para esto");

        Titulo("3. Ejecutar una actividad que nadie escribio en C#");
        Console.WriteLine("  cine.Ejecutar(\"noche-de-cine\");");
        cine.Ejecutar("noche-de-cine");

        Titulo("4. Y deshacerla, porque el archivo tambien dice como");
        cine.DeshacerUltima();

        Titulo("5. La otra actividad del archivo");
        Console.WriteLine("  cine.Ejecutar(\"tarde-de-consola\");");
        cine.Ejecutar("tarde-de-consola");
        cine.DeshacerUltima();

        Titulo("6. Un archivo con errores falla al CARGAR, no a mitad de la sala");
        string[] roto =
        {
            "actividades:",
            "  fiesta-rota:",
            "    pasos:",
            "      - luces.atenuar: 30",
            "      - amplificador.subir-mucho",
            "      - proyector.encender",
            "      - luces.atenuar: muchisimo",
        };
        Console.WriteLine("  el archivo pide \"amplificador.subir-mucho\", que no existe:");
        try
        {
            LectorActividadesYaml.Cargar(roto, catalogo);
        }
        catch (FormatException e)
        {
            foreach (string linea in e.Message.Split(Environment.NewLine))
            {
                Console.WriteLine("    " + linea);
            }
        }

        Console.WriteLine();
        Console.WriteLine("  Ninguno de los tres pasos validos llego a ejecutarse: la sala");
        Console.WriteLine("  no se quedo a oscuras con el proyector encendido.");
        Console.WriteLine("  El valor \"muchisimo\" si pasa la carga y falla al ejecutarse:");
        Console.WriteLine("  comprobar que existe la accion es barato, comprobar que el");
        Console.WriteLine("  argumento sirve exigiria tipar el catalogo.");
    }

    private static int CuantasAcciones(CatalogoAcciones catalogo)
    {
        int n = 0;
        foreach (string _ in catalogo.Claves)
        {
            n++;
        }

        return n;
    }

    private static void Titulo(string texto)
    {
        Console.WriteLine();
        Console.WriteLine(texto);
        Console.WriteLine(new string('-', Math.Min(texto.Length, 74)));
    }
}
