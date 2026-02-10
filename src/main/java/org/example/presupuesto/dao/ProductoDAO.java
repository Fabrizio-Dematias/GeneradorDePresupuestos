package org.example.presupuesto.dao;

import org.example.presupuesto.models.Producto;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

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
}