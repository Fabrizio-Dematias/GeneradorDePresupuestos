package org.example.presupuesto.dao;

import org.example.presupuesto.models.HistorialPrecio;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO para gestionar el historial de cambios de precios
 */
public class HistorialPreciosDAO {
    
    /**
     * Obtiene todo el historial de precios ordenado por fecha (más reciente primero)
     */
    public static List<HistorialPrecio> obtenerTodoElHistorial() {
        List<HistorialPrecio> historial = new ArrayList<>();
        String query = "SELECT * FROM historial_precios ORDER BY fecha_cambio DESC";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                historial.add(crearHistorialDesdeResultSet(rs));
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener historial: " + e.getMessage());
            e.printStackTrace();
        }
        
        return historial;
    }
    
    /**
     * Obtiene historial filtrado por producto
     */
    public static List<HistorialPrecio> obtenerHistorialPorProducto(String codigo) {
        List<HistorialPrecio> historial = new ArrayList<>();
        String query = "SELECT * FROM historial_precios WHERE producto_codigo = ? ORDER BY fecha_cambio DESC";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, codigo);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                historial.add(crearHistorialDesdeResultSet(rs));
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener historial del producto: " + e.getMessage());
        }
        
        return historial;
    }
    
    /**
     * Obtiene historial filtrado por categoría
     */
    public static List<HistorialPrecio> obtenerHistorialPorCategoria(String categoria) {
        List<HistorialPrecio> historial = new ArrayList<>();
        String query = "SELECT * FROM historial_precios WHERE categoria = ? ORDER BY fecha_cambio DESC LIMIT 100";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, categoria);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                historial.add(crearHistorialDesdeResultSet(rs));
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener historial por categoría: " + e.getMessage());
        }
        
        return historial;
    }
    
    /**
     * Obtiene historial filtrado por fecha
     */
    public static List<HistorialPrecio> obtenerHistorialPorFecha(String fechaInicio, String fechaFin) {
        List<HistorialPrecio> historial = new ArrayList<>();
        String query = "SELECT * FROM historial_precios WHERE DATE(fecha_cambio) BETWEEN ? AND ? ORDER BY fecha_cambio DESC";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, fechaInicio);
            pstmt.setString(2, fechaFin);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                historial.add(crearHistorialDesdeResultSet(rs));
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener historial por fecha: " + e.getMessage());
        }
        
        return historial;
    }
    
    /**
     * Cuenta total de registros en el historial
     */
    public static int contarRegistros() {
        String query = "SELECT COUNT(*) as total FROM historial_precios";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            if (rs.next()) {
                return rs.getInt("total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al contar registros: " + e.getMessage());
        }
        
        return 0;
    }
    
    /**
     * Crea un objeto HistorialPrecio desde un ResultSet
     */
    private static HistorialPrecio crearHistorialDesdeResultSet(ResultSet rs) throws SQLException {
        return new HistorialPrecio(
            rs.getInt("id"),
            rs.getString("producto_codigo"),
            rs.getString("producto_descripcion"),
            rs.getDouble("precio_anterior"),
            rs.getDouble("precio_nuevo"),
            rs.getDouble("porcentaje_cambio"),
            rs.getString("categoria"),
            rs.getString("fecha_cambio")
        );
    }
}