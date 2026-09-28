import "dotenv/config"

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

/**
 * Deja la base en cero y vuelve a correr el seed. Es destructivo a propósito: existe
 * para poder simular el marketplace completo sin arrastrar datos de corridas
 * anteriores. No lo ejecutes contra una base que no sea de desarrollo.
 */

const TABLAS = [
  "notifications",
  "favorites",
  "stock_movements",
  "book_metadata",
  "chat_messages",
  "orders",
  "publications",
  "sessions",
  "users",
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("Falta DATABASE_URL. Revisa tu .env")
    process.exit(1)
  }

  if (!/localhost|127\.0\.0\.1|@db:|postgres:/.test(url)) {
    console.error("DATABASE_URL no parece apuntar a una base de desarrollo.")
    console.error("  " + url.replace(/:[^:@/]*@/, ":****@"))
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool)

  console.log("Vaciando " + TABLAS.join(", ") + " ...")
  await db.execute(sql.raw(`TRUNCATE ${TABLAS.join(", ")} RESTART IDENTITY CASCADE`))
  await pool.end()

  // `seed.ts` corre su `main()` al importarse y cierra el proceso al terminar.
  console.log("Ejecutando seed ...")
  await import("./seed")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
