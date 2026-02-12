package org.example.presupuesto.models;

import javafx.beans.property.*;

/**
 * Modelo para estadísticas de productos vendidos
 */
public class EstadisticaProducto {
    private final StringProperty codigo;
    private final StringProperty descripcion;
    private final StringProperty categoria;
    private final IntegerProperty cantidadVendida;
    private final DoubleProperty totalFacturado;
    private final DoubleProperty porcentajeVentas;
    
    public EstadisticaProducto(String codigo, String descripcion, String categoria,
                              int cantidadVendida, double totalFacturado, double porcentajeVentas) {
        this.codigo = new SimpleStringProperty(codigo);
        this.descripcion = new SimpleStringProperty(descripcion);
        this.categoria = new SimpleStringProperty(categoria);
        this.cantidadVendida = new SimpleIntegerProperty(cantidadVendida);
        this.totalFacturado = new SimpleDoubleProperty(totalFacturado);
        this.porcentajeVentas = new SimpleDoubleProperty(porcentajeVentas);
    }
    
    // Properties
    public StringProperty codigoProperty() { return codigo; }
    public StringProperty descripcionProperty() { return descripcion; }
    public StringProperty categoriaProperty() { return categoria; }
    public IntegerProperty cantidadVendidaProperty() { return cantidadVendida; }
    public DoubleProperty totalFacturadoProperty() { return totalFacturado; }
    public DoubleProperty porcentajeVentasProperty() { return porcentajeVentas; }
    
    // Getters
    public String getCodigo() { return codigo.get(); }
    public String getDescripcion() { return descripcion.get(); }
    public String getCategoria() { return categoria.get(); }
    public int getCantidadVendida() { return cantidadVendida.get(); }
    public double getTotalFacturado() { return totalFacturado.get(); }
    public double getPorcentajeVentas() { return porcentajeVentas.get(); }
    
    // Setters
    public void setCodigo(String codigo) { this.codigo.set(codigo); }
    public void setDescripcion(String descripcion) { this.descripcion.set(descripcion); }
    public void setCategoria(String categoria) { this.categoria.set(categoria); }
    public void setCantidadVendida(int cantidad) { this.cantidadVendida.set(cantidad); }
    public void setTotalFacturado(double total) { this.totalFacturado.set(total); }
    public void setPorcentajeVentas(double porcentaje) { this.porcentajeVentas.set(porcentaje); }
}