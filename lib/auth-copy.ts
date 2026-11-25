export function saludoDeInicio(nombre: string) {
  return `Hola de nuevo, ${nombre.replace(/[.!?]+$/, "")}. Tu estantería te estaba esperando.`
}
