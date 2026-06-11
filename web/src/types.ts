export interface Producto {
  id: number
  codigo: string
  descripcion: string
  precio_unitario: number
  categoria: string
  fecha_actualizacion: string | null
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
