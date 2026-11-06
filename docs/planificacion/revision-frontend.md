# Revisión del frontend

Todas las páginas del plan original ([pantallas.md](pantallas.md)) están implementadas. Este
documento recoge lo que salió al revisarlas: funcionalidades nuevas, huecos y la
reorganización del código antes de seguir creciendo. Es la base para planificar la
siguiente ronda de issues de frontend.

Fecha de la revisión: 2026-11-02.

## Estado

Implementado en el frontend (rama `fix/refactor-pages`), funcionando con los mocks
(`VITE_USE_MOCKS=true`):

- §1 Catálogo (`/catalog`), reservas con estado, pestaña *Pendientes* del admin y reservas
  pendientes o rechazadas en *Mis itinerarios*. El mock añade el paquete «Cienfuegos y la
  bahía» para que el turista de demostración tenga algo que elegir.
- §2 Página de atracciones con mapa (Leaflet + OpenStreetMap), alta desde el formulario de
  actividad, enlaces desde ActivityRow y RouteTimeline, y mapa del recorrido en el detalle
  de itinerario, *Hoy*, el detalle de viaje y el catálogo.
- §3 Comprobación de rol en el router, página 404 y contadores en el menú.
- §4 Rutas en inglés ([pantallas.md](pantallas.md) actualizado).
- §5 Separación de páginas.

Pendiente:

