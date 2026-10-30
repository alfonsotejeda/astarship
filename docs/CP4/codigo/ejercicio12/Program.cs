using System;

namespace Ejercicio12;

/// <summary>
/// Punto de entrada unico. Las tres demostraciones del ejercicio se eligen por
/// argumento:
///
///   dotnet run -- demo        inciso (b): 4 tipos x 3 operaciones y la restriccion
///   dotnet run -- composite   inciso (c): Composite e Iterator
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
            case "composite":
                DemoComposite.Run();
                return 0;
            default:
                Console.Error.WriteLine("Uso: dotnet run -- [demo|composite]");
                return 1;
        }
    }
}
