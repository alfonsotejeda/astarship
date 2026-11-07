using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace Ejercicio12;

/// <summary>
/// Lo que el Composite NO resuelve por si solo: el alcance de la atomicidad.
///
/// Si se visita un grupo con el decorador transaccional, cada cuenta es atomica por
/// separado, pero el grupo entero no lo es: un fallo a mitad deja cuentas aplicadas y
/// cuentas sin aplicar. Esta clase ofrece las dos salidas y deja ver su coste.
/// </summary>
public static class OperacionDeGrupo
{
    /// <summary>Hojas del arbol en orden total por identificador.</summary>
    public static List<Cuenta> Hojas(IElementoContable raiz)
    {
        List<Cuenta> acumulado = new();
        Recolectar(raiz, acumulado);
        return acumulado.OrderBy(c => c.Id, StringComparer.Ordinal).ToList();
    }

    private static void Recolectar(IElementoContable e, List<Cuenta> acumulado)
    {
        if (e is GrupoCuentas grupo)
        {
            foreach (IElementoContable hijo in grupo.Hijos)
            {
                Recolectar(hijo, acumulado);
            }
        }
        else
        {
            acumulado.Add((Cuenta)e);
        }
    }

    /// <summary>
    /// Atomicidad para el grupo completo: toma TODOS los cerrojos en orden total por
    /// identificador (lo que evita el interbloqueo), ejecuta y los libera en orden
    /// inverso. El precio es que mientras dura, nadie mas opera en esas cuentas.
    ///
    /// Se usa Monitor.Enter/Exit en vez de lock porque el numero de cerrojos no se
    /// conoce al escribir el codigo: lock solo anida uno por bloque.
    /// </summary>
    public static R Atomica<R>(GrupoCuentas grupo, IVisitanteOperacion<R> v)
    {
        List<Cuenta> cuentas = Hojas(grupo);
        int tomados = 0;
        try
        {
            foreach (Cuenta c in cuentas)
            {
                Monitor.Enter(c.Cerrojo);
                tomados++;
            }

            return grupo.Accept(v);
        }
        finally
        {
            for (int i = tomados - 1; i >= 0; i--)
            {
                Monitor.Exit(cuentas[i].Cerrojo);
            }
        }
    }

    /// <summary>
    /// Recorrido en paralelo con reduccion al final. Solo es correcto porque el
    /// visitante es puro y devuelve su resultado, y porque Combinar es asociativa.
    /// Con un visitante que acumulara en un campo, esto seria una carrera.
    ///
    /// AsOrdered conserva el orden de las hojas, que hace falta para los combinadores
    /// asociativos pero no conmutativos, como concatenar texto.
    /// </summary>
    public static R EnParalelo<R>(GrupoCuentas grupo, IVisitanteOperacion<R> v)
    {
        List<R> parciales = Hojas(grupo)
            .AsParallel()
            .AsOrdered()
            .Select(c => c.Accept(v))
            .ToList();

        R acumulado = v.Neutro();
        foreach (R parcial in parciales)
        {
            acumulado = acumulado is null ? parcial : v.Combinar(acumulado, parcial);
        }

        return acumulado;
    }
}
