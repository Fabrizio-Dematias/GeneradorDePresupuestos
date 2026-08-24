/**
 * Armado de la lista de precios para imprimir (PDF).
 *
 * Se elige qué categorías entran y con qué título sale cada hoja, se ajusta
 * el pie (aclaraciones + mes de vigencia) y se descarga o se abre para ver.
 * Los títulos y el pie quedan guardados en el navegador para la próxima vez.
 *
 * Incluye el asistente para separar las medidas que quedaron dentro de la
 * descripción: aparece solo mientras haya productos en esa situación.
 */

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MESES, plural } from '../lib/format'
import { compararCodigos, separarMedidas } from '../lib/medidas'
import { generarListaPreciosDoc, type ListaPreciosData } from '../lib/pdfLista'
import { Badge, Button, Input, Modal } from './ui'
import { IconAlert, IconDownload, IconEye } from './icons'
import { useToast } from './Toast'
import { soportaCatalogo, type Producto } from '../types'

const CLAVE_PREFERENCIAS = 'dicor-lista-precios'

interface Preferencias {
  titulos: Record<string, string>
  /** Orden en que salen las hojas; las categorías nuevas van al final. */
  orden: string[]
  pie: { izquierda: string; centro: string; derecha: string }
}

function preferenciasPorDefecto(): Preferencias {
  const hoy = new Date()
  return {
    titulos: {},
    orden: [],
    pie: {
      izquierda: 'Precios sin IVA',
      centro: 'Los precios pueden variar sin previo aviso',
      derecha: `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`,
    },
  }
}

