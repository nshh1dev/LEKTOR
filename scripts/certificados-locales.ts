import { spawnSync } from "node:child_process"
import { X509Certificate } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { isIP } from "node:net"
import { networkInterfaces } from "node:os"
import { resolve } from "node:path"

const carpeta = resolve(".certificates")
const ca = resolve(carpeta, "ca")
const locales = Object.values(networkInterfaces()).flatMap((interfaces) =>
  (interfaces ?? []).filter((red) => red.family === "IPv4" && !red.internal).map((red) => red.address),
)
const argumentos = process.argv.slice(2).filter((argumento) => argumento !== "--")
const ips = [...new Set(argumentos.length ? argumentos : locales)]
if (!ips.length || ips.some((ip) => isIP(ip) !== 4)) {
  console.error("Indica la IPv4 de tu computador en el Wi-Fi: pnpm dev:certificados 192.168.100.6")
  process.exit(1)
}
mkdirSync(ca, { recursive: true })
const ejecutableLocal = resolve(carpeta, process.platform === "win32" ? "mkcert.exe" : "mkcert")
const mkcert = existsSync(ejecutableLocal) ? ejecutableLocal : "mkcert"
const resultado = spawnSync(mkcert, [
  "-cert-file", resolve(carpeta, "localhost.pem"),
  "-key-file", resolve(carpeta, "localhost-key.pem"),
  "localhost", "127.0.0.1", "::1", ...ips,
], { stdio: "inherit", env: { ...process.env, CAROOT: ca } })
if (resultado.error || resultado.status !== 0) {
  console.error("No se pudieron generar los certificados. Instala mkcert según README (HTTPS local) y repite el comando.")
  process.exit(1)
}
const raiz = new X509Certificate(readFileSync(resolve(ca, "rootCA.pem")))
writeFileSync(resolve(ca, "LEKTOR-local.cer"), raiz.raw)
console.log(`\nCertificados listos para: ${ips.join(", ")}`)
console.log("Este comando NO instala confianza en el sistema ni inicia el servidor.")
console.log("Instala y confía en .certificates/ca/LEKTOR-local.cer en el iPhone (ver README).")
console.log("No compartas localhost-key.pem ni rootCA-key.pem. No los pongas en public/.")
console.log(`Luego ejecuta pnpm dev y abre https://${ips[0]}:3000 desde el celular.`)
