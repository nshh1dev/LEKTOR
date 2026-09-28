import type { Metadata } from "next"
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ToasterAvisos } from "@/components/notificacion/toaster"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "LEKTOR — Historias que encuentran nueva estantería",
  description:
    "Marketplace entre lectores para comprar y vender mangas, cómics y libros físicos de segunda mano.",
  generator: "v0.app",
  applicationName: "LEKTOR",
  keywords: ["mangas", "cómics", "libros de segunda mano", "marketplace", "Chile"],
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "LEKTOR",
    title: "LEKTOR — Historias que encuentran nueva estantería",
    description:
      "Marketplace entre lectores para comprar y vender mangas, cómics y libros físicos de segunda mano.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="bg-background">
      <body className={`${geist.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          {children}
          <ToasterAvisos />
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
