import { test } from "node:test"
import assert from "node:assert/strict"
import nextConfig from "../next.config.mjs"

test("el origen de la demostración móvil puede acceder a los recursos de desarrollo sin comodines", () => {
  assert.deepEqual(nextConfig.allowedDevOrigins, ["192.168.100.6"])
})
