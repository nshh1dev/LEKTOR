"use client"

import { Toaster as ToasterBase, type ToasterProps } from "sonner"

/**
 * Toaster de LEKTOR. El lienzo de apilado y los gestos los dibuja Sonner; la
 * ficha de cada aviso la compone `components/notificacion/avisar`.
 *
 * `unstyled` deja el <li> sin fondo ni borde propios para que la ficha manda
 * sobre el papel, el lomo de color y la sombra del tomo.
 */
export function ToasterAvisos(props: ToasterProps) {
  return (
    <ToasterBase
      position="top-right"
      closeButton
      expand={false}
      gap={12}
      visibleToasts={4}
      offset="24px"
      mobileOffset="16px"
      containerAriaLabel="Avisos de LEKTOR"
      style={
        {
          "--width": "21.5rem",
          // El botón de cerrar de Sonner lo pinta con sus variables propias:
          // se apuntan a las de la marca para que no aparezca un círculo gris.
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{ unstyled: true, duration: 4400 }}
      {...props}
    />
  )
}
