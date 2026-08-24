/**
 * Importador de listas de productos (Excel .xlsx o CSV).
 *
 * Flujo: elegir archivo → revisar qué columna es cada cosa → elegir la
 * categoría → ver la vista previa (altas / actualizaciones / errores) →
 * importar. Nada se toca en la base hasta apretar "Importar".
 */

import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { exportarCSV } from '../lib/csv'
import { Badge, Button, Input, Modal, Segmented, Select } from './ui'
import { IconAlert, IconCheck, IconUpload, IconX } from './icons'
import { useToast } from './Toast'
import { leerXLSX, type Celda, type HojaExcel } from '../lib/xlsx'
import {
  CAMPOS,
  MAPEO_VACIO,
  analizarFilas,
  detectarEncabezado,
  detectarMapeo,
  leerCSV,
  nombreColumna,
  resumir,
  tandas,
  type EstadoFila,
  type Mapeo,
} from '../lib/importar'
import type { Producto } from '../types'

const CATEGORIA_NUEVA = '__nueva__'
const FILAS_VISTA_PREVIA = 60
const TANDA = 200

const ESTADOS: Record<EstadoFila, { etiqueta: string; color: 'green' | 'blue' | 'slate' | 'red' }> = {
  nuevo: { etiqueta: 'Nuevo', color: 'green' },
  actualiza: { etiqueta: 'Actualiza', color: 'blue' },
  omitido: { etiqueta: 'Se omite', color: 'slate' },
  error: { etiqueta: 'Error', color: 'red' },
}

