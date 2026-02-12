package org.example.presupuesto.models;

import javafx.beans.property.*;

public class Producto {
    private final IntegerProperty id;
    private final StringProperty codigo;
    private final StringProperty descripcion;
    private final DoubleProperty precioUnitario;
    private final StringProperty categoria;
    
    public Producto(int id, String codigo, String descripcion, double precioUnitario) {
        this(id, codigo, descripcion, precioUnitario, "CARBONES");
    }
    
    public Producto(int id, String codigo, String descripcion, double precioUnitario, String categoria) {
        this.id = new SimpleIntegerProperty(id);
        this.codigo = new SimpleStringProperty(codigo);
        this.descripcion = new SimpleStringProperty(descripcion);
        this.precioUnitario = new SimpleDoubleProperty(precioUnitario);
        this.categoria = new SimpleStringProperty(categoria != null ? categoria : "CARBONES");
    }
    
    // Properties
    public IntegerProperty idProperty() { return id; }
    public StringProperty codigoProperty() { return codigo; }
    public StringProperty descripcionProperty() { return descripcion; }
    public DoubleProperty precioUnitarioProperty() { return precioUnitario; }
    public StringProperty categoriaProperty() { return categoria; }
    
    // Getters
    public int getId() { return id.get(); }
    public String getCodigo() { return codigo.get(); }
    public String getDescripcion() { return descripcion.get(); }
    public double getPrecioUnitario() { return precioUnitario.get(); }
    public String getCategoria() { return categoria.get(); }
    
    // Setters
    public void setId(int id) { this.id.set(id); }
    public void setCodigo(String codigo) { this.codigo.set(codigo); }
    public void setDescripcion(String descripcion) { this.descripcion.set(descripcion); }
    public void setPrecioUnitario(double precio) { this.precioUnitario.set(precio); }
    public void setCategoria(String categoria) { this.categoria.set(categoria); }
}