using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace Ejercicio7;

/// <summary>
/// Restriccion final: lee las secuencias de actividades de un archivo YAML.
///
/// Se escribe a mano un lector del subconjunto que el formato de este archivo usa,
/// en lugar de traer una biblioteca, por dos razones: el ejercicio no tiene
/// dependencias externas y asi el subconjunto soportado queda acotado y escrito.
/// En produccion la eleccion correcta seria YamlDotNet, y conviene decirlo.
///
/// Subconjunto soportado: mapas anidados por sangria de dos espacios, listas con
/// guion, escalares sin comillas y comentarios. No hay anclas, ni listas en linea,
/// ni cadenas multilinea, ni tipos: todo valor es una cadena.
/// </summary>
public static class LectorActividadesYaml
{
    public static IReadOnlyList<ActividadConfigurada> CargarArchivo(
        string ruta, CatalogoAcciones catalogo) =>
        Cargar(File.ReadAllLines(ruta), catalogo);

    public static IReadOnlyList<ActividadConfigurada> Cargar(
        IReadOnlyList<string> lineas, CatalogoAcciones catalogo)
    {
        List<ActividadConfigurada> actividades = new();
        List<string> errores = new();

        string? nombreActual = null;
        string? seccionActual = null;
        List<PasoConfigurado> pasos = new();
        List<PasoConfigurado> deshacer = new();
        bool dentroDeActividades = false;

        void CerrarActividad()
        {
            if (nombreActual is not null)
            {
                actividades.Add(new ActividadConfigurada(
                    nombreActual, pasos.ToArray(), deshacer.ToArray()));
                pasos = new List<PasoConfigurado>();
                deshacer = new List<PasoConfigurado>();
            }
        }

        for (int i = 0; i < lineas.Count; i++)
        {
            int numero = i + 1;
            string linea = SinComentario(lineas[i]);
            if (linea.Trim().Length == 0)
            {
                continue;
            }

            int sangria = linea.Length - linea.TrimStart(' ').Length;
            string contenido = linea.Trim();

            if (sangria % 2 != 0)
            {
                errores.Add(Error(numero, "la sangria debe ser multiplo de dos espacios"));
                continue;
            }

            switch (sangria)
            {
                case 0:
                    if (contenido != "actividades:")
                    {
                        errores.Add(Error(numero,
                            "se esperaba \"actividades:\" y hay \"" + contenido + "\""));
                        continue;
                    }

                    dentroDeActividades = true;
                    break;

                case 2:
                    if (!dentroDeActividades)
                    {
                        errores.Add(Error(numero, "actividad fuera de \"actividades:\""));
                        continue;
                    }

                    if (!contenido.EndsWith(":", StringComparison.Ordinal))
                    {
                        errores.Add(Error(numero,
                            "el nombre de una actividad termina en dos puntos"));
                        continue;
                    }

                    CerrarActividad();
                    nombreActual = contenido[..^1].Trim();
                    seccionActual = null;
                    break;

                case 4:
                    if (contenido is not ("pasos:" or "deshacer:"))
                    {
                        errores.Add(Error(numero,
                            "solo se admiten \"pasos:\" y \"deshacer:\", y hay \""
                            + contenido + "\""));
                        continue;
                    }

                    seccionActual = contenido[..^1];
                    break;

                case 6:
                    if (nombreActual is null || seccionActual is null)
                    {
                        errores.Add(Error(numero, "paso sin actividad o sin seccion"));
                        continue;
                    }

                    if (!contenido.StartsWith("- ", StringComparison.Ordinal))
                    {
                        errores.Add(Error(numero, "un paso empieza por \"- \""));
                        continue;
                    }

                    string? error = AgregarPaso(
                        contenido[2..].Trim(), catalogo, numero,
                        seccionActual == "pasos" ? pasos : deshacer);
                    if (error is not null)
                    {
                        errores.Add(error);
                    }

                    break;

                default:
                    errores.Add(Error(numero, "sangria inesperada de "
                        + sangria.ToString(CultureInfo.InvariantCulture) + " espacios"));
                    break;
            }
        }

        CerrarActividad();

        if (errores.Count > 0)
        {
            throw new FormatException(
                "El archivo de actividades tiene "
                + errores.Count.ToString(CultureInfo.InvariantCulture)
                + " problema(s):" + Environment.NewLine
                + string.Join(Environment.NewLine, errores));
        }

        return actividades;
    }

    /// <summary>
    /// Resuelve el paso contra el catalogo AHORA, al cargar. Esta es la decision que
    /// hace que un error de escritura se vea al arrancar y no con la sala a oscuras.
    /// </summary>
    private static string? AgregarPaso(
        string texto, CatalogoAcciones catalogo, int numero, List<PasoConfigurado> destino)
    {
        string clave = texto;
        string? argumento = null;

        int dosPuntos = texto.IndexOf(':', StringComparison.Ordinal);
        if (dosPuntos >= 0)
        {
            clave = texto[..dosPuntos].Trim();
            argumento = texto[(dosPuntos + 1)..].Trim();
            if (argumento.Length == 0)
            {
                argumento = null;
            }
        }

        if (!catalogo.Existe(clave))
        {
            return Error(numero, "no existe la accion \"" + clave + "\"");
        }

        destino.Add(new PasoConfigurado(clave, argumento, catalogo.Obtener(clave)));
        return null;
    }

    private static string SinComentario(string linea)
    {
        int almohadilla = linea.IndexOf('#', StringComparison.Ordinal);
        return almohadilla < 0 ? linea.TrimEnd() : linea[..almohadilla].TrimEnd();
    }

    private static string Error(int numero, string mensaje) =>
        "  linea " + numero.ToString(CultureInfo.InvariantCulture) + ": " + mensaje;
}
