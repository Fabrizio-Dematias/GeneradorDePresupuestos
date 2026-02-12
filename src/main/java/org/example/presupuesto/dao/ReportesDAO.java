package org.example.presupuesto.dao;

import org.example.presupuesto.models.EstadisticaProducto;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * DAO para reportes y estadísticas
 */
public class ReportesDAO {
    
    /**
     * Obtiene los productos más vendidos por cantidad
     */
    public static List<EstadisticaProducto> obtenerProductosMasVendidos(int limite, String periodo) {
        List<EstadisticaProducto> estadisticas = new ArrayList<>();
        
        String fechaDesde = calcularFechaDesde(periodo);
        
        // PRIMERO: Calcular total para porcentajes
        double totalGeneral = obtenerTotalVentas(fechaDesde);
        
        // SEGUNDO: Obtener productos
        String query = 
            "SELECT " +
            "    ri.codigo, " +
            "    ri.descripcion, " +
            "    COALESCE(p.categoria, 'SIN CATEGORIA') as categoria, " +
            "    SUM(ri.cantidad) as cantidad_vendida, " +
            "    SUM(ri.subtotal) as total_facturado " +
            "FROM remito_items ri " +
            "INNER JOIN remitos r ON ri.remito_id = r.id " +
            "LEFT JOIN productos p ON ri.codigo = p.codigo " +
            "WHERE r.fecha >= ? " +
            "GROUP BY ri.codigo, ri.descripcion " +
            "ORDER BY cantidad_vendida DESC " +
            "LIMIT ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, fechaDesde);
            pstmt.setInt(2, limite);
            
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                String codigo = rs.getString("codigo");
                String descripcion = rs.getString("descripcion");
                String categoria = rs.getString("categoria");
                int cantidadVendida = rs.getInt("cantidad_vendida");
                double totalFacturado = rs.getDouble("total_facturado");
                
                double porcentaje = totalGeneral > 0 ? (totalFacturado / totalGeneral * 100) : 0;
                
                EstadisticaProducto est = new EstadisticaProducto(
                    codigo,
                    descripcion,
                    categoria,
                    cantidadVendida,
                    totalFacturado,
                    porcentaje
                );
                
                estadisticas.add(est);
            }
            
