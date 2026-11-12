# Seminario de Arquitecturas de Software Distribuidas — análisis del enunciado

Asignatura: Ingeniería de Software. Equipo: **HAVING FE**.
Enunciado: [`ArqDistribuidas-1.pdf`](ArqDistribuidas-1.pdf) (7 páginas), copiado aquí junto a este
análisis.
Es el segundo seminario de la asignatura; el primero está en [`docs/Seminario 1`](../Seminario%201/README.md)
(enunciado en [`docs/SemArqCapas-1.pdf`](../SemArqCapas-1.pdf)).

Este documento no es la entrega: es la lectura del enunciado, las tesis que conviene defender en
cada pregunta y las trampas que el profesor va a calificar duro. La entrega está en esta misma
carpeta, en [`main.tex`](main.tex) y [`secciones/`](secciones), con la misma estructura del
seminario anterior.

## 1. Qué se entrega

- **Un documento único por equipo** con las 6 respuestas.
- Nombre del fichero: `SemArq1_NombreEquipo` → para este equipo, `SemArq1_HavingFe.pdf`.
  **Ojo:** el enunciado reutiliza la plantilla del seminario anterior y pide otra vez el prefijo
  `SemArq1_`, de modo que el PDF se llamará igual que el que ya está en
  [`docs/Seminario 1/SemArq1_HavingFe.pdf`](../Seminario%201/SemArq1_HavingFe.pdf). Por eso cada
  seminario vive en su propia carpeta dentro de `docs/`; no renombrar para "arreglarlo", el
  enunciado manda.
- Doble canal obligatorio: sección **Evaluaciones** del grupo de Ingeniería de Software en
  Telegram **y** este repositorio (PDF final, fuentes LaTeX, diagramas, ADRs y matrices de
  trade-offs).
- El enlace al repositorio público va **en la portada**: <https://github.com/alfonsotejeda/astarship>.

### Portada — contenido exigido

1. Nombre de la actividad, tal como lo escribe el enunciado: *Seminario de Arquitecturas de
   Software: Un Análisis Comparativo de Estilos Basados en Capas y Dominio*. Es, literalmente, el
   título del seminario anterior —el profesor no actualizó la plantilla—, pero hay que copiarlo
   tal cual: es lo que pide el texto que se está evaluando.
2. Nombre del equipo: **HAVING FE**.
3. Nombres completos de todos los integrantes.
4. **Indicación explícita de qué pregunta trabajó cada integrante.** El enunciado dice que "es
   indispensable que se detalle la contribución individual".
5. Enlace al repositorio público.

### Equipo y reparto

El reparto **provisional** mantiene el mismo del seminario anterior (cada quien repite número de
pregunta). Está escrito así en la portada de `main.tex` y en el comentario de cabecera de cada
`secciones/pN.tex`; si el equipo acuerda otro, hay que cambiar ambos sitios.