- Endpoints del backend para atracciones, catálogo y reservas (y los demás de §3); el
  contrato está en [pantallas.md §6](pantallas.md#6-endpoints-que-necesita-el-frontend).
- Redibujar Booking en el diagrama MERX; el [esquema lógico](../merx/astarship-logical-schema.md)
  ya tiene los atributos nuevos.
- Los reportes RC-1 a RC-6 (#106–#111): cada uno irá en `ReportsPage/reports/RcN.tsx`
  sobre `ReportTemplate`.

---

## 1. Catálogo del turista y reserva de paquetes

Hoy el turista solo ve lo que ya tiene asignado (Hoy, Mis itinerarios, Valoraciones,
Solicitudes) y no puede elegir nada. Debe poder explorar lo que ofrece la plataforma,
navegando **paquete → itinerario → atracción**, y decidir qué paquete quiere.

No hay pago: elegir un paquete es pulsar **Seleccionar**.

### Flujo

1. El turista abre el catálogo, recorre los paquetes y entra en el detalle de uno: sus
   itinerarios y, dentro de cada itinerario, las atracciones.
2. Selecciona el paquete. Indica la **fecha de inicio** que desea y, si quiere, un
   **itinerario preferido** (es una sugerencia; decide el admin).
3. El paquete aparece en *Mis itinerarios* como **Pendiente de asignación**. Mientras siga
   pendiente, el turista puede **cancelarlo**.
4. Al admin le aparece en la pestaña **Pendientes** de Asignaciones, con un contador en el
   menú. Asigna **un** itinerario del paquete (RN-04 se mantiene), confirmando o cambiando
   la fecha, o **rechaza** la reserva indicando el motivo.
5. El turista ve el resultado: el itinerario asignado o el rechazo con su motivo.

### Reglas

- Se pueden seleccionar **varios paquetes** a la vez.
- No se puede seleccionar un paquete que ya esté **asignado** o **pendiente**.
- Estados de la reserva: `pendiente` → `asignada` | `rechazada` | `cancelada`.
- Solo se selecciona el paquete; itinerarios y atracciones se consultan.

### Impacto en el modelo

El MERX ya tiene la agregación **Booking** (Tourist —To Book— Package, con `Booking Date`)
y [pantallas.md §6](pantallas.md#6-endpoints-que-necesita-el-frontend) prevé
`POST/DELETE /packages/{id}/bookings`. Se reutiliza, pero hay que ampliarla con:

| Atributo | Para qué |
|---|---|
| `Status` | pendiente, asignada, rechazada o cancelada |
| `Requested Start Date` | fecha de inicio que propone el turista |
| `Preferred Itinerary` | itinerario sugerido (opcional) |
| `Rejection Reason` | motivo cuando el admin rechaza |

Hay que actualizar el MERX y el [esquema lógico](../merx/astarship-logical-schema.md), y
añadir al backend el listado de reservas pendientes para el admin y las acciones de
asignar, rechazar y cancelar.

---

## 2. Atracciones

El frontend se diseñó antes de que existiera la entidad **Attraction**. Hoy solo aparece
como selector al crear una actividad y como nombre en ActivityRow y RouteTimeline: no hay
forma de ver su información.

### Lo que dicen los docs

- **Atributos** ([merx-v1.8.1](../merx/merx-v1.8.1.png)): `ID`, `Name`, `Address`,
  `Latitude`, `Longitude`.
- Cada actividad se realiza en **exactamente una** atracción, así que el detalle de una
  atracción puede listar sus actividades.
- La red de conexiones (tiempo y costo, RF-32) está fuera del esquema relacional (RNF-02),
  pero se puede mostrar como "atracciones conectadas".
- **RF-07:** todos los roles consultan el banco de actividades y atracciones.
  **RF-01:** el guía registra atracciones.
- Endpoints previstos: CRUD `/attractions` y `GET /attractions/{id}/alternatives`. El
  frontend solo usa `GET /attractions`.

### Decisiones

- **Página propia** `/attractions` y `/attractions/:id`, abierta a todos los roles; en el
  menú del guía, del admin y del turista. No es una pestaña de ActivitiesPage porque esa
  página es solo de guía y admin. El turista también llega desde el catálogo, y el
  breadcrumb del detalle lo lleva al listado, así que tiene su entrada en el menú.
- **Barra inferior del turista en móvil:** caben cinco entradas. Entra *Atracciones* y sale
  *Valoraciones*, que sigue en la barra lateral de escritorio; en móvil se valora desde el
  detalle del viaje.
- **Listado y detalle:** dirección, **mapa** (Leaflet + OpenStreetMap), actividades que se
  hacen allí y atracciones conectadas.
- Pulsar el nombre de una atracción en ActivityRow o RouteTimeline lleva a su detalle.
- **Permisos:** el guía crea (desde la página y también desde el formulario de actividad);
  el admin edita y borra; todos consultan.
- Al crear una atracción, la ubicación se marca **pulsando en el mapa**.
- El mapa es un componente compartido (`AttractionMap`) que también se usa para dibujar la
  ruta del itinerario y la de *Hoy*.

---

## 3. Huecos detectados

Ya cubiertos por issues abiertos:

- Reportes RC-1 a RC-6 (#106–#111): la plantilla existe, pero `REPORT_VIEWS` está vacío
  y todas las pestañas salen vacías. Afecta también a *Mis validaciones* del jefe (RC-3).
- Repaso de móvil a 400 px (#112).
- Repaso de tema oscuro y accesibilidad (#113).

Sin issue todavía:

| Hueco | Detalle |
|---|---|
| Comprobación de rol repetida | Las 11 páginas repiten `if (user.role …) return <Navigate to={HOME_BY_ROLE[…]} />`. Funciona, pero debe vivir en el router: cada ruta declara sus `roles` y un único guard redirige. |
| Ruta comodín | `*` lleva a `/login` aunque haya sesión. Debe llevar a la página de inicio del rol o a una 404. |
| Integración con el backend | `backend/app/api/routes` no tiene attractions, bookings, validaciones, visits, ratings, reviews ni reports. Esas pantallas solo funcionan con `VITE_USE_MOCKS=true`. Cada funcionalidad nueva necesita su mock y su endpoint. |
| Contadores en el menú | El contador de *Pendientes* del admin se generaliza: jefe (por revisar), guía (solicitudes nuevas), turista (solicitud resuelta, reserva asignada o rechazada). Cubre lo que haría un sistema de notificaciones sin construirlo. |

Orden recomendado: comprobación de rol y ruta comodín (pequeños), integración con el
backend (bloquea la demo real), separación de páginas, atracciones, catálogo con reservas
y contadores.

Fuera de alcance por ahora: tests de frontend (RNF-07 los pide, pero se aplazan).

---

## 4. Rutas en inglés

Todas las rutas pasan a inglés, también las pestañas que vayan en la URL. Afecta a
`routes.tsx`, `navigation.ts`, `HOME_BY_ROLE`, enlaces, `navigate()` y breadcrumbs
(unos 72 usos en 11 ficheros) y a [pantallas.md §5](pantallas.md#5-pantallas-y-páginas).

| Antes | Después | Roles |
|---|---|---|
| `/login` | `/login` | — |
| `/actividades` | `/activities` · `/activities/duplicates` | guía, admin |
| — | `/attractions` · `/attractions/:id` | todos |
| `/itinerarios` | `/itineraries` | guía, jefe |
| `/itinerarios/nuevo` | `/itineraries/new` | guía |
| `/itinerarios/:id` | `/itineraries/:id` | guía, jefe |
| `/paquetes` | `/packages` | admin, guía, jefe |
| `/solicitudes` | `/requests` | guía, turista |
| `/valoraciones` | `/ratings` | guía, turista |
| `/viaje/hoy` | `/trip/today` | turista |
| `/viaje/itinerarios` | `/trip/itineraries` | turista |
| `/viaje/itinerarios/:id` | `/trip/itineraries/:id` | turista |
| `/viaje/itinerarios/:id/valorar` | `/trip/itineraries/:id/rate` | turista |
| — | `/catalog` · `/catalog/:packageId` | turista |
| `/personas` | `/people/guides` · `/people/tourists` | admin |
| `/asignaciones` | `/assignments` · `/assignments/pending` | admin |
| `/reportes/:rc` | `/reports/:rc` | todos |

---

## 5. Separación de páginas

Varias páginas superan las 600 líneas y algunas van a crecer (atracciones, catálogo,
reservas pendientes). Se reorganizan antes de añadir nada.

### Criterio

- La carpeta de una página es una **funcionalidad**. `XPage.tsx` solo decide qué vista
  mostrar.
- Va en su propio fichero cada **vista independiente** (pestaña, subruta o vista de un rol)
  y cada **panel lateral o formulario**.
- Tablas, tarjetas y funciones pequeñas se quedan junto a la vista que las usa.
- A `components/` solo sube lo que usan dos páginas o más; a `lib/`, las funciones de
  dominio que se repiten.
- Un CSS por página; una vista lleva el suyo solo si tiene muchos estilos propios.
- Cada vista tiene su **subruta real**: no se elige la vista mirando `pathname` dentro de
  la página, como hacen hoy TripPage e ItinerariesPage.

### Por página

| Página | Líneas | Ficheros | Motivo |
|---|---|---|---|
| ActivitiesPage | 1084 | `BankTab` (+ tabla), `ActivityDrawer`, `DuplicatesTab` (+ `DuplicateCard`) | dos pestañas y un panel lateral grande |
| PeoplePage | 1015 | `GuidesTab` (+ `GuideDrawer`), `TouristsTab` (+ `GroupTourists`), `GroupDrawer`, `TouristDrawer` | dos pestañas y tres paneles |
| ItinerariesPage | 748 | `GuideList`, `ManagerList` (+ cola de revisión e historial), `ItinerariesTable`, `ItineraryDetail` (+ parámetros, gráfico de esfuerzo, historial) | una vista por rol y el detalle en su ruta |
| TripPage | 691 | `TodayView`, `TripsView` (+ reservas pendientes), `TripDetail`, `RateView` | cuatro subrutas en un solo fichero |
| RequestsPage | 638 | `GuideView` (+ formulario de resultado y detalle), `TouristView` (+ formulario y mis solicitudes) | vistas por rol sin nada en común |
| RatingsPage | 376 | `GuideView`, `TouristView` | ídem |
| AssignmentsPage | 420 | `AssignTab` (contenido actual), `PendingTab` | la pestaña de pendientes es nueva |
| ReportsPage | 240 | `ReportTemplate`, `reports/Rc1` … `Rc6` | encaja con #106–#111 |
| **AttractionsPage** | nueva | `AttractionsList`, `AttractionDetail`, `AttractionDrawer` | §2 |
| **CatalogPage** | nueva | `PackageList`, `PackageDetail`, `BookingDialog` | §1 |
| GeneratorPage, PackagesPage, LoginPage | — | sin cambios | cada una es un único flujo cohesionado |

### Lo que pasa a ser compartido

- `components/AttractionMap`: atracciones, detalle de itinerario, *Hoy* y catálogo.
- `components/EffortChart`: sale de ItinerariesPage porque también lo usa el catálogo.
- `lib/activity.ts`: `typeLabel`, `effortLabel` y `EFFORT_OPTIONS`, hoy dentro de
  ActivitiesPage, junto a `EFFORT_LABEL`, que ya está ahí y se usa en otras páginas.
