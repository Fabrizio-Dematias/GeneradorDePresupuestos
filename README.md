# DICOR - Sistema de Gestión

![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

Sistema de gestión de remitos y productos para **DICOR Carbones y Repuestos**. Accesible desde cualquier dispositivo (PC, tablet, celular) con los datos en la nube.

---

## Módulos

| Módulo | Descripción |
|---|---|
| **Panel** | Estadísticas generales, gráfico de facturación mensual y últimos remitos |
| **Nuevo remito** | Buscador de productos con autocompletado por código o descripción, bonificaciones, numeración automática `0001-XXX` y descarga del PDF |
| **Remitos** | Lista con búsqueda, detalle completo y re-descarga del PDF de cualquier remito |
| **Productos** | Alta, edición y baja de productos, filtro por categoría y actualización masiva de precios con vista previa |
| **Historial de precios** | Auditoría de todos los cambios de precio, masivos e individuales |
| **Más vendidos** | Ranking por cantidad o facturación con períodos configurables |
| **Facturación mensual** | Evolución mes a mes con totales, promedio y mejor mes |

---

## Tecnologías

- **React 18 + TypeScript + Vite** — interfaz de usuario
- **Tailwind CSS** — estilos
- **Supabase (PostgreSQL + Auth)** — base de datos en la nube y autenticación
- **jsPDF** — generación de PDFs en el navegador
- **Recharts** — gráficos de estadísticas
- **Vercel** — hosting y deploys automáticos

---

## Base de datos

Cinco tablas en Supabase (PostgreSQL) con Row Level Security:

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo con código, descripción, categoría y precio |
| `remitos` | Encabezado de cada remito (número, fecha, cliente, condición IVA/venta, total) |
| `remito_items` | Líneas de cada remito (producto, cantidad, precio, bonificación) |
| `historial_precios` | Auditoría de todos los cambios de precio |
| `clientes` | Datos de clientes de referencia |

---

## Autor

**Fabrizio Dematias** — dicorcarbones@gmail.com — Córdoba, Argentina

*DICOR Sistema de Gestión © 2026 — Uso privado*
