import { randomUUID } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

export type ImagenParaGuardar = { ext: string; buffer: Buffer }

type AlmacenImagenes = {
  mkdir: (directorio: string, opciones: { recursive: true }) => Promise<unknown>
  writeFile: (archivo: string, datos: Buffer) => Promise<void>
  unlink: (archivo: string) => Promise<void>
}

const almacenLocal: AlmacenImagenes = { mkdir, writeFile, unlink }

export async function guardarImagenes(
  imagenes: ImagenParaGuardar[],
  almacen: AlmacenImagenes = almacenLocal,
): Promise<string[]> {
  const directorio = path.join(process.cwd(), "public", "uploads")
  await almacen.mkdir(directorio, { recursive: true })
  const creados: string[] = []

  try {
    for (const imagen of imagenes) {
      const nombre = `${randomUUID()}.${imagen.ext}`
      const archivo = path.join(process.cwd(), "public", "uploads", nombre)
      creados.push(archivo)
      await almacen.writeFile(archivo, imagen.buffer)
    }
  } catch (error) {
    await Promise.allSettled(creados.map((archivo) => almacen.unlink(archivo)))
    throw error
  }

  return creados.map((archivo) => `/uploads/${path.basename(archivo)}`)
}
