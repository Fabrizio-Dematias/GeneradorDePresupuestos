/**
 * Mock del cliente de Supabase para previsualizar la interfaz sin un
 * proyecto real (build con `vite build -c vite.mock.config.ts`).
 * Solo se usa para desarrollo/screenshots; la app real usa src/lib/supabase.ts.
 */

const productos = [
  { id: 541, codigo: '401', descripcion: 'TAL modo P8020 /P5411 - Sierra Circular modo Ks81 O 6x8x16', precio_unitario: 1597.12, categoria: 'CARBONES', stock: 8, stock_minimo: 10, fecha_actualizacion: '2026-02-10T02:10:53' },
  { id: 542, codigo: '402', descripcion: 'AM. 41/2" SEG 500-TAL 10 mm.Mod.BDI52/154 6,3x6,3x15', precio_unitario: 1014.93, categoria: 'CARBONES', stock: 0, stock_minimo: 5, fecha_actualizacion: '2026-02-10T02:10:53' },
  { id: 538, codigo: '61001', descripcion: 'LAZO NUEVO 8x9x30', precio_unitario: 3953.48, categoria: 'CARBONES', stock: 150, stock_minimo: 50, fecha_actualizacion: '2026-02-10T02:10:53' },
  { id: 539, codigo: '61002', descripcion: 'LAZO GRANDE 6x18x32', precio_unitario: 4735.49, categoria: 'CARBONES', stock: 30, stock_minimo: 40, fecha_actualizacion: '2026-02-10T02:10:53' },
  { id: 700, codigo: '699', descripcion: 'CARBONES BOSCH GSB 13 RE', precio_unitario: 1200, categoria: 'CARBONES', stock: 0, stock_minimo: 0, fecha_actualizacion: '2026-03-01T10:00:00' },
  { id: 801, codigo: '1031', descripcion: 'CUBETA Ø22 - 608 - 627', precio_unitario: 713.08, categoria: 'RULEMANES Y CUBETAS', stock: 200, stock_minimo: 50, fecha_actualizacion: '2026-02-20T10:00:00' },
  { id: 802, codigo: '1032', descripcion: 'CUBETA Ø24 - 609', precio_unitario: 860.97, categoria: 'RULEMANES Y CUBETAS', stock: 12, stock_minimo: 20, fecha_actualizacion: '2026-02-20T10:00:00' },
  { id: 803, codigo: '2001', descripcion: 'CAPACITOR 450V 25uF', precio_unitario: 5230.5, categoria: 'CAPACITORES', stock: 45, stock_minimo: 10, fecha_actualizacion: '2026-02-22T10:00:00' },
  { id: 804, codigo: '2002', descripcion: 'CAPACITOR 450V 40uF', precio_unitario: 6890, categoria: 'CAPACITORES', stock: 5, stock_minimo: 8, fecha_actualizacion: '2026-02-22T10:00:00' },
  { id: 805, codigo: '3001', descripcion: 'INTERRUPTOR AMOLADORA 5/8', precio_unitario: 3120.75, categoria: 'INTERRUPTORES', stock: 0, stock_minimo: 3, fecha_actualizacion: '2026-02-25T10:00:00' },
  { id: 806, codigo: '4001', descripcion: 'PIÑÓN TALADRO 13mm', precio_unitario: 2480, categoria: 'REPUESTOS VARIOS', stock: 60, stock_minimo: 15, fecha_actualizacion: '2026-03-02T10:00:00' },
  { id: 807, codigo: '4002', descripcion: 'MANDRIL 13mm C/LLAVE', precio_unitario: 8975.25, categoria: 'REPUESTOS VARIOS', stock: 3, stock_minimo: 0, fecha_actualizacion: '2026-03-02T10:00:00' },
]

