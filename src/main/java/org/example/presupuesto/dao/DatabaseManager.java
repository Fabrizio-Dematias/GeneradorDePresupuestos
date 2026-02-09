package org.example.presupuesto.dao;

import java.sql.*;

/**
 * Gestor de la base de datos SQLite
 * Maneja la conexión y creación de tablas
 */
public class DatabaseManager {
    
    private static final String DB_URL = "jdbc:sqlite:dicor.db";
    private static Connection connection = null;
    
    /**
     * Obtiene la conexión a la base de datos
     * Si no existe, la crea
     */
    public static Connection getConnection() throws SQLException {
        if (connection == null || connection.isClosed()) {
            connection = DriverManager.getConnection(DB_URL);
            System.out.println("✅ Conectado a la base de datos SQLite");
        }
        return connection;
    }
    
    /**
     * Inicializa la base de datos creando las tablas si no existen
     */
    public static void initializeDatabase() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            
            // Tabla de Clientes
            String createClientes = """
                CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    domicilio TEXT,
                    cuit TEXT,
                    condicion_iva TEXT,
                    condicion_venta TEXT,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """;
            stmt.execute(createClientes);
            System.out.println("✅ Tabla 'clientes' verificada");
            
            // Tabla de Productos
            String createProductos = """
                CREATE TABLE IF NOT EXISTS productos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo TEXT UNIQUE,
                    descripcion TEXT NOT NULL,
                    precio_unitario REAL NOT NULL,
                    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """;
            stmt.execute(createProductos);
            System.out.println("✅ Tabla 'productos' verificada");
            
            // Tabla de Remitos
            String createRemitos = """
                CREATE TABLE IF NOT EXISTS remitos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero TEXT UNIQUE NOT NULL,
                    fecha DATE NOT NULL,
                    cliente_id INTEGER,
                    cliente_nombre TEXT,
                    cliente_domicilio TEXT,
                    cliente_cuit TEXT,
                    total REAL NOT NULL,
                    estado TEXT DEFAULT 'Completado',
                    ruta_pdf TEXT,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
                )
            """;
            stmt.execute(createRemitos);
            System.out.println("✅ Tabla 'remitos' verificada");
            
            // Tabla de Items de Remito
            String createRemitoItems = """
                CREATE TABLE IF NOT EXISTS remito_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    remito_id INTEGER NOT NULL,
                    codigo TEXT,
                    cantidad INTEGER NOT NULL,
                    descripcion TEXT NOT NULL,
                    precio_unitario REAL NOT NULL,
                    bonificacion REAL DEFAULT 0,
                    subtotal REAL NOT NULL,
                    FOREIGN KEY (remito_id) REFERENCES remitos(id) ON DELETE CASCADE
                )
            """;
            stmt.execute(createRemitoItems);
            System.out.println("✅ Tabla 'remito_items' verificada");
            
            System.out.println("🎉 Base de datos inicializada correctamente");
            
        } catch (SQLException e) {
            System.err.println("❌ Error al inicializar la base de datos: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Cierra la conexión a la base de datos
     */
    public static void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                System.out.println("✅ Conexión a la base de datos cerrada");
            }
        } catch (SQLException e) {
            System.err.println("❌ Error al cerrar la conexión: " + e.getMessage());
        }
    }
    
    /**
     * Obtiene el próximo número de remito disponible
     */
    public static String getNextRemitoNumber() {
        String query = "SELECT numero FROM remitos ORDER BY id DESC LIMIT 1";
        
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            if (rs.next()) {
                String lastNumber = rs.getString("numero");
                // Formato: 0001-XXX
                String[] parts = lastNumber.split("-");
                int nextNum = Integer.parseInt(parts[1]) + 1;
                return String.format("0001-%03d", nextNum);
            } else {
                // Primer remito
                return "0001-001";
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener próximo número de remito: " + e.getMessage());
            return "0001-001";
        }
    }
    
    /**
     * Verifica si la base de datos está funcionando correctamente
     */
    public static boolean testConnection() {
        try (Connection conn = getConnection()) {
            return conn != null && !conn.isClosed();
        } catch (SQLException e) {
            System.err.println("❌ Error de conexión: " + e.getMessage());
            return false;
        }
    }
}