export default function ImportarProductosModal({
  open,
  onClose,
  productos,
  categorias,
  onImportado,
}: {
  open: boolean
  onClose: () => void
  productos: Producto[]
  categorias: string[]
  onImportado: () => void
}) {
  const { toast } = useToast()
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [nombreArchivo, setNombreArchivo] = useState('')
  const [hojas, setHojas] = useState<HojaExcel[] | null>(null)
  const [hojaIdx, setHojaIdx] = useState(0)
  const [filaEncabezado, setFilaEncabezado] = useState(-1)
  const [mapeo, setMapeo] = useState<Mapeo>({ ...MAPEO_VACIO })
  const [categoriaSel, setCategoriaSel] = useState(CATEGORIA_NUEVA)
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [actualizarExistentes, setActualizarExistentes] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | EstadoFila>('todos')
  const [error, setError] = useState<string | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState(0)

  const filas = hojas?.[hojaIdx]?.filas ?? []

  const columnas = useMemo(() => {
    let ancho = 0
    for (const f of filas.slice(0, 500)) ancho = Math.max(ancho, f.length)
    return Array.from({ length: ancho }, (_, i) => {
      const encabezado = filaEncabezado >= 0 ? String(filas[filaEncabezado]?.[i] ?? '').trim() : ''
      return encabezado ? `${nombreColumna(i)} · ${encabezado}` : `Columna ${nombreColumna(i)}`
    })
  }, [filas, filaEncabezado])

  const categoriaDestino = (
    categoriaSel === CATEGORIA_NUEVA ? categoriaNueva : categoriaSel
  )
    .trim()
    .toUpperCase()

  const analizadas = useMemo(() => {
    if (!hojas || mapeo.codigo < 0 || mapeo.descripcion < 0 || mapeo.precio < 0) return []
    return analizarFilas(
      filas,
      mapeo,
      filaEncabezado + 1,
      categoriaDestino,
      productos,
      actualizarExistentes
    )
  }, [hojas, filas, mapeo, filaEncabezado, categoriaDestino, productos, actualizarExistentes])

  const resumen = useMemo(() => resumir(analizadas), [analizadas])
  const visibles = useMemo(
    () =>
      (filtro === 'todos' ? analizadas : analizadas.filter((f) => f.estado === filtro)).slice(
        0,
        FILAS_VISTA_PREVIA
      ),
    [analizadas, filtro]
  )

  const faltanCampos = CAMPOS.filter((c) => c.obligatorio && mapeo[c.campo] < 0).map((c) => c.etiqueta)
  const faltaCategoria = !categoriaDestino && mapeo.categoria < 0
  const aProcesar = resumen.nuevos + resumen.actualiza
  const puedeImportar = hojas !== null && faltanCampos.length === 0 && !faltaCategoria && aProcesar > 0

  // ------------------------------------------------ Archivo
  function reiniciar() {
    setNombreArchivo('')
    setHojas(null)
    setHojaIdx(0)
    setFilaEncabezado(-1)
    setMapeo({ ...MAPEO_VACIO })
    setCategoriaNueva('')
    setCategoriaSel(CATEGORIA_NUEVA)
    setFiltro('todos')
    setError(null)
    setProgreso(0)
    if (inputArchivo.current) inputArchivo.current.value = ''
  }

  function cerrar() {
    if (importando) return
    reiniciar()
    onClose()
  }

  /** Excel en es-AR guarda los CSV en ANSI: si no es UTF-8 válido, se reintenta. */
  async function textoDelArchivo(archivo: File): Promise<string> {
    const buf = await archivo.arrayBuffer()
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      return new TextDecoder('windows-1252').decode(buf)
    }
  }

  function aplicarDeteccion(nuevasHojas: HojaExcel[], indice: number) {
    const filasHoja = nuevasHojas[indice]?.filas ?? []
    const encabezado = detectarEncabezado(filasHoja)
    setHojaIdx(indice)
    setFilaEncabezado(encabezado)
    setMapeo(encabezado >= 0 ? detectarMapeo(filasHoja[encabezado]) : { ...MAPEO_VACIO })
    setFiltro('todos')
  }

  async function elegirArchivo(archivo: File) {
    setLeyendo(true)
    setError(null)
    try {
      const esTexto = /\.(csv|txt|tsv)$/i.test(archivo.name)
      const nuevas = esTexto
        ? [{ nombre: archivo.name, filas: leerCSV(await textoDelArchivo(archivo)) }]
        : await leerXLSX(archivo)

      const conDatos = nuevas.filter((h) => h.filas.length > 0)
      if (conDatos.length === 0) throw new Error('El archivo no tiene filas con datos.')

      setNombreArchivo(archivo.name)
      setHojas(conDatos)
      aplicarDeteccion(conDatos, 0)
    } catch (e: any) {
      setHojas(null)
      setNombreArchivo('')
      setError(e?.message ?? 'No se pudo leer el archivo.')
    } finally {
      setLeyendo(false)
      if (inputArchivo.current) inputArchivo.current.value = ''
    }
  }

  function descargarPlantilla() {
    exportarCSV(
      'plantilla_productos',
      ['Código', 'Descripción', 'Categoría', 'Precio unitario', 'Stock inicial', 'Stock mínimo'],
      [
        ['A-100', 'Ejemplo de producto', categoriaDestino || 'CATEGORÍA NUEVA', 12500.5, 0, 0],
      ]
    )
  }

  // ------------------------------------------------ Importar
  async function importar() {
    const nuevos = analizadas.filter((f) => f.estado === 'nuevo')
    const actualiza = analizadas.filter((f) => f.estado === 'actualiza')
    const total = nuevos.length + actualiza.length
    if (total === 0) return

    setImportando(true)
    setProgreso(0)
    let avisoHistorial = false

    try {
      // 1. Alta y actualización en una sola pasada (upsert por código).
      //    stock_minimo solo se manda si el archivo trae esa columna, para no
      //    pisar con 0 los mínimos ya configurados.
      const ahora = new Date().toISOString()
      let hechos = 0
      for (const tanda of tandas([...nuevos, ...actualiza], TANDA)) {
        const payload = tanda.map((f) => {
          const fila: Record<string, unknown> = {
            codigo: f.codigo,
            descripcion: f.descripcion,
            precio_unitario: f.precio,
            categoria: f.categoria,
            fecha_actualizacion: ahora,
          }
          if (mapeo.stockMinimo >= 0) fila.stock_minimo = f.stockMinimo
          return fila
        })
        const { error: errorUpsert } = await supabase
          .from('productos')
          .upsert(payload, { onConflict: 'codigo' })
        if (errorUpsert) throw errorUpsert
        hechos += tanda.length
        setProgreso(hechos)
      }

      // 2. Historial de los precios que cambiaron
      const cambiosPrecio = actualiza.filter(
        (f) => f.anterior && f.precio !== null && f.anterior.precio_unitario !== f.precio
      )
      for (const tanda of tandas(cambiosPrecio, TANDA)) {
        const { error: errorHistorial } = await supabase.from('historial_precios').insert(
          tanda.map((f) => ({
            producto_codigo: f.codigo,
            producto_descripcion: f.descripcion,
            precio_anterior: f.anterior!.precio_unitario,
            precio_nuevo: f.precio,
            porcentaje_cambio:
              f.anterior!.precio_unitario > 0
                ? ((f.precio! - f.anterior!.precio_unitario) / f.anterior!.precio_unitario) * 100
                : null,
            categoria: f.categoria,
          }))
        )
        if (errorHistorial) avisoHistorial = true
      }

      // 3. Stock inicial de los productos nuevos, como movimiento auditado
      const conStock = nuevos.filter((f) => f.stock > 0)
      if (mapeo.stock >= 0 && conStock.length > 0) {
        const ids = new Map<string, number>()
        for (const tanda of tandas(conStock, TANDA)) {
          const { data } = await supabase
            .from('productos')
            .select('id, codigo')
            .in(
              'codigo',
              tanda.map((f) => f.codigo)
            )
          for (const p of (data ?? []) as Pick<Producto, 'id' | 'codigo'>[]) ids.set(p.codigo, p.id)
        }
        for (const f of conStock) {
          const id = ids.get(f.codigo)
          if (!id) continue
          await supabase.rpc('registrar_movimiento_stock', {
            p_producto_id: id,
            p_tipo: 'ingreso',
            p_cantidad: f.stock,
            p_motivo: 'Stock inicial (importación)',
          })
        }
      }

      const partes = [
        nuevos.length > 0 ? `${nuevos.length} productos nuevos` : '',
        actualiza.length > 0 ? `${actualiza.length} actualizados` : '',
      ].filter(Boolean)
      toast('success', `Importación lista: ${partes.join(' y ')}.`)
      if (avisoHistorial) toast('error', 'Los precios se actualizaron, pero no se pudo escribir el historial.')

      onImportado()
      reiniciar()
      onClose()
    } catch (e: any) {
      toast('error', `No se pudo completar la importación: ${e?.message ?? 'error desconocido'}`)
      onImportado()
    } finally {
      setImportando(false)
    }
  }

  // ------------------------------------------------ Vista
  return (
    <Modal
      open={open}
      onClose={cerrar}
      size="xl"
      title="Importar productos desde Excel o CSV"
      footer={
        <>
          {hojas && (
            <p className="mr-auto text-xs text-slate-500">
              {importando
                ? `Importando… ${progreso} de ${aProcesar}`
                : `${analizadas.length} filas leídas de ${nombreArchivo}`}
            </p>
          )}
          <Button variant="secondary" onClick={cerrar} disabled={importando}>
            Cancelar
          </Button>
          <Button onClick={importar} loading={importando} disabled={!puedeImportar}>
            {aProcesar > 0 ? `Importar ${aProcesar} productos` : 'Importar'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <input
          ref={inputArchivo}
          type="file"
          accept=".xlsx,.csv,.txt,.tsv"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            if (archivo) elegirArchivo(archivo)
          }}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ---------------- Paso 1: archivo ---------------- */}
        {!hojas ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center">
            <IconUpload className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Elegí la lista de precios
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Sirve el mismo Excel (.xlsx) que usás para mandar la lista, o un CSV. Después
              revisás qué columna es cada cosa antes de cargar nada.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => inputArchivo.current?.click()} loading={leyendo}>
                <IconUpload className="h-5 w-5" />
                Elegir archivo
              </Button>
              <Button variant="secondary" onClick={descargarPlantilla}>
                Descargar plantilla
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <IconCheck className="h-5 w-5 shrink-0 text-brand-700" />
              <span className="text-sm font-semibold text-slate-800">{nombreArchivo}</span>
              <button
                onClick={reiniciar}
                disabled={importando}
                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <IconX className="h-4 w-4" />
                Elegir otro
              </button>
            </div>

            {/* ---------------- Paso 2: hoja y encabezados ---------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hojas.length > 1 && (
                <Select
                  label="Hoja del Excel"
                  id="imp-hoja"
                  value={hojaIdx}
                  onChange={(e) => aplicarDeteccion(hojas, Number(e.target.value))}
                >
                  {hojas.map((h, i) => (
                    <option key={h.nombre + i} value={i}>
                      {h.nombre} ({h.filas.length} filas)
                    </option>
                  ))}
                </Select>
              )}
              <Select
                label="Fila de encabezados"
                id="imp-encabezado"
                value={filaEncabezado}
                onChange={(e) => {
                  const nueva = Number(e.target.value)
                  setFilaEncabezado(nueva)
                  if (nueva >= 0) setMapeo(detectarMapeo(filas[nueva] ?? []))
                }}
              >
                <option value={-1}>El archivo no tiene encabezados</option>
                {filas.slice(0, 15).map((f, i) => (
                  <option key={i} value={i}>
                    Fila {i + 1}: {resumenFila(f)}
                  </option>
                ))}
              </Select>
            </div>

            {/* ---------------- Paso 3: columnas ---------------- */}
            <div>
              <p className="label">¿Qué columna es cada dato?</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAMPOS.map(({ campo, etiqueta, obligatorio }) => (
                  <Select
                    key={campo}
                    aria-label={etiqueta}
                    value={mapeo[campo]}
                    onChange={(e) => setMapeo({ ...mapeo, [campo]: Number(e.target.value) })}
                  >
                    <option value={-1}>
                      {etiqueta}
                      {obligatorio ? ' *' : ''} — sin asignar
                    </option>
                    {columnas.map((c, i) => (
                      <option key={i} value={i}>
                        {etiqueta}
                        {obligatorio ? ' *' : ''} → {c}
                      </option>
                    ))}
                  </Select>
                ))}
              </div>
              {faltanCampos.length > 0 && (
                <p className="mt-2 text-xs text-red-700">
                  Falta asignar: {faltanCampos.join(', ')}.
                </p>
              )}
            </div>

            {/* ---------------- Paso 4: categoría ---------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label={mapeo.categoria >= 0 ? 'Categoría (si la fila viene vacía)' : 'Categoría *'}
                id="imp-categoria"
                value={categoriaSel}
                onChange={(e) => setCategoriaSel(e.target.value)}
              >
                <option value={CATEGORIA_NUEVA}>➕ Categoría nueva…</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              {categoriaSel === CATEGORIA_NUEVA && (
                <div>
                  <Input
                    label="Nombre de la categoría nueva"
                    id="imp-categoria-nueva"
                    className="uppercase"
                    value={categoriaNueva}
                    onChange={(e) => setCategoriaNueva(e.target.value)}
                    placeholder="Ej: BOBINADOS"
                  />
                  {faltaCategoria && (
                    <p className="mt-1.5 text-xs text-red-700">
                      Poné el nombre de la categoría para poder importar.
                    </p>
                  )}
                </div>
              )}
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={actualizarExistentes}
                  onChange={(e) => setActualizarExistentes(e.target.checked)}
                />
                Actualizar precio y descripción de los códigos que ya existen
              </label>
            </div>

            {/* ---------------- Paso 5: vista previa ---------------- */}
            {analizadas.length > 0 && (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge color="green">{resumen.nuevos} nuevos</Badge>
                    <Badge color="blue">{resumen.actualiza} actualizan</Badge>
                    <Badge color="slate">{resumen.omitidos} se omiten</Badge>
                    {resumen.errores > 0 && <Badge color="red">{resumen.errores} con error</Badge>}
                  </div>
                  <Segmented
                    size="sm"
                    value={filtro}
                    onChange={setFiltro}
                    options={[
                      { value: 'todos', label: 'Todas' },
                      { value: 'nuevo', label: 'Nuevos' },
                      { value: 'actualiza', label: 'Actualizan' },
                      { value: 'error', label: 'Errores' },
                    ]}
                  />
                </div>

                <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Fila</th>
                        <th className="px-3 py-2 font-medium">Estado</th>
                        <th className="px-3 py-2 font-medium">Código</th>
                        <th className="px-3 py-2 font-medium">Descripción</th>
                        <th className="hidden px-3 py-2 font-medium sm:table-cell">Categoría</th>
                        <th className="px-3 py-2 text-right font-medium">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibles.map((f) => (
                        <tr key={f.nroFila}>
                          <td className="px-3 py-2 text-xs text-slate-400">{f.nroFila}</td>
                          <td className="px-3 py-2">
                            <Badge color={ESTADOS[f.estado].color}>{ESTADOS[f.estado].etiqueta}</Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {f.codigo || '—'}
                          </td>
                          <td className="max-w-[280px] px-3 py-2 text-slate-700">
                            <span className="line-clamp-1">{f.descripcion || '—'}</span>
                            {f.detalle && <span className="text-xs text-slate-400">{f.detalle}</span>}
                          </td>
                          <td className="hidden whitespace-nowrap px-3 py-2 text-xs text-slate-500 sm:table-cell">
                            {f.categoria || '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {f.precio === null ? (
                              <span className="text-xs text-red-700">sin precio</span>
                            ) : f.anterior && f.anterior.precio_unitario !== f.precio ? (
                              <span className="text-xs text-slate-500">
                                {formatARS(f.anterior.precio_unitario)}{' '}
                                <span className="font-semibold text-brand-700">
                                  → {formatARS(f.precio)}
                                </span>
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-700">{formatARS(f.precio)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Se muestran hasta {FILAS_VISTA_PREVIA} filas. Los precios se leen con formato
                  argentino ($ 1.234,56); las filas con error no se importan.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

/** Primeras celdas de una fila, para reconocerla en el selector de encabezados. */
function resumenFila(fila: Celda[]): string {
  const texto = fila
    .filter((c) => String(c ?? '').trim() !== '')
    .slice(0, 4)
    .join(' · ')
  return texto.length > 60 ? `${texto.slice(0, 60)}…` : texto || '(vacía)'
}