const remitos = [
  { id: 23, numero: '0001-008', fecha: '2026-06-08', cliente_nombre: 'Antonio Arone', cliente_domicilio: '', cliente_cuit: '20-11222333-4', condicion_iva: 'Resp. Inscripto', condicion_venta: 'Cuenta Corriente', total: 215918.87, estado: 'Completado', ruta_pdf: 'remito_Antonio_Arone_0001-008.pdf', fecha_creacion: '2026-06-08T22:21:22' },
  { id: 22, numero: '0001-007', fecha: '2026-05-15', cliente_nombre: 'Gustavo Clara', cliente_domicilio: 'Av. Colón 1234, Córdoba', cliente_cuit: '', condicion_iva: 'Consumidor Final', condicion_venta: 'Contado', total: 2513843.97, estado: 'Completado', ruta_pdf: '', fecha_creacion: '2026-05-15T20:41:35' },
  { id: 21, numero: '0001-006', fecha: '2026-05-12', cliente_nombre: 'Gigena - Electromundo', cliente_domicilio: '', cliente_cuit: '', condicion_iva: 'Monotributo', condicion_venta: 'Contado', total: 67861.26, estado: 'Anulado', ruta_pdf: '', fecha_creacion: '2026-05-12T20:24:40' },
  { id: 19, numero: '0001-005', fecha: '2026-04-26', cliente_nombre: 'Daniel Ferrero', cliente_domicilio: 'San Vicente', cliente_cuit: '', condicion_iva: 'Consumidor Final', condicion_venta: 'Contado', total: 213024.85, estado: 'Completado', ruta_pdf: '', fecha_creacion: '2026-04-26T22:30:57' },
  { id: 18, numero: '0001-004', fecha: '2026-03-25', cliente_nombre: 'Fernando Martinez', cliente_domicilio: '', cliente_cuit: '', condicion_iva: 'Consumidor Final', condicion_venta: 'Contado', total: 36896.94, estado: 'Completado', ruta_pdf: '', fecha_creacion: '2026-03-25T18:18:37' },
  { id: 7, numero: '0001-003', fecha: '2026-02-10', cliente_nombre: 'Gustavo Clara', cliente_domicilio: '', cliente_cuit: '', condicion_iva: 'Consumidor Final', condicion_venta: 'Contado', total: 911576.26, estado: 'Completado', ruta_pdf: '', fecha_creacion: '2026-02-10T15:42:37' },
  { id: 6, numero: '0001-002', fecha: '2026-02-10', cliente_nombre: 'Antonio Arone', cliente_domicilio: '', cliente_cuit: '', condicion_iva: 'Resp. Inscripto', condicion_venta: 'Contado', total: 301961.12, estado: 'Completado', ruta_pdf: '', fecha_creacion: '2026-02-10T15:15:21' },
  { id: 5, numero: '0001-001', fecha: '2026-02-10', cliente_nombre: 'Grupo Mengo', cliente_domicilio: '', cliente_cuit: '', condicion_iva: 'Consumidor Final', condicion_venta: 'Contado', total: 242369.47, estado: 'Completado', ruta_pdf: '', fecha_creacion: '2026-02-10T13:59:31' },
]

const fechaPorRemito = new Map(remitos.map((r) => [r.id, r.fecha]))

const remito_items = [
  { id: 1, remito_id: 23, codigo: '1031', cantidad: 20, descripcion: 'CUBETA Ø22 - 608 - 627', precio_unitario: 713.08, bonificacion: 25, subtotal: 10696.19 },
  { id: 2, remito_id: 23, codigo: '1032', cantidad: 10, descripcion: 'CUBETA Ø24 - 609', precio_unitario: 860.97, bonificacion: 25, subtotal: 6457.28 },
  { id: 3, remito_id: 23, codigo: '401', cantidad: 50, descripcion: 'TAL modo P8020 /P5411 - Sierra Circular', precio_unitario: 1597.12, bonificacion: 10, subtotal: 71870.54 },
  { id: 4, remito_id: 22, codigo: '61001', cantidad: 200, descripcion: 'LAZO NUEVO 8x9x30', precio_unitario: 3953.48, bonificacion: 0, subtotal: 790695.4 },
  { id: 5, remito_id: 22, codigo: '61002', cantidad: 150, descripcion: 'LAZO GRANDE 6x18x32', precio_unitario: 4735.49, bonificacion: 5, subtotal: 674807.33 },
  { id: 6, remito_id: 21, codigo: '699', cantidad: 30, descripcion: 'CARBONES BOSCH GSB 13 RE', precio_unitario: 1200, bonificacion: 10, subtotal: 32400 },
  { id: 7, remito_id: 19, codigo: '2001', cantidad: 25, descripcion: 'CAPACITOR 450V 25uF', precio_unitario: 5230.5, bonificacion: 0, subtotal: 130762.5 },
  { id: 8, remito_id: 18, codigo: '4001', cantidad: 12, descripcion: 'PIÑÓN TALADRO 13mm', precio_unitario: 2480, bonificacion: 0, subtotal: 29760 },
  { id: 9, remito_id: 7, codigo: '402', cantidad: 400, descripcion: 'AM. 41/2" SEG 500-TAL 10 mm', precio_unitario: 1014.93, bonificacion: 15, subtotal: 345076.2 },
  { id: 10, remito_id: 6, codigo: '3001', cantidad: 40, descripcion: 'INTERRUPTOR AMOLADORA 5/8', precio_unitario: 3120.75, bonificacion: 0, subtotal: 124830 },
  { id: 11, remito_id: 5, codigo: '699', cantidad: 100, descripcion: 'CARBONES BOSCH GSB 13 RE', precio_unitario: 1200, bonificacion: 10, subtotal: 108000 },
].map((i) => ({ ...i, remitos: { fecha: fechaPorRemito.get(i.remito_id) ?? '2026-01-01' } }))

