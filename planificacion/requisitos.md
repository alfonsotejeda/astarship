# Requisitos del sistema

> **Estado: borrador para discutir.** Este documento se redactó a partir del
> enunciado, para que el equipo lo revise y lo corrija entre los cinco. Nada de lo que
> hay aquí está cerrado. La sección [8. Puntos abiertos](#8-puntos-abiertos) recoge las
> decisiones que todavía no hemos tomado y que bloquean partes del modelo.

**Proyecto:** Astarship — generación automática de itinerarios turísticos
**Asignaturas:** Bases de Datos II · Ingeniería de Software · Curso 2026–2027
**Equipo:** HAVING Fe

---

## Índice

- [Cómo leer este documento](#cómo-leer-este-documento) — qué significa RF, RNF, RC, RN y PA
- [1. Propósito y alcance](#1-propósito-y-alcance)
- [2. Actores](#2-actores)
- [3. Requisitos funcionales](#3-requisitos-funcionales) — qué tiene que hacer el sistema
- [4. Requisitos no funcionales](#4-requisitos-no-funcionales) — cómo tiene que funcionar
- [5. Las seis consultas](#5-las-seis-consultas) — el criterio de evaluación de Bases de Datos
- [6. Reglas de negocio](#6-reglas-de-negocio)
- [7. Restricciones técnicas](#7-restricciones-técnicas) — el stack ya decidido
- [8. Puntos abiertos](#8-puntos-abiertos) — **lo que hay que decidir en la reunión**
- [9. Trazabilidad](#9-trazabilidad)

---

## Cómo leer este documento

Cada línea numerada lleva un prefijo que dice de qué tipo de cosa se trata:

| Prefijo | Qué es | Cómo distinguirlo | Ejemplo de aquí |
|---|---|---|---|
| **RF** | **Requisito funcional.** Algo que el sistema tiene que **hacer**. | Es una acción, y se puede probar: o la hace o no la hace. | RF-05: asignar el nivel de esfuerzo a una actividad. |
| **RNF** | **Requisito no funcional.** No es una función, es una **cualidad** de cómo tiene que funcionar. | No describe qué hace el sistema, sino cómo de rápido, seguro, mantenible o accesible tiene que ser. | RNF-01: entregar el itinerario del día sin demoras perceptibles. |
| **RC** | **Requisito de consulta.** Las seis consultas que el enunciado enumera. | Técnicamente son requisitos funcionales; los separamos porque son el criterio de evaluación de Bases de Datos. | RC-6: correlación entre esfuerzo y valoración. |
| **RN** | **Regla de negocio.** Una restricción que se cumple **siempre**. | No es una acción que alguien ejecuta, es un límite que el sistema nunca puede violar. | RN-01: un guía solo clasifica las actividades que él describió. |
| **PA** | **Punto abierto.** Una decisión que el equipo **todavía no ha tomado**. | No es un requisito: es algo que hay que resolver antes de poder escribir uno. | PA-3: qué significa exactamente "asignación doble". |

La diferencia práctica entre **RF** y **RNF**: si falla un RF, falta una funcionalidad
—el botón no está—. Si falla un RNF, la funcionalidad está pero el sistema es lento,
inseguro o imposible de mantener.

La diferencia entre **RF** y **RN**: "registrar una actividad" es una acción (RF);
"no pueden existir actividades duplicadas" es un límite que se respeta en todo momento (RN).

La columna **Fuente** de cada tabla cita la frase del enunciado que justifica ese requisito.
Donde dice *interpretación*, es una deducción nuestra y no una cita: son justo los puntos
que conviene mirar con lupa, porque es donde podemos habernos equivocado.

---

## 1. Propósito y alcance

Aplicación web para una agencia de viajes que **genera itinerarios turísticos de forma
automática**. El sistema administra el banco de actividades y atracciones, los paquetes
turísticos en que se usan, los guías que las describen y validan, y los turistas que las
recorren.

La generación no es aleatoria: cada itinerario debe respetar criterios de equilibrio
—proporción de actividades por tipo, cobertura de categorías y cantidad total— y conservar
el orden de recorrido para poder analizar cómo se acumula el esfuerzo físico a lo largo
del viaje.

**Queda dentro del alcance:** todo lo descrito en el enunciado ([`docs/enunciado.pdf`](../docs/enunciado.pdf)).

**Queda fuera:** pagos, facturación, reservas de transporte o alojamiento, mensajería entre
usuarios, y cualquier integración con servicios externos (mapas reales, pasarelas de pago).
El enunciado no los menciona.

---

## 2. Actores

| Actor | Qué hace en el sistema |
|---|---|
| **Guía turístico** | Registra atracciones y actividades. Clasifica por categoría y tipo y asigna nivel de esfuerzo a las actividades que él describió. Genera itinerarios. Atiende solicitudes de modificación. |
| **Jefe de operaciones turísticas** | Revisa y aprueba los itinerarios generados. Puede ordenar la confección de otro bajo sus criterios. |
| **Turista** | Consulta los itinerarios que le asignan, registra sus visitas, valora la experiencia y solicita modificaciones. |
| **Administrador** | Evita actividades duplicadas e impide la asignación doble de itinerarios. Ver [PA-1](#pa-1-el-administrador-existe-como-actor-del-sistema). |

Un mismo guía puede estar autorizado en unos paquetes y no en otros, y la autorización
distingue entre **generar** y **validar** itinerarios.

---

## 3. Requisitos funcionales

Notación: `RF-nn`. La columna *Fuente* cita el enunciado; donde dice *interpretación*, es
una deducción nuestra que conviene confirmar.

### 3.1 Actividades y atracciones

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-01 | Registrar una atracción. | Guía | "cada guía turístico podrá ingresar actividades y atracciones al banco existente" |
| RF-02 | Registrar una actividad e indicar en qué atracción se realiza. | Guía | Ídem + *interpretación*: la relación actividad→atracción no es explícita en el enunciado |
| RF-03 | Clasificar una actividad por **categoría**. Solo sobre las actividades que él mismo describió. | Guía | "sobre aquellas actividades descritas por él, clasificarlas por categoría" |
| RF-04 | Clasificar una actividad por **tipo**: `visita`, `excursión` o `taller`. | Guía | "y por tipo (visita, excursión o taller)" |
| RF-05 | Asignar el **nivel de esfuerzo físico**: `bajo`, `medio` o `alto`. | Guía | "otorgarle el nivel de esfuerzo físico (bajo, medio o alto)" |
| RF-06 | Impedir que se registren actividades duplicadas. | Administrador | "se encargará de evitar la existencia de actividades duplicadas" |
| RF-07 | Consultar y listar el banco de actividades y atracciones. | Todos | Implícito en RF-12 (interpretación) |

### 3.2 Paquetes turísticos y turistas

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-08 | Registrar un paquete con identificador único, nombre, destino y la lista de categorías a cubrir. | — | "Cada paquete turístico tendrá un identificador único, su nombre, el destino… y la lista de categorías a cubrir" |
| RF-09 | Registrar en qué paquetes está autorizado cada guía, distinguiendo si puede **generar**, **validar** o ambas. | — | "los paquetes turísticos para los cuales está autorizado a generar o validar itinerarios" |
| RF-10 | Registrar un turista con identificador único, nombre, edad, grupo de viaje y los paquetes en que está inscrito. | — | "Cada turista tendrá un identificador único, su nombre, edad, grupo de viaje… y los paquetes turísticos en los que está inscrito" |
| RF-11 | Registrar un guía con identificador único, nombre y especialidad. | — | "De cada guía turístico se almacenará su identificador único, nombre, especialidad" |
| RF-12 | Gestionar grupos de viaje y la pertenencia de turistas a ellos. | — | Derivado de RF-10 |

### 3.3 Generación de itinerarios

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-13 | Generar un itinerario **automáticamente** a partir de un conjunto de actividades seleccionadas. | Guía autorizado | "generar itinerarios de forma automática a partir de las actividades seleccionadas" |
| RF-14 | Parametrizar la generación con: proporción de actividades **por tipo**, cobertura de **categorías** y **cantidad total** de actividades. | Guía autorizado | "basándose en criterios como la proporción de actividades por tipo, la cobertura de las categorías y la cantidad total de actividades" |
| RF-15 | Almacenar esa parametrización **junto al itinerario generado**. | Sistema | "cuya parametrización es almacenada junto al itinerario generado" |
| RF-16 | Conservar el **orden** en que las actividades serán recorridas. | Sistema | "debe además conservar el orden en que las actividades serán recorridas" |
| RF-17 | Un itinerario pertenece a un paquete turístico. | Sistema | "los itinerarios generados automáticamente para un paquete turístico específico" |
| RF-18 | Consultar los itinerarios de otros guías que atienden el mismo paquete. | Guía | "cada guía tiene la opción de ver itinerarios de otros guías que atienden el mismo paquete turístico" |

> El enunciado separa explícitamente quién **añade** actividades de quién **crea** el
> itinerario: *"no siempre aquellos guías que agregan actividades son los que crean el
> itinerario, esta labor es desempeñada por un guía específico"*. Son roles distintos sobre
> la misma entidad Guía, no personas de distinto tipo.

### 3.4 Validación

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-19 | Revisar y aprobar o rechazar un itinerario generado, registrando **fecha de validación**, **resultado** y **observaciones**. | Jefe de operaciones | "es quien revisa y aprueba el itinerario generado" + RC-3 |
| RF-20 | Indicar la confección de otro itinerario bajo sus propios criterios. | Jefe de operaciones | "aunque también puede indicar la confección de otro bajo sus criterios" |
| RF-21 | Distinguir el estado de un itinerario entre **generado pendiente de validación** y **validado**. | Sistema | Derivado de RF-19 (interpretación) |

### 3.5 Asignación y recorrido

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-22 | Asignar un itinerario a un turista. | Ver [PA-1](#pa-1-el-administrador-existe-como-actor-del-sistema) | "impedir la asignación doble de itinerarios a los turistas" |
| RF-23 | Impedir la asignación doble. | Administrador | Ídem. Ver [PA-3](#pa-3-qué-significa-asignación-doble) |
| RF-24 | Consultar los itinerarios asignados. | Turista | "los turistas podrán acceder a los itinerarios que le son asignados" |
| RF-25 | Registrar cada **visita** de un turista a una actividad de un itinerario recorrido. | Turista / Sistema | "el sistema debe garantizar el almacenamiento de cada visita registrada ante un itinerario recorrido" |
| RF-26 | Valorar la experiencia. | Turista | "las valoraciones de la experiencia" |
| RF-27 | Consultar las valoraciones. | Guía y Turista | "pueden ser consultadas por los guías y los turistas" |
| RF-28 | Consultar todas sus valoraciones agrupadas por paquete turístico. | Turista | "estos pueden consultar todas sus valoraciones por paquete turístico recibido" |

### 3.6 Solicitud de modificación

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-29 | Solicitar de forma **virtual** una modificación del itinerario. | Turista | "los turistas pueden solicitar de forma virtual una modificación del itinerario" |
| RF-30 | Pedir el apoyo de un **guía adicional** al asignado para que atienda la solicitud. | Turista | "pudiendo pedir el apoyo de un guía turístico adicional al que tienen asignado" |
| RF-31 | Registrar todo el proceso de solicitud **y el resultado** de la modificación manual. | Sistema | "todo este proceso se registra en la base de datos como también el resultado de la modificación manual" |

### 3.7 Red de atracciones

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-32 | Mantener las conexiones entre atracciones según cercanía geográfica y transporte disponible, con **tiempo** y **costo** asociados. | Sistema | "formando una red donde cada punto puede alcanzar a otros con distintos tiempos y costos asociados" |
| RF-33 | Recorrer la red para **proponer alternativas** cuando una actividad no pueda realizarse en el horario previsto. | Sistema | "el sistema debe recorrer dicha red para proponer alternativas cuando una actividad no pueda realizarse en el horario previsto" |

> Esta red tiene tratamiento especial: ver [RNF-02](#4-requisitos-no-funcionales).

### 3.8 Reportes y exportación

| ID | Requisito | Actor | Fuente |
|---|---|---|---|
| RF-34 | Generar reportes sobre la creación de itinerarios, las actividades más utilizadas, la distribución de niveles de esfuerzo y el desempeño de la experiencia según el esfuerzo. | Todos | "el sistema admitirá la generación de reportes detallados sobre…" |
| RF-35 | Presentar los resultados en **tablas y gráficos**. | Sistema | "el sistema debe de proveer resultados (tablas y gráficos)" |
| RF-36 | **Exportar a PDF** la información mostrada. Disponible para **todo tipo de usuario**. | Todos | "la posibilidad de exportar la información mostrada a ficheros con formato PDF tiene que ser una funcionalidad provista por el sistema para todo tipo de usuario" |
| RF-37 | **Ordenar cada columna** de los resultados. | Todos | "poder ordenar cada columna de los resultados acorde a los intereses del usuario final" |

---

## 4. Requisitos no funcionales

| ID | Requisito | Origen |
|---|---|---|
| RNF-01 | **Rendimiento.** El itinerario del día debe entregarse sin demoras perceptibles, incluso con varios grupos consultando a la vez. Justifica una capa de caché (Redis). | Enunciado |
| RNF-02 | **La red de atracciones no se modela como tabla del esquema relacional.** Se gestiona de forma independiente para poder navegarla con agilidad. | Enunciado, explícito |
| RNF-03 | **Multiplataforma**: accesible desde cualquier sistema. Confirmado por el profesor que una web basta. | IS-3 |
| RNF-04 | **Arquitectura desacoplada, extensible y mantenible.** | IS-7 |
| RNF-05 | **Al menos dos patrones de diseño** implementados y justificados. | IS-6 |
| RNF-06 | **Docstrings en todo el código.** Verificado automáticamente por `ruff` (regla `D`). | IS-5 |
| RNF-07 | **Pruebas unitarias** de back-end y front-end. | IS-8 |
| RNF-08 | **Control de versiones.** Git + GitHub. | IS-1 |
| RNF-09 | **Planificación con herramienta CASE.** | IS-2 |
| RNF-10 | **Autenticación y autorización por rol.** Cada actor ve y hace solo lo que le corresponde. | Interpretación |

> Los requisitos **IS-1 a IS-6 son indispensables para aprobar** la asignatura; IS-7 e IS-8
> suman. RNF-05 (patrones) y RNF-06 (docstrings) están entre los obligatorios.

---

## 5. Las seis consultas

El enunciado las lista de forma explícita y son criterio de evaluación de Bases de Datos.
Cada una debe poder verse como tabla y como gráfico, exportarse a PDF y ordenarse por
columna (RF-35 a RF-37).

| ID | Consulta |
|---|---|
| RC-1 | Itinerarios generados automáticamente para un paquete, indicando **creador**, **fecha de creación** y **parámetros utilizados**. |
| RC-2 | Actividades **más utilizadas** en los itinerarios finales de un paquete, clasificadas por nivel de esfuerzo y categoría. |
| RC-3 | Itinerarios **validados por un revisor determinado**, con fecha de validación y observaciones. |
| RC-4 | Reporte de **experiencia de los turistas** en un itinerario, clasificando las actividades por esfuerzo y comparando tasas de satisfacción. |
| RC-5 | **Comparación entre paquetes**: distribución de actividades por categoría y esfuerzo, y si se cumplieron los criterios de equilibrio. |
| RC-6 | **Correlación** entre nivel de esfuerzo y valoración promedio, por paquete. Incluye: las **10 actividades con mayor tasa de abandono** con su guía creador y su paquete; y la comparación del desempeño de los turistas que solicitaron modificación contra el promedio de sus grupos de viaje en esos mismos paquetes. |

> **RC-6 es la más exigente** y conviene diseñarla pronto, porque condiciona el modelo:
> exige poder calcular una *tasa de abandono* por actividad (lo que implica distinguir una
> visita realizada de una no realizada, RF-25), trazar cada actividad hasta el guía que la
> creó (RF-02) y relacionar solicitudes de modificación con valoraciones y grupos de viaje.

---

## 6. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Un guía solo clasifica (categoría, tipo, esfuerzo) las actividades que él describió. |
| RN-02 | Un guía solo genera o valida itinerarios de paquetes en los que está autorizado, y según el tipo de autorización que tenga. |
| RN-03 | No pueden existir actividades duplicadas. |
| RN-04 | Un turista no puede recibir una asignación doble. Ver [PA-3](#pa-3-qué-significa-asignación-doble). |
| RN-05 | Un itinerario pertenece a un único paquete; un paquete puede tener varios itinerarios. |
| RN-06 | El orden de las actividades dentro de un itinerario es significativo y debe preservarse. |
| RN-07 | Un itinerario generado no es válido hasta que el jefe de operaciones lo aprueba. |
| RN-08 | El guía que atiende una solicitud de modificación puede ser distinto del asignado al turista. |

---

## 7. Restricciones técnicas

Decisiones ya tomadas por el equipo y aprobadas por el profesor:

- **Backend:** Python + FastAPI, gestionado con `uv`.
- **Base de datos:** PostgreSQL 18, con SQLAlchemy y migraciones con Alembic.
- **Frontend:** TypeScript + React (Vite).
- **Entorno:** Docker y Docker Compose.
- **Despliegue:** propuesto Vercel (frontend) + Render (API). Sin cerrar.
- **Caché:** Redis, si RNF-01 lo exige.

---

## 8. Puntos abiertos

Decisiones que el equipo todavía no ha cerrado y que bloquean partes del modelo. **Cada
una hay que resolverla antes de escribir los modelos ORM.**

### PA-1. ¿El administrador existe como actor del sistema?

El enunciado le atribuye dos tareas (RF-06 y RF-23) pero no dice que se almacene ningún dato
suyo, y ninguna de las seis consultas lo menciona. El equipo decidió el 21 de septiembre
**no modelarlo como entidad**, con el argumento de que "evitar" e "impedir" son verbos de
control que el sistema puede garantizar con restricciones de integridad, y de que la
asignación es automática.

**Queda pendiente:** si la asignación es automática, RF-22 no tiene actor. Hay que decidir si
la asignación la hace el sistema, el jefe de operaciones o un guía.

### PA-2. `Usuario` frente a `Persona` en el MERX

El profesor indicó textualmente: *"User no existe en el Merx. En el Merx lo que existe es
Persona, porque usuario es algo propio de la aplicación y no del modelo conceptual"*. También
dijo que los permisos no se modelan en el MERX.

El revisor externo recomendó lo contrario: entidad `Usuario` + entidad `Rol` agregadas, en
lugar de especializaciones, por extensibilidad.

**Son criterios incompatibles y solo uno de los dos pone la nota.** Hay que elegir.

### PA-3. ¿Qué significa "asignación doble"?

Caben dos lecturas: que a un turista se le asigne dos veces el mismo itinerario, o que se le
asignen itinerarios solapados en el tiempo. **El enunciado no da fechas por paquete ni por
itinerario**, así que la segunda lectura no se puede comprobar con los datos que pide guardar.

### PA-4. ¿El itinerario se asigna al turista o al grupo de viaje?

El enunciado dice "los itinerarios que le son asignados" (al turista), pero también habla de
grupos de viaje que recorren juntos. Afecta a RF-22 y a RC-6.

### PA-5. ¿Modificar un itinerario o cambiarlo entero?

En la discusión del 21 quedó que el turista toma el itinerario completo o lo cambia completo,
sin modificación parcial. **No está en el enunciado**: es una decisión nuestra y conviene
dejarla escrita.

### PA-6. ¿Un turista pertenece a un grupo o a varios?

El enunciado dice "grupo de viaje" en singular pero "paquetes turísticos" en plural. Si un
turista puede ir en varios paquetes, ¿tiene un grupo por paquete?

### PA-7. ¿Dónde vive la autorización del guía sobre el paquete?

RF-09 y RN-02 son datos del negocio que el enunciado pide guardar, pero el profesor dijo que
los permisos no se modelan en el MERX. Hay que distinguir **autorización de negocio** (qué
paquetes atiende un guía) de **permisos de aplicación** (quién puede pulsar qué botón), y
decidir dónde va cada cosa.

### PA-8. Atributos que el enunciado no define

El enunciado enumera con detalle los atributos de **paquete**, **guía** y **turista**, pero
**no dice nada de los de atracción, actividad, itinerario ni grupo de viaje**. Lo que tenemos
en el MERX (`nombre`, `ubicación`, `fecha`, etc.) son decisiones nuestras, defendibles por
usabilidad pero no respaldadas por el texto. Conviene tenerlo claro por si nos lo preguntan.

### PA-9. ¿ORM o SQL directo para las consultas?

Sin resolver entre Alfonso (SQL directo) y Miguel (ORM). Afecta sobre todo a RC-1 a RC-6, que
son analíticas. Una salida intermedia: ORM para el CRUD, SQL a mano para las seis consultas.

---

## 9. Trazabilidad

| Documento | Ruta |
|---|---|
| Enunciado original | [`docs/enunciado.pdf`](../docs/enunciado.pdf) |
| MERX (versiones) | [`docs/merx/`](../docs/merx/) |
| Milestones | `planificacion/milestones.md` *(pendiente)* |
| Detalle por pantalla | `planificacion/pantallas.md` *(pendiente)* |