            System.out.println("✅ Productos más vendidos cargados: " + estadisticas.size() + " productos (total ventas: $" + totalGeneral + ")");
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener productos más vendidos: " + e.getMessage());
            e.printStackTrace();
        }
        
        return estadisticas;
    }
    
    /**
     * Obtiene los productos con mayor facturación
     */
    public static List<EstadisticaProducto> obtenerProductosMayorFacturacion(int limite, String periodo) {
        List<EstadisticaProducto> estadisticas = new ArrayList<>();
        
        String fechaDesde = calcularFechaDesde(periodo);
        
        // PRIMERO: Calcular total para porcentajes
        double totalGeneral = obtenerTotalVentas(fechaDesde);
        
        // SEGUNDO: Obtener productos
        String query = 
            "SELECT " +
            "    ri.codigo, " +
            "    ri.descripcion, " +
            "    COALESCE(p.categoria, 'SIN CATEGORIA') as categoria, " +
            "    SUM(ri.cantidad) as cantidad_vendida, " +
            "    SUM(ri.subtotal) as total_facturado " +
            "FROM remito_items ri " +
            "INNER JOIN remitos r ON ri.remito_id = r.id " +
            "LEFT JOIN productos p ON ri.codigo = p.codigo " +
            "WHERE r.fecha >= ? " +
            "GROUP BY ri.codigo, ri.descripcion " +
            "ORDER BY total_facturado DESC " +
            "LIMIT ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, fechaDesde);
            pstmt.setInt(2, limite);
            
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                String codigo = rs.getString("codigo");
                String descripcion = rs.getString("descripcion");
                String categoria = rs.getString("categoria");
                int cantidadVendida = rs.getInt("cantidad_vendida");
                double totalFacturado = rs.getDouble("total_facturado");
                
                double porcentaje = totalGeneral > 0 ? (totalFacturado / totalGeneral * 100) : 0;
                
                EstadisticaProducto est = new EstadisticaProducto(
                    codigo,
                    descripcion,
                    categoria,
                    cantidadVendida,
                    totalFacturado,
                    porcentaje
                );
                
                estadisticas.add(est);
            }
            
            System.out.println("✅ Productos mayor facturación cargados: " + estadisticas.size() + " productos (total ventas: $" + totalGeneral + ")");
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener productos mayor facturación: " + e.getMessage());
            e.printStackTrace();
        }
        
        return estadisticas;
    }
    
    /**
     * Obtiene el total de ventas en un período
     */
    private static double obtenerTotalVentas(String fechaDesde) {
        String query = "SELECT SUM(total) as total_ventas FROM remitos WHERE fecha >= ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, fechaDesde);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                double total = rs.getDouble("total_ventas");
                System.out.println("💰 Total de ventas desde " + fechaDesde + ": $" + total);
                return total;
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener total de ventas: " + e.getMessage());
        }
        
        return 0.0;
    }
    
    /**
     * Calcula la fecha desde según el período seleccionado
     */
    private static String calcularFechaDesde(String periodo) {
        LocalDate hoy = LocalDate.now();
        LocalDate fechaDesde;
        
        switch (periodo) {
            case "Último mes":
                fechaDesde = hoy.minusMonths(1);
                break;
            case "Últimos 3 meses":
                fechaDesde = hoy.minusMonths(3);
                break;
            case "Últimos 6 meses":
                fechaDesde = hoy.minusMonths(6);
                break;
            case "Último año":
                fechaDesde = hoy.minusYears(1);
                break;
            case "Todo el tiempo":
            default:
                fechaDesde = LocalDate.of(2000, 1, 1); // Fecha muy antigua
                break;
        }
        
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;
        String fechaStr = fechaDesde.format(formatter);
        
        System.out.println("📅 Período seleccionado: " + periodo + " (desde: " + fechaStr + ")");
        
        return fechaStr;
    }
    
    /**
     * Obtiene estadísticas generales de ventas
     */
    public static int obtenerTotalProductosVendidos(String periodo) {
        String fechaDesde = calcularFechaDesde(periodo);
        String query = 
            "SELECT SUM(ri.cantidad) as total " +
            "FROM remito_items ri " +
            "INNER JOIN remitos r ON ri.remito_id = r.id " +
            "WHERE r.fecha >= ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, fechaDesde);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return rs.getInt("total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener total de productos vendidos: " + e.getMessage());
        }
        
        return 0;
    }
    
    /**
     * Obtiene la cantidad de productos diferentes vendidos
     */
    public static int obtenerProductosDiferentesVendidos(String periodo) {
        String fechaDesde = calcularFechaDesde(periodo);
        String query = 
            "SELECT COUNT(DISTINCT ri.codigo) as total " +
            "FROM remito_items ri " +
            "INNER JOIN remitos r ON ri.remito_id = r.id " +
            "WHERE r.fecha >= ?";
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            pstmt.setString(1, fechaDesde);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return rs.getInt("total");
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener productos diferentes vendidos: " + e.getMessage());
        }
        
        return 0;
    }
    
    /**
     * Obtiene la facturación mensual agrupada por mes y año
     */
    public static List<org.example.presupuesto.models.FacturacionMensual> obtenerFacturacionMensual(Integer anioFiltro) {
        List<org.example.presupuesto.models.FacturacionMensual> facturacion = new ArrayList<>();
        
        String query;
        
        if (anioFiltro != null) {
            query = 
                "SELECT " +
                "    strftime('%Y', fecha) as anio, " +
                "    strftime('%m', fecha) as mes, " +
                "    COUNT(*) as cantidad_remitos, " +
                "    SUM(total) as total_facturado " +
                "FROM remitos " +
                "WHERE strftime('%Y', fecha) = ? " +
                "GROUP BY anio, mes " +
                "ORDER BY anio DESC, mes ASC";
        } else {
            query = 
                "SELECT " +
                "    strftime('%Y', fecha) as anio, " +
                "    strftime('%m', fecha) as mes, " +
                "    COUNT(*) as cantidad_remitos, " +
                "    SUM(total) as total_facturado " +
                "FROM remitos " +
                "GROUP BY anio, mes " +
                "ORDER BY anio DESC, mes ASC";
        }
        
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            if (anioFiltro != null) {
                pstmt.setString(1, String.valueOf(anioFiltro));
            }
            
            ResultSet rs = pstmt.executeQuery();
            
            String[] meses = {"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                             "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"};
            
            while (rs.next()) {
                int anio = Integer.parseInt(rs.getString("anio"));
                int mes = Integer.parseInt(rs.getString("mes"));
                int cantidadRemitos = rs.getInt("cantidad_remitos");
                double totalFacturado = rs.getDouble("total_facturado");
                
                String mesNombre = meses[mes - 1] + " " + anio;
                
                org.example.presupuesto.models.FacturacionMensual fact = 
                    new org.example.presupuesto.models.FacturacionMensual(
                        anio, mes, mesNombre, cantidadRemitos, totalFacturado
                    );
                
                facturacion.add(fact);
            }
            
            System.out.println("✅ Facturación mensual cargada: " + facturacion.size() + " meses");
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener facturación mensual: " + e.getMessage());
            e.printStackTrace();
        }
        
        return facturacion;
    }
    
    /**
     * Obtiene los años disponibles en los remitos
     */
    public static List<Integer> obtenerAniosDisponibles() {
        List<Integer> anios = new ArrayList<>();
        
        String query = "SELECT DISTINCT strftime('%Y', fecha) as anio FROM remitos ORDER BY anio DESC";
        
        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            
            while (rs.next()) {
                anios.add(Integer.parseInt(rs.getString("anio")));
            }
            
        } catch (SQLException e) {
            System.err.println("❌ Error al obtener años disponibles: " + e.getMessage());
        }
        
        return anios;
    }
}