# LEKTOR

> Historias que encuentran nueva estantería.

Marketplace entre lectores para comprar y vender **mangas, cómics y libros físicos de segunda mano**.

Proyecto de título de desarrollo individual. Aplicación web para conectar vendedores y compradores de libros usados, con módulos de gestión de inventario, usuarios y reportes.

> **Alcance:** es un proyecto académico, no un servicio en producción. No hay despliegue,
> ni dominio, ni operación continua: se demuestra en desarrollo (`pnpm dev`) y con
> `pnpm simular`. La pasarela de pago es una simulación con fines de demostración y
> los datos de `.env.example` apuntan a un PostgreSQL local.

## Características

### Marketplace

- Catálogo con búsqueda, filtros por categoría, condición, precio (por tramos) y comuna, más orden.
- Fichas de publicación con galería de imágenes por URL, relacionados y perfil del vendedor.
- Perfiles de usuario con reseñas, métricas de venta y verificación de correo.
- Escaneo de ISBN con la cámara del dispositivo (`BarcodeDetector`) o entrada manual, consultation de Open Library y caché local de metadatos.
- Compra directa con pasarela de pago por tarjeta, envío a domicilio o retiro en punto, y notificaciones de cada cambio de estado.
- Reserva inmediata de ejemplares por **48 horas** con liberación automática de stock.

### Panel de operación

- **Roles**: `admin` y lector; un usuario es vendedor si publica ejemplares.
- **Dashboard**: ventas del mes, reservas por vencer, alertas de stock, últimas órdenes, movimientos y tops de venta.
- **Publicaciones**: moderación de catálogo (pausar, reactivar, eliminar), filtros por estado, categoría, vendedor y orden.
- **Escáner**: ficha de un ISBN, publicaciones asociadas y ajuste de stock en el momento.
- **Reportes**: serie diaria de ventas, top de títulos y vendedores, desglose por categoría, estado, método de entrega y detalle de órdenes.
- **Usuarios**: gestión de rol y estado de cuentas (solo administración).
- **Órdenes**: el vendedor prepara y despacha sus ventas, el comprador confirma la recepción y ambos coordinan la entrega por el chat privado de la orden.
- **Historial de movimientos** de stock (`entrada`, `salida`, `ajuste`) con usuario, motivo y stock anterior/resultante.
  Editar el stock desde el perfil del vendedor también genera un movimiento `ajuste`, siempre dentro de una
  transacción con bloqueo de fila para que no se pise con una compra simultánea.
- Interfaz con **tema claro/oscuro**.

