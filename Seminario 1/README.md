# Seminario de Arquitecturas de Software

**Un Análisis Comparativo de Estilos Basados en Capas y Dominio**
Asignatura: Ingeniería de Software

Estudio comparativo de cinco estilos arquitectónicos: N-Capas, Hexagonal (Puertos y Adaptadores), Limpia (Clean), Cebolla (Onion) y Domain-Driven Design (DDD).

## Equipo

**Nombre del equipo:** _HAVING FE_

| Nombre | Grupo | GitHub | Pregunta |
| ------ | ----- | ------ | -------- |

| Eric Reyes Milián | C312 | [@EricReyesMilian](https://github.com/EricReyesMilian) | Pregunta 1 |
| Adrián Estévez Álvarez | C312 | [@Chikiak](https://github.com/Chikiak) | Pregunta 2 |
| Alfonso Tejeda Rodríguez | C312 | [@alfonsotejeda](https://github.com/alfonsotejeda) | Pregunta 3 |
| Kamila Reinoso Asín | C311 | [@KamAlien](https://github.com/KamAlien) | Pregunta 4 |
| Miguel Andrés Cazorla Zamora | C312 | [@andr-migue](https://github.com/andr-migue) | Pregunta 5|

## Estructura del repositorio

```
.
├── main.tex            # Documento principal (portada, índice, inclusión de secciones)
├── secciones/
│   ├── p1.tex          # Pregunta 1: N-Capas vs. Clean/Hexagonal
│   ├── p2.tex          # Pregunta 2: Simetría del hexágono vs. jerarquía de capas
│   ├── p3.tex          # Pregunta 3: DDD y Bounded Contexts
│   ├── p4.tex          # Pregunta 4: Inversión de dependencias
│   ├── p5.tex          # Pregunta 5: Kitty Problem y OCP
│   └── p6.tex          # Pregunta 6: N-Capas y atributos de calidad
├── figures/            # Diagramas e imágenes
├── references.bib      # Bibliografía
└── README.md
```

## Compilación

Requisitos: una distribución de LaTeX (TeX Live o MiKTeX), `latexmk` y `biber`.

```bash
latexmk -pdf main.tex
```

Para limpiar archivos auxiliares:

```bash
latexmk -c
```

## Flujo de trabajo

1. Cada integrante trabaja **solo en el archivo de su pregunta** (`secciones/pN.tex`) para evitar conflictos.
2. Crear una rama por tarea: `pregunta-N` o `edicion-final`.
3. Hacer commits pequeños y descriptivos, por ejemplo: `P3: agrega división en bounded contexts`.
4. Abrir un Pull Request hacia `main` y pedir revisión a otro integrante antes de fusionar.
5. Referenciar el issue correspondiente en el PR (`Closes #N`).

## Reglas del seminario (resumen)

- **Citas:** toda idea, definición, dato o figura que no sea propia debe citarse con estilo autor-año (APA) uniforme. Toda fuente citada debe aparecer en la bibliografía, y viceversa.
- **Bibliografía recomendada:** Cockburn (2005), De la Torre et al. (2010), Martin (2017), Palermo (2008), Richards (2015) y Richards & Ford (2020).
- **Uso de IA:** si se usó alguna herramienta, incluir al final del documento, después de la bibliografía, el epígrafe independiente _Declaración de Uso de la Inteligencia Artificial_ (herramienta y versión, propósito y forma de integración).
- **Portada:** nombre de la actividad, nombre del equipo, nombres completos de los integrantes, preguntas de cada integrante y enlace a este repositorio.

## Entrega

- **Nombre del archivo:** `SemArq1_NombreEquipo.pdf`
- **Canales (ambos obligatorios):**
  1. Sección _Evaluaciones_ del grupo de Ingeniería de Software en Telegram.
  2. Este repositorio: PDF final, código LaTeX y diagramas.

## Seguimiento

Las tareas están en la pestaña **Issues**: preparación del entorno, una por pregunta y la edición final del documento.
