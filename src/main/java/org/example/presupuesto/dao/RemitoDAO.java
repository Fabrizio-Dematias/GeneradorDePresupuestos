package org.example.presupuesto.dao;

import org.example.presupuesto.Remito;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object para Remitos
 */
public class RemitoDAO {
    
    /**
     * Guarda un remito completo en la base de datos
     */
    public static boolean guardarRemito(String numero, String fecha, String clienteNombre, 
                                       String clienteDomicilio, String clienteCuit, 
                                       double total, List<Remito> items, String rutaPDF) {
        Connection conn = null;
        
        try {
            conn = DatabaseManager.getConnection();
            conn.setAutoCommit(false); // Iniciar transacción
            
            // 1. Insertar el remito
            String queryRemito = "INSERT INTO remitos (numero, fecha, cliente_nombre, cliente_domicilio, cliente_cuit, total, ruta_pdf) VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            PreparedStatement pstmtRemito = conn.prepareStatement(queryRemito, Statement.RETURN_GENERATED_KEYS);
            pstmtRemito.setString(1, numero);
            pstmtRemito.setString(2, fecha);
            pstmtRemito.setString(3, clienteNombre);
            pstmtRemito.setString(4, clienteDomicilio);
            pstmtRemito.setString(5, clienteCuit);
            pstmtRemito.setDouble(6, total);
            pstmtRemito.setString(7, rutaPDF);
            
            int affectedRows = pstmtRemito.executeUpdate();
            
            if (affectedRows == 0) {
                throw new SQLException("No se pudo insertar el remito");
            }
            
            // Obtener el ID generado
            ResultSet generatedKeys = pstmtRemito.getGeneratedKeys();
            int remitoId = 0;
            if (generatedKeys.next()) {
                remitoId = generatedKeys.getInt(1);
            } else {
                throw new SQLException("No se pudo obtener el ID del remito");
            }
            
            // 2. Insertar los items del remito
            String queryItems = "INSERT INTO remito_items (remito_id, codigo, cantidad, descripcion, precio_unitario, bonificacion, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            PreparedStatement pstmtItems = conn.prepareStatement(queryItems);
            
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
            
            // Commit de la transacción
            conn.commit();
            
            System.out.println("✅ Remito guardado exitosamente: " + numero);
            return true;
            
        } catch (SQLException e) {
            System.err.println("❌ Error al guardar remito: " + e.getMessage());
            e.printStackTrace();
            
            // Rollback en caso de error
            if (conn != null) {
                try {
                    conn.rollback();
                    System.err.println("⚠️  Transacción revertida");
                } catch (SQLException ex) {
                    System.err.println("❌ Error al hacer rollback: " + ex.getMessage());
                }
            }
            
            return false;
            
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException e) {
                    System.err.println("❌ Error al cerrar conexión: " + e.getMessage());
                }
            }
        }
    }
    
    /**
     * Obtiene todos los remitos
     */
    public static List<RemitoResumen> obtenerTodosLosRemitos() {
        List<RemitoResumen> remitos = new ArrayList<>();
        String query = "SELECT id, numero, fecha, cliente_nombre, cliente_domicilio, cliente_cuit, total, estado, ruta_pdf FROM remitos ORDER BY fecha DESC, numero DESC";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                RemitoResumen remito = new RemitoResumen(
                    rs.getInt("id"),
                    rs.getString("numero"),
                    rs.getString("fecha"),
                    rs.getString("cliente_nombre"),
                    rs.getString("cliente_domicilio"),
                    rs.getString("cliente_cuit"),
                    rs.getDouble("total"),
                    rs.getString("estado"),
                    rs.getString("ruta_pdf")
                );
                remitos.add(remito);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener remitos: " + e.getMessage());
            e.printStackTrace();
        }
        
        return remitos;
    }
    
    /**
     * Busca remitos por número o cliente
     */
    public static List<RemitoResumen> buscarRemitos(String filtro) {
        List<RemitoResumen> remitos = new ArrayList<>();
        String query = "SELECT id, numero, fecha, cliente_nombre, cliente_domicilio, cliente_cuit, total, estado, ruta_pdf FROM remitos WHERE numero LIKE ? OR cliente_nombre LIKE ? ORDER BY fecha DESC, numero DESC";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            String pattern = "%" + filtro + "%";
            pstmt.setString(1, pattern);
            pstmt.setString(2, pattern);
            
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                RemitoResumen remito = new RemitoResumen(
                    rs.getInt("id"),
                    rs.getString("numero"),
                    rs.getString("fecha"),
                    rs.getString("cliente_nombre"),
                    rs.getString("cliente_domicilio"),
                    rs.getString("cliente_cuit"),
                    rs.getDouble("total"),
                    rs.getString("estado"),
                    rs.getString("ruta_pdf")
                );
                remitos.add(remito);
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al buscar remitos: " + e.getMessage());
        }
        
        return remitos;
    }
    
    /**
     * Elimina un remito por ID
     */
    public static boolean eliminarRemito(int id) {
        String query = "DELETE FROM remitos WHERE id = ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
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
     * Obtiene la facturación total de todos los remitos
     */
    public static double obtenerFacturacionTotal() {
        String query = "SELECT SUM(total) as facturacion_total FROM remitos";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            if (rs.next()) {
                return rs.getDouble("facturacion_total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener facturación total: " + e.getMessage());
        }
        
        return 0.0;
    }
    
    /**
     * Clase interna para representar un resumen de remito
     */
    public static class RemitoResumen {
        private final int id;
        private final String numero;
        private final String fecha;
        private final String clienteNombre;
        private final String clienteDomicilio;
        private final String clienteCuit;
        private final double total;
        private final String estado;
        private final String rutaPDF;
        
        public RemitoResumen(int id, String numero, String fecha, String clienteNombre, 
                           String clienteDomicilio, String clienteCuit,
                           double total, String estado, String rutaPDF) {
            this.id = id;
            this.numero = numero;
            this.fecha = fecha;
            this.clienteNombre = clienteNombre;
            this.clienteDomicilio = clienteDomicilio;
            this.clienteCuit = clienteCuit;
            this.total = total;
            this.estado = estado;
            this.rutaPDF = rutaPDF;
        }
        
        public int getId() { return id; }
        public String getNumero() { return numero; }
        public String getFecha() { return fecha; }
        public String getClienteNombre() { return clienteNombre; }
        public String getClienteDomicilio() { return clienteDomicilio; }
        public String getClienteCUIT() { return clienteCuit; }
        public double getTotal() { return total; }
        public String getEstado() { return estado; }
        public String getRutaPDF() { return rutaPDF; }
    }
}