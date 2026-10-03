<div align="center">

<img src="frontend/public/favicon.svg" width="76" alt="">

# Astarship

**Generación automática de itinerarios turísticos**

*A\* + starship*

<br>

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

<sub>Proyecto de **Bases de Datos II** e **Ingeniería de Software** · Curso 2026–2027<br>
Facultad de Matemática y Computación · Equipo **HAVING Fe**</sub>

</div>

---

## Qué es

Un sistema de gestión para una agencia de viajes que **arma los itinerarios solo**.

Administra el banco de actividades y atracciones, los paquetes turísticos en los que se usan, los guías que las describen y validan, y los turistas que las recorren. A partir de ahí genera itinerarios que respetan criterios de equilibrio: proporción de actividades por tipo, cobertura de categorías y distribución del esfuerzo físico a lo largo del recorrido.

Las atracciones no viven sueltas: forman una **red de conexiones de transporte** con tiempos y costos asociados. El sistema la recorre para proponer alternativas cuando una actividad no cabe en su horario.

## Arrancar

Necesitas [Docker](https://www.docker.com/), [uv](https://docs.astral.sh/uv/) y [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/alfonsotejeda/astarship.git
cd astarship
cp .env.example .env
```

**Base de datos y API** — desde la raíz:

```bash
docker compose up -d
```

**Frontend** — en otra terminal:

```bash
cd frontend && pnpm install && pnpm dev
```

Y ya tienes:

| | |
|---|---|
| Aplicación | <http://localhost:5173> |
| API | <http://localhost:8000> |
| Documentación interactiva (Swagger) | <http://localhost:8000/docs> |
| PostgreSQL | `localhost:5432` |

### Trabajar en el backend sin Docker

Más cómodo si estás tocando la API a cada rato. Deja la base de datos en Docker y corre la API a mano:

```bash
docker compose up -d db
cd backend
uv sync
uv run fastapi dev app/main.py
```

## Estructura

```
astarship/
├── backend/              API en FastAPI
│   ├── app/
│   │   ├── api/          enrutadores HTTP, una carpeta por área
│   │   ├── core/         configuración transversal
│   │   ├── db/           motor, sesiones y base declarativa
│   │   ├── models/       modelos ORM  (se llenan al cerrar el MERX)
│   │   ├── schemas/      esquemas Pydantic de entrada y salida
│   │   ├── services/     lógica de negocio: generación, grafo, reportes
│   │   └── main.py
│   ├── tests/
│   └── Dockerfile
├── frontend/             interfaz en React + TypeScript (Vite)
│   └── src/
│       └── components/
├── docs/
│   ├── enunciado.pdf     el problema tal como lo mandaron
│   └── merx/             versiones del modelo entidad-relación extendido
└── docker-compose.yml
```

## Comandos

| Qué | Dónde | Comando |
|---|---|---|
| Correr la API | `backend/` | `uv run fastapi dev app/main.py` |
| Pruebas | `backend/` | `uv run pytest` |
| Lint y formato | `backend/` | `uv run ruff check . && uv run ruff format .` |
| Añadir dependencia | `backend/` | `uv add <paquete>` |
| Crear migración | `backend/` | `uv run alembic revision --autogenerate -m "qué cambia"` |
| Aplicar migraciones | `backend/` | `uv run alembic upgrade head` |
| Deshacer la última | `backend/` | `uv run alembic downgrade -1` |
| Ver en qué versión estás | `backend/` | `uv run alembic current` |
| Correr el frontend | `frontend/` | `pnpm dev` |
| Compilar el frontend | `frontend/` | `pnpm build` |
| Levantar todo | raíz | `docker compose up -d` |
| Ver logs de la API | raíz | `docker compose logs -f api` |
| Parar todo | raíz | `docker compose down` |

## Migraciones

El esquema de la base de datos se versiona con [Alembic](https://alembic.sqlalchemy.org/), igual que el código con git. **Nunca se toca la base de datos a mano**: cada cambio es una migración que se commitea.

Después de cada `git pull`:

```bash
cd backend && uv run alembic upgrade head
```

Al añadir o cambiar un modelo:

```bash
uv run alembic revision --autogenerate -m "añade tabla actividad"
```

Dos cosas que hay que tener presentes:

- **Revisa siempre el fichero generado** antes de aplicarlo. Alembic acierta con tablas y columnas nuevas, pero un renombrado lo interpreta como "borra una columna y crea otra", y eso se lleva los datos por delante.
- **Importa el modelo en `migrations/env.py`.** Si no está importado, Alembic no lo ve y la migración sale vacía.

## Convenciones

- **Docstrings en todo el código.** Es requisito de la asignatura, y en FastAPI el docstring de cada endpoint sale automáticamente en Swagger. `ruff` lo comprueba: la regla `D` está activada.
- **Ramas**: `main` siempre funcionando. Se trabaja en `feat/…`, `fix/…`, `docs/….`
- **Commits** en imperativo y en español: `añade endpoint de actividades`.
- Antes de abrir un PR: `uv run ruff check .` y `uv run pytest` en verde.

## Estado

El diseño de la base de datos está en curso — el MERX va por la v1.6 y le faltan cardinalidades en el bloque de usuarios y permisos. Las versiones están en [`docs/merx/`](docs/merx/); los `.md` se abren con el plugin de Excalidraw en Obsidian.

La planificación vive en [`planificacion/`](planificacion/). Empieza por [`requisitos.md`](planificacion/requisitos.md), y en particular por su sección de **puntos abiertos**: son las decisiones que todavía bloquean el modelo.

- [x] Stack decidido y aprobado
- [x] Repositorio y esqueleto del proyecto
- [x] Requisitos funcionales y no funcionales (borrador)
- [ ] Milestones y detalle por pantalla
- [ ] MERX cerrado y validado por el profesor
- [ ] Esquema lógico relacional y migraciones
- [ ] Generación automática de itinerarios
- [ ] Red de atracciones (grafo)
- [ ] Las 6 consultas y sus reportes
- [ ] Exportación a PDF y ordenamiento por columnas

## Equipo

| | Grupo | GitHub |
|---|---|---|
| Adrián Estévez Álvarez | C312 | [@Chikiak](https://github.com/Chikiak) |
| Alfonso Tejeda Rodríguez | C312 | [@alfonsotejeda](https://github.com/alfonsotejeda) |
| Eric Reyes Milián | C312 | [@EricReyesMilian](https://github.com/EricReyesMilian) |
| Kamila Reinoso Asín | C311 | [@KamAlien](https://github.com/KamAlien) |
| Miguel Andrés Cazorla Zamora | C312 | [@andr-migue](https://github.com/andr-migue) |

<div align="center">
<sub>HAVING Fe · 2026</sub>
</div>
