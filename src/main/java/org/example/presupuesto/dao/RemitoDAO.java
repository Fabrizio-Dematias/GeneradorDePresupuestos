package org.example.presupuesto.dao;

import org.example.presupuesto.Remito;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object para Remitos
 * Maneja todas las operaciones de base de datos relacionadas con remitos
 */
public class RemitoDAO {
    
    /**
     * Guarda un remito completo en la base de datos
     */
    public static boolean guardarRemito(String numero, String fecha, String clienteNombre,
                                       String clienteDomicilio, String clienteCUIT,
                                       double total, List<Remito> items, String rutaPDF) {
        
        String insertRemito = """
            INSERT INTO remitos (numero, fecha, cliente_nombre, cliente_domicilio, 
                               cliente_cuit, total, ruta_pdf, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Completado')
        """;
        
        String insertItem = """
            INSERT INTO remito_items (remito_id, codigo, cantidad, descripcion, 
                                     precio_unitario, bonificacion, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """;
        
        try (Connection conn = DatabaseManager.getConnection()) {
            // Desactivar auto-commit para hacer transacción
            conn.setAutoCommit(false);
            
            try {
                // 1. Insertar el remito
                PreparedStatement pstmtRemito = conn.prepareStatement(insertRemito, 
                                                                      Statement.RETURN_GENERATED_KEYS);
                pstmtRemito.setString(1, numero);
                pstmtRemito.setString(2, fecha);
                pstmtRemito.setString(3, clienteNombre);
                pstmtRemito.setString(4, clienteDomicilio);
                pstmtRemito.setString(5, clienteCUIT);
                pstmtRemito.setDouble(6, total);
                pstmtRemito.setString(7, rutaPDF);
                
                int affectedRows = pstmtRemito.executeUpdate();
                
                if (affectedRows == 0) {
                    throw new SQLException("Error al guardar remito");
                }
                
                // Obtener el ID del remito insertado
                ResultSet generatedKeys = pstmtRemito.getGeneratedKeys();
                int remitoId;
                if (generatedKeys.next()) {
                    remitoId = generatedKeys.getInt(1);
                } else {
                    throw new SQLException("No se pudo obtener el ID del remito");
                }
                
                // 2. Insertar los items del remito
                PreparedStatement pstmtItems = conn.prepareStatement(insertItem);
                
                for (Remito item : items) {
                    pstmtItems.setInt(1, remitoId);
                    pstmtItems.setString(2, item.codigoProperty().get());
                    pstmtItems.setInt(3, item.cantidadProperty().get());
                    pstmtItems.setString(4, item.descripcionProperty().get());
                    pstmtItems.setDouble(5, item.precioUnitarioProperty().get());
                    pstmtItems.setDouble(6, item.bonificacionProperty().get());
                    pstmtItems.setDouble(7, item.precioTotalProperty().get());
                    pstmtItems.addBatch();
                }
                
                pstmtItems.executeBatch();
                
                // Confirmar transacción
                conn.commit();
                
                System.out.println("✅ Remito guardado en BD: " + numero);
                return true;
                
            } catch (SQLException e) {
                // Revertir cambios si hay error
                conn.rollback();
                System.err.println("❌ Error al guardar remito: " + e.getMessage());
                e.printStackTrace();
                return false;
            } finally {
                conn.setAutoCommit(true);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error de conexión: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Obtiene todos los remitos de la base de datos
     */
    public static List<RemitoResumen> obtenerTodosLosRemitos() {
        List<RemitoResumen> remitos = new ArrayList<>();
        String query = """
            SELECT id, numero, fecha, cliente_nombre, cliente_cuit, total, estado, ruta_pdf
            FROM remitos
            ORDER BY id DESC
        """;
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                RemitoResumen resumen = new RemitoResumen(
                    rs.getInt("id"),
                    rs.getString("numero"),
                    rs.getString("fecha"),
                    rs.getString("cliente_nombre"),
                    rs.getString("cliente_cuit"),
                    rs.getDouble("total"),
                    rs.getString("estado"),
                    rs.getString("ruta_pdf")
                );
                remitos.add(resumen);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener remitos: " + e.getMessage());
        }
        
        return remitos;
    }
    
    /**
     * Elimina un remito de la base de datos
     */
    public static boolean eliminarRemito(int id) {
        String deleteRemito = "DELETE FROM remitos WHERE id = ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(deleteRemito)) {
            
            pstmt.setInt(1, id);
            int affectedRows = pstmt.executeUpdate();
            
            if (affectedRows > 0) {
                System.out.println("✅ Remito eliminado: ID " + id);
                return true;
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al eliminar remito: " + e.getMessage());
        }
        
        return false;
    }
    
    /**
     * Cuenta el total de remitos
     */
    public static int contarRemitos() {
        String query = "SELECT COUNT(*) as total FROM remitos";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            if (rs.next()) {
                return rs.getInt("total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al contar remitos: " + e.getMessage());
        }
        
        return 0;
    }
    
    /**
     * Obtiene el total facturado
     */
    public static double obtenerTotalFacturado() {
        String query = "SELECT SUM(total) as total_facturado FROM remitos WHERE estado = 'Completado'";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            if (rs.next()) {
                return rs.getDouble("total_facturado");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al calcular total facturado: " + e.getMessage());
        }
        
        return 0.0;
    }
    
    /**
     * Clase interna para representar un resumen de remito en la lista
     */
    public static class RemitoResumen {
        private final int id;
        private final String numero;
        private final String fecha;
        private final String clienteNombre;
        private final String clienteCUIT;
        private final double total;
        private final String estado;
        private final String rutaPDF;
        
        public RemitoResumen(int id, String numero, String fecha, String clienteNombre,
                           String clienteCUIT, double total, String estado, String rutaPDF) {
            this.id = id;
            this.numero = numero;
            this.fecha = fecha;
            this.clienteNombre = clienteNombre;
            this.clienteCUIT = clienteCUIT;
            this.total = total;
            this.estado = estado;
            this.rutaPDF = rutaPDF;
        }
        
        // Getters
        public int getId() { return id; }
        public String getNumero() { return numero; }
        public String getFecha() { return fecha; }
        public String getClienteNombre() { return clienteNombre; }
        public String getClienteCUIT() { return clienteCUIT; }
        public double getTotal() { return total; }
        public String getEstado() { return estado; }
        public String getRutaPDF() { return rutaPDF; }
    }
}