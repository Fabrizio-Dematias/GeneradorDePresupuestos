import type { Proveedor } from '../types'

/**
 * Redondea a centavos sin el error de los decimales de la computadora:
 * 954,30 × 0,75 + 60,60 da 776,32499999… en vez de 776,325, y redondeado
 * directo quedaría en 776,32. Primero se corrige ese error y después se
 * redondea a 2 decimales (776,33).
 */
export function redondearCentavos(n: number): number {
  const centavos = Math.round(Math.round(Math.abs(n) * 1e6) / 1e4) / 100
  return n < 0 ? -centavos : centavos
}

/**
 * Costo de una unidad comprada a un proveedor, igual que en su factura:
 * el descuento se aplica al precio de lista y el cargo por unidad (por
 * ejemplo el emblistado) se suma después, sin descuento.
 *
 *   costo = precio de lista × (1 − descuento/100) + cargo por unidad
 */
export function costoUnitario(
  precioLista: number,
  proveedor: Pick<Proveedor, 'descuento' | 'cargo_unitario'>
): number {
  return precioLista * (1 - proveedor.descuento / 100) + proveedor.cargo_unitario
}

export interface Margen {
  /** Precio de venta usado (lista menos la bonificación simulada). */
  venta: number
  /** Lo que se gana por unidad. */
  ganancia: number
  /** Ganancia sobre el costo, en % (null si el costo es 0). */
  sobreCosto: number | null
}

/**
 * Margen de un producto: precio de venta (menos una bonificación opcional,
 * para ver cuánto queda cuando se le hace descuento al cliente) contra el costo.
 */
export function calcularMargen(precioVenta: number, costo: number, bonificacion = 0): Margen {
  const venta = precioVenta * (1 - bonificacion / 100)
  const ganancia = venta - costo
  return { venta, ganancia, sobreCosto: costo > 0 ? (ganancia / costo) * 100 : null }
}

/** Totales estimados de un pedido, con el mismo armado que la factura del proveedor. */
export function totalesPedido(
  lineas: { cantidad: number; precioLista: number | null }[],
  proveedor: Pick<Proveedor, 'descuento' | 'cargo_unitario'>
) {
  let lista = 0
  let unidades = 0
  let sinPrecio = 0
  for (const l of lineas) {
    unidades += l.cantidad
    if (l.precioLista === null) sinPrecio += 1
    else lista += l.cantidad * l.precioLista
  }
  const descuento = (lista * proveedor.descuento) / 100
  const cargo = unidades * proveedor.cargo_unitario
  return { lista, descuento, cargo, unidades, sinPrecio, total: lista - descuento + cargo }
}
