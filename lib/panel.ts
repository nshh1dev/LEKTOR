import "server-only"

import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { bookMetadata, orders, publications, stockMovements, users } from "@/db/schema"
import { ApiError, getSession, requireSession, type SafeUser } from "@/lib/auth"
import { RESERVA_HORAS, esStaff, estadoSegunStock } from "@/lib/catalog"
import type {
  PanelMovimientoInput,
  PanelMovimientosQuery,
  PanelOrdenesQuery,
  PanelPublicacionesQuery,
  PanelReportesQuery,
  PanelUsuariosQuery,
  SesionUsuario,
} from "@/lib/catalog"
import { claveDiaSantiago } from "@/lib/format"
import { diaLocal, inicioDiaSantiago } from "@/lib/panel-sql"

const compradorAlias = alias(users, "panel_comprador")
const vendedorAlias = alias(users, "panel_vendedor")

export async function requirePanelUser(): Promise<SafeUser> {
  const user = await requireSession()
  if (!esStaff(user.rol)) {
    throw new ApiError(403, "forbidden", "Necesitas una cuenta del equipo de LEKTOR")
  }
  return user
}

export async function requireAdminUser(): Promise<SafeUser> {
  const user = await requirePanelUser()
  if (user.rol !== "admin") {
    throw new ApiError(403, "forbidden", "Solo la administración puede realizar esta acción")
  }
  return user
}

export async function panelPageUser(): Promise<SafeUser> {
  const user = await getSession()
  if (!user || !esStaff(user.rol)) redirect("/")
  return user
}

export async function adminPageUser(): Promise<SafeUser> {
  const user = await panelPageUser()
  if (user.rol !== "admin") redirect("/dashboard")
  return user
}

export function toSesionUsuario(user: SafeUser): SesionUsuario {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol === "admin" ? "admin" : "lector",
    activo: user.activo,
    avatarUrl: user.avatarUrl,
  }
}

const inicioDia = inicioDiaSantiago()

function aInt(valor: number | string | null | undefined): number {
  return Number(valor ?? 0)
}

function escaparLike(valor: string): string {
  return `%${valor.replace(/[\\%_]/g, (match) => `\\${match}`)}%`
}