const historial_precios = [
  { id: 6, producto_codigo: '61001', producto_descripcion: 'LAZO NUEVO 8x9x30', precio_anterior: 3437.81, precio_nuevo: 3953.48, porcentaje_cambio: 15, categoria: 'CARBONES', fecha_cambio: '2026-05-20T11:30:00' },
  { id: 5, producto_codigo: '61002', producto_descripcion: 'LAZO GRANDE 6x18x32', precio_anterior: 4117.82, precio_nuevo: 4735.49, porcentaje_cambio: 15, categoria: 'CARBONES', fecha_cambio: '2026-05-20T11:30:00' },
  { id: 4, producto_codigo: '401', producto_descripcion: 'TAL modo P8020 /P5411', precio_anterior: 1388.8, precio_nuevo: 1597.12, porcentaje_cambio: 15, categoria: 'CARBONES', fecha_cambio: '2026-05-20T11:30:00' },
  { id: 3, producto_codigo: '2001', producto_descripcion: 'CAPACITOR 450V 25uF', precio_anterior: 5505.79, precio_nuevo: 5230.5, porcentaje_cambio: -5, categoria: 'CAPACITORES', fecha_cambio: '2026-04-12T09:15:00' },
  { id: 2, producto_codigo: '1031', producto_descripcion: 'CUBETA Ø22 - 608 - 627', precio_anterior: 620.07, precio_nuevo: 713.08, porcentaje_cambio: 15, categoria: 'RULEMANES Y CUBETAS', fecha_cambio: '2026-03-18T16:45:00' },
  { id: 1, producto_codigo: '4002', producto_descripcion: 'MANDRIL 13mm C/LLAVE', precio_anterior: 8154.77, precio_nuevo: 8975.25, porcentaje_cambio: 10.06, categoria: 'REPUESTOS VARIOS', fecha_cambio: '2026-03-18T16:45:00' },
]

const movimientos_stock = [
  { id: 10, producto_id: 538, producto_codigo: '61001', producto_descripcion: 'LAZO NUEVO 8x9x30', tipo: 'ingreso', cantidad: 300, stock_anterior: 50, stock_nuevo: 350, motivo: 'Compra a proveedor', remito_id: null, fecha: '2026-06-05T10:15:00' },
  { id: 9, producto_id: 538, producto_codigo: '61001', producto_descripcion: 'LAZO NUEVO 8x9x30', tipo: 'egreso', cantidad: 200, stock_anterior: 350, stock_nuevo: 150, motivo: 'Venta · remito 0001-007', remito_id: 22, fecha: '2026-05-15T20:41:35' },
  { id: 8, producto_id: 801, producto_codigo: '1031', producto_descripcion: 'CUBETA Ø22 - 608 - 627', tipo: 'ingreso', cantidad: 220, stock_anterior: 0, stock_nuevo: 220, motivo: 'Stock inicial', remito_id: null, fecha: '2026-05-02T09:00:00' },
  { id: 7, producto_id: 801, producto_codigo: '1031', producto_descripcion: 'CUBETA Ø22 - 608 - 627', tipo: 'egreso', cantidad: 20, stock_anterior: 220, stock_nuevo: 200, motivo: 'Venta · remito 0001-008', remito_id: 23, fecha: '2026-06-08T22:21:22' },
  { id: 6, producto_id: 542, producto_codigo: '402', producto_descripcion: 'AM. 41/2" SEG 500-TAL 10 mm', tipo: 'egreso', cantidad: 400, stock_anterior: 400, stock_nuevo: 0, motivo: 'Venta · remito 0001-003', remito_id: 7, fecha: '2026-02-10T15:42:37' },
  { id: 5, producto_id: 804, producto_codigo: '2002', producto_descripcion: 'CAPACITOR 450V 40uF', tipo: 'ajuste', cantidad: 2, stock_anterior: 7, stock_nuevo: 5, motivo: 'Conteo de inventario', remito_id: null, fecha: '2026-05-28T17:30:00' },
  { id: 4, producto_id: 806, producto_codigo: '4001', producto_descripcion: 'PIÑÓN TALADRO 13mm', tipo: 'ingreso', cantidad: 72, stock_anterior: 0, stock_nuevo: 72, motivo: 'Compra a proveedor', remito_id: null, fecha: '2026-04-20T11:00:00' },
  { id: 3, producto_id: 806, producto_codigo: '4001', producto_descripcion: 'PIÑÓN TALADRO 13mm', tipo: 'egreso', cantidad: 12, stock_anterior: 72, stock_nuevo: 60, motivo: 'Venta · remito 0001-004', remito_id: 18, fecha: '2026-03-25T18:18:37' },
  { id: 2, producto_id: 805, producto_codigo: '3001', producto_descripcion: 'INTERRUPTOR AMOLADORA 5/8', tipo: 'egreso', cantidad: 40, stock_anterior: 40, stock_nuevo: 0, motivo: 'Venta · remito 0001-002', remito_id: 6, fecha: '2026-02-10T15:15:21' },
  { id: 1, producto_id: 541, producto_codigo: '401', producto_descripcion: 'TAL modo P8020 /P5411', tipo: 'ingreso', cantidad: 58, stock_anterior: 0, stock_nuevo: 58, motivo: 'Stock inicial', remito_id: null, fecha: '2026-02-01T08:30:00' },
]

