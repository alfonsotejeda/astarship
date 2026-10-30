using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;

namespace Ejercicio7;

/// <summary>
/// Demostracion del inciso (d): Singleton para la sala y Observer para enterarse de
/// los cambios de estado de los componentes.
/// </summary>
public static class DemoIntegracion
{
    public static void Run()
    {
        Titulo("1. Observer: dos interesados, y los componentes no los conocen");

        Amplificador amplificador = new();
        ReproductorDvd dvd = new();
        ConsolaJuegos consola = new();
        Proyector proyector = new();
        Pantalla pantalla = new();
        Luces luces = new();

        RegistroDeEventos registro = new();
        VigilanteDeConsumo vigilante = new(3);

        List<ComponenteBase> componentes = new()
        {
            amplificador, dvd, consola, proyector, pantalla, luces
        };
        foreach (ComponenteBase c in componentes)
        {
            c.Suscribir(registro);
            c.Suscribir(vigilante);
        }

        HomeTheaterFacade cine = new(amplificador, dvd, consola, proyector, pantalla, luces);

        Console.WriteLine("  cine.VerPelicula(\"Metropolis\");");
        cine.VerPelicula("Metropolis");

        Console.WriteLine();
        Console.WriteLine("  eventos recibidos por el registro: "
            + registro.Eventos.Count.ToString(CultureInfo.InvariantCulture));
        Console.WriteLine("  de los cuales cambiaron el estado: "
            + registro.CambiosDeEstado.ToString(CultureInfo.InvariantCulture));
        Console.WriteLine("  componentes activos segun el vigilante: "
            + vigilante.Activos.ToString(CultureInfo.InvariantCulture));

        Titulo("2. Al terminar, el vigilante ve bajar el consumo");
        cine.TerminarPelicula();
        Console.WriteLine();
        Console.WriteLine("  componentes activos: "
            + vigilante.Activos.ToString(CultureInfo.InvariantCulture));

        Titulo("3. Desuscribirse: el componente deja de contarle a quien se fue");
        registro.AlCambiarEstado(new EventoComponente("prueba", "marca", "a", "b", true));
        int antes = registro.Eventos.Count;
        foreach (ComponenteBase c in componentes)
        {
            c.Desuscribir(registro);
        }

        luces.Atenuar(25);
        Console.WriteLine("  eventos antes: " + antes.ToString(CultureInfo.InvariantCulture)
            + ", despues: "
            + registro.Eventos.Count.ToString(CultureInfo.InvariantCulture));

        Titulo("4. Singleton: la misma sala desde cualquier punto del programa");
        HomeTheaterFacade a = SalaPrincipal.Instancia;
        HomeTheaterFacade b = SalaPrincipal.Instancia;
        Console.WriteLine("  SalaPrincipal.Instancia dos veces -> misma referencia: "
            + (ReferenceEquals(a, b) ? "true" : "false"));

        Titulo("5. Y una sola, aunque la pidan ocho hilos a la vez");
        HomeTheaterFacade[] obtenidas = new HomeTheaterFacade[8];
        Parallel.For(0, 8, i => obtenidas[i] = SalaPrincipal.Instancia);
        bool todasIguales = true;
        foreach (HomeTheaterFacade f in obtenidas)
        {
            if (!ReferenceEquals(f, obtenidas[0]))
            {
                todasIguales = false;
            }
        }

        Console.WriteLine("  las ocho obtuvieron la misma: "
            + (todasIguales ? "true" : "false"));
        Console.WriteLine("  veces que corrio la fabrica: "
            + SalaPrincipal.Construcciones.ToString(CultureInfo.InvariantCulture));

        Titulo("6. Lo que el Singleton se lleva por delante");
        Console.WriteLine("  La sala principal trae sus propios seis componentes, a los");
        Console.WriteLine("  que nadie suscribio nada. Una prueba que quiera observarlos");
        Console.WriteLine("  no tiene por donde entrar, y ese es el precio del acceso");
        Console.WriteLine("  global: la dependencia deja de verse en los constructores.");
    }

    private static void Titulo(string texto)
    {
        Console.WriteLine();
        Console.WriteLine(texto);
        Console.WriteLine(new string('-', Math.Min(texto.Length, 74)));
    }
}