## Stack tecnológico

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [TypeScript](https://www.typescript.org/) en modo estricto
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) sobre Radix UI
- [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) + [drizzle-kit](https://orm.drizzle.team/docs/kit-docs/overview)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) (formularios y validación)
- [Recharts](https://recharts.org/) (gráficos de reportes)
- [bcryptjs](https://github.com/kelektiv/node.bcrypt.js) (hash de contraseñas), sesiones en cookie `lektor_session`

## Requisitos previos

- [Node.js](https://nodejs.org/) 20 o superior
- [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/downloads) 16 o superior, con una base de datos `lektor`

## Instalación

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar la conexión a la base de datos
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux

# 3. Aplicar el esquema (migraciones versionadas en drizzle/)
pnpm db:migrate

# 4. Cargar datos de demostración (idempotente)
pnpm db:seed

# 5. Ejecutar en modo desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Cuentas de demostración

| Rol      | Correo              | Contraseña |
| -------- | ------------------- | ---------- |
| Admin    | `admin@lektor.cl`   | `admin123` |
| Lector   | `otaku@lektor.cl`   | `otaku123` |

El resto de lectores de ejemplo usa la contraseña `123456` (`nico@`, `camila@`, `felipe@`, `vale@`, `jorge@`, `fran@`).

## Scripts disponibles

| Comando            | Descripción                                          |
| ------------------ | ---------------------------------------------------- |
| `pnpm dev`         | Inicia el servidor de desarrollo                     |
| `pnpm build`       | Genera la versión de producción                      |
| `pnpm start`       | Inicia el servidor de producción                     |
| `pnpm lint`        | Ejecuta el linter de ESLint                          |
| `pnpm typecheck`   | Verifica los tipos sin emitir                        |
| `pnpm test`        | Corre las pruebas unitarias del dominio               |
| `pnpm db:generate` | Genera la migración a partir de `db/schema.ts`       |
| `pnpm db:migrate`  | Aplica las migraciones pendientes                    |
| `pnpm db:seed`     | Carga usuarios, catálogo y órdenes de demostración   |
| `pnpm db:reset`    | Vacía todas las tablas y vuelve a cargar el seed     |
| `pnpm simular`     | Corre un flujo completo contra el servidor en marcha  |

### Base de datos de demostración

`pnpm db:reset` borra **todos** los datos y vuelve a ejecutar el seed. Solo acepta una `DATABASE_URL`
local: si apunta a otro host se detiene sin tocar nada. Es lo más simple para partir de cero:

```bash
pnpm db:reset
```

### Pasarela de pago

El checkout abre una ventana de pago con tarjeta (LEKTOR Pay) entre los datos de entrega y la
reserva del ejemplar. Reproduce el paso de una pasarela real —comercio, monto, número de tarjeta,
titular, vencimiento y código de seguridad— pero **no cobra nada**: no hay integração con un
procesador real. Los datos de la tarjeta se validan en el navegador y nunca se envían a la API ni se
guardan.

La validación vive en `lib/pago.ts` y `pagoFormSchema` de `lib/catalog.ts`, y exige:

- Número de 16 dígitos en bloques de cuatro (`4111 1111 1111 1111`) que supere el algoritmo de Luhn.
- Titular con solo letras, tal como aparece en la tarjeta.
- Vencimiento `MM/AA` con un mes real y no vencido.
- Código de seguridad de 3 o 4 dígitos.

Para probar el flujo manual sirven los números de prueba estándar, que pasan Luhn:

| Tarjeta | Vencimiento | CVV |
| --- | --- | --- |
| `4111 1111 1111 1111` (Visa) | cualquier mes futuro | 123 |
| `5500 0055 5555 5559` (Mastercard) | cualquier mes futuro | 123 |
| `3782 822463 10005` (American Express) | cualquier mes futuro | 1234 |

`3782 822463 10005` tiene 15 dígitos, así que el formulario la rechaza: el caso Visa o Mastercard es
el que recorre el flujo completo.

### Simulación de extremo a extremo

`pnpm simular` recorre el marketplace contra el servidor real como cuatro actores (vendedor, dos
compradores y administración): registro, publicación, catálogo con su filtro de precio por tramos, las tres formas
de entrega, ajuste de stock, preparación, despacho, recepción, **cancelación con devolución del
ejemplar**, cuadre del inventario contra el historial de movimientos y reportes. Termina con `1` si
alguna comprobación falla, así que sirve como puerta de calidad antes de un commit.

Requiere el servidor de desarrollo en marcha en otra terminal:

```bash
pnpm dev          # terminal 1
pnpm simular      # terminal 2
```

El destino se puede cambiar con `SIMULAR_BASE_URL`. La simulación crea datos propios (marcados con
`Sim` en el título); para repetarla desde cero, ejecuta `pnpm db:reset` antes.

El historial de stock se consulta en `GET /api/panel/movimientos`, con los filtros opcionales `q`,
`tipo`, `publicacionId`, `pagina` y `porPagina`. Desde el cliente se usa `usePanelMovimientos()`
de `lib/panel-client.ts`.

### Mantenimiento de reservas

Las reservas vencen a las 48 horas. El vencimiento es **diferido**: al servir el catálogo,
las órdenes o el panel de órdenes se barren las reservas vencidas y se devuelve el stock al
catálogo. No hace falta configurar nada para que funcione.

Si necesitas forzar el barrido en un momento puntual:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reservas
```

`GET /api/cron/reservas` exige `CRON_SECRET`: si la variable no está definida responde `503`
y no ejecuta nada, para que el endpoint nunca quede abierto por olvido.

## Estructura del proyecto

```
LEKTOR/
├── app/                    # Rutas de la aplicación (App Router)
│   ├── (panel)/            # Área principal autenticada
│   │   ├── dashboard/      # Dashboard y gestión de usuarios
│   │   ├── escaner/        # Escaneo de ISBN
│   │   ├── productos/      # Gestión de catálogo
│   │   └── reportes/       # Reportes y análisis
│   ├── admin/              # Entrada del panel de administración
│   ├── api/                # Route handlers (auth, catálogo, órdenes, panel)
│   └── layout.tsx          # Layout raíz
├── components/             # Componentes React
│   ├── marketplace/        # Vistas del marketplace (catálogo, detalle, venta, checkout, perfil, auth, chat)
│   ├── admin/              # Shell del panel
│   ├── panel/              # Vistas del panel principal
│   └── ui/                 # Componentes base (shadcn/ui)
├── db/                     # Esquema Drizzle y cliente de PostgreSQL
├── drizzle/                # Migraciones SQL generadas
├── hooks/                  # Hooks personalizados
├── lib/                    # Utilidades de dominio, auth y capa de datos
├── public/                 # Archivos estáticos
├── scripts/seed.ts         # Datos de demostración
├── tests/                  # Pruebas del dominio (runner nativo de Node)
└── package.json
```

### Variables de entorno

| Variable       | Descripción                                                        |
| -------------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (obligatoria)                      |
| `CRON_SECRET`  | Secreto para proteger `GET /api/cron/reservas`; sin él responde `503` |

### Seguridad

- Contraseñas con `bcryptjs` (coste 10). Las sesiones viven en la cookie `lektor_session`
  (`httpOnly`, `sameSite=lax`, `secure` en producción) y duran 24 h con renovación deslizante.
- `lib/rate-limit.ts` limita por IP los endpoints sensibles: 10 intentos de login por
  5 minutos y email, 5 registros por hora, 5 cambios de contraseña por cada 15 minutos
  y 30 consultas de ISBN por 5 minutos. La IP se toma de las cabeceras que fija la
  plataforma (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`); `x-forwarded-for`
  solo se usa como último recurso porque la puede falseificar el cliente.
  Respondemos `429` con `Retry-After` y el contador se reinicia tras un acceso correcto
  (mientras la clave está bloqueada ni siquiera una contraseña válida entra).
- El registro exige nombre, correo, contraseña con confirmación, teléfono, comuna y región.
- `GET /api/isbn` exige sesión: consulta un servicio externo y sin sesión se usaría como proxy abierto.
- Reportes y Usuarios son exclusivos de `admin`, tanto en la API como en la navegación.
- El login responde siempre `401 Email o contraseña incorrectos`, sin revelar si el email existe.
- Cambiar la contraseña cierra la sesión actual y obliga a volver a entrar.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
  y `Cache-Control: no-store` en las APIs; el panel y la bodega se marcan `noindex`.

## Trabajo con Git

El proyecto se desarrolla en la rama `main`, committing con frecuencia para que el historial cuente
qué se hizo y cuándo:

1. **Clonar** el repo (una sola vez):

   ```bash
   git clone https://github.com/nshh1dev/LEKTOR.git
   ```

2. **Antes de empezar a trabajar**, baja los últimos cambios:

   ```bash
   git pull
   ```

3. **Mientras trabajas**, commitea a menudo y con un mensaje que describa el cambio, no un
   `wip`. Si un cambio queda a medias, haz un commit aunque no compile todavía: así puedes volver
   atrás con `git reset` sin perder lo demás.

4. **Al terminar**, sube tus cambios:

   ```bash
   git add .
   git commit -m "descripción del cambio"
   git push
   ```

### Si aparece un conflicto

Git te avisará con un mensaje tipo `CONFLICT` / `Merge conflict`. La solución:

1. Baja y fusiona: `git pull`
2. Abre el archivo marcado y decide qué líneas se quedan (las marcas `<<<<<<<` / `=======` / `>>>>>>>` indican las partes en conflicto).
3. Sube el resultado: `git add .` → `git commit -m "resolver conflicto"` → `git push`

### Integración continua

Cada `push` a `main` y cada PR ejecutan `.github/workflows/ci.yml`, que corre en dos trabajos:

| Trabajo | Qué corre |
| --- | --- |
| Typecheck, lint y pruebas | `pnpm typecheck`, `pnpm lint`, `pnpm test` |
| Build de producción | `pnpm build` |

Las pruebas del dominio no tocan la base de datos, así que la CI no levanta PostgreSQL.
Verás el resultado en la pestaña **Actions** del repo. Si la CI falla, corrige en local antes
de volver a subir.

### Fin de línea

`.gitattributes` fija LF en todo el repositorio, para que nadie tenga que pelear con los
finales de línea si trabaja en Windows, macOS o Linux a la vez. Si tu editor insists en
guardar en CRLF, deja que lo guarde: Git lo normaliza al commitear.

## Licencia

Proyecto académico de título. Todos los derechos reservados.
