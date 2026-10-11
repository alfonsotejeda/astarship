# Pantallas del frontend

> **Estado:** listo para repartir. El diseño está cerrado en una primera versión; si al
> implementar algo no encaja, se comenta en el canvas y se ajusta allí antes de cambiar
> el código.

**Proyecto:** Astarship · **Equipo:** HAVING Fe

---

## Índice

- [1. Dónde está el diseño](#1-dónde-está-el-diseño)
- [2. Decisiones de modelo que asume el diseño](#2-decisiones-de-modelo-que-asume-el-diseño)
- [3. Stack y estructura del frontend](#3-stack-y-estructura-del-frontend)
- [4. Componentes](#4-componentes)
- [5. Pantallas](#5-pantallas)
- [6. Endpoints que necesita el frontend](#6-endpoints-que-necesita-el-frontend)
- [7. Plan de trabajo e issues](#7-plan-de-trabajo-e-issues)
- [8. Definición de hecho](#8-definición-de-hecho)

---

## 1. Dónde está el diseño

| Qué | Enlace | Para qué |
|---|---|---|
| **Design System** | <https://claude.ai/artifact/ShtLQPciavsxzR88uhMeVV> | Colores (claro y oscuro), tipografía, espaciado y los 29 componentes con su preview en vivo, su guía de uso y sus props (`index.d.ts`). Su README tiene las reglas de tono, color y plantillas. |
| **Pantallas** | <https://claude.ai/artifact/8mhXQkrjiZrSd3LJM5aSi5> | 30 artboards con interacción, agrupados por rol. Cada pantalla tiene un ajuste de tema claro/oscuro. |

Los dos se abren con el enlace. Para dudas o cambios, deja un comentario sobre el artboard
o el componente en cuestión.

**Cómo leer un artboard para implementarlo:** el nombre del artboard está en la columna
*Artboard* de las tablas de la sección 5. Dentro, cada pieza es un componente del Design
System (`Astarship.Button`, `Astarship.DataTable`…) con las mismas props que tendrá en
React. El código del artboard (`renderVals`) trae datos de ejemplo con la forma que
esperamos del backend.

---

## 2. Decisiones de modelo que asume el diseño

El diseño ya da por hechas estas decisiones. **Todavía no están en
[`docs/merx/astarship-logical-schema.md`](../docs/merx/astarship-logical-schema.md) ni en
[`docs/requisitos.md`](../docs/requisitos.md)**, y hay que llevarlas allí antes de los
modelos ORM afectados.

| Cambio | Por qué | Pantallas que lo usan |
|---|---|---|
| Nueva entidad **Attraction** (`ID`, `Name`, `Address`, `Latitude`, `Longitude`); **Activity** referencia a una Attraction. | RF-01 y RF-02 piden atracciones; las coordenadas sirven a la heurística de A\* (PA-10). | Banco de actividades, generador, Hoy |
| **Composition** guarda `Day`, `StartTime` y `Duration` además de `Order`. | Sin día no existe «el itinerario del día» (RNF-01) y no se puede mirar el esfuerzo por día. | Generador, revisión, Hoy |
| **Visit** guarda `Status` (`done` / `skipped`), `Rating` y `Comment`. | RC-4 y RC-6 comparan satisfacción y abandono **por actividad**; con una sola nota por itinerario no se puede. | Hoy, valorar el viaje, RC-4, RC-6 |
| `Assignment.Rating` y `Assignment.Comment` se mantienen como valoración **del viaje completo**. | El turista valora cada actividad y además el viaje. | Valorar el viaje, Mis valoraciones |
| Rol de aplicación **Administrador** (resuelve PA-1). | Alguien tiene que gestionar paquetes, permisos, turistas, asignaciones y duplicados. | Todas las de admin |
| La asignación es **por turista**, con la acción «Asignar a todo el grupo» (resuelve PA-4). | Permite excepciones dentro de un grupo y mantiene la regla de RN-04. | Asignaciones |
| **Asignación doble** = dos itinerarios del mismo paquete para el mismo turista (resuelve PA-3). | Es la única lectura comprobable con los datos que se guardan. | Asignaciones |
| Estado del itinerario derivado: `generated` → `in_review` → `approved` / `redo`, y `assigned` si tiene alguna Assignment. | Hace falta `in_review` (enviado al jefe) además de `Validated`. | Todas las de itinerarios |
| **ModificationRequest** guarda `Status` (`requested`, `in_progress`, `resolved`, `denied`) y opcionalmente el itinerario que sustituye al anterior. | RF-31 pide registrar el proceso y el resultado. | Solicitudes (guía y turista) |

---

## 3. Stack y estructura del frontend

Ya decidido (requisitos §7): React 19 + TypeScript + Vite.

**Propuesta para el resto.** Se cierra en la issue F0-1:

| Necesidad | Librería | Por qué |
|---|---|---|
| Rutas | `react-router` | Rutas por rol y protegidas. |
| Datos del servidor | `@tanstack/react-query` | Caché y reintentos; ayuda a que «Hoy» cargue al instante (RNF-01). |
| Gráficos | `recharts` | La recomienda el Design System; los colores salen de los tokens. |
| Exportar PDF | `jspdf` + `jspdf-autotable` | RF-36: lo que se ve, en el orden actual de la tabla. |
| Iconos | `lucide-react` | Los mismos que usa `Icon` en el Design System. |
| Tests | `vitest` + `@testing-library/react` | RNF-07 pide pruebas unitarias también en el frontend. |

**Estructura** (las carpetas ya existen en `frontend/src`):

```
src/
├── app/          App.tsx, router, rutas por rol
├── components/   un componente del Design System por carpeta (Button/, DataTable/…)
├── pages/        una carpeta por rol: guia/, jefe/, turista/, admin/, reportes/, login/
├── providers/    AuthProvider (usuario y rol), ThemeProvider (claro/oscuro)
├── lib/          cliente de la API, hooks de react-query, exportar PDF, formato de fechas y números
└── styles/       tokens.css (copiado del Design System), index.css
```

**Convenciones:**
- Los colores, espacios y radios **siempre** con las variables de `tokens.css`, nunca un hex suelto.
- Cada componente replica las props de `index.d.ts` del Design System y su comportamiento de `bundle.js`.
- Textos en español y tuteando, con los términos exactos del enunciado (ver el README del Design System).
- Comentarios JSDoc en cada componente y función exportada (IS-5).

---

## 4. Componentes

Son los 29 del Design System. Cada uno tiene en él su preview, su guía y sus props. La
columna *Usos* cuenta en cuántas pantallas aparece y sirve para priorizar.

### Base

| Componente | Qué es | Usos |
|---|---|---|
| `Icon` | Iconos Lucide del subconjunto de la app | todas |
| `Button` | primary · secondary · ghost · danger, tamaños md/sm | todas |
| `Badge` | Tipo de actividad (Visita, Excursión, Taller), categoría, neutral | 18 |
| `StatusPill` | Estado de itinerario, solicitud o visita, siempre con palabra | 16 |
| `EffortMeter` | Esfuerzo bajo/medio/alto en barras más palabra | 14 |
| `Rating` | Estrellas de lectura o input | 6 |

### Estructura

| Componente | Qué es | Usos |
|---|---|---|
| `AppShell` | Navegación lateral por rol (escritorio) o barra inferior (móvil), usuario, tema | todas menos login |
| `PageHeader` | Migas, título, subtítulo | todas menos login |
| `Panel` | Contenedor elevado con cabecera y pie | 20 |
| `Tabs` | Subrayadas (secciones) o segmentadas (vistas) | 12 |

### Formularios

| Componente | Qué es | Usos |
|---|---|---|
| `Field` | Input, select o textarea con etiqueta, hint y error | 20 |
| `Checkbox` | Casilla con etiqueta y descripción | 7 |
| `ChipSelect` | Selección múltiple con chips (categorías) | 3 |
| `FilterBar` | Fila de filtros encima de listados y reportes | 13 |

### Feedback

| Componente | Qué es | Usos |
|---|---|---|
| `Alert` | Aviso en página: info, warn, bad, ok | 12 |
| `Toast` | Confirmación breve con «Deshacer» | 2 |
| `Dialog` | Confirmación modal | 1+ |
| `EmptyState` | Listado o reporte sin datos | 4 |
| `Skeleton` | Carga con la forma del contenido | Hoy (y listados) |

### Datos

| Componente | Qué es | Usos |
|---|---|---|
| `DataTable` | Tabla con todas las columnas ordenables y «Exportar PDF» | 16 |
| `ChartPanel` | Gráfico (apilado, agrupado, dispersión) con vista Tabla ordenable | 8 |
| `StatTile` | Cifra principal de un reporte | 9 |

### Dominio (propios de Astarship)

| Componente | Qué es | Usos |
|---|---|---|
| `RouteTimeline` | Actividades de un día en orden, esfuerzo acumulado; en modo turista registra visitas y valoraciones | 5 |
| `ActivityRow` | Actividad seleccionable u ordenable | 2 |
| `ProportionInput` | Proporción por tipo que suma 100 % | 1 |
| `CriteriaCheck` | Criterios de equilibrio: pedido, obtenido, cumple | 3 |
| `ItineraryCard` + `EffortSplit` | Resumen de un itinerario | 4 |
| `ReviewPanel` | Decisión del jefe con observaciones | 1 |
| `RequestCard` | Solicitud de modificación | 2 |

---

## 5. Pantallas

**Todo funciona primero en ordenador.** El móvil reutiliza la misma página con
`AppShell layout="mobile"`; no hay páginas separadas para móvil.

Las plantillas están descritas en el README del Design System:

- **Listado:** PageHeader → FilterBar → DataTable; crear y editar en un panel lateral.
- **Reporte:** FilterBar → StatTiles → ChartPanel → DataTable.
- **Detalle de itinerario:** a la izquierda, días con RouteTimeline; a la derecha, criterios y acciones.
- **Propia:** disposición única de esa pantalla.

### Acceso

| ID | Pantalla | Ruta | Artboard | Plantilla | Componentes clave | Requisitos |
|---|---|---|---|---|---|---|
| P-01 | Iniciar sesión | `/login` | Acceso · Iniciar sesión | propia | Field, Checkbox, Button, Alert | RNF-10 |

### Guía turístico

| ID | Pantalla | Ruta | Artboard | Plantilla | Componentes clave | Requisitos |
|---|---|---|---|---|---|---|
| P-02 | Banco de actividades | `/guia/actividades` | Guía · Banco de actividades | Listado | FilterBar, DataTable, Field, Alert (duplicado) | RF-01–07, RN-01, RN-03 |
| P-03 | Generar itinerario | `/guia/generar` | Guía · Generar itinerario | propia | ProportionInput, ChipSelect, ActivityRow, RouteTimeline, CriteriaCheck | RF-13–17 |
| P-04 | Itinerarios del paquete | `/guia/itinerarios` | Guía · Itinerarios del paquete | Listado | Tabs (míos / de otros), DataTable, EffortSplit | RF-18 |
| P-05 | Detalle de itinerario | `/guia/itinerarios/:id` | (= Revisión sin ReviewPanel) | Detalle | Tabs, RouteTimeline, ChartPanel, CriteriaCheck | RF-16, RF-21 |
| P-06 | Solicitudes de modificación | `/guia/solicitudes` | Guía · Solicitudes de modificación | propia | Tabs, RequestCard, Field, Checkbox | RF-30, RF-31, RN-08 |
| P-07 | Valoraciones | `/guia/valoraciones` | Guía · Valoraciones | Listado | StatTile, DataTable, Rating | RF-27 |

### Jefe de operaciones

| ID | Pantalla | Ruta | Artboard | Plantilla | Componentes clave | Requisitos |
|---|---|---|---|---|---|---|
| P-08 | Por revisar | `/jefe/revision` | Jefe · Por revisar | propia | ItineraryCard, DataTable | RF-19 |
| P-09 | Revisar itinerario | `/jefe/revision/:id` | Jefe · Revisar itinerario | Detalle | RouteTimeline, ChartPanel, CriteriaCheck, ReviewPanel | RF-19–21, RN-07 |
| P-10 | Itinerarios | `/jefe/itinerarios` | (= P-04 sin pestaña «Míos») | Listado | DataTable | RF-19 |
| P-11 | Mis validaciones | `/jefe/validaciones` | (= Reporte RC-3 filtrado por el usuario) | Reporte | ver RC-3 | RC-3 |

### Turista

| ID | Pantalla | Ruta | Artboard (ordenador · móvil) | Plantilla | Componentes clave | Requisitos |
|---|---|---|---|---|---|---|
| P-12 | Hoy | `/turista/hoy` | Turista · Hoy (ordenador) · Turista móvil · Hoy | propia | RouteTimeline (modo turista), Skeleton, Alert, Toast, EffortSplit | RF-24, RF-25, RF-33, RNF-01 |
| P-13 | Mis itinerarios | `/turista/itinerarios` | Turista · Mis itinerarios · Turista móvil · Mis itinerarios | propia | ItineraryCard, Rating | RF-24 |
| P-14 | Valorar el viaje | `/turista/itinerarios/:id/valorar` | Turista · Valorar el viaje · Turista móvil · Valorar | propia | Rating, Field, EffortMeter | RF-26 |
| P-15 | Pedir modificación | `/turista/solicitudes` | Turista · Pedir modificación · Turista móvil · Pedir modificación | propia | Field, ChipSelect, Checkbox, RequestCard | RF-29, RF-30 |
| P-16 | Mis valoraciones | `/turista/valoraciones` | Turista · Mis valoraciones · Turista móvil · Mis valoraciones | Listado | StatTile, DataTable por paquete, Rating | RF-27, RF-28 |

### Administrador

| ID | Pantalla | Ruta | Artboard | Plantilla | Componentes clave | Requisitos |
|---|---|---|---|---|---|---|
| P-17 | Paquetes turísticos | `/admin/paquetes` | Admin · Paquetes turísticos | Listado | DataTable, ChipSelect, Checkbox | RF-08 |
| P-18 | Guías y permisos | `/admin/permisos` | Admin · Guías y permisos | propia | matriz de Checkbox, Alert | RF-09, RF-11, RN-02 |
| P-19 | Turistas y grupos | `/admin/turistas` | Admin · Turistas y grupos | Listado | lista de grupos, DataTable | RF-10, RF-12 |
| P-20 | Asignaciones | `/admin/asignaciones` | Admin · Asignaciones | propia | Field, Checkbox, Alert, Dialog, ItineraryCard | RF-22, RF-23, RN-04 |
| P-21 | Actividades duplicadas | `/admin/duplicados` | Admin · Actividades duplicadas | propia | Tabs, comparación lado a lado, Button danger | RF-06, RN-03 |

### Reportes (todos los roles)

Una sola página `/reportes/:rc` con pestañas; cada reporte es una configuración de la
plantilla Reporte. En el canvas, RC-1 a RC-5 comparten el archivo `Reportes.dc.html`, y
RC-6 tiene artboard propio.

| ID | Reporte | Ruta | Filtros | Gráfico | Tabla | Requisitos |
|---|---|---|---|---|---|---|
| P-22 | RC-1 Itinerarios generados | `/reportes/rc1` | paquete, fechas | apilado: creador × estado | ID, creador, fecha, parámetros, estado | RC-1 |
| P-23 | RC-2 Actividades más utilizadas | `/reportes/rc2` | paquete, fechas | apilado: categoría × esfuerzo | actividad, categoría, tipo, esfuerzo, usos, % | RC-2 |
| P-24 | RC-3 Validaciones por revisor | `/reportes/rc3` | revisor, fechas | agrupado: mes × aprobados/devueltos | ID, paquete, creador, fecha, resultado, observaciones | RC-3 |
| P-25 | RC-4 Experiencia en un itinerario | `/reportes/rc4` | itinerario, grupo | agrupado: esfuerzo × satisfacción/abandono | actividad, esfuerzo, visitas, valoración, satisfacción, abandono | RC-4 |
| P-26 | RC-5 Comparar paquetes | `/reportes/rc5` | conjunto, fechas | dos apilados: paquete × tipo y paquete × esfuerzo | itinerario, paquete, reparto, cobertura, esfuerzo alto, equilibrio | RC-5 |
| P-27 | RC-6 Esfuerzo y valoración | `/reportes/rc6` | paquete, fechas | dispersión con tendencia + agrupado por paquete | top 10 de abandono; solicitantes frente a su grupo | RC-6 |

Todas las tablas ordenan por cualquier columna (RF-37) y exportan a PDF (RF-36).

---

## 6. Endpoints que necesita el frontend

Siguen la convención actual de la API (recursos en inglés y en plural, como `/users` y
`/activities`). ✅ = ya existe en `backend/app/api/routes`.

| Recurso | Endpoints | Pantallas |
|---|---|---|
| Auth | `POST /auth/login` · `GET /auth/me` | P-01, todas |
| Users | ✅ `GET/POST/PATCH/DELETE /users` · filtro `?role=` | P-18, P-19 |
| Permissions | ✅ `GET/POST/DELETE /permissions` (permisos de aplicación) | — |
| Activities | ✅ CRUD `/activities` · filtros `?type&category&effort&author&q` | P-02, P-03 |
| Duplicates | `GET /activities/duplicates` · `POST /activities/{id}/merge` `{into}` · `POST /activities/duplicates/{pair_id}/dismiss` | P-21 |
| Attractions | CRUD `/attractions` · `GET /attractions/{id}/alternatives?activity&time` (A\*, RF-33) | P-02, P-12 |
| Catálogos | `GET /categories` · `GET /activity-types` | varias |
| Packages | CRUD `/packages` · `PUT /packages/{id}/categories` · `GET/PUT /packages/{id}/authorizations` | P-17, P-18 |
| Travel groups | CRUD `/travel-groups` · `GET /travel-groups/{id}/members` | P-19, P-20 |
| Bookings | `POST/DELETE /packages/{id}/bookings` | P-19 |
| Itineraries | `GET /itineraries?package&creator&status` · `GET /itineraries/{id}` (días, parámetros, criterios) · `POST /itineraries/generate` (vista previa) · `POST /itineraries` · `POST /itineraries/{id}/submit` | P-03–P-05, P-08, P-10 |
| Validations | `POST /itineraries/{id}/validations` `{result, observations}` · `GET /itineraries/{id}/validations` | P-09 |
| Assignments | `POST /itineraries/{id}/assignments` `{user_ids}` (409 si hay asignación doble) · `GET /me/assignments` · `PATCH /assignments/{itinerary_id}/{user_id}` `{rating, comment}` | P-13, P-14, P-20 |
| Today | `GET /me/today` (cacheado en Redis, RNF-01) | P-12 |
| Visits | `PUT /assignments/{itinerary_id}/{user_id}/visits/{activity_id}` `{status, rating, comment}` | P-12, P-14 |
| Modification requests | `POST /modification-requests` · `GET /modification-requests?mine&status` · `PATCH /modification-requests/{id}` `{status, result, new_itinerary_id}` | P-06, P-15 |
| Ratings | `GET /ratings?guide=me&package&effort` · `GET /me/ratings` (agrupadas por paquete) | P-07, P-16 |
| Reports | `GET /reports/rc1` … `GET /reports/rc6` con los filtros de cada uno | P-22–P-27 |

El PDF se genera en el cliente con los datos ya cargados, así sale exactamente lo que se
ve, en el orden elegido.

---

## 7. Plan de trabajo e issues

Cuatro fases. Dentro de cada fase, las issues son independientes y se pueden repartir en
paralelo. Cada issue indica de qué depende.

### Fase 0: fundaciones (bloquea todo; 1–2 personas, primero)

| Issue | Qué | Depende de |
|---|---|---|
| F0-1 | Instalar las librerías de §3, configurar vitest y alias de rutas | — |
| F0-2 | `styles/tokens.css` desde el Design System, fuentes de Google, ThemeProvider (claro/oscuro con `data-theme`) | F0-1 |
| F0-3 | Router con rutas por rol, AuthProvider (con usuario simulado mientras no exista `/auth`) y redirección según rol | F0-1 |
| F0-4 | `lib/api.ts` (cliente con la URL de `.env`) y helpers de formato: fechas `12 oct 2026`, horas 24 h, decimales con coma | F0-1 |

### Fase 1: componentes (5 personas en paralelo)

Cada issue incluye el componente, su test unitario y JSDoc.

| Issue | Componentes | Depende de |
|---|---|---|
| F1-1 | Icon, Button, Badge, StatusPill, EffortMeter, Rating | F0-2 |
| F1-2 | AppShell, PageHeader, Panel, Tabs | F0-2, F0-3 |
| F1-3 | Field, Checkbox, ChipSelect, FilterBar, Alert, Toast, Dialog, EmptyState, Skeleton | F0-2 |
| F1-4 | DataTable (ordenación + exportar PDF con `lib/pdf.ts`), StatTile, ChartPanel (Recharts) | F0-2, F1-1 |
| F1-5 | RouteTimeline, ActivityRow, ProportionInput, CriteriaCheck, ItineraryCard + EffortSplit, ReviewPanel, RequestCard | F1-1 |

### Fase 2: pantallas (reparto propuesto por rol)

Se pueden empezar con datos simulados (los del artboard) y conectar la API cuando el
endpoint exista.

| Issue | Pantallas | Persona sugerida | Depende de |
|---|---|---|---|
| F2-1 | P-01 Login | 1 | F1-3 |
| F2-2 | P-02 Banco, P-04 Itinerarios, P-07 Valoraciones | 1 | F1-2, F1-4 |
| F2-3 | P-03 Generador, P-05 Detalle | 2 | F1-5 |
| F2-4 | P-06 Solicitudes del guía | 2 | F1-5 |
| F2-5 | P-08 Por revisar, P-09 Revisar, P-10 Itinerarios del jefe | 3 | F1-5 |
| F2-6 | P-12 Hoy, P-13 Mis itinerarios | 4 | F1-5 |
| F2-7 | P-14 Valorar, P-15 Pedir modificación, P-16 Mis valoraciones | 4 | F1-5 |
| F2-8 | P-17 Paquetes, P-18 Permisos, P-19 Turistas y grupos | 5 | F1-3, F1-4 |
| F2-9 | P-20 Asignaciones, P-21 Duplicados | 5 | F1-3, F1-4 |

### Fase 3: reportes

| Issue | Qué | Depende de |
|---|---|---|
| F3-1 | Página `/reportes/:rc` con pestañas y la configuración de cada reporte | F1-4 |
| F3-2 | RC-1, RC-2, RC-3 conectados a `/reports/*` (P-22–P-24, P-11) | F3-1 |
| F3-3 | RC-4, RC-5 (P-25, P-26) | F3-1 |
| F3-4 | RC-6 (P-27) | F3-1 |

### Transversal (al cerrar cada fase)

- Revisar las pantallas a 400 px de ancho (móvil) y en tema oscuro.
- Comprobar que todas las tablas ordenan y exportan a PDF.

---

## 8. Definición de hecho

Una pantalla o componente está terminado cuando:

1. Coincide con su artboard o preview: mismos componentes, textos y estados (vacío, cargando, error).
2. Usa solo variables de `tokens.css`; se ve bien en claro y en oscuro.
3. Funciona en ordenador y a 400 px sin scroll horizontal de la página.
4. Las tablas ordenan por cualquier columna y exportan a PDF.
5. Tiene test unitario (componentes y lógica de páginas) y JSDoc en lo exportado.
6. Se navega con teclado y el foco se ve.
7. Muestra solo lo que el rol puede ver y hacer (RNF-10).
