package org.example.presupuesto.models;

import javafx.beans.property.*;

/**
 * Modelo para el historial de cambios de precios
 */
public class HistorialPrecio {
    private final IntegerProperty id;
    private final StringProperty productoCodigo;
    private final StringProperty productoDescripcion;
    private final DoubleProperty precioAnterior;
    private final DoubleProperty precioNuevo;
    private final DoubleProperty porcentajeCambio;
    private final StringProperty categoria;
    private final StringProperty fechaCambio;
    
    public HistorialPrecio(int id, String productoCodigo, String productoDescripcion,
                          double precioAnterior, double precioNuevo, double porcentajeCambio,
                          String categoria, String fechaCambio) {
        this.id = new SimpleIntegerProperty(id);
        this.productoCodigo = new SimpleStringProperty(productoCodigo);
        this.productoDescripcion = new SimpleStringProperty(productoDescripcion);
        this.precioAnterior = new SimpleDoubleProperty(precioAnterior);
        this.precioNuevo = new SimpleDoubleProperty(precioNuevo);
        this.porcentajeCambio = new SimpleDoubleProperty(porcentajeCambio);
        this.categoria = new SimpleStringProperty(categoria);
        this.fechaCambio = new SimpleStringProperty(fechaCambio);
    }
    
    // Getters para properties
    public IntegerProperty idProperty() { return id; }
    public StringProperty productoCodigoProperty() { return productoCodigo; }
    public StringProperty productoDescripcionProperty() { return productoDescripcion; }
    public DoubleProperty precioAnteriorProperty() { return precioAnterior; }
    public DoubleProperty precioNuevoProperty() { return precioNuevo; }
    public DoubleProperty porcentajeCambioProperty() { return porcentajeCambio; }
    public StringProperty categoriaProperty() { return categoria; }
    public StringProperty fechaCambioProperty() { return fechaCambio; }
    
    // Getters normales
    public int getId() { return id.get(); }
    public String getProductoCodigo() { return productoCodigo.get(); }
    public String getProductoDescripcion() { return productoDescripcion.get(); }
    public double getPrecioAnterior() { return precioAnterior.get(); }
    public double getPrecioNuevo() { return precioNuevo.get(); }
    public double getPorcentajeCambio() { return porcentajeCambio.get(); }
    public String getCategoria() { return categoria.get(); }
    public String getFechaCambio() { return fechaCambio.get(); }
    
    // Setters
    public void setId(int id) { this.id.set(id); }
    public void setProductoCodigo(String codigo) { this.productoCodigo.set(codigo); }
    public void setProductoDescripcion(String desc) { this.productoDescripcion.set(desc); }
    public void setPrecioAnterior(double precio) { this.precioAnterior.set(precio); }
    public void setPrecioNuevo(double precio) { this.precioNuevo.set(precio); }
    public void setPorcentajeCambio(double porcentaje) { this.porcentajeCambio.set(porcentaje); }
    public void setCategoria(String cat) { this.categoria.set(cat); }
    public void setFechaCambio(String fecha) { this.fechaCambio.set(fecha); }
}