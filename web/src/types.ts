export interface Producto {
  id: number
  codigo: string
  descripcion: string
  precio_unitario: number
  categoria: string
  /** Datos de catálogo, opcionales: los usa la lista de precios en PDF. */
  marca: string | null
  medidas: string | null
  modelo: string | null
  stock: number
  stock_minimo: number
  fecha_actualizacion: string | null
}

export type TipoMovimiento = 'ingreso' | 'egreso' | 'ajuste'

export interface MovimientoStock {
  id: number
  producto_id: number | null
  producto_codigo: string | null
  producto_descripcion: string | null
  tipo: TipoMovimiento
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  remito_id: number | null
  fecha: string
}

export interface Marca {
  nombre: string
  logo: string | null
  fecha_actualizacion?: string | null
}

export interface Cliente {
  id: number
  nombre: string
  domicilio: string | null
  cuit: string | null
  condicion_iva: string | null
  condicion_venta: string | null
  fecha_creacion: string | null
}

export interface Remito {
  id: number
  numero: string
  fecha: string
  cliente_nombre: string | null
  cliente_domicilio: string | null
  cliente_cuit: string | null
  condicion_iva: string | null
  condicion_venta: string | null
  total: number
  estado: string | null
  ruta_pdf: string | null
  fecha_creacion: string | null
}

export interface Proveedor {
  id: number
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  /** Descuento único sobre el precio de lista del proveedor, en %. */
  descuento: number
  /** Cargo fijo por unidad que se suma después del descuento (ej. emblistado). */
  cargo_nombre: string
  cargo_unitario: number
  notas: string | null
  fecha_creacion: string | null
}

/** Código y precio de lista de un producto propio en un proveedor. */
export interface ProductoProveedor {
  id: number
  producto_id: number
  proveedor_id: number
  codigo_proveedor: string
  precio_lista: number | null
  fecha_actualizacion: string | null
}

/** Situación de cobro de un remito (control interno, no sale en el PDF). */
export type EstadoCobro = 'pendiente' | 'parcial' | 'cobrado' | 'anulado'

/** Fila de la vista remitos_con_cobro: el remito más lo cobrado y el saldo. */
export interface RemitoConCobro extends Remito {
  cliente_id: number | null
  cobrado: number
  saldo: number
  estado_cobro: EstadoCobro
  ultimo_pago: string | null
}

export const MEDIOS_PAGO = [
  'Efectivo',
  'Transferencia',
  'Cheque',
  'Mercado Pago',
  'Tarjeta',
  'Otro',
] as const

export interface Pago {
  id: number
  fecha: string
  importe: number
  medio: string
  referencia: string | null
  nota: string | null
  anulado: boolean
  motivo_anulacion: string | null
  fecha_anulacion: string | null
}

/** Parte de un pago que se aplicó a un remito, con el pago completo embebido. */
export interface ImputacionConPago {
  id: number
  importe: number
  remito_numero: string
  pagos: Pago
}

export interface RemitoItem {
  id: number
  remito_id: number
  codigo: string | null
  cantidad: number
  descripcion: string
  precio_unitario: number
  bonificacion: number
  subtotal: number
}

export interface HistorialPrecio {
  id: number
  producto_codigo: string
  producto_descripcion: string | null
  precio_anterior: number
  precio_nuevo: number
  porcentaje_cambio: number | null
  categoria: string | null
  fecha_cambio: string
}

/** Ítem del remito mientras se está armando (antes de guardar) */
export interface ItemBorrador {
  codigo: string
  cantidad: number
  descripcion: string
  precio_unitario: number
  bonificacion: number
  subtotal: number
}

export const CONDICIONES_IVA = [
  'Consumidor Final',
  'Exento',
  'Resp. Inscripto',
  'Monotributo',
] as const

export const CONDICIONES_VENTA = ['Contado', 'Cuenta Corriente'] as const

export const CATEGORIAS_BASE = [
  'CARBONES',
  'CAPACITORES',
  'INTERRUPTORES',
  'REPUESTOS VARIOS',
  'RULEMANES Y CUBETAS',
]

/**
 * ¿La base ya tiene las columnas de catálogo (marca/medidas/modelo)?
 *
 * Se detecta mirando lo que devuelve `select *`: si todavía no se ejecutó
 * `migration_lista_precios.sql`, esas columnas no vienen y la app evita
 * mandarlas (así seguir usando el sistema no da error).
 */
export function soportaCatalogo(productos: Producto[] | null | undefined): boolean {
  if (!productos || productos.length === 0) return true
  return 'marca' in productos[0]
}

/** Estado del stock de un producto, para el "semáforo" del inventario. */
export type EstadoStock = 'sin' | 'bajo' | 'ok'

export function estadoStock(p: Pick<Producto, 'stock' | 'stock_minimo'>): EstadoStock {
  if (p.stock <= 0) return 'sin'
  if (p.stock_minimo > 0 && p.stock <= p.stock_minimo) return 'bajo'
  return 'ok'
}
