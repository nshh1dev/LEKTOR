# AGENTS.md

Guía de convenciones para asistentes de IA que trabajen en este repositorio.

## Proyecto

LEKTOR es un marketplace entre lectores para comprar y vender mangas, cómics y libros físicos de segunda mano. Es un proyecto académico grupal.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (componentes en `components/ui`)
- **PostgreSQL** + **Drizzle ORM** (`db/schema.ts`, migraciones en `drizzle/`, seed en `scripts/seed.ts`)
- **React Hook Form** + **Zod** para formularios y validación
- **Recharts** para gráficos de reportes
- No hay estado global en cliente: los datos viven en PostgreSQL y el servidor los expone con route handlers.

## Estructura de datos

- `db/schema.ts` es la única fuente de verdad del esquema. Tras cambiarlo se ejecuta `pnpm db:generate` y se revisa la migración en `drizzle/`.
- `lib/` concentra el dominio: `auth.ts` (sesiones y roles), `catalog.ts` (constantes, esquemas Zod y `TRANSICIONES_ORDEN`), `orders.ts` (operaciones de orden sobre la base), `panel.ts` (consultas del panel), `avisos.ts` (vocabulario de avisos), `reviews.ts` (valoraciones verificadas de solo estrellas: crear, editar, moderar y recalcular promedios, con el `orderId` opcional para anclar la reseña a la compra recibida), `sellers.ts` (perfil público del vendedor), `conversaciones.ts` (contacto previo antes de la compra: abrir, responder, listar y leer hilos), `isbn.ts`, `entrada.ts` (máscaras de precio y teléfono), `format.ts`, `pago.ts` (formato, Luhn y vigencia de tarjeta), `api.ts` (respuestas y errores HTTP), `rate-limit.ts` (límite de intentos por IP).
- **Auditoría de órdenes**: cada cambio de estado deja una fila en `order_events` (`ordenId`, `actorId`, `estadoAnterior`, `estadoNuevo`, `motivo`, `intervencionAdmin`). Se escribe en `registrarEvento` (`lib/orders.ts`), dentro de la misma transacción que el cambio, y se lee en `GET /api/orders/[id]/events`, que solo abre a comprador, vendedor y administración. Tres reglas:
  - `actorId` nulo significa que no hubo persona detrás: es el barrido de reservas vencidas (`sweepExpiredReservations`). Atribuirlo al vendedor sería inventar un autor.
  - `intervencionAdmin` marca el caso que no se puede leer en la orden misma: la administración (`user.rol === "admin"`) que no es ni compradora ni vendedora. En ese caso el aviso a la contraparte usa el tipo `orden_intervenida` y lo dice en el título, y el motivo del movimiento de stock dice `cancelada por la administracion`.
  - El seed deja las órdenes que crea sin historial, porque sus estados son anteriores a la tabla. No es un hueco del código.
- `scripts/seed.ts` es idempotente: debe poder ejecutarse varias veces sin duplicar datos.
- Conexión por `DATABASE_URL` (ver `.env.example`).

## Roles y acceso

- Un único campo `users.rol` con `admin` o `lector`. Es vendedor quien tenga publicaciones; no hay campo de rol separado.
- Las páginas del panel se protegen en el servidor con `panelPageUser()` de `lib/panel.ts`; las APIs usan `requirePanelUser()` o `requireAdminUser()`.
- El recorrido de la orden es del vendedor, que prepara y despacha; el comprador confirma la recepción y ambos pueden cancelar mientras esté reservada o en preparación.
- El chat de la orden (`components/marketplace/chat-orden.tsx` sobre `app/api/orders/[id]/chat`) es privado: solo lo ven el comprador y el vendedor de esa orden, ni siquiera la administración.
- El contacto previo (`lib/conversaciones.ts`, `app/api/conversaciones`) comparte esa regla: un lector puede escribirle al vendedor de una publicación antes de comprar, y el hilo solo lo ven esas dos personas, ni siquiera la administración. Sus avisos usan el tipo `contacto` (uno por publicación y comprador).
- No confiar solo en la UI para ocultar acciones: la validación va en el servidor.
- La pasarela de pago (`components/marketplace/pago-view.tsx`) es el límite del dominio: la tarjeta se
  valida en el navegador con `pagoFormSchema` y **nunca** se envía a la API ni se guarda. `POST
  /api/orders` sigue siendo el único que crea la orden, así que el flujo se puede seguir probando
  con `pnpm simular` sin pasar por la ventana de pago.

