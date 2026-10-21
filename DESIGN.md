---
name: LEKTOR
description: "Ficha de biblioteca: papel, tinta, títulos editoriales y sellos dorados."
colors:
  background-light: "oklch(0.985 0.004 85)"
  foreground-light: "oklch(0.19 0.012 55)"
  card-light: "oklch(1 0 0)"
  primary-light: "oklch(0.19 0.012 55)"
  primary-foreground-light: "oklch(0.985 0.004 85)"
  secondary-light: "oklch(0.955 0.008 80)"
  muted-light: "oklch(0.955 0.008 80)"
  muted-foreground-light: "oklch(0.49 0.014 60)"
  accent-light: "oklch(0.945 0.014 75)"
  destructive-light: "oklch(0.55 0.19 27)"
  border-light: "oklch(0.9 0.008 75)"
  input-light: "oklch(0.9 0.008 75)"
  ring-light: "oklch(0.62 0.02 70)"
  oro-light: "oklch(0.68 0.12 72)"
  oro-foreground-light: "oklch(0.17 0.01 55)"
  aviso-ok-light: "oklch(0.52 0.11 68)"
  aviso-ok-tenue-light: "oklch(0.965 0.03 80)"
  aviso-falla-light: "oklch(0.52 0.19 27)"
  aviso-falla-tenue-light: "oklch(0.963 0.03 28)"
  aviso-revisar-light: "oklch(0.53 0.12 62)"
  aviso-revisar-tenue-light: "oklch(0.966 0.04 80)"
  aviso-dato-light: "oklch(0.48 0.04 250)"
  aviso-dato-tenue-light: "oklch(0.96 0.02 250)"
  background-dark: "oklch(0.17 0.008 60)"
  foreground-dark: "oklch(0.955 0.008 80)"
  card-dark: "oklch(0.215 0.009 60)"
  popover-dark: "oklch(0.205 0.009 60)"
  primary-dark: "oklch(0.955 0.008 80)"
  primary-foreground-dark: "oklch(0.17 0.008 60)"
  secondary-dark: "oklch(0.265 0.01 60)"
  muted-dark: "oklch(0.26 0.01 60)"
  muted-foreground-dark: "oklch(0.68 0.014 70)"
  accent-dark: "oklch(0.28 0.012 62)"
  destructive-dark: "oklch(0.62 0.19 25)"
  border-dark: "oklch(0.31 0.011 62)"
  input-dark: "oklch(0.31 0.011 62)"
  ring-dark: "oklch(0.55 0.02 70)"
  oro-dark: "oklch(0.82 0.135 78)"
  oro-foreground-dark: "oklch(0.18 0.01 55)"
  aviso-ok-dark: "oklch(0.82 0.13 78)"
  aviso-ok-tenue-dark: "oklch(0.28 0.035 70)"
  aviso-falla-dark: "oklch(0.7 0.16 28)"
  aviso-falla-tenue-dark: "oklch(0.29 0.05 27)"
  aviso-revisar-dark: "oklch(0.82 0.13 76)"
  aviso-revisar-tenue-dark: "oklch(0.3 0.045 72)"
  aviso-dato-dark: "oklch(0.74 0.06 250)"
  aviso-dato-tenue-dark: "oklch(0.28 0.03 250)"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
  reference:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
components:
  button-default:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-foreground-light}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-oro:
    backgroundColor: "{colors.oro-light}"
    textColor: "{colors.oro-foreground-light}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 20px"
  button-outline:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.md}"
    height: "36px"
  button-ghost:
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.md}"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.destructive-light}"
    textColor: "#fff"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  navigation:
    textColor: "{colors.foreground-light}"
  badge:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-foreground-light}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.xl}"
    padding: "24px 0"
  sello:
    textColor: "{colors.aviso-ok-light}"
    rounded: "{rounded.full}"
    size: "32px"
---

# Design System: LEKTOR

## Overview

**Creative North Star: "Ficha de biblioteca"**

Interfaz editorial, cálida y legible: las portadas muestran el ejemplar; los títulos serif,
los rótulos y los avisos con sello recuerdan una ficha impresa. Los controles son sobrios y
funcionales, con superficies y separadores suaves. La profundidad se reserva para distinguir
capas y dar presencia a los libros, no para convertir cada sección en una tarjeta decorativa.

**Key Characteristics:**
- Papel claro o tinta oscura según el tema, con oro de marca.
- Fraunces para voz editorial, Geist para operación y JetBrains Mono para referencias.
- Fichas de aviso con rótulo, sello y tono semántico.
- Portadas protagonistas; listas y filtros organizados para consultar y actuar.

