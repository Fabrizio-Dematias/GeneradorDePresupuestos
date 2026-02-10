package org.example.presupuesto.dao;

import org.example.presupuesto.models.Producto;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Data Access Object para Productos
 */
public class ProductoDAO {
    
    /**
     * Obtiene todos los productos de la base de datos
     */
    public static List<Producto> obtenerTodosLosProductos() {
        List<Producto> productos = new ArrayList<>();
        String query = "SELECT * FROM productos ORDER BY codigo";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                Producto producto = new Producto(
                    rs.getInt("id"),
                    rs.getString("codigo"),
                    rs.getString("descripcion"),
                    rs.getDouble("precio_unitario")
                );
                productos.add(producto);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener productos: " + e.getMessage());
            e.printStackTrace();
        }
        
        return productos;
    }
    
    /**
     * Busca un producto por código
     */
    public static Producto buscarPorCodigo(String codigo) {
        String query = "SELECT * FROM productos WHERE codigo = ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, codigo);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return new Producto(
                    rs.getInt("id"),
                    rs.getString("codigo"),
                    rs.getString("descripcion"),
                    rs.getDouble("precio_unitario")
                );
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al buscar producto: " + e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Busca productos por descripción (para autocompletado)
     */
    public static List<Producto> buscarPorDescripcion(String texto) {
        List<Producto> productos = new ArrayList<>();
        String query = "SELECT * FROM productos WHERE descripcion LIKE ? OR codigo LIKE ? LIMIT 10";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            String pattern = "%" + texto + "%";
            pstmt.setString(1, pattern);
            pstmt.setString(2, pattern);
            
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                Producto producto = new Producto(
                    rs.getInt("id"),
                    rs.getString("codigo"),
                    rs.getString("descripcion"),
                    rs.getDouble("precio_unitario")
                );
                productos.add(producto);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al buscar productos: " + e.getMessage());
        }
        
        return productos;
    }
    
    /**
     * Agrega un nuevo producto
     */
    public static boolean agregarProducto(String codigo, String descripcion, double precioUnitario) {
        String query = "INSERT INTO productos (codigo, descripcion, precio_unitario) VALUES (?, ?, ?)";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, codigo);
            pstmt.setString(2, descripcion);
            pstmt.setDouble(3, precioUnitario);
            
            int affectedRows = pstmt.executeUpdate();
            
            if (affectedRows > 0) {
                System.out.println("✅ Producto agregado: " + codigo);
                return true;
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al agregar producto: " + e.getMessage());
            
            // Si es error de duplicado
            if (e.getMessage().contains("UNIQUE constraint failed")) {
                System.err.println("⚠️  Ya existe un producto con el código: " + codigo);
            }
        }
        
        return false;
    }
    
    /**
     * Actualiza un producto existente
     */
    public static boolean actualizarProducto(String codigo, String descripcion, double precioUnitario) {
        String query = "UPDATE productos SET descripcion = ?, precio_unitario = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE codigo = ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, descripcion);
            pstmt.setDouble(2, precioUnitario);
            pstmt.setString(3, codigo);
            
            int affectedRows = pstmt.executeUpdate();
            
            if (affectedRows > 0) {
                System.out.println("✅ Producto actualizado: " + codigo);
                return true;
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al actualizar producto: " + e.getMessage());
        }
        
        return false;
    }
    
    /**
     * Elimina un producto
     */
    public static boolean eliminarProducto(String codigo) {
        String query = "DELETE FROM productos WHERE codigo = ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, codigo);
            int affectedRows = pstmt.executeUpdate();
            
            if (affectedRows > 0) {
                System.out.println("✅ Producto eliminado: " + codigo);
                return true;
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al eliminar producto: " + e.getMessage());
        }
        
        return false;
    }
    
    /**
     * Cuenta el total de productos
     */
    public static int contarProductos() {
        String query = "SELECT COUNT(*) as total FROM productos";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            if (rs.next()) {
                return rs.getInt("total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al contar productos: " + e.getMessage());
        }
        
        return 0;
    }
    
    /**
     * Actualiza los precios de productos por categoría aplicando un porcentaje
     * y registra los cambios en el historial
     */
    public static int actualizarPreciosPorCategoria(String categoria, double porcentajeAumento) {
        String querySelect;
        String queryUpdate;
        
        if (categoria == null || categoria.equals("TODOS")) {
            querySelect = "SELECT codigo, descripcion, precio_unitario, categoria FROM productos";
            queryUpdate = "UPDATE productos SET precio_unitario = precio_unitario * (1 + ? / 100.0), fecha_actualizacion = CURRENT_TIMESTAMP";
        } else {
            querySelect = "SELECT codigo, descripcion, precio_unitario, categoria FROM productos WHERE categoria = ?";
            queryUpdate = "UPDATE productos SET precio_unitario = precio_unitario * (1 + ? / 100.0), fecha_actualizacion = CURRENT_TIMESTAMP WHERE categoria = ?";
        }
        
        try (Connection conn = DatabaseManager.getConnection()) {
            
            // Primero, obtener los productos antes de actualizar
            List<ProductoConPrecio> productosAntes = new ArrayList<>();
            
            try (PreparedStatement pstmtSelect = conn.prepareStatement(querySelect)) {
                if (categoria != null && !categoria.equals("TODOS")) {
                    pstmtSelect.setString(1, categoria);
                }
                
                ResultSet rs = pstmtSelect.executeQuery();
                while (rs.next()) {
                    productosAntes.add(new ProductoConPrecio(
                        rs.getString("codigo"),
                        rs.getString("descripcion"),
                        rs.getDouble("precio_unitario"),
                        rs.getString("categoria")
                    ));
                }
            }
            
            // Actualizar precios
            int affectedRows;
            try (PreparedStatement pstmtUpdate = conn.prepareStatement(queryUpdate)) {
                pstmtUpdate.setDouble(1, porcentajeAumento);
                
                if (categoria != null && !categoria.equals("TODOS")) {
                    pstmtUpdate.setString(2, categoria);
                }
                
                affectedRows = pstmtUpdate.executeUpdate();
            }
            
            // Registrar en historial
            String queryHistorial = "INSERT INTO historial_precios (producto_codigo, producto_descripcion, precio_anterior, precio_nuevo, porcentaje_cambio, categoria) VALUES (?, ?, ?, ?, ?, ?)";
            
            try (PreparedStatement pstmtHistorial = conn.prepareStatement(queryHistorial)) {
                for (ProductoConPrecio producto : productosAntes) {
                    double precioAnterior = producto.precio;
                    double precioNuevo = precioAnterior * (1 + porcentajeAumento / 100.0);
                    
                    pstmtHistorial.setString(1, producto.codigo);
                    pstmtHistorial.setString(2, producto.descripcion);
                    pstmtHistorial.setDouble(3, precioAnterior);
                    pstmtHistorial.setDouble(4, precioNuevo);
                    pstmtHistorial.setDouble(5, porcentajeAumento);
                    pstmtHistorial.setString(6, producto.categoria);
                    pstmtHistorial.addBatch();
                }
                
                pstmtHistorial.executeBatch();
            }
            
            System.out.println("✅ Precios actualizados: " + affectedRows + " productos con " + porcentajeAumento + "% de aumento");
            System.out.println("✅ Cambios registrados en historial");
            
            return affectedRows;
            
        } catch (SQLException e) {
            System.err.println("❌ Error al actualizar precios: " + e.getMessage());
            e.printStackTrace();
        }
        
        return 0;
    }
    
    /**
     * Cuenta productos por categoría
     */
    public static int contarProductosPorCategoria(String categoria) {
        String query;
        
        if (categoria == null || categoria.equals("TODOS")) {
            query = "SELECT COUNT(*) as total FROM productos";
        } else {
            query = "SELECT COUNT(*) as total FROM productos WHERE categoria = ?";
        }
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            if (categoria != null && !categoria.equals("TODOS")) {
                pstmt.setString(1, categoria);
            }
            
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return rs.getInt("total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al contar productos: " + e.getMessage());
        }
        
        return 0;
    }
    
    /**
     * Obtiene vista previa de cambios de precios
     */
    public static List<String> obtenerVistaPreviaCambios(String categoria, double porcentajeAumento, int limit) {
        List<String> previews = new ArrayList<>();
        String query;
        
        if (categoria == null || categoria.equals("TODOS")) {
            query = "SELECT codigo, descripcion, precio_unitario FROM productos ORDER BY codigo LIMIT ?";
        } else {
            query = "SELECT codigo, descripcion, precio_unitario FROM productos WHERE categoria = ? ORDER BY codigo LIMIT ?";
        }
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            int paramIndex = 1;
            if (categoria != null && !categoria.equals("TODOS")) {
                pstmt.setString(paramIndex++, categoria);
            }
            pstmt.setInt(paramIndex, limit);
            
            ResultSet rs = pstmt.executeQuery();
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("es", "AR"));
            
            while (rs.next()) {
                String codigo = rs.getString("codigo");
                double precioActual = rs.getDouble("precio_unitario");
                double precioNuevo = precioActual * (1 + porcentajeAumento / 100.0);
                
                String preview = String.format("%s: %s → %s", 
                    codigo,
                    currencyFormat.format(precioActual),
                    currencyFormat.format(precioNuevo)
                );
                previews.add(preview);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener vista previa: " + e.getMessage());
        }
        
        return previews;
    }
    
    /**
     * Clase auxiliar para almacenar producto con precio
     */
    private static class ProductoConPrecio {
        String codigo;
        String descripcion;
        double precio;
        String categoria;
        
        ProductoConPrecio(String codigo, String descripcion, double precio, String categoria) {
            this.codigo = codigo;
            this.descripcion = descripcion;
            this.precio = precio;
            this.categoria = categoria;
        }
    }
}