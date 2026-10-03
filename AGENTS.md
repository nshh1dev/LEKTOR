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
  PR. La CI **avisa, no bloquea**: avisa si algo falla, pero el cambio ya está en `main` o en el
  PR. La CI no necesita PostgreSQL porque las pruebas del dominio son puras.
- Ojo con esto: la CI **no corre al empujar una rama**, solo en `push` a `main` y en PR a `main`.
  Una rama subida sin PR no la valida nadie, así que sus commits pueden llevar días sin que GitHub
  los mire. Las puertas locales (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) sí
  pasan, pero son las de esta máquina: abrir el PR es lo que dispara la única verificación
  independiente.
- Todo cambio bueno y verificado se sube a GitHub en cuanto `pnpm typecheck`, `pnpm lint`,
  `pnpm test` y `pnpm build` pasen: commit descriptivo en español, `push` **a la rama de
  trabajo** y PR a `main`. Nunca se empuja directo a `main`, aunque las puertas estén en verde.
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
  Cubren el dominio puro (`lib/isbn.ts`, `lib/format.ts`, `lib/catalog.ts`, `lib/entrada.ts`, `lib/pago.ts`, `lib/avisos.ts`, `lib/rate-limit-store.ts`,
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
- Hay dos topes de intentos, los dos por IP y con el contador en la memoria del proceso: el registro
  admite 5 intentos por hora y el login 30 cada 5 minutos. Al ampliar la simulación, reutilizar
  cuentas del seed en vez de registrar más actores.
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
  Base siempre main (último commit). Crear ramas desde main actualizado. Un PR = una única unidad de trabajo, destino main.
- `main` es la línea de integración y **no se reescribe**. Todo el trabajo hecho hasta ahora está
  fusionado ahí, módulo por módulo y en commits atómicos, no en ramas: para ver cómo entró un módulo
  se usa `git log -- <archivos>`, no se parte la historia para reconstruir lo ya hecho.
- Las nueve `feature/*` del repositorio son marcadores de módulo: apuntan a la base de `main` y no
  tienen commits propios. Sirven para el trabajo que venga, no como destino del pasado.
- Trabajo nuevo: `git switch feature/<módulo>` → `git merge main` (fast-forward si la rama solo va
  atrasada) → commits frecuentes → PR a `main`. `main` nunca se rebasea ni se reescribe.
- **Trabajo en equipo**: desde el 2026-10-03 el flujo acordado es rama → PR → `main`; ya no se
  empuja directo a `main`. Eso no elimina la deriva: `main` sigue moviéndose, ahora por merges,
  así que las ramas se atrasan igual y el síntoma sigue siendo el mismo, que el PR se marque en
  conflicto o que `pnpm build` falle por archivos que no tocaste. Antes de seguir trabajando y
  antes de abrir el PR, pon la rama al día:
  `git switch feature/<módulo>` → `git fetch origin` → `git merge origin/main` → resolver los
  conflictos **en la rama** → volver a correr `pnpm typecheck`, `pnpm lint`, `pnpm test` y
  `pnpm build`. Nunca al revés: no se reescribe `main` ni se fuerza un push.
- `main` está **protegido en GitHub** desde el 2026-10-02: no se admiten force pushes, no se puede borrar
  la rama, y la regla también aplica a los administradores. Y nada más: **no** se pide pull request y
  **no** se exigen checks para pushear. La protección frena que se destruya la historia, no que alguien
  salte el flujo, así que trabajar en rama es una convención que el equipo respeta, no una barrera que
  lo imponga GitHub. La CI sigue corriendo en cada push y avisa si algo falla, pero un commit roto
  llega igual a `main` y queda en rojo: la garantía es que la historia no se puede reescribir ni borrar.
  Ese ajuste se dejó así a propósito el 2026-10-03. Activar "Require status checks to pass" ya no
  obligaría al equipo a abandonar las ramas, porque ya trabajan en ramas, así que algún día se
  puede activar sin el costo que tenía antes; conviene hacerlo cuando la CI sea estable. Lo que sí
  rechazaría, siempre, son los `push` directos a `main`.
- `.gitattributes` fija LF en todo el repositorio y Git normaliza al commitear: da igual si el editor
  guarda en CRLF, no hay que convertir archivos a mano.

## Nota

Este archivo es leído por asistentes de IA (opencode, Antigravity, entre otros) al trabajar sobre este repositorio. Mantenerlo actualizado si el stack o las convenciones cambian.