Registro extraído del código de `6c023c4`, con lenguaje descriptivo confirmado por el usuario.
No constituye un rediseño ni una auditoría visual: no se inició un servidor ni se verificó el
renderizado en esta tarea. El detalle ejecutable sigue en `app/globals.css` y los componentes.
Si cambia la implementación, actualizar este registro y regenerar `.impeccable/design.json`
mediante el flujo `impeccable document`; no convertir una discrepancia documental en permiso para cambiar la UI.

## Colors

El frontmatter conserva los valores OKLCH de `app/globals.css`: el sufijo `-light` corresponde
a `:root` y `-dark` a `.dark`; el resto del nombre identifica la variable CSS. Es una selección
de tokens reutilizados, no un reemplazo del archivo CSS ni una lista de valores nuevos.
El tema inicial es oscuro (`app/layout.tsx`) y se cambia con `next-themes`.

### Primary

- **Oro de marca** (`--oro` y `--oro-foreground`): acciones destacadas del marketplace, precios,
  detalles de navegación y énfasis editorial. No sustituye al botón base: `--primary` es tinta
  en claro y papel en oscuro.
- **Oro del sello** (`--aviso-ok`): éxito. Es de la misma familia de marca, pero sus valores
  no son idénticos a `--oro`; conservar ambos tokens, especialmente en el tema claro.

### Neutral

- **Papel y tinta**: fondo, texto y superficies `--background`, `--foreground`, `--card` y `--popover`.
  En claro, popover y card comparten blanco; en oscuro son superficies distintas.
- **Papel secundario / tinta elevada**: `--secondary`, `--muted` y `--accent` dan capas y estados discretos.
  `--accent` es una superficie de interacción, no el oro de marca.
- **Tinta secundaria y filetes**: `--muted-foreground`, `--border`, `--input` y `--ring`.
  El perfil utiliza separadores con opacidad (habitualmente 60%); no hay una medición de paridad
  de contraste entre temas en este registro.
- El panel utiliza los tokens `--sidebar-*` definidos por tema en el mismo CSS.

### Tonos y excepciones existentes

- `ok`: oro; `falla`: terracota; `revisar`: ocre; `dato`: azul grisáceo. Cada tono tiene fondo `-tenue`.
  `--destructive` corresponde a controles destructivos y no reemplaza la ficha de error.
- `coverTone` (`lib/catalog.ts`) conserva paletas por categoría: índigo/violeta para mangas,
  ámbar/rosa para cómics y esmeralda/verde azulado para libros. `Portada` usa actualmente la
  variante oscura para la carátula de reemplazo, incluso en tema claro.
- Los gráficos de `components/panel/reports-view.tsx` tienen su propia lista `COLORES` y colores
  literales; **no consumen automáticamente** los tokens `--chart-*` del CSS. Esta documentación
  no migra esos gráficos ni declara que ya se adapten por tokens.
- Los fondos neutros oscuros y texto blanco sobre fotografías son tratamientos de imagen existentes.
  No confundir esos casos, las categorías o los gráficos con un nuevo tono de éxito.

**The Sello Rule.** El éxito es el oro de marca, nunca verde genérico. El tono no debe ser
la única señal: conservar el glifo, el rótulo y el mensaje.

## Typography

- **Display / editorial:** Fraunces, con fallback serif. La cabecera del catálogo usa 30px y
  48px desde `md`, peso 600 y altura de línea ajustada; los perfiles usan títulos de 30px.
- **Body / operación:** Geist, con fallback sans-serif. El cuerpo es sans; formularios y
  metadatos emplean tamaños de 12px a 16px según el componente. No imponer un único tamaño a todos los roles.
- **Label:** la utilidad `rotulo` aplica mayúsculas y espaciado amplio; algunos componentes
  ajustan su tamaño. Es para índices y referencias cortas, no párrafos.
- **Reference:** JetBrains Mono para códigos, índices y datos de referencia; cifras tabulares en precios y métricas.
- En los avisos, el título usa Fraunces y la explicación Geist. No cambiar toda la ficha a serif.

Las fuentes se cargan con `next/font/google` en `app/layout.tsx`; reutilizar sus variables,
no añadir otra descarga de las mismas familias.

## Layout

- Shell público centrado, ancho máximo de 92rem, márgenes interiores de 16px y 32px desde `md`.
- La búsqueda pasa a una fila propia en pantallas estrechas. La cabecera es sticky;
  el desplazamiento del foco contempla ese encabezado mediante `scroll-padding-top`.