export async function resumenPanel() {
  const inicioMes = sql`date_trunc('month', now())`
  const inicioMesPrevio = sql`(date_trunc('month', now()) - interval '1 month')`

  const [
    [{ totalUsuarios = 0 } = { totalUsuarios: 0 }],
    [{ activos = 0 } = { activos: 0 }],
    [{ nuevos = 0 } = { nuevos: 0 }],
    [{ totalPublicaciones = 0 } = { totalPublicaciones: 0 }],
    [{ totalOrdenes = 0 } = { totalOrdenes: 0 }],
    [{ hoy = 0 } = { hoy: 0 }],
    [{ reservasPorVencer = 0 } = { reservasPorVencer: 0 }],
    [{ ventasMes = 0 } = { ventasMes: 0 }],
    [{ ventasMesPrevio = 0 } = { ventasMesPrevio: 0 }],
    [{ ventasTotal = 0 } = { ventasTotal: 0 }],
    [{ recibidas = 0 } = { recibidas: 0 }],
    estadosPublicacion,
    estadosOrden,
    [stock = { unidades: 0, agotadas: 0 }] = [
      { unidades: 0, agotadas: 0 },
    ],
  ] = await Promise.all([
    db.select({ totalUsuarios: sql<number>`count(*)::int` }).from(users),
    db.select({ activos: sql<number>`count(*) filter (where ${users.activo})::int` }).from(users),
    db
      .select({
        nuevos: sql<number>`count(*) filter (where ${users.fechaCreacion} > now() - interval '30 days')::int`,
      })
      .from(users),
    db.select({ totalPublicaciones: sql<number>`count(*)::int` }).from(publications),
    db.select({ totalOrdenes: sql<number>`count(*)::int` }).from(orders),
    db
      .select({ hoy: sql<number>`count(*) filter (where ${orders.fechaCreacion} >= ${inicioDia})::int` })
      .from(orders),
    db
      .select({ reservasPorVencer: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.estado, "reservada"),
          lte(orders.reservaExpiraEn, new Date(Date.now() + 6 * 3_600_000)),
        ),
      ),
    db
      .select({
        ventasMes: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida' and ${orders.fechaCreacion} >= ${inicioMes}), 0)::int`,
      })
      .from(orders),
    db
      .select({
        ventasMesPrevio: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida' and ${orders.fechaCreacion} >= ${inicioMesPrevio} and ${orders.fechaCreacion} < ${inicioMes}), 0)::int`,
      })
      .from(orders),
    db
      .select({
        ventasTotal: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
      })
      .from(orders),
    db
      .select({ recibidas: sql<number>`count(*) filter (where ${orders.estado} = 'recibida')::int` })
      .from(orders),
    db.select({ estado: publications.estado, total: count() }).from(publications).groupBy(publications.estado),
    db.select({ estado: orders.estado, total: count() }).from(orders).groupBy(orders.estado),
    db
      .select({
        unidades: sql<number>`coalesce(sum(${publications.stock}), 0)::int`,
        agotadas: sql<number>`count(*) filter (where ${publications.stock} = 0)::int`,
      })
      .from(publications),
  ])

  const [ordenesRecientes, topPublicaciones, topVendedores, movimientos, alertasStock] = await Promise.all([
    db
      .select({
        id: orders.id,
        tituloSnapshot: orders.tituloSnapshot,
        total: orders.total,
        estado: orders.estado,
        fechaCreacion: orders.fechaCreacion,
        comprador: compradorAlias.nombre,
        vendedor: vendedorAlias.nombre,
      })
      .from(orders)
      .innerJoin(compradorAlias, eq(orders.compradorId, compradorAlias.id))
      .innerJoin(vendedorAlias, eq(orders.vendedorId, vendedorAlias.id))
      .orderBy(desc(orders.fechaCreacion))
      .limit(8),
    db
      .select({
        publicacionId: orders.publicacionId,
        titulo: sql<string>`coalesce(${publications.titulo}, ${orders.tituloSnapshot}, 'Publicación eliminada')`,
        unidades: sql<number>`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
        ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
        stock: sql<number>`coalesce(max(${publications.stock}), 0)::int`,
      })
      .from(orders)
      .leftJoin(publications, eq(publications.id, orders.publicacionId))
      .groupBy(orders.publicacionId, orders.tituloSnapshot, publications.titulo)
      .orderBy(desc(sql`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)`))
      .limit(5),
    db
      .select({
        id: users.id,
        nombre: users.nombre,
        publicaciones: sql<number>`(select count(*)::int from publications p where p.vendedor_id = users.id)`,
        ventas: sql<number>`coalesce((select sum(o.total)::int from orders o where o.vendedor_id = users.id and o.estado = 'recibida'), 0)`,
      })
      .from(users)
      .orderBy(desc(sql`coalesce((select sum(o.total) from orders o where o.vendedor_id = users.id and o.estado = 'recibida'), 0)`), asc(users.nombre))
      .limit(5),
    db
      .select({
        id: stockMovements.id,
        tipo: stockMovements.tipo,
        cantidad: stockMovements.cantidad,
        motivo: stockMovements.motivo,
        fechaCreacion: stockMovements.fechaCreacion,
        titulo: publications.titulo,
        usuario: users.nombre,
      })
      .from(stockMovements)
      .innerJoin(publications, eq(stockMovements.publicacionId, publications.id))
      .innerJoin(users, eq(stockMovements.usuarioId, users.id))
      .orderBy(desc(stockMovements.fechaCreacion))
      .limit(8),
    db
      .select({
        id: publications.id,
        titulo: publications.titulo,
        stock: publications.stock,
        estado: publications.estado,
        vendedor: users.nombre,
      })
      .from(publications)
      .innerJoin(users, eq(publications.vendedorId, users.id))
      .where(sql`${publications.stock} = 0`)
      .orderBy(asc(publications.stock), desc(publications.fechaPublicacion))
      .limit(8),
  ])

  const ventasMesNumero = aInt(ventasMes)
  const ventasMesPrevioNumero = aInt(ventasMesPrevio)

  return {
    kpis: {
      publicaciones: totalPublicaciones,
      unidades: stock.unidades,
      agotadas: stock.agotadas,
      ordenes: totalOrdenes,
      ordenesHoy: hoy,
      recibidas,
      ventasMes: ventasMesNumero,
      ventasMesPrevio: ventasMesPrevioNumero,
      tendencia:
        ventasMesPrevioNumero === 0
          ? null
          : Math.round(((ventasMesNumero - ventasMesPrevioNumero) / ventasMesPrevioNumero) * 100),
      ventasTotal: ventasTotal,
      usuarios: totalUsuarios,
      usuariosActivos: activos,
      usuariosNuevos: nuevos,
      reservasPorVencer,
    },
    publicacionesPorEstado: Object.fromEntries(
      estadosPublicacion.map((fila) => [fila.estado, fila.total]),
    ) as Record<string, number>,
    ordenesPorEstado: Object.fromEntries(estadosOrden.map((fila) => [fila.estado, fila.total])) as Record<
      string,
      number
    >,
    ordenesRecientes,
    topPublicaciones,
    topVendedores,
    movimientos,
    alertasStock,
    reservaHoras: RESERVA_HORAS,
  }
}

const ORDENES = {
  recientes: desc(publications.fechaPublicacion),
  titulo: asc(publications.titulo),
  stock: asc(publications.stock),
  precio_desc: desc(publications.precio),
} as const

export async function publicacionesPanel(filtros: PanelPublicacionesQuery) {
  const condiciones: SQL[] = []

  if (filtros.q) {
    const patron = escaparLike(filtros.q)
    condiciones.push(
      sql`(${publications.titulo} ilike ${patron} or ${publications.autor} ilike ${patron} or ${publications.editorial} ilike ${patron} or ${publications.isbn} ilike ${patron})`,
    )
  }
  if (filtros.estado !== "todas") condiciones.push(eq(publications.estado, filtros.estado))
  if (filtros.categoria !== "todas") condiciones.push(eq(publications.categoria, filtros.categoria))
  if (filtros.vendedorId) condiciones.push(eq(publications.vendedorId, filtros.vendedorId))

  const where = condiciones.length > 0 ? and(...condiciones) : undefined

  const [filas, [conteo], resumen, vendedores] = await Promise.all([
    db
      .select({
        id: publications.id,
        titulo: publications.titulo,
        autor: publications.autor,
        editorial: publications.editorial,
        volumen: publications.volumen,
        categoria: publications.categoria,
        condicion: publications.condicion,
        precio: publications.precio,
        stock: publications.stock,
        isbn: publications.isbn,
        estado: publications.estado,
        fechaPublicacion: publications.fechaPublicacion,
        vendedorId: users.id,
        vendedorNombre: users.nombre,
        vendedorComuna: users.comuna,
        unidadesVendidas: sql<number>`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
        ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
        ordenesActivas: sql<number>`count(${orders.id}) filter (where ${orders.estado} in ('reservada', 'en_preparacion', 'despachada'))::int`,
      })
      .from(publications)
      .innerJoin(users, eq(publications.vendedorId, users.id))
      .leftJoin(orders, eq(orders.publicacionId, publications.id))
      .where(where)
      .groupBy(publications.id, users.id)
      .orderBy(ORDENES[filtros.orden])
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(publications).where(where),
    db
      .select({
        estado: publications.estado,
        total: count(),
        unidades: sql<number>`coalesce(sum(${publications.stock}), 0)::int`,
      })
      .from(publications)
      .groupBy(publications.estado),
    db
      .select({ id: users.id, nombre: users.nombre })
      .from(users)
      .where(sql`exists (select 1 from publications p where p.vendedor_id = ${users.id})`)
      .orderBy(asc(users.nombre)),
  ])

  return {
    publicaciones: filas,
    vendedores,
    resumen: Object.fromEntries(
      resumen.map((fila) => [fila.estado, { total: fila.total, unidades: fila.unidades }]),
    ) as Record<string, { total: number; unidades: number }>,
    paginacion: {
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      total: conteo.total,
      paginas: Math.max(1, Math.ceil(conteo.total / filtros.porPagina)),
    },
  }
}

