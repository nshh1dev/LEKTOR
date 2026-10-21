# LEKTOR

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Lectores en Chile que buscan comprar o vender mangas, cómics y libros físicos de segunda mano.
Una misma persona puede comprar y publicar ejemplares: vender es una actividad, no un rol separado.
La administración modera publicaciones y usuarios y consulta la operación del marketplace.

## Product Purpose

«Historias que encuentran nueva estantería». Conectar lectores para encontrar ejemplares,
publicar los propios y seguir una compra desde la reserva hasta la recepción.
El resultado esperado es completar esas tareas con información clara sobre precio, condición,
stock, entrega y estado de la orden; no maximizar una métrica comercial inventada.

## Operating Context

- Proyecto académico grupal, demostrado en desarrollo local; no es un servicio desplegado en producción.
- Cada integrante utiliza su propio clon y PostgreSQL local. El arranque y la configuración están en `README.md`.
- Web adaptable a computador y celular. Safari en iPhone es parte del recorrido de prueba del escáner,
  no una aplicación nativa de iOS.
- La cámara desde un celular por Wi-Fi requiere HTTPS confiable, permisos y certificados locales;
  los pasos y las precauciones están en `README.md`, sección «Cámara desde un celular».
- Los flujos reales contra el servidor se comprueban con `pnpm simular`; las pruebas puras no necesitan base de datos.

## Capabilities and Constraints

- Catálogo con filtros y orden, detalle del ejemplar, perfil público de vendedor y valoraciones verificadas de estrellas.
- Publicación de ejemplares con fotos, condición, precio en pesos chilenos, ubicación y stock.
- ISBN manual o escaneado con cámara y ZXing, incluido Safari de iPhone; consulta de metadatos cuando el proveedor los tiene.
  Mantener la entrada manual cuando no hay cámara o permiso. No prometer metadatos para todos los ISBN.
- Reserva de 48 horas, preparación y despacho por el vendedor, confirmación de recepción por el comprador
  y cancelaciones según las reglas del servidor. Usar los estados reales de `lib/catalog.ts`.
- Pago simulado: no hay cobro real ni integración con un procesador. Los datos de tarjeta se validan
  en el navegador y nunca se envían a la API ni se guardan.
- Contacto previo y chat de orden privados entre comprador y vendedor; ni la administración accede a esos hilos.
- Panel autenticado para operación, stock y reportes; permisos de administración validados en el servidor.
- Avisos y confirmaciones a través del sistema único del proyecto. Las reglas técnicas viven en `AGENTS.md`;
  el registro visual, en `DESIGN.md`.
- Terminología: publicación es el aviso de venta; ejemplar es el objeto físico; orden es la compra reservada;
  condición describe el estado físico y no el estado del flujo de compra.

## Brand Commitments

- Conservar el nombre LEKTOR y la frase «Historias que encuentran nueva estantería».
- Comunicación en español de Chile, directa y comprensible; precios CLP, comunas y regiones de Chile.
- Esta incorporación de Impeccable documenta el producto y el diseño existente: no autoriza un rediseño,
  una paleta nueva ni cambios de comportamiento. Cualquier cambio posterior se delimita por tarea.

## Evidence on Hand

- `README.md` y `AGENTS.md`: alcance académico, flujos, restricciones y convenciones.
- `app/`, `components/` y `lib/`: implementación de las funciones y del lenguaje de la interfaz.
- `scripts/seed.ts`: datos de demostración, no evidencia de ventas o clientes reales.
- `tests/` y `scripts/simular-flujo.ts`: comprobaciones automatizadas de dominio y flujos.
- No atribuir testimonios, métricas comerciales, certificaciones ni garantías a datos de ejemplo.

## Product Principles

1. Ayudar a encontrar y evaluar el ejemplar físico antes de comprarlo.
2. Mostrar el estado de cada acción y explicar cómo continuar cuando faltan datos o algo falla.
3. Mantener la privacidad y los permisos también fuera de la interfaz.
4. Preservar recorridos utilizables en celular, incluida la alternativa manual del ISBN.
5. Distinguir siempre la demostración académica de una operación con pagos reales.

## Accessibility & Inclusion

Preservar las medidas existentes: navegación por teclado, foco visible, enlace de salto al contenido,
etiquetas de campos, anuncios de errores y respeto de movimiento reducido. Los avisos no deben depender
solo del color. La documentación no certifica conformidad WCAG AA: los cambios de interfaz necesitan
comprobaciones de contraste, teclado y tamaños de pantalla en ambos temas.
