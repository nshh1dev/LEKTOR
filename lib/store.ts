"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Product = {
  sku: string
  nombre: string
  stockActual: number
  stockMinimo: number
  proveedor: string
}

export type Movement = {
  id: string
  sku: string
  nombreProducto: string
  tipo: "entrada" | "salida"
  cantidad: number
  fecha: string // ISO string
  usuario: "admin" | "worker"
}

export type UserRole = "admin" | "worker" | null

export type Usuario = {
  id: string
  nombre: string
  email: string
  password: string // Demo: texto plano. En producción NUNCA almacenar así.
  rol: "admin" | "worker"
  activo: boolean
  fechaCreacion: string // ISO string (serializable for persist)
  ultimoAcceso?: string
}

export type AuthResult =
  | { ok: true; usuario: Usuario }
  | { ok: false; reason: "no-user" | "bad-password" | "inactive"; message: string }

type InventoryState = {
  role: UserRole
  email: string | null
  products: Product[]
  movements: Movement[]
  usuarios: Usuario[]
  setUser: (role: UserRole, email: string | null) => void
  logout: () => void
  addMovement: (
    sku: string,
    tipo: "entrada" | "salida",
    cantidad: number,
    usuario?: "admin" | "worker",
  ) => { ok: boolean; message?: string; alertaStockBajo?: boolean }
  updateProduct: (sku: string, data: Partial<Product>) => void
  addProduct: (product: Product) => { ok: boolean; message?: string }
  deleteProduct: (sku: string) => void
  crearUsuario: (
    data: { nombre: string; email: string; password: string; rol: "admin" | "worker"; activo: boolean },
  ) => { ok: boolean; message?: string }
  desactivarUsuario: (id: string) => void
  activarUsuario: (id: string) => void
  cambiarRol: (id: string, nuevoRol: "admin" | "worker") => void
  actualizarUsuario: (
    id: string,
    data: Partial<Pick<Usuario, "nombre" | "rol" | "activo" | "password">>,
  ) => void
  autenticar: (email: string, password: string) => AuthResult
  getMovementsByDate: (date: Date) => Movement[]
  getProductBySku: (sku: string) => Product | undefined
}

const initialUsuarios: Usuario[] = [
  {
    id: "u-admin-001",
    nombre: "Don Ricardo",
    email: "admin@tienda.cl",
    password: "admin123",
    rol: "admin",
    activo: true,
    fechaCreacion: new Date("2024-01-15T09:00:00").toISOString(),
    ultimoAcceso: new Date().toISOString(),
  },
  {
    id: "u-worker-001",
    nombre: "Pedro Bodeguero",
    email: "worker@tienda.cl",
    password: "worker123",
    rol: "worker",
    activo: true,
    fechaCreacion: new Date("2024-02-10T10:30:00").toISOString(),
    ultimoAcceso: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "u-worker-002",
    nombre: "María Soto",
    email: "maria@tienda.cl",
    password: "maria123",
    rol: "worker",
    activo: false,
    fechaCreacion: new Date("2023-11-20T14:00:00").toISOString(),
  },
]