export async function usuariosPanel(filtros: PanelUsuariosQuery) {
  const condiciones: SQL[] = []

  if (filtros.q) {
    const patron = escaparLike(filtros.q)
    condiciones.push(sql`(${users.nombre} ilike ${patron} or ${users.email} ilike ${patron})`)
  }
  if (filtros.rol !== "todos") condiciones.push(eq(users.rol, filtros.rol))
  if (filtros.activo !== "todos") condiciones.push(eq(users.activo, filtros.activo === "activos"))

  const where = condiciones.length > 0 ? and(...condiciones) : undefined

  const [filas, [conteo], roles, [activos]] = await Promise.all([
    db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        rol: users.rol,
        activo: users.activo,
        comuna: users.comuna,
        region: users.region,
        fechaCreacion: users.fechaCreacion,
        ultimoAcceso: users.ultimoAcceso,
        publicaciones: sql<number>`(select count(*)::int from publications p where p.vendedor_id = users.id)`,
        unidades: sql<number>`coalesce((select sum(p.stock)::int from publications p where p.vendedor_id = users.id), 0)`,
        compras: sql<number>`(select count(*)::int from orders o where o.comprador_id = users.id)`,
        ventas: sql<number>`coalesce((select sum(o.total)::int from orders o where o.vendedor_id = users.id and o.estado = 'recibida'), 0)`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.fechaCreacion), asc(users.nombre))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(users).where(where),
    db.select({ rol: users.rol, total: count() }).from(users).groupBy(users.rol),
    db.select({ total: sql<number>`count(*) filter (where ${users.activo})::int` }).from(users),
  ])

  return {
    usuarios: filas,
    roles: Object.fromEntries(roles.map((fila) => [fila.rol, fila.total])) as Record<string, number>,
    totalActivos: activos.total,
    paginacion: {
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      total: conteo.total,
      paginas: Math.max(1, Math.ceil(conteo.total / filtros.porPagina)),
    },
  }
}

