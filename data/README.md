# Catálogo de retiro

`puntos-retiro.json` es una captura local consultada el 27 de noviembre de 2026,
no una API de disponibilidad en tiempo real. Solo llega al navegador la página de
resultados consultada, no el catálogo completo.

Fuentes públicas consultadas en el navegador, sin copiar claves de integración:

- Blue Express: https://www.blue.cl/lockers-puntos/encuentra-tu-punto
  (mapa oficial `mapa-pickup.blue.cl`). Se conserva `status=active`,
  `pickupAvailability=true` y servicio 24 «Retiro de paquete»: 2.904 puntos.
- Starken: https://starken.cl/sucursales. El listado del buscador
  (`agencyDls/sucursalesCL/0`) contiene 699 puntos. Se exige conservadoramente
  **ambos** indicadores `pickup` y `dropoff` habilitados y una comuna reconocible:
  687 puntos. Se omiten puntos de servicio único y localidades cuya comuna no
  se pudo normalizar con confianza; no se afirma que esos puntos no permitan retiro.
- Chilexpress: https://centrodeayuda.chilexpress.cl/sucursales. Se recorrieron
  las 344 opciones de comuna/localidad de su selector público y se deduplicó
  por código de oficina. Solo servicio 22 «Entrega de encomiendas» activo:
  1.003 puntos.

Hay puntos de cada transportista en las 16 regiones, pero eso no implica que
cada comuna tenga puntos ni que la captura sea exhaustiva respecto de toda su red.
CorreosChile se excluyó: el sitio presentó un CAPTCHA que no se intentó eludir.

Se conservan exclusivamente código, transportista, nombre público, dirección,
comuna y región. No se incluyen nombres de encargados, teléfonos, correos,
cuentas, cookies ni credenciales.

## Actualización

Las fuentes web pueden cambiar y sus condiciones de reutilización deben revisarse
antes de redistribuir o usar estos datos fuera de la demostración académica.
No se ejecuta scraping por cada compra.

`pnpm exec tsx scripts/preparar-puntos-retiro.ts <carpeta-capturas>` transforma las
capturas normalizadas de investigación:
`blue-retiro-normalizado.json`, `starken-puntos-normalizado.json` y
`chilexpress-retiro-normalizado.json`. Estas capturas temporales no se versionan;
se deben obtener de nuevo para actualizar, manteniendo el formato de entrada.
La herramienta comprueba la finalización del selector de Chilexpress, normaliza
comunas, elimina campos innecesarios y falla ante códigos duplicados.

Después de actualizar, revisar contadores y exclusiones en `fuentes`, ejecutar
las cuatro puertas y probar checkout en una base temporal. Los pedidos guardan
su nombre/dirección como snapshot, por lo que no dependen de que el punto siga
en el siguiente catálogo.
