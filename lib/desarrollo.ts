export function argumentosDeDesarrollo(argumentos: string[], https: boolean): string[] {
  const extras = argumentos.filter((argumento) => argumento !== "--")
  const compilador = extras.some((argumento) => ["--webpack", "--turbo", "--turbopack"].includes(argumento))
  return [
    "dev",
    ...(!compilador ? ["--webpack"] : []),
    ...(https ? [
      "--experimental-https",
      "--experimental-https-key", ".certificates/localhost-key.pem",
      "--experimental-https-cert", ".certificates/localhost.pem",
    ] : []),
    ...extras,
  ]
}