const clientes = [
  { id: 1, nombre: 'Antonio Arone', domicilio: 'Bv. Los Andes 1450, Córdoba', cuit: '20112223334', condicion_iva: 'Resp. Inscripto', condicion_venta: 'Cuenta Corriente', fecha_creacion: '2026-06-01T10:00:00' },
  { id: 2, nombre: 'Gustavo Clara', domicilio: 'Av. Colón 1234, Córdoba', cuit: '', condicion_iva: 'Consumidor Final', condicion_venta: 'Contado', fecha_creacion: '2026-06-01T10:00:00' },
  { id: 3, nombre: 'Gigena - Electromundo', domicilio: 'Rivadavia 89, Villa María', cuit: '27334445556', condicion_iva: 'Monotributo', condicion_venta: 'Contado', fecha_creacion: '2026-06-10T10:00:00' },
]

const user_profiles = [
  { id: 'u1', username: 'fabrizio', email: 'dicorcarbones@gmail.com' },
]

const DB: Record<string, any[]> = { productos, remitos, remito_items, historial_precios, movimientos_stock, clientes, user_profiles }

function crearBuilder(table: string) {
  const state = {
    head: false,
    single: false,
    eqs: [] as [string, any][],
    ins: [] as [string, any[]][],
    gtes: [] as [string, any][],
    ltes: [] as [string, any][],
    ors: [] as string[],
    orders: [] as [string, boolean][],
    limit: undefined as number | undefined,
    range: undefined as [number, number] | undefined,
  }
  function resolver() {
    let rows = [...(DB[table] ?? [])]
    for (const [c, v] of state.eqs) rows = rows.filter((r) => r[c] === v)
    for (const [c, vs] of state.ins) rows = rows.filter((r) => vs.includes(r[c]))
    for (const [c, v] of state.gtes) rows = rows.filter((r) => r[c] >= v)
    for (const [c, v] of state.ltes) rows = rows.filter((r) => r[c] <= v)
    // Soporta el formato "col.ilike.%q%,col2.ilike.%q%"
    for (const expr of state.ors) {
      const condiciones = expr.split(',').map((c) => c.split('.ilike.'))
      rows = rows.filter((r) =>
        condiciones.some(([col, patron]) => {
          const q = (patron ?? '').replace(/%/g, '').toLowerCase()
          return String(r[col] ?? '').toLowerCase().includes(q)
        })
      )
    }
    const total = rows.length
    for (const [c, asc] of [...state.orders].reverse()) {
      rows.sort((a, b) => (a[c] < b[c] ? (asc ? -1 : 1) : a[c] > b[c] ? (asc ? 1 : -1) : 0))
    }
    if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1)
    if (state.limit) rows = rows.slice(0, state.limit)
    if (state.single) {
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'no rows' }, count: total }
    }
    return { data: state.head ? null : rows, error: null, count: total }
  }
  const api: any = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.head) state.head = true
      return api
    },
    order(col: string, opts?: { ascending?: boolean }) {
      state.orders.push([col, opts?.ascending !== false])
      return api
    },
    limit(n: number) {
      state.limit = n
      return api
    },
    range(from: number, to: number) {
      state.range = [from, to]
      return api
    },
    eq(col: string, val: any) {
      state.eqs.push([col, val])
      return api
    },
    in(col: string, vals: any[]) {
      state.ins.push([col, vals])
      return api
    },
    gte(col: string, val: any) {
      state.gtes.push([col, val])
      return api
    },
    lte(col: string, val: any) {
      state.ltes.push([col, val])
      return api
    },
    or(expr: string) {
      state.ors.push(expr)
      return api
    },
    single() {
      state.single = true
      return api
    },
    maybeSingle() {
      state.single = true
      return api
    },
    insert() {
      return api
    },
    upsert() {
      return api
    },
    update() {
      return api
    },
    delete() {
      return api
    },
    then(resolve: (r: any) => void) {
      resolve(resolver())
    },
  }
  return api
}