export default function ListaPreciosModal({
  open,
  onClose,
  productos,
  onActualizado,
}: {
  open: boolean
  onClose: () => void
  productos: Producto[]
  onActualizado: () => void
}) {
  const { toast } = useToast()
  const [vista, setVista] = useState<'lista' | 'medidas'>('lista')
  const [prefs, setPrefs] = useState<Preferencias>(preferenciasPorDefecto)
  const [excluidas, setExcluidas] = useState<Set<string>>(new Set())
  const [generando, setGenerando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [omitidos, setOmitidos] = useState<Set<number>>(new Set())

  // Preferencias guardadas (títulos y pie) al abrir
  useEffect(() => {
    if (!open) return
    setVista('lista')
    try {
      const guardado = localStorage.getItem(CLAVE_PREFERENCIAS)
      if (guardado) {
        const parseado = JSON.parse(guardado) as Partial<Preferencias>
        const base = preferenciasPorDefecto()
        setPrefs({
          titulos: parseado.titulos ?? base.titulos,
          orden: parseado.orden ?? base.orden,
          // El mes se recalcula siempre: la lista es "vigente"
          pie: { ...base.pie, ...parseado.pie, derecha: base.pie.derecha },
        })
      }
    } catch {
      // preferencias corruptas: se usan las por defecto
    }
  }, [open])

  function guardarPrefs(nuevas: Preferencias) {
    setPrefs(nuevas)
    try {
      localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(nuevas))
    } catch {
      // sin localStorage (modo privado) la lista igual se genera
    }
  }

  const categorias = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const p of productos) {
      const c = p.categoria || 'SIN CATEGORÍA'
      conteo.set(c, (conteo.get(c) ?? 0) + 1)
    }
    const alfabetico = Array.from(conteo.keys()).sort((a, b) => a.localeCompare(b, 'es'))
    const ordenadas = [
      ...prefs.orden.filter((c) => conteo.has(c)),
      ...alfabetico.filter((c) => !prefs.orden.includes(c)),
    ]
    return ordenadas.map((c) => [c, conteo.get(c) ?? 0] as [string, number])
  }, [productos, prefs.orden])

  function mover(categoria: string, delta: number) {
    const orden = categorias.map(([c]) => c)
    const desde = orden.indexOf(categoria)
    const hasta = desde + delta
    if (desde < 0 || hasta < 0 || hasta >= orden.length) return
    ;[orden[desde], orden[hasta]] = [orden[hasta], orden[desde]]
    guardarPrefs({ ...prefs, orden })
  }

  const incluidas = categorias.filter(([c]) => !excluidas.has(c))
  const totalProductos = incluidas.reduce((acc, [, n]) => acc + n, 0)

  // ------------------------------------------------ Medidas dentro de la descripción
  // Sin las columnas nuevas (migration_lista_precios.sql) no hay dónde
  // guardar la medida, así que el asistente no se ofrece.
  const conCatalogo = soportaCatalogo(productos)
  const candidatos = useMemo(
    () =>
      (conCatalogo ? productos : [])
        .filter((p) => !(p.medidas ?? '').trim())
        .map((p) => ({ producto: p, separado: separarMedidas(p.descripcion) }))
        .filter((c): c is { producto: Producto; separado: NonNullable<ReturnType<typeof separarMedidas>> } =>
          c.separado !== null
        )
        .sort((a, b) => compararCodigos(a.producto.codigo, b.producto.codigo)),
    [productos, conCatalogo]
  )
  const aAplicar = candidatos.filter((c) => !omitidos.has(c.producto.id))

  async function aplicarMedidas() {
    if (aAplicar.length === 0) return
    setAplicando(true)
    setProgreso(0)
    let hechos = 0
    let fallados = 0

    // De a tandas chicas para no disparar cientos de requests a la vez
    for (let i = 0; i < aAplicar.length; i += 8) {
      const tanda = aAplicar.slice(i, i + 8)
      const resultados = await Promise.all(
        tanda.map(({ producto, separado }) =>
          supabase
            .from('productos')
            .update({
              descripcion: separado.descripcion,
              medidas: separado.medidas,
              fecha_actualizacion: new Date().toISOString(),
            })
            .eq('id', producto.id)
        )
      )
      fallados += resultados.filter((r) => r.error).length
      hechos += tanda.length
      setProgreso(hechos)
    }

    setAplicando(false)
    if (fallados > 0) {
      toast('error', `${plural(fallados, 'producto')} no se pudieron actualizar.`)
    } else {
      toast('success', `Listo: ${plural(aAplicar.length, 'producto')} con la medida en su propia columna.`)
    }
    setOmitidos(new Set())
    onActualizado()
    setVista('lista')
  }

  // ------------------------------------------------ PDF
  function armarDatos(): ListaPreciosData {
    const secciones = incluidas.map(([categoria]) => ({
      titulo: (prefs.titulos[categoria] ?? categoria).trim() || categoria,
      productos: productos
        .filter((p) => (p.categoria || 'SIN CATEGORÍA') === categoria)
        .sort(
          (a, b) =>
            (a.marca ?? '').localeCompare(b.marca ?? '', 'es') ||
            compararCodigos(a.codigo, b.codigo)
        )
        .map((p) => ({
          codigo: p.codigo,
          descripcion: p.descripcion,
          medidas: p.medidas,
          modelo: p.modelo,
          marca: p.marca,
          precio_unitario: p.precio_unitario,
        })),
    }))
    return { secciones, pie: prefs.pie }
  }

  async function generar(accion: 'ver' | 'descargar') {
    if (totalProductos === 0) return
    setGenerando(true)
    try {
      const doc = await generarListaPreciosDoc(armarDatos())
      if (accion === 'descargar') {
        const hoy = new Date()
        doc.save(`lista_de_precios_${MESES[hoy.getMonth()].toLowerCase()}_${hoy.getFullYear()}.pdf`)
      } else {
        window.open(doc.output('bloburl') as unknown as string, '_blank')
      }
    } catch (e: any) {
      toast('error', e?.message ?? 'No se pudo generar la lista.')
    } finally {
      setGenerando(false)
    }
  }

  // ------------------------------------------------ Vista: separar medidas
  if (vista === 'medidas') {
    return (
      <Modal
        open={open}
        onClose={() => !aplicando && setVista('lista')}
        size="xl"
        title="Separar las medidas de la descripción"
        footer={
          <>
            <p className="mr-auto text-xs text-slate-500">
              {aplicando
                ? `Actualizando… ${progreso} de ${aAplicar.length}`
                : `${plural(aAplicar.length, 'producto')} seleccionado${aAplicar.length === 1 ? '' : 's'}`}
            </p>
            <Button variant="secondary" onClick={() => setVista('lista')} disabled={aplicando}>
              Volver
            </Button>
            <Button onClick={aplicarMedidas} loading={aplicando} disabled={aAplicar.length === 0}>
              Aplicar a {plural(aAplicar.length, 'producto')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Estos productos tienen la medida al final de la descripción. Al aplicar, la medida
            pasa a su propia columna (la que usa la lista de precios) y la descripción queda más
            corta. Destildá los que no quieras tocar.
          </p>

          <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Descripción actual</th>
                  <th className="px-3 py-2 font-medium">Queda como</th>
                  <th className="px-3 py-2 font-medium">Medidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidatos.map(({ producto, separado }) => {
                  const incluido = !omitidos.has(producto.id)
                  return (
                    <tr key={producto.id} className={incluido ? '' : 'opacity-50'}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          checked={incluido}
                          onChange={(e) => {
                            const nuevos = new Set(omitidos)
                            if (e.target.checked) nuevos.delete(producto.id)
                            else nuevos.add(producto.id)
                            setOmitidos(nuevos)
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                        {producto.codigo}
                      </td>
                      <td className="max-w-[240px] px-3 py-2 text-xs text-slate-500">
                        <span className="line-clamp-1">{producto.descripcion}</span>
                      </td>
                      <td className="max-w-[240px] px-3 py-2 text-slate-700">
                        <span className="line-clamp-1">{separado.descripcion}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Badge color="green">{separado.medidas}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    )
  }

  // ------------------------------------------------ Vista principal
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Lista de precios para imprimir"
      footer={
        <>
          <p className="mr-auto text-xs text-slate-500">
            {plural(totalProductos, 'producto')} · {plural(incluidas.length, 'hoja')}
          </p>
          <Button variant="secondary" onClick={onClose} disabled={generando}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => generar('ver')} disabled={generando || totalProductos === 0}>
            <IconEye className="h-5 w-5" />
            Ver
          </Button>
          <Button onClick={() => generar('descargar')} loading={generando} disabled={totalProductos === 0}>
            <IconDownload className="h-5 w-5" />
            Descargar PDF
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!conCatalogo && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <span>
              La lista sale con código, descripción y precio. Para agrupar por marca y usar
              las columnas MEDIDAS y MOD hay que ejecutar una vez{' '}
              <code className="font-mono text-xs">migration_lista_precios.sql</code> en Supabase.
            </span>
          </div>
        )}
        {candidatos.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <IconAlert className="h-5 w-5 shrink-0 text-amber-700" />
            <span className="flex-1">
              <strong>{plural(candidatos.length, 'producto')}</strong>{' '}
              {candidatos.length === 1 ? 'tiene' : 'tienen'} las medidas dentro de la descripción.
              Pasalas a su propia columna para que la lista salga como la impresa.
            </span>
            <Button variant="warning" className="!px-3 !py-1.5" onClick={() => setVista('medidas')}>
              Revisar y separar
            </Button>
          </div>
        )}

        <div>
          <p className="label">Categorías y título de cada hoja</p>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {categorias.map(([categoria, cantidad], i) => {
              const incluida = !excluidas.has(categoria)
              return (
                <div key={categoria} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="px-1 text-xs leading-none text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => mover(categoria, -1)}
                      title="Subir"
                      aria-label={`Subir ${categoria}`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="px-1 text-xs leading-none text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                      disabled={i === categorias.length - 1}
                      onClick={() => mover(categoria, 1)}
                      title="Bajar"
                      aria-label={`Bajar ${categoria}`}
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={incluida}
                    aria-label={`Incluir ${categoria}`}
                    onChange={(e) => {
                      const nuevas = new Set(excluidas)
                      if (e.target.checked) nuevas.delete(categoria)
                      else nuevas.add(categoria)
                      setExcluidas(nuevas)
                    }}
                  />
                  <span className="w-44 shrink-0 truncate text-sm font-semibold text-slate-800">
                    {categoria}
                    <span className="ml-1.5 text-xs font-normal text-slate-400">({cantidad})</span>
                  </span>
                  <input
                    className="input flex-1 !py-1.5 text-sm uppercase"
                    disabled={!incluida}
                    value={prefs.titulos[categoria] ?? categoria}
                    placeholder={categoria}
                    aria-label={`Título de la hoja de ${categoria}`}
                    onChange={(e) =>
                      guardarPrefs({
                        ...prefs,
                        titulos: { ...prefs.titulos, [categoria]: e.target.value },
                      })
                    }
                  />
                </div>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Cada categoría arranca en una hoja nueva. Dentro de la hoja, los productos se agrupan
            por marca.
          </p>
        </div>

        <div>
          <p className="label">Pie de página</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              aria-label="Texto de la izquierda"
              value={prefs.pie.izquierda}
              onChange={(e) => guardarPrefs({ ...prefs, pie: { ...prefs.pie, izquierda: e.target.value } })}
            />
            <Input
              aria-label="Texto del centro"
              value={prefs.pie.centro}
              onChange={(e) => guardarPrefs({ ...prefs, pie: { ...prefs.pie, centro: e.target.value } })}
            />
            <Input
              aria-label="Vigencia"
              value={prefs.pie.derecha}
              onChange={(e) => guardarPrefs({ ...prefs, pie: { ...prefs.pie, derecha: e.target.value } })}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
