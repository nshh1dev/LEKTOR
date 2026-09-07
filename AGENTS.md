# AGENTS.md

Guía de convenciones para asistentes de IA que trabajen en este repositorio.

## Proyecto

LEKTOR es un marketplace entre lectores para comprar y vender mangas, cómics y libros físicos de segunda mano. Es un proyecto de título desarrollado en conjunto por un equipo.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (componentes en `components/ui`)
- **Zustand** para el estado global
- **React Hook Form** + **Zod** para formularios y validación
- **Recharts** para gráficos de reportes

## Convenciones de código

- TypeScript estricto y tipado explícito donde aporte claridad.
- Usar los componentes base de `components/ui` (shadcn/ui) y no reimplementarlos.
- Colocar componentes por área:
  - `components/admin/` — interfaz de administración.
  - `components/panel/` — vistas del panel principal.
  - `components/worker/` — vistas del trabajador.
  - `components/ui/` — componentes base shadcn/ui (no modificar salvo necesidad).
- Estilos con Tailwind CSS; clases utilitarias, sin CSS suelto salvo casos necesarios en `app/globals.css`.
- No añadir comentarios innecesarios al código.
- Mantener la estructura de `app/` según las rutas del App Router:
  - `app/(panel)/` — área principal autenticada (dashboard, escaner, productos, reportes).
  - `app/admin/` — panel de administración.
  - `app/worker/` — vista de trabajador.

## Flujo de trabajo

- Antes de dar una tarea por terminada, verificar que el proyecto compile y pase el linter:
  - `pnpm build`
  - `pnpm lint`
- Seguir el estilo y patrones ya existentes en el proyecto.
- Los commits deben ser descriptivos y en español.

## Nota

Este archivo es leído por asistentes de IA (opencode, Antigravity, entre otros) al trabajar sobre este repositorio. Mantenerlo actualizado si el stack o las convenciones cambian.