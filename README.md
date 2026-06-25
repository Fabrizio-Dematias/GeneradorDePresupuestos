# DICOR - Sistema de Gestión

![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

Sistema de gestión de remitos y productos para **DICOR Carbones y Repuestos**. Funciona desde cualquier dispositivo (PC, tablet, celular) y usa Supabase como base de datos en la nube.

---

## Módulos

| Módulo | Descripción |
|---|---|
| **Panel** | Estadísticas generales, gráfico de facturación mensual y últimos remitos |
| **Nuevo remito** | Buscador de productos con autocompletado (por código o descripción), bonificaciones, numeración automática `0001-XXX` y descarga del PDF |
| **Remitos** | Lista con búsqueda, detalle completo, re-descarga del PDF de cualquier remito y eliminación |
| **Productos** | Alta/edición/baja, filtro por categoría, búsqueda y actualización masiva de precios con vista previa |
| **Historial de precios** | Auditoría de todos los cambios (masivos e individuales) con filtros |
| **Más vendidos** | Ranking por cantidad o facturación con períodos configurables |
| **Facturación mensual** | Evolución mes a mes con totales, promedio y mejor mes |

---

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Base de datos y auth**: Supabase (PostgreSQL + Auth)
- **PDF**: generado en el navegador (jsPDF), mismo formato que el sistema original
- **Hosting**: Vercel

---

## Puesta en marcha (una sola vez, ~15 minutos)

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta.
2. **New project** → nombre (ej: `dicor`), contraseña de base de datos y región **South America (São Paulo)**.
3. Esperá 1-2 minutos a que el proyecto se cree.

### 2. Crear las tablas y cargar los datos

1. En Supabase: **SQL Editor → New query**.
2. Copiá y pegá todo el contenido de [`web/supabase/setup-completo.sql`](web/supabase/setup-completo.sql) → **Run**.

Eso crea las tablas, la seguridad (Row Level Security) y carga el catálogo completo de productos y los remitos, todo en un solo paso.

> Si preferís hacerlo en dos pasos, están los archivos separados:
> `web/supabase/migration.sql` (estructura) y `web/supabase/seed.sql` (datos).

### 3. Crear tu usuario

1. En Supabase: **Authentication → Users → Add user → Create new user**.
2. Email y contraseña que querés usar para entrar al sistema.
3. Tildá **Auto Confirm User** y creá el usuario.

Con ese email y contraseña entrás a la web. Nadie más puede ver los datos: todas las tablas están protegidas con Row Level Security y solo usuarios autenticados pueden acceder.

### 4. Publicar en Vercel

1. Entrá a [vercel.com](https://vercel.com) y logueate con tu cuenta de GitHub.
2. **Add New → Project** → importá el repositorio `GeneradorDePresupuestos`.
3. El `vercel.json` de la raíz ya deja todo listo, no hay que tocar la config de build.
4. En **Environment Variables** agregá estas dos (los valores están en Supabase → **Settings → API**):

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | la clave `anon / public` |

5. **Deploy**. En un minuto tenés la URL accesible desde cualquier dispositivo.

---

## Desarrollo local

```bash
cd web
cp .env.example .env   # completar con los datos de Supabase
npm install
npm run dev            # http://localhost:5173
```

### Previsualizar sin Supabase (datos de ejemplo)

```bash
cd web
npx vite build -c vite.mock.config.ts
npx vite preview --outDir dist-mock
```

---

## Estructura del proyecto

```
GeneradorDePresupuestos/
├── web/
│   ├── src/
│   │   ├── pages/          # Dashboard, NuevoRemito, Remitos, Productos, etc.
│   │   ├── components/     # Layout, Toast, íconos, componentes UI
│   │   ├── lib/            # Cliente Supabase, generación de PDF, logo, formateo
│   │   ├── context/        # AuthContext (sesión de Supabase)
│   │   └── types.ts        # Tipos TypeScript compartidos
│   ├── supabase/
│   │   ├── setup-completo.sql   # Setup completo en un solo paso (recomendado)
│   │   ├── migration.sql        # Solo estructura de tablas
│   │   └── seed.sql             # Solo datos (productos + remitos)
│   ├── dev/
│   │   └── mock-supabase.ts     # Cliente mock para demo sin Supabase
│   ├── .env.example
│   └── vite.mock.config.ts
├── vercel.json
└── README.md
```

---

## Base de datos

Cinco tablas en Supabase (PostgreSQL):

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo de productos con código, descripción, categoría y precio |
| `remitos` | Encabezado de cada remito (número, fecha, cliente, condición IVA/venta, total) |
| `remito_items` | Líneas de cada remito (producto, cantidad, precio, bonificación) |
| `historial_precios` | Auditoría de todos los cambios de precio |
| `clientes` | Datos de clientes (referencia; los remitos guardan los datos directamente) |

---

## PDF de remito

El PDF mantiene el formato original: logo y datos del negocio, N° de remito y fecha, leyenda "DOCUMENTO NO VÁLIDO COMO FACTURA", datos del cliente con condición de IVA y venta, tabla de productos con bonificaciones, total y recuadro de observaciones.

Para cambiar los datos del negocio (dirección, CUIT, email), editá la constante `EMPRESA` en [`web/src/lib/pdf.ts`](web/src/lib/pdf.ts).

Para cambiar el logo, reemplazá el contenido de [`web/src/lib/logo.ts`](web/src/lib/logo.ts) con el nuevo data URL:
```bash
base64 -w0 logo.png
```

---

## Autor

**Fabrizio Dematias** — dicorcarbones@gmail.com — Córdoba, Argentina

*DICOR Sistema de Gestión © 2026 — Uso privado*
