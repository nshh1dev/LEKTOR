# LEKTOR

> Historias que encuentran nueva estantería.

Marketplace entre lectores para comprar y vender **mangas, cómics y libros físicos de segunda mano**.

Proyecto de título desarrollado en conjunto. Aplicación web para conectar vendedores y compradores de libros usados, con módulos de gestión de inventario, usuarios y reportes.

## Características

- **Marketplace** de libros y mangas de segunda mano.
- **Roles de usuario**: administrador y trabajador con accesos diferenciados.
- **Panel administrativo**: gestión de productos, usuarios y reportes.
- **Módulo de escaneo** para el registro de productos desde el dispositivo físico.
- **Reportes** y análisis con gráficos.
- Interfaz con **tema claro/oscuro**.

## Stack tecnológico

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) (estado global)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) (formularios y validación)
- [Recharts](https://recharts.org/) (gráficos de reportes)

## Requisitos previos

- [Node.js](https://nodejs.org/) (versión 18.18 o superior recomendada)
- [pnpm](https://pnpm.io/)

## Instalación

```bash
# 1. Instalar dependencias
pnpm install

# 2. Ejecutar en modo desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Scripts disponibles

| Comando          | Descripción                              |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Inicia el servidor de desarrollo         |
| `pnpm build`     | Genera la versión de producción          |
| `pnpm start`     | Inicia el servidor de producción         |
| `pnpm lint`      | Ejecuta el linter de ESLint              |

## Estructura del proyecto

```
LEKTOR/
├── app/                    # Rutas de la aplicación (App Router)
│   ├── (panel)/            # Área principal autenticada
│   │   ├── dashboard/      # Panel de control
│   │   ├── escaner/        # Escaneo de productos
│   │   ├── productos/      # Gestión de catálogo
│   │   └── reportes/       # Reportes y análisis
│   ├── admin/              # Panel de administración
│   ├── worker/             # Vista de trabajador
│   └── layout.tsx          # Layout raíz
├── components/             # Componentes React
│   ├── admin/              # Componentes del administrador
│   ├── panel/              # Componentes del panel principal
│   ├── worker/             # Componentes del trabajador
│   └── ui/                 # Componentes base (shadcn/ui)
├── hooks/                  # Hooks personalizados
├── lib/                    # Utilidades y estado global (Zustand)
├── public/                 # Archivos estáticos
└── package.json
```

## Trabajo en equipo (Git)

Trabajamos todos sobre la rama `main`. Para coordinar los cambios sin romperse entre sí:

1. **Clonar** el repo (una sola vez):

   ```bash
   git clone https://github.com/Lucianop5/LEKTOR.git
   ```

2. **Antes de empezar a trabajar**, baja los últimos cambios:

   ```bash
   git pull
   ```

3. **Mientras trabajas**, no edites el mismo archivo que otro miembro al mismo tiempo. Si ambos tocan el mismo archivo en paralelo, el segundo que suba tendrá un conflicto.

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

## Licencia

Proyecto académico de título. Todos los derechos reservados.
