# 📦 DICOR - Sistema de Gestión

<div align="center">

![Java](https://img.shields.io/badge/Java-17-orange?style=for-the-badge&logo=java)
![JavaFX](https://img.shields.io/badge/JavaFX-21.0.2-blue?style=for-the-badge&logo=java)
![Maven](https://img.shields.io/badge/Maven-3.9.12-red?style=for-the-badge&logo=apachemaven)
![SQLite](https://img.shields.io/badge/SQLite-3-green?style=for-the-badge&logo=sqlite)

**Sistema completo de gestión de remitos y productos para DICOR Carbones y Repuestos**

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Tecnologías](#-tecnologías)

</div>

---

## 🎯 Descripción

DICOR es un sistema de gestión empresarial desarrollado en JavaFX que permite administrar productos, generar remitos profesionales en PDF, llevar control de precios y obtener reportes estadísticos de facturación.

### ✨ Características Principales

#### 📝 Gestión de Remitos
- ✅ Creación de remitos con autocompletado de productos
- ✅ Generación automática de PDFs profesionales
- ✅ Numeración automática correlativa (formato: 0001-XXX)
- ✅ Selección de condición IVA (4 opciones)
- ✅ Condiciones de venta personalizables
- ✅ Cálculo automático de totales con bonificaciones
- ✅ Historial completo de remitos generados

#### 📦 Gestión de Productos
- ✅ CRUD completo (Crear, Leer, Actualizar, Eliminar)
- ✅ Categorización por tipo (Carbones, Interruptores, Repuestos Varios)
- ✅ Actualización masiva de precios por categoría
- ✅ Búsqueda en tiempo real por código o descripción
- ✅ Filtrado avanzado por categorías
- ✅ Base de datos con 379+ productos precargados

#### 📊 Reportes y Estadísticas
- ✅ **Productos Más Vendidos**: Gráfico de barras con top productos
- ✅ **Facturación Mensual**: Evolución temporal de ventas
- ✅ **Historial de Precios**: Auditoría completa de cambios de precios
- ✅ Dashboard con estadísticas en tiempo real

#### 🎨 Interfaz de Usuario
- ✅ Diseño moderno y profesional
- ✅ Navegación fluida sin ventanas modales
- ✅ Compatible con pantalla completa en macOS
- ✅ Alertas y confirmaciones no intrusivas
- ✅ Interfaz responsive y adaptable

---

## 🚀 Instalación

### Requisitos Previos

- **Java JDK 17** o superior
- **Maven 3.9+**
- **macOS** / **Linux** / **Windows**

### Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/GeneradorDePresupuestos.git
cd GeneradorDePresupuestos
```

### Compilar el Proyecto
```bash
mvn clean compile
```

### Ejecutar la Aplicación
```bash
mvn javafx:run
```

---

## 📖 Uso

### 1. Dashboard Principal

Al iniciar la aplicación, verás el **Dashboard** con 6 módulos principales:

- 📝 **Nuevo Remito**: Crear remitos y generar PDFs
- 📋 **Lista de Remitos**: Ver, abrir y eliminar remitos guardados
- 📦 **Productos**: Gestión completa de productos
- 📜 **Historial de Precios**: Auditoría de cambios de precios
- 📊 **Productos Más Vendidos**: Reportes con gráficos
- 💰 **Facturación Mensual**: Evolución de ventas

### 2. Crear un Nuevo Remito

1. Click en **"📝 Nuevo Remito"**
2. Completar datos del cliente (nombre, domicilio, CUIT)
3. Seleccionar condición de IVA y condiciones de venta
4. Agregar productos:
   - Ingresar código del producto (autocompletado)
   - Especificar cantidad
   - Aplicar bonificación si corresponde
5. Click en **"💾 Guardar como PDF"**
6. El remito se guarda automáticamente en la base de datos

### 3. Gestionar Productos

1. Click en **"📦 Productos"**
2. **Crear**: Click en "➕ Nuevo Producto"
3. **Editar**: Click en ✏️ en la fila del producto
4. **Eliminar**: Click en 🗑️ (con confirmación)
5. **Búsqueda**: Escribir en el campo de búsqueda
6. **Filtrar**: Seleccionar categoría en el combo
7. **Actualizar Precios**: Click en "💲 Actualizar Precios" para aplicar aumentos masivos

### 4. Ver Reportes

- **Productos Más Vendidos**: Muestra gráfico de barras con los productos más demandados
- **Facturación Mensual**: Presenta evolución de ventas mes a mes
- **Historial de Precios**: Lista todos los cambios de precios realizados

---

## 🛠️ Tecnologías

### Backend
- **Java 17**: Lenguaje de programación
- **JavaFX 21.0.2**: Framework para interfaz gráfica
- **SQLite**: Base de datos embebida
- **Maven**: Gestión de dependencias

### Bibliotecas Principales
- **iText (OpenPDF)**: Generación de PDFs
- **JFreeChart**: Gráficos estadísticos
- **JDBC**: Conectividad con base de datos

### Arquitectura
- **Patrón MVC**: Separación de capas (Models, Views, Controllers)
- **DAO Pattern**: Acceso a datos desacoplado
- **Navigation Manager**: Navegación centralizada
- **Single Window Architecture**: Una ventana principal con vistas dinámicas

---

## 📁 Estructura del Proyecto
```
GeneradorDePresupuestos/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── org/example/presupuesto/
│   │   │       ├── controllers/          # Vistas de la aplicación
│   │   │       │   ├── DashboardView.java
│   │   │       │   ├── NuevoRemitoView.java
│   │   │       │   ├── ListaRemitosView.java
│   │   │       │   ├── ProductosView.java
│   │   │       │   ├── HistorialPreciosView.java
│   │   │       │   ├── ProductosMasVendidosView.java
│   │   │       │   └── FacturacionMensualView.java
│   │   │       ├── dao/                   # Acceso a datos
│   │   │       │   ├── DatabaseManager.java
│   │   │       │   ├── ProductoDAO.java
│   │   │       │   └── RemitoDAO.java
│   │   │       ├── models/                # Modelos de datos
│   │   │       │   ├── Producto.java
│   │   │       │   └── Remito.java
│   │   │       ├── utils/                 # Utilidades
│   │   │       │   └── NavigationManager.java
│   │   │       └── Main.java              # Punto de entrada
│   │   └── resources/
│   │       ├── dicor.db                   # Base de datos SQLite
│   │       └── logo.png                   # Logo de la empresa
├── pom.xml                                # Configuración Maven
└── README.md                              # Este archivo
```

---

## 💾 Base de Datos

### Esquema Principal

**Tabla: `productos`**
```sql
- id (INTEGER PRIMARY KEY)
- codigo (TEXT UNIQUE)
- descripcion (TEXT)
- categoria (TEXT)
- precio_unitario (REAL)
```

**Tabla: `remitos`**
```sql
- id (INTEGER PRIMARY KEY)
- numero (TEXT UNIQUE)
- fecha (TEXT)
- cliente_nombre (TEXT)
- cliente_domicilio (TEXT)
- cliente_cuit (TEXT)
- total (REAL)
- ruta_pdf (TEXT)
```

**Tabla: `remitos_items`**
```sql
- id (INTEGER PRIMARY KEY)
- remito_id (INTEGER)
- producto_codigo (TEXT)
- cantidad (INTEGER)
- precio_unitario (REAL)
- bonificacion (REAL)
```

**Tabla: `historial_precios`**
```sql
- id (INTEGER PRIMARY KEY)
- producto_codigo (TEXT)
- precio_anterior (REAL)
- precio_nuevo (REAL)
- fecha_cambio (TEXT)
```

---

## 🔧 Configuración

### Personalizar Logo

Reemplazar el archivo `src/main/resources/logo.png` con el logo de tu empresa (tamaño recomendado: 200x100px).

### Datos de la Empresa

Editar `NuevoRemitoView.java` líneas 640-645:
```java
datosNegocio.addCell(celdaTexto("TU EMPRESA", fontBold));
datosNegocio.addCell(celdaTexto("de Tu Nombre", fontNormal));
datosNegocio.addCell(celdaTexto("Dirección - Ciudad", fontNormal));
datosNegocio.addCell(celdaTexto("email@tuempresa.com", fontNormal));
```

### Agregar Productos Iniciales
```bash
# Conectar a la base de datos
sqlite3 src/main/resources/dicor.db

# Insertar productos
INSERT INTO productos (codigo, descripcion, categoria, precio_unitario) 
VALUES ('TU-001', 'Tu Producto', 'CARBONES', 1500.00);
```

---

## 🐛 Solución de Problemas

### Error: "No se puede encontrar JavaFX"
```bash
# Verificar que JavaFX esté instalado correctamente
mvn clean install
```

### Error: "Base de datos bloqueada"
```bash
# Cerrar todas las instancias de la aplicación
# Reiniciar la aplicación
```

### Error: "PDF no se genera"
```bash
# Verificar permisos de escritura en el directorio destino
# Verificar que el logo.png exista en resources/
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

---

## 📝 Licencia

Este proyecto es de uso privado para **DICOR Carbones y Repuestos**.

---

## 👤 Autor

**Fabrizio Dematias**

- Email: dicorcarbones@gmail.com
- Ubicación: Córdoba, Argentina

---

## 🙏 Agradecimientos

- Desarrollado con ❤️ para DICOR
- Powered by JavaFX y SQLite
- Iconos: Emojis Unicode

---

<div align="center">

**DICOR Sistema de Gestión © 2026**

[⬆ Volver arriba](#-dicor---sistema-de-gestión)

</div>