## Convenciones de código

- TypeScript estricto y tipado explícito donde aporte claridad.
- Usar los componentes base de `components/ui` (shadcn/ui) y no reimplementarlos.
- Colocar componentes por área:
  - `components/marketplace/` — vistas del marketplace público (`catalog-view`, `detail-view`, `sell-view`, `checkout-view`, `pago-view`, `profile-view`, `seller-view`, `auth-view`, `order-card`, `product-card`, `dialogo-contacto`, `filter-index`, `hero`) más `types.ts`, `api.ts` y `shared.tsx`. El shell que las coordina sigue en `components/lektor-marketplace.tsx`.
  - `components/notificacion/` — sistema único de avisos: `avisar.tsx` (toasts), `avisos.tsx` (bloques en línea y lista de datos faltantes), `sello.tsx` (sello estampado), `toaster.tsx` y `confirmar-accion.tsx`.
  - `components/escaner-isbn.tsx` — lector de ISBN por cámara, compartido por `sell-view` y el escáner del panel.
  - `components/admin/` — shell del panel.
  - `components/panel/` — vistas del panel principal.
  - `components/ui/` — componentes base shadcn/ui (no modificar salvo necesidad).
- **Avisos**: todo aviso del proyecto pasa por `components/notificacion/`. No se llama a `toast.*`
  directamente fuera de `avisar.tsx`, ni se usa `AlertDialog` fuera de `confirmar-accion.tsx`, ni
  `Alert` de shadcn. El vocabulario (tonos `ok`/`falla`/`revisar`/`dato`, rótulos y copy de motivos
  de fallo) está en `lib/avisos.ts`: `TONO_AVISO`, `ROTULO_AVISO`, `MOTIVO_FALLO`, `mensajeDeFallo` y
  `resumenFaltantes`. Un error de negocio se explica con `mensajeDeFallo(fallo, respaldo)`, que
  traduce el `reason` del servidor; los pendientes de un formulario salen de `resumenFaltantes` para
  que se listen en `FaltanDatos` en vez de dejar el botón muerto.
- **Cuerpo de las peticiones**: cuando un componente manda datos a una API, el objeto del cuerpo se arma
  con una función pura de `lib/` y su tipo de retorno es `z.infer<typeof <esquema>>`, no un objeto literal
  escrito en el `.tsx`. Así el compilador falla si a la API le falta un campo que el esquema exige, y una
  prueba la pasa por `safeParse` para fijar el contrato. Un ejemplo: `cuerpoDeRegistro` de `lib/catalog.ts`
  alimenta a `registroSchema`. Ninguna puerta cubre esto por sí sola —`pnpm simular` pega contra la API
  con su propio payload y no pasa por el componente—: es el eslabón que hay que cerrar a mano.
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
  - `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` y `app/robots.ts` — estados globales de la App
    Router. Las rutas del panel agregan su propio `loading.tsx` con
    `components/panel/route-loading.tsx`.

## Flujo de trabajo

- Antes de dar una tarea por terminada, verificar que el proyecto compile y pase el linter:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Esos mismos comandos corren en `.github/workflows/ci.yml` en cada `push` a `main` y en cada
  PR. La CI no necesita PostgreSQL porque las pruebas del dominio son puras.
- **Ningún cambio va directo a `main`.** El flujo es: rama propia → commits frecuentes → push de
  la rama → pull request a `main`. Cuando las cuatro puertas pasan, el cambio está listo para
  abrir el PR: no se espera a que lo pidan, pero tampoco se salta el PR.
- El proyecto no se despliega a producción: es académico y se demuestra con `pnpm dev` y
  `pnpm simular`. No agregar pasos de despliegue, variables de un entorno real ni secretos.
