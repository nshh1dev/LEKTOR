import { fail, ok } from "@/lib/api"
import { ApiError, requireSession } from "@/lib/auth"
import { guardarImagenes, type ImagenParaGuardar } from "@/lib/uploads"

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ARCHIVOS = 6

const FORMATOS: { ext: string; detectar: (bytes: Uint8Array) => boolean }[] = [
  { ext: "jpg", detectar: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    detectar: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    ext: "webp",
    detectar: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
]

function detectarFormato(bytes: Uint8Array): string | null {
  for (const formato of FORMATOS) {
    if (formato.detectar(bytes)) return formato.ext
  }
  return null
}

export async function POST(request: Request) {
  try {
    await requireSession()

    const form = await request.formData()
    const archivos = form
      .getAll("archivos")
      .filter((valor): valor is File => valor instanceof File)

    if (archivos.length === 0) throw new ApiError(400, "sin-archivos", "Sube al menos una imagen")
    if (archivos.length > MAX_ARCHIVOS) {
      throw new ApiError(400, "demasiados-archivos", "Sube como máximo 6 imágenes por publicación")
    }

    const imagenes: ImagenParaGuardar[] = []
    for (const archivo of archivos) {
      if (archivo.size === 0) throw new ApiError(400, "archivo-vacio", "Uno de los archivos está vacío")
      if (archivo.size > MAX_BYTES) throw new ApiError(400, "archivo-grande", "Cada imagen debe pesar 5 MB o menos")

      const buffer = Buffer.from(await archivo.arrayBuffer())
      const ext = detectarFormato(new Uint8Array(buffer.subarray(0, 16)))
      if (!ext) {
        throw new ApiError(400, "formato-no-soportado", "Solo se aceptan imágenes JPG, PNG o WebP")
      }
      imagenes.push({ ext, buffer })
    }

    const urls = await guardarImagenes(imagenes)
    return ok({ urls })
  } catch (error) {
    return fail(error)
  }
}
