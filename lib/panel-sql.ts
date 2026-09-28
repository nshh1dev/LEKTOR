import { sql } from "drizzle-orm"
import type { Column } from "drizzle-orm"
import { ZONA_HORARIA } from "@/lib/format"

/**
 * Fragmentos de SQL del panel que dependen de la zona horaria del negocio.
 *
 * Viven aparte de `lib/panel.ts` porque ese módulo es `server-only` y estos
 *helpers se prueban sin base de datos. Ver `tests/panel-sql.test.ts`.
 */

// `AT TIME ZONE` no admite un parámetro bind ($1), así que la zona debe ir como
// literal en el SQL. Es una constante nuestra, no dato de entrada, y `sql.raw` lo
// inserta sin comillas.
//
// Ojo: si algún día se cambia esto a un bind, Postgres lanza
// "bind message supplies 0 parameters" o devuelve un resultado silenciosamente
// distinto. Por eso hay un test que lo vigila.
export const ZONA_SQL = sql.raw(`'${ZONA_HORARIA}'`)

/**
 * Inicio del día (hace `dias - 1` días) en la zona horaria del negocio, devuelto
 * como timestamptz. Ojo: `date at time zone` devuelve un timestamp sin zona, y al
 * compararlo con una columna timestamptz Postgres lo interpreta con el TimeZone de
 * la sesión, que en un hosting puede ser UTC. De ahí el doble `at time zone`.
 */
export function inicioDiaSantiago(dias = 0) {
  const medianoche = sql`date_trunc('day', now() at time zone ${ZONA_SQL}) at time zone ${ZONA_SQL}`
  return dias > 0 ? sql`(${medianoche} - (${dias} - 1) * interval '1 day')` : medianoche
}

/** Columna `fecha_creacion` traducida a la fecha local del negocio, para agrupar por día. */
export function diaLocal(columna: Column) {
  return sql`(${columna} at time zone ${ZONA_SQL})::date`
}