const fakeSession = {
  user: { id: 'u1', email: 'dicorcarbones@gmail.com' },
}

const sinSesion = typeof window !== 'undefined' && window.location.search.includes('nologin')

const noAnulados = () => remitos.filter((r) => r.estado !== 'Anulado')

/** Réplica en memoria de las funciones SQL de agregación. */
function ejecutarRPC(nombre: string, args: any = {}) {
  switch (nombre) {
    case 'proximo_numero_remito':
      return '0001-009'
    case 'login_email':
      return user_profiles[0].email
    case 'facturacion_mensual': {
      const mapa = new Map<string, { anio: number; mes: number; cantidad: number; total: number }>()
      for (const r of noAnulados()) {
        const anio = Number(r.fecha.slice(0, 4))
        const mes = Number(r.fecha.slice(5, 7))
        const clave = `${anio}-${mes}`
        const fila = mapa.get(clave) ?? { anio, mes, cantidad: 0, total: 0 }
        fila.cantidad += 1
        fila.total += r.total
        mapa.set(clave, fila)
      }
      return Array.from(mapa.values()).sort((a, b) => a.anio - b.anio || a.mes - b.mes)
    }
    case 'productos_reposicion':
      return productos
        .filter((p) => p.stock <= 0 || (p.stock_minimo > 0 && p.stock <= p.stock_minimo))
        .sort((a, b) => a.stock - b.stock)
    case 'ranking_productos': {
      const idsValidos = new Set(noAnulados().filter((r) => !args.p_desde || r.fecha >= args.p_desde).map((r) => r.id))
      const mapa = new Map<string, any>()
      for (const it of remito_items) {
        if (!idsValidos.has(it.remito_id)) continue
        const clave = `${it.codigo ?? ''}|${it.descripcion}`
        const fila = mapa.get(clave) ?? {
          codigo: it.codigo ?? '—',
          descripcion: it.descripcion,
          categoria: productos.find((p) => p.codigo === it.codigo)?.categoria ?? 'SIN CATEGORÍA',
          cantidad: 0,
          facturado: 0,
        }
        fila.cantidad += it.cantidad
        fila.facturado += it.subtotal
        mapa.set(clave, fila)
      }
      const lista = Array.from(mapa.values())
      lista.sort((a, b) => (args.p_orden === 'facturado' ? b.facturado - a.facturado : b.cantidad - a.cantidad))
      return lista.slice(0, args.p_limite ?? 10)
    }
    case 'resumen_ventas': {
      const idsValidos = new Set(noAnulados().filter((r) => !args.p_desde || r.fecha >= args.p_desde).map((r) => r.id))
      const items = remito_items.filter((it) => idsValidos.has(it.remito_id))
      return [
        {
          unidades: items.reduce((a, i) => a + i.cantidad, 0),
          productos_distintos: new Set(items.map((i) => `${i.codigo ?? ''}|${i.descripcion}`)).size,
          facturado: items.reduce((a, i) => a + i.subtotal, 0),
        },
      ]
    }
    // Mutaciones: no persisten nada en el mock
    case 'crear_remito':
    case 'actualizar_remito':
      return { id: 99, numero: '0001-009' }
    default:
      return null
  }
}

export const isSupabaseConfigured = true

export const supabase: any = {
  from: crearBuilder,
  rpc: async (nombre: string, args?: any) => ({ data: ejecutarRPC(nombre, args), error: null }),
  auth: {
    getSession: async () => ({ data: { session: sinSesion ? null : fakeSession } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
}
