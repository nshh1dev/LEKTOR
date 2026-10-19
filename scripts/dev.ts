import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { X509Certificate } from "node:crypto"
import { argumentosDeDesarrollo } from "../lib/desarrollo"

const clave = existsSync(".certificates/localhost-key.pem")
const certificado = existsSync(".certificates/localhost.pem")
if (clave !== certificado) {
  console.error("Falta parte del certificado local. Ejecuta pnpm dev:certificados antes de iniciar.")
  process.exit(1)
}
if (certificado) {
  const cert = new X509Certificate(readFileSync(".certificates/localhost.pem"))
  if (Date.parse(cert.validTo) <= Date.now()) {
    console.error("El certificado local venció. Renuévalo con pnpm dev:certificados.")
    process.exit(1)
  }
  console.log("[LEKTOR] HTTPS local activo. El celular debe confiar en .certificates/ca/LEKTOR-local.cer.")
} else {
  console.log("[LEKTOR] HTTP local: para usar la cámara por Wi-Fi configura pnpm dev:certificados (ver README).")
}

const require = createRequire(import.meta.url)
const proceso = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"),
  ...argumentosDeDesarrollo(process.argv.slice(2), certificado),
], { stdio: "inherit", env: process.env })

process.on("SIGINT", () => proceso.kill("SIGINT"))
process.on("SIGTERM", () => proceso.kill("SIGTERM"))
proceso.on("error", (error) => {
  console.error("No se pudo iniciar Next.js:", error.message)
  process.exitCode = 1
})
proceso.on("exit", (codigo, senal) => {
  process.exitCode = codigo ?? (senal === "SIGINT" || senal === "SIGTERM" ? 0 : 1)
})