export async function reportePanel({ dias }: PanelReportesQuery) {
  // El corte se calcula en la zona horaria del negocio para que "hoy" coincida con el
  // día que ve el usuario, en lugar del día UTC.
  const desdeSql = inicioDiaSantiago(dias)
  // El driver puede devolver el timestamptz como Date o como string según cómo resuelva la
  // expresión, así que normalizamos antes de exponerlo.
  const corte = await db.execute<{ desde: Date | string }>(sql`select ${desdeSql} as "desde"`)
  const valor = corte.rows[0]?.desde
  const desde = valor instanceof Date ? valor : new Date(valor ?? Date.now())

  const [serie, [resumen] = emptyResumen(), topTitulos, porCategoria, porEstado, vendedores, entregas, ordenesDetalle, movimientoTotales] =
    await Promise.all([
      db
        .select({
          dia: sql<string>`to_char(${diaLocal(orders.fechaCreacion)}, 'YYYY-MM-DD')`,
          ordenes: sql<number>`count(*)::int`,
          unidades: sql<number>`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          brutas: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
          recibidas: sql<number>`count(*) filter (where ${orders.estado} = 'recibida')::int`,
        })
        .from(orders)
        .where(gte(orders.fechaCreacion, desdeSql))
        .groupBy(diaLocal(orders.fechaCreacion))
        .orderBy(diaLocal(orders.fechaCreacion)),
      db
        .select({
          ordenes: sql<number>`count(*)::int`,
          // En todo el reporte `unidades` son unidades recibidas, igual que `ventas` y
          // que la serie diaria y el top de títulos. Lo que no se concretó va en `brutas`
          // y `canceladas`, que cuentan órdenes, no unidades.
          unidades: sql<number>`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          brutas: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
          recibidas: sql<number>`count(*) filter (where ${orders.estado} = 'recibida')::int`,
          canceladas: sql<number>`count(*) filter (where ${orders.estado} = 'cancelada')::int`,
          envios: sql<number>`coalesce(sum(${orders.envio}), 0)::int`,
        })
        .from(orders)
        .where(gte(orders.fechaCreacion, desdeSql)),
      db
        .select({
          titulo: sql<string>`coalesce(${publications.titulo}, ${orders.tituloSnapshot}, 'Publicación eliminada')`,
          unidades: sql<number>`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          ordenes: sql<number>`count(*)::int`,
        })
        .from(orders)
        .leftJoin(publications, eq(publications.id, orders.publicacionId))
        .where(gte(orders.fechaCreacion, desdeSql))
        .groupBy(publications.titulo, orders.tituloSnapshot)
        .orderBy(desc(sql`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)`))
        .limit(8),
      db
        .select({
          categoria: publications.categoria,
          unidades: sql<number>`coalesce(sum(${orders.cantidad}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
        })
        .from(orders)
        .leftJoin(publications, eq(publications.id, orders.publicacionId))
        .where(gte(orders.fechaCreacion, desdeSql))
        .groupBy(publications.categoria),
      db.select({ estado: orders.estado, total: count() }).from(orders).where(gte(orders.fechaCreacion, desdeSql)).groupBy(orders.estado),
      db
        .select({
          id: users.id,
          nombre: users.nombre,
          ventas: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)::int`,
          ordenes: sql<number>`count(*) filter (where ${orders.estado} = 'recibida')::int`,
        })
        .from(orders)
        .innerJoin(users, eq(orders.vendedorId, users.id))
        .where(gte(orders.fechaCreacion, desdeSql))
        .groupBy(users.id)
        .orderBy(desc(sql`coalesce(sum(${orders.total}) filter (where ${orders.estado} = 'recibida'), 0)`))
        .limit(6),
      db
        .select({
          metodo: sql<string>`coalesce(${orders.datosDespacho}->>'metodoEntrega', 'coordinar')`,
          total: count(),
        })
        .from(orders)
        .where(gte(orders.fechaCreacion, desdeSql))
        .groupBy(sql`coalesce(${orders.datosDespacho}->>'metodoEntrega', 'coordinar')`),
      db
        .select({
          id: orders.id,
          tituloSnapshot: orders.tituloSnapshot,
          categoria: publications.categoria,
          cantidad: orders.cantidad,
          total: orders.total,
          envio: orders.envio,
          estado: orders.estado,
          metodoEntrega: sql<string>`coalesce(${orders.datosDespacho}->>'metodoEntrega', 'coordinar')`,
          fechaCreacion: orders.fechaCreacion,
        })
        .from(orders)
        .leftJoin(publications, eq(publications.id, orders.publicacionId))
        .where(gte(orders.fechaCreacion, desdeSql))
        .orderBy(desc(orders.fechaCreacion))
        .limit(200),
      db
        .select({
          entradas: sql<number>`coalesce(sum(${stockMovements.cantidad}) filter (where ${stockMovements.tipo} = 'entrada'), 0)::int`,
          salidas: sql<number>`coalesce(sum(${stockMovements.cantidad}) filter (where ${stockMovements.tipo} = 'salida'), 0)::int`,
          ajustes: sql<number>`count(*) filter (where ${stockMovements.tipo} = 'ajuste')::int`,
        })
        .from(stockMovements)
        .where(gte(stockMovements.fechaCreacion, desdeSql)),
    ])

  const movimientos = movimientoTotales[0] ?? { entradas: 0, salidas: 0, ajustes: 0 }

  return {
    dias,
    desde: desde.toISOString(),
    resumen: {
      ordenes: resumen.ordenes,
      unidades: resumen.unidades,
      recibidas: resumen.recibidas,
      ventas: resumen.ventas,
      brutas: resumen.brutas,
      envios: resumen.envios,
      canceladas: resumen.canceladas,
      ticketPromedio: resumen.recibidas > 0 ? Math.round(resumen.ventas / resumen.recibidas) : 0,
      tasaCancelacion: resumen.ordenes > 0 ? Math.round((resumen.canceladas / resumen.ordenes) * 1000) / 10 : 0,
      movimientos: {
        entradas: movimientos.entradas,
        salidas: movimientos.salidas,
        ajustes: movimientos.ajustes,
        balance: movimientos.entradas - movimientos.salidas,
      },
    },
    serie: completarSerie(serie, dias),
    topTitulos,
    porCategoria: porCategoria.map((fila) => ({
      categoria: fila.categoria ?? "Publicación eliminada",
      unidades: fila.unidades,
      ventas: fila.ventas,
    })),
    porEstado: porEstado.map((fila) => ({ estado: fila.estado, total: fila.total })),
    vendedores,
    entregas: entregas.map((fila) => ({ metodo: fila.metodo, total: fila.total })),
    ordenesDetalle,
  }
}

type SerieFila = {
  dia: string
  ordenes: number
  unidades: number
  ventas: number
  brutas: number
  recibidas: number
}

function emptyResumen() {
  return [
    {
      ordenes: 0,
      unidades: 0,
      ventas: 0,
      brutas: 0,
      recibidas: 0,
      canceladas: 0,
      envios: 0,
    },
  ]
}

function completarSerie(serie: SerieFila[], dias: number): SerieFila[] {
  const porDia = new Map(serie.map((fila) => [fila.dia, fila]))
  const salida: SerieFila[] = []
  for (let i = dias - 1; i >= 0; i -= 1) {
    const dia = claveDiaSantiago(new Date(Date.now() - i * 86_400_000))
    salida.push(porDia.get(dia) ?? { dia, ordenes: 0, unidades: 0, ventas: 0, brutas: 0, recibidas: 0 })
  }
  return salida
}

export async function ordenesPanel(filtros: PanelOrdenesQuery) {
  const condiciones: SQL[] = []

  if (filtros.q) {
    const patron = escaparLike(filtros.q)
    condiciones.push(
      sql`(${orders.tituloSnapshot} ilike ${patron} or ${compradorAlias.nombre} ilike ${patron} or ${vendedorAlias.nombre} ilike ${patron} or cast(${orders.id} as text) ilike ${patron})`,
    )
  }
  if (filtros.estado !== "todas") condiciones.push(eq(orders.estado, filtros.estado))

  const where = and(...condiciones)

  const [filas, [conteo], estados] = await Promise.all([
    db
      .select({
        id: orders.id,
        publicacionId: orders.publicacionId,
        tituloSnapshot: orders.tituloSnapshot,
        cantidad: orders.cantidad,
        total: orders.total,
        metodoPago: orders.metodoPago,
        estado: orders.estado,
        reservaExpiraEn: orders.reservaExpiraEn,
        fechaCreacion: orders.fechaCreacion,
        datosDespacho: orders.datosDespacho,
        comprador: {
          id: compradorAlias.id,
          nombre: compradorAlias.nombre,
          telefono: compradorAlias.telefono,
          comuna: compradorAlias.comuna,
        },
        vendedor: {
          id: vendedorAlias.id,
          nombre: vendedorAlias.nombre,
          telefono: vendedorAlias.telefono,
          comuna: vendedorAlias.comuna,
        },
      })
      .from(orders)
      .innerJoin(compradorAlias, eq(orders.compradorId, compradorAlias.id))
      .innerJoin(vendedorAlias, eq(orders.vendedorId, vendedorAlias.id))
      .where(where)
      .orderBy(asc(orders.reservaExpiraEn), desc(orders.fechaCreacion))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db
      .select({ total: count() })
      .from(orders)
      .innerJoin(compradorAlias, eq(orders.compradorId, compradorAlias.id))
      .innerJoin(vendedorAlias, eq(orders.vendedorId, vendedorAlias.id))
      .where(where),
    db.select({ estado: orders.estado, total: count() }).from(orders).groupBy(orders.estado),
  ])

  return {
    ordenes: filas,
    estados: Object.fromEntries(estados.map((fila) => [fila.estado, fila.total])) as Record<string, number>,
    paginacion: {
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      total: conteo.total,
      paginas: Math.max(1, Math.ceil(conteo.total / filtros.porPagina)),
    },
  }
}

export async function registrarMovimiento(usuario: SafeUser, input: PanelMovimientoInput) {
  return db.transaction(async (tx) => {
    const bloqueada = await tx.execute<{ stock: number; estado: string }>(
      sql`select stock, estado from publications where id = ${input.publicacionId} for update`,
    )
    const publicacion = bloqueada.rows[0]
    if (!publicacion) throw new ApiError(404, "not-found", "Publicación no encontrada")

    const stockAnterior = publicacion.stock
    let stockResultante = stockAnterior

    if (input.tipo === "entrada") {
      stockResultante = stockAnterior + input.cantidad
    } else if (input.tipo === "salida") {
      if (input.cantidad > stockAnterior) {
        throw new ApiError(409, "stock-insuficiente", "No hay ejemplares suficientes para registrar la salida")
      }
      stockResultante = stockAnterior - input.cantidad
    } else {
      stockResultante = input.cantidad
    }

    const enPausa = publicacion.estado === "pausada"
    const estado = estadoSegunStock(stockResultante, enPausa ? "pausada" : "activa")

    await tx
      .update(publications)
      .set({ stock: stockResultante, estado })
      .where(eq(publications.id, input.publicacionId))

    const [movimiento] = await tx
      .insert(stockMovements)
      .values({
        publicacionId: input.publicacionId,
        usuarioId: usuario.id,
        tipo: input.tipo,
        cantidad: input.cantidad,
        stockAnterior,
        stockResultante,
        motivo: input.motivo || null,
      })
      .returning()

    return { movimiento: movimiento!, estado, stock: stockResultante }
  })
}

export async function actualizarUsuarioPanel(
  actor: SafeUser,
  cambios: { id: string; rol?: "admin" | "lector"; activo?: boolean },
) {
  return db.transaction(async (tx) => {
    const bloqueado = await tx.execute<{ id: string; rol: string; activo: boolean }>(
      sql`select id, rol, activo from users where id = ${cambios.id} for update`,
    )
    const objetivo = bloqueado.rows[0]
    if (!objetivo) throw new ApiError(404, "not-found", "Usuario no encontrado")

    if (cambios.id === actor.id && (cambios.activo === false || (cambios.rol && cambios.rol !== actor.rol))) {
      throw new ApiError(400, "mismo-usuario", "No puedes cambiar tu propio rol ni desactivar tu cuenta")
    }

    const rolFinal = cambios.rol ?? (objetivo.rol as "admin" | "lector")
    const activoFinal = cambios.activo ?? objetivo.activo
    const degradaAdmin = objetivo.rol === "admin" && objetivo.activo && (rolFinal !== "admin" || !activoFinal)

    if (degradaAdmin) {
      // El bloqueo de filas serializa a los administradores concurrentes: la comprobación
      // y la actualización comparten transacción, así que no pueden quedar cero admins.
      const admins = await tx.execute<{ id: string }>(
        sql`select id from users where rol = 'admin' and activo = true for update`,
      )
      if (admins.rows.length <= 1) {
        throw new ApiError(409, "ultimo-admin", "Debe quedar al menos una cuenta de administración activa")
      }
    }

    const [actualizado] = await tx
      .update(users)
      .set({
        ...(cambios.rol ? { rol: cambios.rol } : {}),
        ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
      })
      .where(eq(users.id, cambios.id))
      .returning({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        rol: users.rol,
        activo: users.activo,
      })

    if (cambios.activo === false) {
      await tx.execute(sql`delete from sessions where user_id = ${cambios.id}`)
    }

    return actualizado!
  })
}

export async function buscarPorIsbn(isbn: string) {
  const [metadata] = await db.select().from(bookMetadata).where(eq(bookMetadata.isbn, isbn)).limit(1)

  const publicaciones = await db
    .select({
      id: publications.id,
      titulo: publications.titulo,
      autor: publications.autor,
      editorial: publications.editorial,
      precio: publications.precio,
      stock: publications.stock,
      estado: publications.estado,
      vendedor: users.nombre,
      movimientos: sql<number>`(select count(*) from stock_movements m where m.publicacion_id = publications.id)::int`,
      ultimoMovimiento: sql<Date | null>`(select max(m.fecha_creacion) from stock_movements m where m.publicacion_id = publications.id)`,
    })
    .from(publications)
    .innerJoin(users, eq(publications.vendedorId, users.id))
    .where(eq(publications.isbn, isbn))
    .orderBy(asc(publications.titulo))

  return {
    metadata: metadata ? { ...metadata, fuente: "cache" as const } : null,
    publicaciones,
  }
}

/**
 * Historial paginado de movimientos de stock de todo el marketplace. Es la única
 * forma de auditar el inventario: el resumen del dashboard solo trae los últimos
 * movimientos y `movimientosDePublicacion` solo mira una publicación.
 */
export async function movimientosPanel(filtros: PanelMovimientosQuery) {
  const condiciones: SQL[] = []

  if (filtros.publicacionId) {
    condiciones.push(eq(stockMovements.publicacionId, filtros.publicacionId))
  }
  if (filtros.tipo !== "todos") {
    condiciones.push(eq(stockMovements.tipo, filtros.tipo))
  }
  if (filtros.q) {
    const patron = escaparLike(filtros.q)
    condiciones.push(
      sql`(${publications.titulo} ilike ${patron} or ${stockMovements.motivo} ilike ${patron} or cast(${stockMovements.id} as text) ilike ${patron} or cast(${publications.id} as text) ilike ${patron})`,
    )
  }

  const where = and(...condiciones)

  const [filas, [conteo]] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        tipo: stockMovements.tipo,
        cantidad: stockMovements.cantidad,
        stockAnterior: stockMovements.stockAnterior,
        stockResultante: stockMovements.stockResultante,
        motivo: stockMovements.motivo,
        fechaCreacion: stockMovements.fechaCreacion,
        publicacion: {
          id: publications.id,
          titulo: publications.titulo,
        },
        usuario: {
          id: users.id,
          nombre: users.nombre,
        },
      })
      .from(stockMovements)
      .innerJoin(publications, eq(stockMovements.publicacionId, publications.id))
      .innerJoin(users, eq(stockMovements.usuarioId, users.id))
      .where(where)
      .orderBy(desc(stockMovements.fechaCreacion), desc(stockMovements.id))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db
      .select({ total: count() })
      .from(stockMovements)
      .innerJoin(publications, eq(stockMovements.publicacionId, publications.id))
      .innerJoin(users, eq(stockMovements.usuarioId, users.id))
      .where(where),
  ])

  return {
    movimientos: filas,
    paginacion: {
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      total: conteo.total,
      paginas: Math.max(1, Math.ceil(conteo.total / filtros.porPagina)),
    },
  }
}

export async function movimientosDePublicacion(publicacionId: string, limite = 12) {
  return db
    .select({
      id: stockMovements.id,
      tipo: stockMovements.tipo,
      cantidad: stockMovements.cantidad,
      stockAnterior: stockMovements.stockAnterior,
      stockResultante: stockMovements.stockResultante,
      motivo: stockMovements.motivo,
      fechaCreacion: stockMovements.fechaCreacion,
      usuario: users.nombre,
    })
    .from(stockMovements)
    .innerJoin(users, eq(stockMovements.usuarioId, users.id))
    .where(eq(stockMovements.publicacionId, publicacionId))
    .orderBy(desc(stockMovements.fechaCreacion))
    .limit(limite)
}