- Si cambian el esquema o el seed: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`.
- Las fotos del aviso salen de `POST /api/uploads`, que valida la firma de los bytes y escribe en
  `public/uploads/`. Esa carpeta está en `.gitignore`: las imágenes del entorno local no se versionan.
- Nada se escribe fuera de la carpeta del proyecto. El almacén de paquetes de pnpm está fijado con
  `storeDir: .pnpm-store` en `pnpm-workspace.yaml` (en pnpm 12 los ajustes de pnpm ya no se leen del
  `.npmrc`); sin eso pnpm crea `D:\.pnpm-store` en la raíz de la unidad. `.pnpm-store/` está en
  `.gitignore`.
- Las entradas del usuario se formatean mientras se escriben con los helpers puros de `lib/entrada.ts`
  (`formatearPrecio`, `formatearTelefono`) y de `lib/isbn.ts` (`formatIsbn`), no con lógica suelta en
  cada vista. El esquema Zod acepta lo ya formateado y devuelve el valor canónico: `precioANumero`
  convierte `$15.000` a `15000` y el teléfono se guarda con los espacios que la API ya acepta. Al
  formatear en vivo, el `Input` va como `type="text"` con `inputMode="numeric"` y el `onChange` de
  React Hook Form vuelve a escribir con `setValue`; no se usa `valueAsNumber` en campos formateados.
- Las pruebas viven en `tests/` y usan el runner nativo de Node con `tsx` (`node --import tsx --test`).
  Cubren el dominio puro (`lib/isbn.ts`, `lib/format.ts`, `lib/catalog.ts`, `lib/entrada.ts`, `lib/pago.ts`, `lib/rate-limit-store.ts`,
  `lib/panel-sql.ts`) y un guardián de codificación; lo que depende de Next o de la base de datos se
  prueba con `pnpm simular`, que hace peticiones reales contra el dev server.
- `scripts/simular-flujo.ts` (`pnpm simular`) es la puerta de calidad de los flujos: necesita
  `pnpm dev` en marcha, crea sus propios datos y sale con `1` si algo no cuadra. Antes de repetirla
  desde cero: `pnpm db:reset` (`scripts/db-reset.ts`, destructivo y restringido a URLs locales).
- **El dev server solo se levanta cuando la persona lo pide de forma explícita.** La regla original
  (prohibir que un asistente arranque Next) se cambió el 2026-10-01 a pedido del equipo, porque
  obliga a cortar la sesión para ver la aplicación. Desde entonces:
  - Un asistente **puede** arrancar `pnpm dev` / `next dev` si la persona lo pide, pero **nunca por
    iniciativa propia** para correr `pnpm simular` u otra puerta: primero se pergunta.
  - Si lo arranca, avisa en qué puerto quedó y **lo detiene al terminar** la tarea o cuando se lo
    pidan. No dejar procesos de Next escuchando en el puerto 3000 al cerrar la sesión.
  - Si `pnpm simular` no puede correr porque no hay servidor, se dice y se sigue con el resto de las
    puertas (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), que no necesitan ninguno de
    los dos. Las etapas de simulación que tocan base de datos se pueden auditar de forma alternativa
    con `pnpm db:seed` y consultas directas de solo lectura.
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
- Ramas de Git: usar prefijos por tipo de trabajo. Nomenclatura: <tipo>/<descripcion-kebab-case>.
  - feature/  -> nuevas funcionalidades (ej.: feature/auth-login-register, feature/favoritos)
  - fix/      -> correcciones de bugs (ej.: fix/login-rate-limit)
  - refactor/ -> reorganización sin cambiar comportamiento (ej.: refactor/orders-dominio)
  - docs/     -> solo documentación (ej.: docs/actualizar-readme)
  - chore/    -> mantenimiento/config/dependencias (ej.: chore/actualizar-tsx)
  - test/     -> añadir/corregir tests (ej.: test/reviews-validacion)
  - perf/     -> mejoras de rendimiento (ej.: perf/catalogo-consultas)
  - hotfix/   -> arreglos urgentes sobre main (ej.: hotfix/stock-negativo)
  Base siempre `main` actualizado. La rama se crea nueva y fresca; no se reutiliza una rama vieja
  que quedó atrás. Un PR = una única unidad de trabajo, destino `main`. El nombre de la rama
  describe **la tarea**, no el módulo: `feature/filtro-panel-ventas` y no `feature/panel`.
- `main` es la línea de integración y **no se reescribe**: no se rebasea, no se borra y no se fuerza
  un push. Para ver cómo entró un módulo se usa `git log -- <archivos>`.
- **Trabajo en equipo (tres personas).** El flujo diario es corto y sin reuniones:
  - Al empezar el día: `git switch <tu-rama>` → `git fetch origin` → `git merge origin/main`.
    Traer `main` **todos los días**, no solo antes de abrir el PR: un conflicto de un día cuesta
    minutos y uno de una semana, horas.
  - Se trabaja en la rama propia con commits chicos. Si el cambio toca un archivo que otra
    persona está tocando, se avisa en el grupo antes de seguir.
  - Antes de abrir el PR: las cuatro puertas. Nadie mergea su propio PR; lo revisa otra persona.
- **Reparto por áreas, para que los archivos no se pisen.** No es propiedad: cualquiera puede
  escribir en cualquier área, y el reparto indica quién **revisa** cada una y quién desempata.
  - Órdenes, checkout y pago → `components/marketplace/checkout-view.tsx`, `order-card.tsx`,
    `pago-view.tsx`, `comprobante.tsx`, `chat-orden.tsx`, `app/api/orders/*`, `lib/orders.ts`
  - Panel y administración → `components/panel/*`, `components/admin/*`, `app/(panel)/*`,
    `app/api/panel/*`, `lib/panel.ts`
  - Perfil y valoraciones → `components/marketplace/profile-view.tsx`, `valoraciones.tsx`,
    `dialogo-valoracion.tsx`, `seller-view.tsx`, `lib/reviews.ts`, `lib/sellers.ts`
  - Zonas de aviso por solapamiento: `profile-view.tsx` (lo tocan órdenes y perfil) y
    `lib/catalog.ts`. Quien los toque, lo dice en el grupo.
- **Archivos compartidos: se serializan, no se reparten.**
  - `scripts/simular-flujo.ts` lo tocan casi todas las ramas: **un solo PR a la vez** sobre ese
    archivo, avisado en el grupo. No es de nadie.
  - `db/schema.ts` y las migraciones: antes de correr `pnpm db:generate`, mirar el PR abierto
    más reciente para ver qué número se está usando y **anotar el número en el PR**. Dos personas
    que generan la misma dejan dos entradas con el mismo `idx` en `drizzle/meta/_journal.json` y
    `pnpm db:migrate` deja de saber qué aplicar.
- **Operaciones destructivas: se avisa antes, siempre.** Sin excepción y sin importar cuán
  urgente parezca:
  - `git push --mirror` **borra** en el remoto toda referencia que no exista en local. Es la causa
    más común de perder un repositorio entero.
  - `git push --force` a `main` está prohibido; `main` no se reescribe nunca.
  - Borrar, renombrar o recrear el repositorio en GitHub requiere ser **owner**. Los owners son
    decisiones del grupo: si una sola persona puede borrar el proyecto, un mal día se pierde todo.
    Lo que se guarda en local (un `git bundle` o un clon completo) es la red de seguridad.
  - `git fetch --prune` solo es seguro si las ramas que importan están respaldadas: borra las
    referencias remotas que ya no existen en el remoto.
- `main` está **protegido en GitHub**: no se admiten force pushes, no se puede borrar la rama, y la
  regla aplica también a los administradores. La protección exige pull request, una aprobación y
  que pasen las cuatro puertas, así que un commit roto no llega a `main`.
- `.gitattributes` fija LF en todo el repositorio y Git normaliza al commitear: da igual si el editor
  guarda en CRLF, no hay que convertir archivos a mano.

## Nota

Este archivo es leído por asistentes de IA (opencode, Antigravity, entre otros) al trabajar sobre este repositorio. Mantenerlo actualizado si el stack o las convenciones cambian.