- Catálogo de dos columnas en móvil, tres desde `lg` y cuatro desde `2xl`; separación horizontal
  de 20px/28px y vertical de 36px. El índice de filtros ocupa 15rem en la composición de escritorio cuando está abierto.
- Perfil limitado a 64rem, listas separadas por filetes y cambios de columna según el ancho.
  No sustituir sus filas por tarjetas sin una tarea explícita.
- Portadas con proporción 2:3, texto y controles con espacio para truncado o salto de línea según el caso.
- El panel conserva su shell con sidebar y sus propias densidades; no imponerle la composición del catálogo.

## Elevation & Depth

Profundidad híbrida: superficies tonales y bordes para estructura; sombras pequeñas en componentes
base y sombra de tomo en las portadas al pasar el cursor. La utilidad `sombra-tomo` está registrada
con su valor exacto en el sidecar. El desenfoque, la sombra de la imagen y el lomo de `Portada`
son parte del tratamiento del libro, no recetas para fondos de toda la aplicación.

`papel` añade un rayado muy tenue; `filete` y `filete-vertical` son separadores degradados de un píxel.
Conservarlos en sus usos existentes sin extender la textura a todos los controles.

## Shapes

Radio base de 8px. Las derivaciones del CSS dan 4px, 6px y 12px; las portadas y algunos diálogos
usan esquinas de 16px. Los controles destacados, etiquetas de portada y avatares pueden ser
redondeados completos. No uniformar esas diferencias: el botón base y el botón dorado de la cabecera
no tienen la misma silueta.

## Components

### Buttons

Reutilizar `components/ui/button.tsx`: variantes `default`, `destructive`, `outline`, `secondary`,
`ghost` y `link`; alturas de 32px, 36px y 40px según tamaño. El botón dorado de la cabecera es una
personalización de uso, no una variante nueva del componente base. Mantener `hover`, foco visible
y estado deshabilitado. Las previsualizaciones del sidecar cubren una selección, no todas las variantes.

### Inputs / Fields

`Input` tiene borde semántico, radio medio y altura de 36px; texto de 16px en móvil y 14px desde `md`.
Foco con anillo de 3px y estados `aria-invalid`/deshabilitado. Etiquetas, errores y ayudas siguen
las reglas de formularios de `AGENTS.md`; no sustituirlos por placeholder únicamente.

### Chips / Cards / Containers

`Badge` base es una etiqueta compacta con borde, radio medio y variantes semánticas.
Las etiquetas sobre fotografía tienen un tratamiento específico de contraste.
`Card` base usa superficie, borde, radio de 12px, sombra ligera y 24px de espacio vertical;
el contenido añade sus márgenes. `ProductCard` no es esa tarjeta genérica: portada, título,
autor/editorial, precio y datos del vendedor conservan su propia estructura abierta.

### Navigation

Conservar búsqueda y acciones del shell público, navegación de actividad del perfil y sidebar del panel.
La referencia interactiva del sidecar procede de las pestañas del perfil: estado elegido con borde y
texto oro, estado inactivo con texto secundario. Los enlaces o botones deben conservar su semántica
real, nombre accesible y tratamiento de foco.

### Avisos y sello

Usar `components/notificacion/`: avisos flotantes y en línea, datos faltantes, confirmación y sello.
Una ficha combina lomo, fondo tenue, rótulo, mensaje y glifo. `lib/avisos.ts` es la autoridad del
vocabulario y clases de tono; la documentación no duplica esa lógica. El sello es circular, de doble
anillo, girado y animado al estamparse. Se respeta `prefers-reduced-motion`; no añadir animación obligatoria.

## Do's and Don'ts

### Do:
- Do reutilizar los tokens y componentes existentes en ambos temas.
- Do conservar la identidad «Ficha de biblioteca» sin añadir decoración a cada pantalla.
- Do mantener los nombres, estados y explicaciones reales del producto.
- Do comprobar foco, lectura y comportamiento en móvil cuando se modifica una interfaz.
- Do actualizar este registro y regenerar su sidecar cuando cambie el sistema visual.

### Don't:
- Don't recuperar la paleta descartada ni renombrar `--oro` como parte de esta incorporación.
- Don't sustituir el oro del éxito por verde ni crear un segundo sistema de avisos.
- Don't interpretar las rampas de muestra del sidecar como tokens nuevos para la aplicación.
- Don't cambiar paletas de portadas o gráficos bajo el pretexto de documentarlas.
- Don't afirmar conformidad WCAG o contraste equivalente entre temas sin comprobarlo.
