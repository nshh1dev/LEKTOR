# AGENTS.md

Guía de convenciones para asistentes de IA que trabajen en este repositorio.

## Proyecto

LEKTOR es un marketplace entre lectores para comprar y vender mangas, cómics y libros físicos de segunda mano. Es un proyecto de título desarrollado en conjunto por un equipo.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (componentes en `components/ui`)
- **PostgreSQL** + **Drizzle ORM** (`db/schema.ts`, migraciones en `drizzle/`, seed en `scripts/seed.ts`)
- **React Hook Form** + **Zod** para formularios y validación
- **Recharts** para gráficos de reportes
- No hay estado global en cliente: los datos viven en PostgreSQL y el servidor los expone con route handlers.

## Estructura de datos

- `db/schema.ts` es la única fuente de verdad del esquema. Tras cambiarlo se ejecuta `pnpm db:generate` y se revisa la migración en `drizzle/`.
- `lib/` concentra el dominio: `auth.ts` (sesiones y roles), `catalog.ts` (constantes y esquemas Zod), `orders.ts` (máquina de estados de órdenes), `panel.ts` (consultas del panel), `isbn.ts`, `format.ts`, `pago.ts` (formato, Luhn y vigencia de tarjeta), `api.ts` (respuestas y errores HTTP), `rate-limit.ts` (límite de intentos por IP).
- `scripts/seed.ts` es idempotente: debe poder ejecutarse varias veces sin duplicar datos.
- Conexión por `DATABASE_URL` (ver `.env.example`).

## Roles y acceso

- Un único campo `users.rol` con `admin`, `worker` o `lector`. Es vendedor quien tenga publicaciones; no hay campo de rol separado.
- Las páginas del panel se protegen en el servidor con `panelPageUser()` de `lib/panel.ts`; las APIs usan `requirePanelUser()` o `requireAdminUser()`.
- El `worker` opera órdenes (`en_preparacion`, `despachada`, `cancelada`) y stock; confirmar la recepción es del comprador.
- No confiar solo en la UI para ocultar acciones: la validación va en el servidor.
- La pasarela de pago (`components/marketplace/pago-view.tsx`) es el límite del dominio: la tarjeta se
  valida en el navegador con `pagoFormSchema` y **nunca** se envía a la API ni se guarda. `POST
  /api/orders` sigue siendo el único que crea la orden, así que el flujo se puede seguir probando
  con `pnpm simular` sin pasar por la ventana de pago.

## Convenciones de código

- TypeScript estricto y tipado explícito donde aporte claridad.
- Usar los componentes base de `components/ui` (shadcn/ui) y no reimplementarlos.
- Colocar componentes por área:
  - `components/marketplace/` — vistas del marketplace público (`catalog-view`, `detail-view`, `sell-view`, `checkout-view`, `pago-view`, `profile-view`, `auth-view`, `order-card`, `product-card`, `hero`) más `types.ts`, `api.ts` y `shared.tsx`. El shell que las coordina sigue en `components/lektor-marketplace.tsx`.
  - `components/notificacion/` — sistema único de avisos: `avisar.tsx` (toasts), `avisos.tsx` (bloques en línea y lista de datos faltantes), `sello.tsx` (sello estampado), `toaster.tsx` y `confirmar-accion.tsx`.
  - `components/admin/` — shell del panel.
  - `components/panel/` — vistas del panel principal.
  - `components/worker/` — vistas del trabajador.
  - `components/ui/` — componentes base shadcn/ui (no modificar salvo necesidad).
- **Avisos**: todo aviso del proyecto pasa por `components/notificacion/`. No se llama a `toast.*`
  directamente fuera de `avisar.tsx`, ni se usa `AlertDialog` fuera de `confirmar-accion.tsx`, ni
  `Alert` de shadcn. El vocabulario (tonos `ok`/`falla`/`revisar`/`dato`, rótulos y copy de motivos
  de fallo) está en `lib/avisos.ts`: `TONO_AVISO`, `ROTULO_AVISO`, `MOTIVO_FALLO`, `mensajeDeFallo` y
  `resumenFaltantes`. Un error de negocio se explica con `mensajeDeFallo(fallo, respaldo)`, que
  traduce el `reason` del servidor; los pendientes de un formulario salen de `resumenFaltantes` para
  que se listen en `FaltanDatos` en vez de dejar el botón muerto.
