using System;

namespace Ejercicio7;

/// <summary>
/// Demostracion del inciso (b): seis componentes, tres actividades, y la comparacion
/// entre el cliente que conoce el subsistema y el que solo conoce la fachada.
/// </summary>
public static class Demo
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

        Titulo("1. El cliente SIN fachada: once llamadas y el orden es cosa suya");
        Console.WriteLine("  codigo del cliente: once lineas, seis componentes, un orden");
        Console.WriteLine("  que nadie ha escrito en ningun sitio.");
        luces.Atenuar(10);
        pantalla.Bajar();
        proyector.Encender();
        proyector.Entrada("dvd");
        proyector.Formato("16:9");
        amplificador.Encender();
        amplificador.Entrada("dvd");
        amplificador.ModoEnvolvente(true);
        amplificador.PonerVolumen(7);
        dvd.Encender();
        dvd.Reproducir("Blade Runner");
        cine.TerminarPelicula();

        Titulo("2. El mismo resultado CON fachada: una llamada");
        Console.WriteLine("  codigo del cliente: cine.VerPelicula(\"Blade Runner\");");
        cine.VerPelicula("Blade Runner");

        Titulo("3. Terminar: el orden inverso tambien es conocimiento del subsistema");
        Console.WriteLine("  codigo del cliente: cine.TerminarPelicula();");
        cine.TerminarPelicula();

        Titulo("4. Las otras dos actividades sobre el mismo subsistema");
        Console.WriteLine("  cine.EscucharMusica(\"Kind of Blue\");");
        cine.EscucharMusica("Kind of Blue");
        Console.WriteLine();
        Console.WriteLine("  cine.JugarVideojuego(\"Hollow Knight\");");
        cine.JugarVideojuego("Hollow Knight");

        Titulo("5. La fachada no cierra el subsistema");
        Console.WriteLine("  Un cliente con una necesidad que la fachada no cubre sigue");
        Console.WriteLine("  pudiendo hablar con el componente directamente:");
        amplificador.PonerVolumen(3);
        Console.WriteLine();
        Console.WriteLine("  Estado final de los seis componentes:");
        foreach (IComponente c in new IComponente[]
                 { amplificador, dvd, consola, proyector, pantalla, luces })
        {
            Console.WriteLine("    " + c.Nombre.PadRight(14) + c.Estado);
        }
    }

    private static void Titulo(string texto)
    {
        Console.WriteLine();
        Console.WriteLine(texto);
        Console.WriteLine(new string('-', Math.Min(texto.Length, 74)));
    }
}
