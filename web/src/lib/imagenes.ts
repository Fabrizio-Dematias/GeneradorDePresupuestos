/**
 * Utilidades de imágenes para los logos de marca.
 *
 * Los logos salen del Excel, donde suelen venir mucho más grandes de lo que
 * hace falta. Antes de guardarlos se achican, así la base no se llena de
 * megas y la lista de precios se genera rápido.
 */

const MAX_ANCHO = 420
const MAX_ALTO = 150

function cargar(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = dataUrl
  })
}

export interface MedidaImagen {
  ancho: number
  alto: number
}

/** Tamaño real de la imagen, para respetar la proporción al dibujarla. */
export async function medirImagen(dataUrl: string): Promise<MedidaImagen | null> {
  try {
    const img = await cargar(dataUrl)
    return { ancho: img.naturalWidth, alto: img.naturalHeight }
  } catch {
    return null
  }
}

/** Devuelve la imagen redimensionada (PNG, conserva la transparencia). */
export async function achicarImagen(dataUrl: string): Promise<string> {
  try {
    const img = await cargar(dataUrl)
    const escala = Math.min(MAX_ANCHO / img.naturalWidth, MAX_ALTO / img.naturalHeight, 1)
    if (escala === 1) return dataUrl

    const lienzo = document.createElement('canvas')
    lienzo.width = Math.max(1, Math.round(img.naturalWidth * escala))
    lienzo.height = Math.max(1, Math.round(img.naturalHeight * escala))
    const ctx = lienzo.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)
    return lienzo.toDataURL('image/png')
  } catch {
    return dataUrl // si algo falla se guarda tal cual
  }
}