- Los avisos se construyen con `toast.custom` porque sonner renderiza `title` crudo; el `Toaster` va
  con `unstyled` y el color del botón de cerrar seCorrige con `--normal-bg`/`--normal-border`.
- El sello (`animate-sello`) y la ficha usan tokens propios: `--aviso-ok`, `--aviso-falla`,
  `--aviso-revisar`, `--aviso-dato` y sus variantes `-tenue`, más las utilidades `papel`,
  `filete`, `filete-vertical` y `sombra-tomo` de `app/globals.css`. El éxito es el oro de la marca,
  nunca un verde genérico.
- APIs de lectura del panel bajo `app/api/panel/*`; el cliente usa `lib/panel-client.ts` (`panelGet`, `panelEnviar`, `usePanelQuery`).
- En SQL con Drizzle, calificar las columnas dentro de subconsultas (`users.id`, `publications.id`); interpolar `${tabla.columna}` puede quedar sin calificar y resolverse contra la tabla interna.
- La condición `where` es compartida por la consulta de filas y la de conteo: si menciona columnas de
  una tabla unida (`publications`, `users`), el conteo también debe declarar esos joins o falla.
- Evitar joins de dos tablas con relaciones distintas en la misma consulta: multiplican los agregados. Usar subconsultas correlacionadas.
- Estilos con Tailwind CSS; clases utilitarias, sin CSS suelto salvo casos necesarios en `app/globals.css`.
- No añadir comentarios innecesarios al código.
- Mantener la estructura de `app/` según las rutas del App Router:
  - `app/(panel)/` — área principal autenticada (dashboard, escaner, productos, reportes, usuarios).
  - `app/admin/` — entrada del panel de administración.
  - `app/worker/` — vista de bodega.

## Flujo de trabajo

- Antes de dar una tarea por terminada, verificar que el proyecto compile y pase el linter:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Esos mismos comandos corren en `.github/workflows/ci.yml` en cada `push` a `main` y en cada
  PR: si la CI falla, el cambio no entra. La CI no necesita PostgreSQL porque las pruebas del
  dominio son puras.
- El proyecto no se despliega a producción: es académico y se demuestra con `pnpm dev` y
  `pnpm simular`. No agregar pasos de despliegue, variables de un entorno real ni secretos.
- Si cambian el esquema o el seed: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`.
- Las pruebas viven en `tests/` y usan el runner nativo de Node con `tsx` (`node --import tsx --test`).
  Cubren el dominio puro (`lib/isbn.ts`, `lib/format.ts`, `lib/catalog.ts`, `lib/pago.ts`, `lib/rate-limit-store.ts`,
  `lib/panel-sql.ts`) y un guardián de codificación; lo que depende de Next o de la base de datos se
  prueba con `pnpm simular`, que hace peticiones reales contra el dev server.
- `scripts/simular-flujo.ts` (`pnpm simular`) es la puerta de calidad de los flujos: necesita
  `pnpm dev` en marcha, crea sus propios datos y sale con `1` si algo no cuadra. Antes de repetirla
  desde cero: `pnpm db:reset` (`scripts/db-reset.ts`, destructivo y restringido a URLs locales).
- El rate limit de registro es de 5 intentos por hora y por IP, y el contador vive en la memoria del
  proceso: al ampliar la simulación, reutilizar cuentas del seed en vez de registrar más actores.
- Todo cambio de stock debe dejar movimiento en `stock_movements` (venta, ajuste y devolución por
  cancelación o reserva vencida). La simulación audita que la cadena de movimientos sea continua y
  termine en el stock actual de la publicación.
- Archivos siempre en UTF-8. `tests/encoding.test.ts` falla si algún archivo queda con doble
  codificación (`Ã³`, `Â·`, …): no editar con herramientas que reescriban el archivo usando la
  página de códigos del sistema. Ese test además fija varias cadenas del marketplace (p. ej.
  `"quedó reservado por ti"`, `"Código de orden"`, `"Sesión cerrada"`): si se edita copy, la frase
  tiene que seguir apareciendo **contigua en el código**, no partida por un salto de línea de JSX.
- Seguir el estilo y patrones ya existentes en el proyecto.
- Los commits deben ser descriptivos y en español.

## Nota

Este archivo es leído por asistentes de IA (opencode, Antigravity, entre otros) al trabajar sobre este repositorio. Mantenerlo actualizado si el stack o las convenciones cambian.
