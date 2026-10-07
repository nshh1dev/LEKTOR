import assert from "node:assert/strict"
import { test } from "node:test"
import { guardarImagenes } from "../lib/uploads"

test("guarda un lote completo y devuelve las URLs correspondientes", async () => {
  const escritos: string[] = []
  const borrados: string[] = []
  const almacen = {
    mkdir: async () => undefined,
    writeFile: async (archivo: string) => { escritos.push(archivo) },
    unlink: async (archivo: string) => { borrados.push(archivo) },
  }

  const urls = await guardarImagenes(
    [{ ext: "jpg", buffer: Buffer.from("una") }, { ext: "png", buffer: Buffer.from("dos") }],
    almacen,
  )

  assert.equal(escritos.length, 2)
  assert.deepEqual(borrados, [])
  assert.deepEqual(urls, escritos.map((archivo) => `/uploads/${archivo.split(/[\\/]/).at(-1)}`))
})

test("limpia todos los archivos del lote si falla una escritura", async () => {
  const intentados: string[] = []
  const borrados: string[] = []
  const error = new Error("fallo de escritura")
  const almacen = {
    mkdir: async () => undefined,
    writeFile: async (archivo: string) => {
      intentados.push(archivo)
      if (intentados.length === 2) throw error
    },
    unlink: async (archivo: string) => { borrados.push(archivo) },
  }

  await assert.rejects(
    guardarImagenes(
      [
        { ext: "jpg", buffer: Buffer.from("una") },
        { ext: "png", buffer: Buffer.from("dos") },
        { ext: "webp", buffer: Buffer.from("tres") },
      ],
      almacen,
    ),
    error,
  )
  assert.deepEqual(borrados, intentados)
})

test("si falla la limpieza de un archivo conserva el error original", async () => {
  const error = new Error("fallo de escritura")
  const almacen = {
    mkdir: async () => undefined,
    writeFile: async () => { throw error },
    unlink: async () => { throw new Error("fallo de limpieza") },
  }

  await assert.rejects(
    guardarImagenes([{ ext: "jpg", buffer: Buffer.from("una") }], almacen),
    error,
  )
})