const initialProducts: Product[] = [
  { sku: "CARP01", nombre: "Carpa Iglú 4 Personas", stockActual: 45, stockMinimo: 10, proveedor: "Doite" },
  { sku: "CANA02", nombre: "Caña de Pescar Telescópica 2.1m", stockActual: 120, stockMinimo: 30, proveedor: "Shimano" },
  { sku: "SACO03", nombre: "Saco de Dormir Térmico -5°C", stockActual: 8, stockMinimo: 10, proveedor: "Marmot" },
  { sku: "LINT04", nombre: "Linterna Frontal LED", stockActual: 3, stockMinimo: 8, proveedor: "Energizer" },
  { sku: "ANAF05", nombre: "Anafe Portátil a Gas", stockActual: 2, stockMinimo: 5, proveedor: "Campingaz" },
  { sku: "NAVA06", nombre: "Navaja Multifuncional", stockActual: 15, stockMinimo: 8, proveedor: "Victorinox" },
]

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      role: null,
      email: null,
      products: initialProducts,
      movements: [],
      usuarios: initialUsuarios,
      setUser: (role, email) => set({ role, email }),
      logout: () => set({ role: null, email: null }),
      addMovement: (sku, tipo, cantidad, usuario = "worker") => {
        const product = get().products.find((p) => p.sku === sku)
        if (!product) return { ok: false, message: "Producto no encontrado" }
        if (cantidad <= 0) return { ok: false, message: "La cantidad debe ser mayor a 0" }
        if (tipo === "salida" && product.stockActual < cantidad) {
          return { ok: false, message: "Stock insuficiente para realizar la salida" }
        }
        const nuevoStock = tipo === "entrada" ? product.stockActual + cantidad : product.stockActual - cantidad
        const movement: Movement = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sku,
          nombreProducto: product.nombre,
          tipo,
          cantidad,
          fecha: new Date().toISOString(),
          usuario,
        }
        set({
          products: get().products.map((p) => (p.sku === sku ? { ...p, stockActual: nuevoStock } : p)),
          movements: [movement, ...get().movements],
        })
        const alertaStockBajo = tipo === "salida" && nuevoStock <= product.stockMinimo
        return { ok: true, alertaStockBajo }
      },
      updateProduct: (sku, data) =>
        set({
          products: get().products.map((p) => (p.sku === sku ? { ...p, ...data } : p)),
        }),
      addProduct: (product) => {
        if (get().products.some((p) => p.sku.toLowerCase() === product.sku.toLowerCase())) {
          return { ok: false, message: "Ya existe un producto con ese SKU" }
        }
        if (!product.sku.trim() || !product.nombre.trim()) {
          return { ok: false, message: "SKU y nombre son obligatorios" }
        }
        set({ products: [...get().products, product] })
        return { ok: true }
      },
      deleteProduct: (sku) =>
        set({
          products: get().products.filter((p) => p.sku !== sku),
        }),
      crearUsuario: (data) => {
        const email = data.email.trim().toLowerCase()
        const password = data.password.trim()
        if (!data.nombre.trim() || !email) {
          return { ok: false, message: "Nombre y email son obligatorios" }
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { ok: false, message: "Email no válido" }
        }
        if (password.length < 6) {
          return { ok: false, message: "La contraseña debe tener al menos 6 caracteres" }
        }
        if (get().usuarios.some((u) => u.email.toLowerCase() === email)) {
          return { ok: false, message: "Ya existe un usuario con ese email" }
        }
        const nuevo: Usuario = {
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nombre: data.nombre.trim(),
          email,
          password,
          rol: data.rol,
          activo: data.activo,
          fechaCreacion: new Date().toISOString(),
        }
        set({ usuarios: [...get().usuarios, nuevo] })
        return { ok: true }
      },
      autenticar: (email, password) => {
        const normalized = email.trim().toLowerCase()
        const usuario = get().usuarios.find((u) => u.email.toLowerCase() === normalized)
        if (!usuario) {
          return { ok: false, reason: "no-user", message: "No existe un usuario con ese email" }
        }
        if (usuario.password !== password) {
          return { ok: false, reason: "bad-password", message: "Contraseña incorrecta" }
        }
        if (!usuario.activo) {
          return {
            ok: false,
            reason: "inactive",
            message: "Esta cuenta está desactivada. Contacte al administrador.",
          }
        }
        // Actualizar último acceso
        set({
          usuarios: get().usuarios.map((u) =>
            u.id === usuario.id ? { ...u, ultimoAcceso: new Date().toISOString() } : u,
          ),
        })
        return { ok: true, usuario }
      },
      desactivarUsuario: (id) =>
        set({
          usuarios: get().usuarios.map((u) => (u.id === id ? { ...u, activo: false } : u)),
        }),
      activarUsuario: (id) =>
        set({
          usuarios: get().usuarios.map((u) => (u.id === id ? { ...u, activo: true } : u)),
        }),
      cambiarRol: (id, nuevoRol) =>
        set({
          usuarios: get().usuarios.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u)),
        }),
      actualizarUsuario: (id, data) =>
        set({
          usuarios: get().usuarios.map((u) => (u.id === id ? { ...u, ...data } : u)),
        }),
      getMovementsByDate: (date) => {
        const target = date.toDateString()
        return get().movements.filter((m) => new Date(m.fecha).toDateString() === target)
      },
      getProductBySku: (sku) => get().products.find((p) => p.sku.toLowerCase() === sku.toLowerCase()),
    }),
    {
      name: "el-teniente-inventory",
      version: 2,
      partialize: (state) => ({
        products: state.products,
        movements: state.movements,
        usuarios: state.usuarios,
        role: state.role,
        email: state.email,
      }),
      // v2: pivote de rubro (construcción -> camping y pesca).
      // Reseteamos catálogo y movimientos para reflejar el nuevo inventario.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<InventoryState>
        if (version < 2) {
          return {
            products: initialProducts,
            movements: [],
            usuarios: state.usuarios ?? initialUsuarios,
            role: state.role ?? null,
            email: state.email ?? null,
          }
        }
        return {
          products: state.products ?? initialProducts,
          movements: state.movements ?? [],
          usuarios: state.usuarios ?? initialUsuarios,
          role: state.role ?? null,
          email: state.email ?? null,
        }
      },
    },
  ),
)
