# DICOR Web · Sistema de Gestión

Versión web del sistema de gestión de remitos y productos de DICOR.
Funciona desde cualquier dispositivo (PC, tablet, celular) y usa
[Supabase](https://supabase.com) como base de datos en la nube (gratis).

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Base de datos y login**: Supabase (PostgreSQL + Auth)
- **PDF**: se genera en el navegador con el mismo formato que la app de escritorio
- **Hosting recomendado**: Vercel (gratis)

---

## 🚀 Puesta en marcha (una sola vez, ~15 minutos)

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (podés usar tu Gmail).
2. **New project** → poné un nombre (ej: `dicor`), una contraseña de base de datos
   (guardala) y la región **South America (São Paulo)**.
3. Esperá 1-2 minutos a que el proyecto se cree.

### 2. Crear las tablas

1. En el menú lateral de Supabase: **SQL Editor** → **New query**.
2. Copiá y pegá **todo** el contenido de
   [`supabase/setup-completo.sql`](supabase/setup-completo.sql) → **Run**.
   Es el único archivo SQL del proyecto: crea todas las tablas, la seguridad
   (RLS) y las funciones. Solo estructura, sin datos.

> 📦 **¿Estás recreando la base?** Los datos se restauran desde el archivo de
> backup JSON que se descarga con el botón **Backup** del Panel de la web.

### 3. Crear tu usuario

1. En Supabase: **Authentication → Users → Add user → Create new user**.
2. Email: el tuyo. Contraseña: la que quieras usar para entrar al sistema.
3. Tildá **Auto Confirm User** y creá el usuario.
4. Copiá el **UUID** del usuario recién creado y en **SQL Editor** ejecutá
   (con tu nombre de usuario en minúsculas):

   ```sql
   insert into user_profiles (id, username, email)
   values ('<UUID>', 'tuusuario', 'tu@email.com');
   ```

Con ese usuario y contraseña vas a entrar a la web. Nadie más puede ver tus
datos: todas las tablas están protegidas y solo usuarios autenticados pueden
acceder.

### 4. Publicar la web en Vercel

1. Entrá a [vercel.com](https://vercel.com) y logueate con tu cuenta de GitHub.
2. **Add New → Project** → importá el repositorio `GeneradorDePresupuestos`.
3. No hace falta tocar la configuración de build: el `vercel.json` de la raíz
   del repo ya deja todo listo. (Opcionalmente podés poner **Root Directory**
   = `web`; funciona igual de las dos maneras.)
4. En **Environment Variables** agregá estas dos (los valores están en
   Supabase → **Settings → API**):

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` (Project URL) |
   | `VITE_SUPABASE_ANON_KEY` | la clave `anon` / `public` |

5. **Deploy**. En un minuto tenés tu URL (ej: `https://dicor.vercel.app`)
   accesible desde cualquier lado. 📱

> La clave `anon` es segura para usar en el navegador: sin iniciar sesión no
> permite leer ni escribir nada (Row Level Security).

---

## 💻 Desarrollo local

```bash
cd web
cp .env.example .env   # completar con los datos de Supabase
npm install
npm run dev            # http://localhost:5173
```

### Previsualizar sin Supabase (datos de ejemplo)

```bash
npx vite build -c vite.mock.config.ts
npx vite preview --outDir dist-mock
```

---

## 📦 Qué incluye

| Módulo | Descripción |
|---|---|
| **Panel** | Estadísticas generales, gráfico de facturación y últimos remitos |
| **Nuevo remito** | Buscador de productos con autocompletado (por código o descripción), bonificaciones, numeración automática `0001-XXX` y descarga del PDF |
| **Remitos** | Lista con búsqueda, detalle completo, **re-descarga del PDF** de cualquier remito y eliminación |
| **Productos** | Alta/edición/baja, filtro por categoría, búsqueda, **stock**, **importación de listas desde Excel/CSV** y **actualización masiva de precios** con vista previa |
| **Stock / Inventario** | Control de stock con semáforo (verde/ámbar/rojo), valor del inventario, alerta de reposición, ingresos/egresos/ajustes y registro de **todos los movimientos**. El stock se descuenta solo al generar un remito |
| **Historial de precios** | Auditoría de todos los cambios (masivos e individuales), con filtros — *en la app de escritorio este módulo no funcionaba* |
| **Más vendidos** | Ranking por cantidad o facturación, con períodos configurables |
| **Facturación mensual** | Evolución mes a mes con totales, promedio y mejor mes |

Mejoras respecto a la app de escritorio:

- Se usa desde **cualquier dispositivo** (es responsive, anda bien en el celular).
- El PDF de un remito viejo se puede **volver a descargar siempre** (se regenera
  desde la base de datos; ya no depende de un archivo guardado en una computadora).
- El buscador de productos encuentra por **código o descripción** mientras escribís.
- **Todos** los cambios de precio quedan en el historial (también los individuales).
- **Control de stock**: el inventario se descuenta solo al emitir un remito, avisa
  cuándo reponer y guarda cada entrada, salida y ajuste.
- **Importar listas**: se carga el mismo Excel que se usa para mandar la lista de
  precios y el sistema da de alta los productos nuevos y actualiza los que ya están.
- Los datos están en la nube con backup automático de Supabase.

### Importar una lista de precios

En **Productos → Importar** se elige el archivo (`.xlsx` de Excel o `.csv`) y la
pantalla muestra, antes de tocar nada:

1. **Qué columna es cada dato** — lo detecta solo por los encabezados; si la lista
   tiene el título arriba o encabezados raros, se corrige a mano con los desplegables.
2. **La categoría** — se elige una existente o se escribe una nueva (por ejemplo
   `BOBINADOS`); queda disponible en toda la app apenas se importa.
3. **La vista previa** — cuántos productos son nuevos, cuántos actualizan precio
   (muestra "precio viejo → precio nuevo") y cuáles tienen error (sin código, sin
   precio, código repetido). Las filas con error no se importan.

Los precios se leen en formato argentino (`$ 1.234,56`). Cada cambio de precio queda
registrado en el **Historial de precios**, igual que un aumento masivo. Si el archivo
trae una columna de stock inicial, se carga como movimiento de ingreso auditado.

## 🧾 Formato del PDF

El PDF mantiene el formato del sistema original: logo y datos del negocio,
N° de remito y fecha, leyenda "DOCUMENTO NO VÁLIDO COMO FACTURA", datos del
cliente con condición de IVA y venta, tabla de productos con bonificaciones,
total y recuadro de observaciones. El nombre del archivo también:
`remito_<Cliente>_<numero>.pdf`.

Para cambiar los datos del negocio (dirección, CUIT, email), editá
[`src/lib/pdf.ts`](src/lib/pdf.ts) (constante `EMPRESA`). Para cambiar el logo,
reemplazá el contenido de [`src/lib/logo.ts`](src/lib/logo.ts)
(generá el nuevo data URL con: `base64 -w0 logo.png`).