| Nombre                             | Grupo | GitHub                                                 | Pregunta   |
| ---------------------------------- | ----- | ------------------------------------------------------ | ---------- |
| Eric Reyes Milián                  | C312  | [@EricReyesMilian](https://github.com/EricReyesMilian) | Pregunta 1 |
| Adrián Estévez Álvarez             | C312  | [@Chikiak](https://github.com/Chikiak)                 | Pregunta 2 |
| Alfonso Tejeda Rodríguez           | C312  | [@alfonsotejeda](https://github.com/alfonsotejeda)     | Pregunta 3 |
| Kamila Reinoso Asín                | C311  | [@KamAlien](https://github.com/KamAlien)               | Pregunta 4 |
| Miguel Andrés Cazorla Zamora       | C312  | [@andr-migue](https://github.com/andr-migue)           | Pregunta 5 |
| Reynaldo Guillermo Capdevila Reyes | C312  | [@kaizenrg](https://github.com/kaizenrg)               | Pregunta 6 |

### Citas

Toda idea, concepto, definición, dato o figura ajena lleva cita en el cuerpo del documento.
Estilo consistente, se recomienda autor-año (APA) o notas al pie. Correspondencia bidireccional:
todo lo citado aparece en referencias y viceversa. En el seminario anterior esto se resolvió con
`biblatex` en estilo APA y un `references.bib`; conviene repetirlo.

### Declaración de Uso de IA

Epígrafe independiente titulado **"Declaración de Uso de la Inteligencia Artificial"**, al final,
después de la bibliografía. Debe decir:

1. Qué herramienta(s) y versión.
2. Con qué propósito (ideas, borradores, estilo, traducción, LaTeX, diagramas).
3. Cómo se integró el resultado en el documento final.
4. Qué integrantes la usaron.

La responsabilidad del contenido sigue siendo del equipo. Hay un ejemplo redactado al final de
[`docs/Seminario 1/main.tex`](../Seminario%201/main.tex) que sirve de molde.

## 2. Los cinco estilos del enunciado

| Estilo | Rasgo definitorio según el enunciado |
|---|---|
| **Service-Based (SBA)** | Híbrido pragmático: UI separada, 4–12 servicios de dominio de grano grueso desplegables independientemente, BD compartida o parcialmente compartida |
| **Event-Driven (EDA)** | Producción/detección/consumo/reacción a eventos. Dos topologías: *broker* (descentralizada) y *mediator* (centralizada) |
| **Space-Based** | Elimina la BD central como cuello de botella; red de processing units con réplicas de datos en memoria (data grids) |
| **SOA** | Servicios de grano fino y altamente reutilizables. Admite orquestación **y** coreografía |
| **Microservicios** | *Bounded context* de DDD al máximo; cada servicio con su propia BD, desacoplamiento alto |

## 3. Las 6 preguntas: tesis a defender en cada una

### P1 — Subastas: orquestación vs. coreografía vs. SBA de grano grueso

Pide explícitamente *connascence* y los trade-offs síncrono/asíncrono.

- **Acoplamiento dinámico:** la orquestación concentra el conocimiento del flujo en el mediador →
  connascencia de ejecución (y de temporización si las llamadas son síncronas). La coreografía
  baja el acoplamiento dinámico pero dispersa el flujo: nadie sabe en qué estado está la
  operación. En SBA las tres acciones caen dentro del mismo servicio de grano grueso → la
  connascencia pasa a ser **estática** (compile-time) y el acoplamiento dinámico desaparece.
- **Fallo del pago tras notificar al ganador:** en SBA hay rollback ACID, nada ocurrió. En
  microservicios hace falta transacción compensatoria (Saga) sobre BASE, y la notificación ya
  salió — **un correo enviado no se compensa**. Ahí está el punto fuerte de la respuesta: la
  incoherencia semántica que la consistencia eventual no resuelve.

### P2 — Entradas de concierto: Space-Based (cap. 15)

Es el ejemplo canónico del capítulo; el enunciado lo cita por capítulo, así que se espera el
razonamiento del libro.

- **Por qué Space-Based y no microservicios:** el cuello de botella en un pico de cientos a
  decenas de miles de usuarios en segundos es **la base de datos**, no el cómputo. Microservicios
  escala los servicios pero todos convergen en almacenes de datos. Space-Based saca la BD del
  camino de la petición: processing units con data grid en memoria, data writers/readers
  asíncronos, middleware virtualizado (messaging grid, data grid, processing grid, deployment
  manager). Elasticidad alta porque las unidades arrancan con los datos ya en memoria, sin
  contención de BD.
- **Colisiones de datos en cachés replicadas:** ocurren cuando dos processing units actualizan el
  mismo dato y la latencia de replicación provoca actualizaciones perdidas. Palancas: reducir la
  latencia de replicación; **particionar** la caché (cada sección de asientos en su partición, un
  único propietario por asiento); o pasar a caché **distribuida** con fuente única de verdad. Para
  asientos numerados la consistencia manda → se paga en latencia y se pierde algo de elasticidad.

### P3 — EDA topología broker: poison message

- **Impacto:** sin mediador no hay estado del flujo ni manejo central de errores. El mensaje se
  pierde o se reentrega en bucle bloqueando la cola (*head-of-line blocking*); la cadena posterior
  de eventos nunca se dispara y el usuario ve una operación a medias **sin ningún error visible**.
- **Solución pedida — Workflow Event Pattern (cap. 14):** el event processor delega el mensaje
  defectuoso a un **workflow processor** por una cola aparte; este intenta repararlo y lo reenvía a
  la cola original como mensaje nuevo. Si no puede repararlo, lo deposita en la cola del
  **dashboard**, que el equipo de operaciones monitorea para intervención manual.
- **Trade-offs:** el mensaje reparado vuelve a entrar **fuera de orden** (el propio enunciado lo
  nombra); complejidad añadida; la lógica de reparación duplica conocimiento del dominio.

### P4 — Granularidad en el sistema de RH

- **El error fundamental:** confundieron **entidad con bounded context**. Tomaron el esquema de
  tablas del monolito como eje de descomposición (un servicio por entidad: Empleado, Departamento,
  Nómina, Beneficios), y eso convierte cada operación de negocio en una transacción distribuida.
  Resultado: un **monolito distribuido**, más frágil que el original porque añade la red.
- **Nueva descomposición (cap. 17):** se argumenta con los tres criterios que nombra el enunciado.
  - **Propósito:** el servicio es una capacidad de dominio, no una tabla.
  - **Transacciones:** lo que debe ser atómico vive en el mismo servicio.
  - **Coreografía:** si dos servicios se hablan demasiado, es señal de fusionarlos.
- **Ejemplo para "contratación":** `EmployeeManagement` (empleado + asignación de departamento,
  atómico en un solo servicio) publica el evento `EmployeeHired`, que `Payroll` (nómina +
  beneficios) consume de forma asíncrona. La contratación es una llamada síncrona a un solo
  servicio, no una coreografía de cuatro.

### P5 — Transacciones financieras: SBA vs. Microservicios

Requisitos: 1) ACID absoluto, 2) despliegue independiente y rápido, 3) equipo de experiencia mixta.

- **Ganador: SBA.** BD compartida → un único límite transaccional → ACID natural. Y mucha menos
  complejidad operativa, decisivo con un equipo de experiencia mixta. Microservicios, con BD por
  servicio, obliga a Saga y consistencia eventual, lo que **viola el requisito 1**.
- **Matiz del requisito 2:** en SBA los servicios **sí** se despliegan independientemente (es lo que
  lo distingue del monolito), pero la BD compartida es un punto de acoplamiento: un cambio de
  esquema puede forzar despliegues coordinados de varios servicios. Ese "independiente con
  asterisco" es exactamente el trade-off que el CTO acepta al priorizar consistencia sobre
  agilidad.

### P6 — Legado de SOA

- **La clave:** SOA persiguió la reutilización como objetivo de primer orden, y **la reutilización
  genera acoplamiento**. Microservicios invierte el principio: prefiere **duplicación antes que
  acoplamiento** en la lógica de negocio (la validación de clientes se duplica, o se replican los
  datos, dentro de cada bounded context), y centraliza únicamente la reutilización **operativa**
  (logging, monitoreo, circuit breaker, autenticación) mediante el patrón **sidecar** / service
  mesh. Esa asimetría dominio-vs-operación es la respuesta que pide el enunciado.
- **Cuándo sigue valiendo la orquestación:** flujos largos con ramificación condicional, estado de
  larga duración, necesidad de visibilidad y de compensación estricta. Ejemplos defendibles:
  solicitud de hipoteca, tramitación de siniestros, fulfillment de pedidos con reembolsos
  compensatorios. Un mediador local en microservicios compra estado explícito y observabilidad, al
  coste de acoplamiento al mediador.

## 4. Señales de lo que el profesor va a calificar duro

El enunciado tiene tres aclaraciones insertadas a presión dentro del texto, lo que delata errores
que ya vio en entregas anteriores y no quiere volver a leer:

- *"Nota: Aunque comparte la base de datos, no es un monolito; los servicios se despliegan de forma
  independiente"* (sobre SBA).
- *"SOA admite tanto orquestación [...] como coreografía"*, y en la P6 otra vez: *"SOA también
  admite coreografía, no solo orquestación."*
- *"La orquestación es solo una de sus variantes."*

Si el documento dice "SBA = monolito" o "SOA = orquestación", se cae ahí.

## 5. Bibliografía y mapeo de capítulos

**Richards, M., & Ford, N. (2020).** *Fundamentals of Software Architecture: An Engineering
Approach.* O'Reilly Media. — referencia principal.

| Tema | Capítulos |
|---|---|
| Estilos arquitectónicos, monolito vs. distribuido | 9 y 18 |
| Service-Based Architecture | 13 |
| Event-Driven Architecture | 14 |
| Space-Based Architecture | 15 |
| SOA (orquestación y coreografía) | 16 |
| Microservices Architecture | 17 |
| Acoplamiento, connascencia, architecture quantum | 3, 7 y 8 |

**Ford, N., Richards, M., Sadalage, P., & Dehghani, Z. (2021).** *Software Architecture: The Hard
Parts.* O'Reilly Media. — datos distribuidos, consistencia eventual, Saga, CQRS, Event Sourcing:
capítulos 4, 6, 7 y 9.

**Ford, N., Parsons, R., & Kua, P. (2017).** *Building Evolutionary Architectures: Automated
Software Governance.* O'Reilly Media. — fitness functions, evolución guiada, gobierno
arquitectónico: capítulos 2, 3 y 5.

Richards & Ford (2020) ya está en el `references.bib` del seminario anterior como `richards2020`;
ese fichero sirve de punto de partida para el de este.

## 6. Estado y pendientes

El documento está completo y compilado: [`SemArq1_HavingFe.pdf`](SemArq1_HavingFe.pdf), 23
páginas, con las seis respuestas redactadas, dos diagramas TikZ, tres tablas de trade-offs,
bibliografía en estilo autor-año y la declaración de uso de IA.

Queda por hacer antes de entregar:

- **Confirmar el reparto de preguntas.** Está puesto el mismo del seminario anterior; si cambia,
  hay que tocar la portada de `main.tex` y el comentario de cabecera de cada `secciones/pN.tex`.
- **Revisar cada quien su pregunta.** Es lo que exige la declaración de IA que firma el equipo:
  contrastar las afirmaciones con los capítulos citados y reescribir lo que haga falta.
- **Ajustar la declaración de uso de IA** si alguien usó otra herramienta.

### Compilar

El documento usa `natbib` con `apalike` (no `biber`), así que compila con cualquier motor:

```bash
tectonic -X compile main.tex
```

Con una distribución TeX Live completa, `latexmk -pdf main.tex` también funciona. El PDF de
entrega se obtiene renombrando `main.pdf` a `SemArq1_HavingFe.pdf`.

### Flujo de trabajo

El del seminario anterior: una rama por pregunta (`pregunta-N`), cada integrante toca solo su
`secciones/pN.tex`, PR hacia `main` con revisión de otro integrante.
