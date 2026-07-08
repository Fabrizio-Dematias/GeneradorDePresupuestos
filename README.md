# DICOR - Sistema de Gestión

![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

Sistema de gestión integral para **DICOR Carbones y Repuestos** (Córdoba, Argentina):
remitos con PDF, catálogo de productos, control de stock, clientes, precios y
estadísticas de ventas. Se usa desde cualquier dispositivo (PC, tablet, celular)
con los datos en la nube.

---

## De qué trata

DICOR es un comercio de venta de carbones y repuestos para herramientas
eléctricas. Este sistema resuelve su operación diaria:

- **Emitir remitos** a los clientes con los productos vendidos, generando un
  PDF con el formato comercial del negocio (multipágina, con numeración
  automática y marca de agua si el remito se anula).
- **Controlar el inventario**: cada remito descuenta stock automáticamente,
  con alertas de reposición y auditoría de todos los movimientos.
- **Administrar precios** con aumentos masivos por categoría e historial
  completo de cambios.
- **Ver el negocio**: facturación mensual, productos más vendidos y panel
  de control con indicadores.

## Cómo se hizo

El sistema nació como una aplicación de escritorio (JavaFX + SQLite) que solo
funcionaba en una computadora. Se migró por completo a la web para poder usarlo
desde cualquier lado, sin instalar nada y con los datos seguros en la nube:

- **Frontend**: React 18 + TypeScript + Vite, estilos con Tailwind CSS y
  gráficos con Recharts. Es una SPA responsive que anda igual de bien en el
  celular que en la PC.
- **Backend**: no hay servidor propio — se usa **Supabase** (PostgreSQL en la
  nube) con **Row Level Security**: sin iniciar sesión no se puede leer ni
  escribir nada. El login es por nombre de usuario (Supabase Auth por debajo).
- **Lógica crítica en la base de datos**: las operaciones sensibles (crear,
  editar, anular y eliminar remitos) son **funciones PL/pgSQL transaccionales**.
  Todo o nada: el remito, sus ítems, el descuento/reposición de stock y la
  auditoría de movimientos suceden en una sola transacción. La numeración de
  remitos se asigna en el servidor (serializada con advisory locks) para que
  dos usuarios a la vez nunca generen el mismo número. Los importes se guardan
  como `numeric(12,2)`. Las estadísticas se agregan en el servidor (el
  navegador no descarga toda la base).
- **PDF en el navegador**: se genera con jsPDF + jspdf-autotable, sin backend.
  El PDF de cualquier remito histórico se puede regenerar siempre desde los
  datos.
- **Hosting**: Vercel con deploy automático en cada push a `master`.

## Qué hace (módulos)

| Módulo | Descripción |
|---|---|
| **Panel** | Indicadores generales, gráfico de facturación de los últimos 6 meses, últimos remitos, alerta de reposición y **backup completo** de los datos en un click |
| **Nuevo remito** | Autocompletado de productos (búsqueda en el servidor por código o descripción) y de **clientes guardados**, bonificaciones, validación de códigos contra el catálogo, numeración automática `0001-XXX` asignada por el servidor, **vista previa del PDF** y descarga |
| **Remitos** | Lista paginada con búsqueda y **filtro por rango de fechas**, detalle completo, re-descarga del PDF, **edición** (ajusta stock automáticamente), **anulación** (repone stock y conserva la historia, PDF con marca de agua ANULADO) y exportación a CSV |
| **Clientes** | Alta, edición y baja de clientes recurrentes; completan el remito automáticamente |
| **Productos** | Alta/edición/baja, filtro por categoría, actualización masiva de precios con vista previa, historial de precios por producto y exportación a CSV |
| **Stock** | Semáforo de inventario (ok / bajo / sin stock), valor del inventario, ingresos/egresos/ajustes manuales y auditoría paginada de todos los movimientos |
| **Historial de precios** | Auditoría paginada de todos los cambios de precio, masivos e individuales |
| **Más vendidos** | Ranking por cantidad o facturación con períodos configurables y exportación a CSV |
| **Facturación mensual** | Evolución mes a mes con totales, promedio y mejor mes (excluye remitos anulados) |

## Base de datos

Tablas en Supabase (PostgreSQL), todas protegidas con Row Level Security:

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo con código, descripción, categoría, precio, stock y stock mínimo |
| `remitos` | Encabezado de cada remito (número, fecha, cliente, condiciones, total, estado) |
| `remito_items` | Líneas de cada remito (producto, cantidad, precio, bonificación) |
| `clientes` | Clientes guardados para autocompletar remitos |
| `movimientos_stock` | Auditoría de cada entrada, salida y ajuste de inventario |
| `historial_precios` | Auditoría de todos los cambios de precio |
| `user_profiles` | Mapea nombre de usuario → cuenta de Supabase Auth |

El esquema completo (tablas, seguridad y funciones) está en un solo archivo:
[`web/supabase/setup-completo.sql`](web/supabase/setup-completo.sql). Los datos
se respaldan con el botón **Backup** del Panel (archivo JSON con todas las tablas).

## Estructura del repositorio

```
web/                  Aplicación web (React + Vite)
├── src/pages/        Un archivo por módulo (Remitos, Stock, Clientes, …)
├── src/lib/          PDF, CSV, backup, formato de números y cliente de Supabase
├── src/components/   UI reutilizable (tablas, modales, paginación, iconos)
└── supabase/         setup-completo.sql — esquema completo de la base
```

La puesta en marcha paso a paso (crear el proyecto en Supabase, usuario y
deploy en Vercel) está en [`web/README.md`](web/README.md).

---

## Autor

**Fabrizio Dematias** — dematiasfabrizio@gmail.com — Córdoba, Argentina

*DICOR Sistema de Gestión © 2026 — Uso privado*
