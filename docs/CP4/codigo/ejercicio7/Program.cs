using System;

namespace Ejercicio7;

/// <summary>
/// Punto de entrada unico. Las demostraciones del ejercicio se eligen por argumento:
///
///   dotnet run -- demo        inciso (b): 6 componentes y 3 actividades
///   dotnet run -- extension   inciso (c): Command y Strategy
///   dotnet run -- integracion inciso (d): Singleton y Observer
/// </summary>
public static class Program
{
    public static int Main(string[] args)
    {
        string cual = args.Length > 0 ? args[0] : "demo";
        switch (cual)
        {
            case "demo":
                Demo.Run();
                return 0;
            case "extension":
                DemoExtension.Run();
                return 0;
            case "integracion":
                DemoIntegracion.Run();
                return 0;
            default:
                Console.Error.WriteLine("Uso: dotnet run -- [demo|extension|integracion]");
                return 1;
        }
    }
}
