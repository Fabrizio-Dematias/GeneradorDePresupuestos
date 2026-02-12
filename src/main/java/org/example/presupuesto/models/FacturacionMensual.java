package org.example.presupuesto.models;

import javafx.beans.property.*;

/**
 * Modelo para facturación mensual
 */
public class FacturacionMensual {
    private final IntegerProperty anio;
    private final IntegerProperty mes;
    private final StringProperty mesNombre;
    private final IntegerProperty cantidadRemitos;
    private final DoubleProperty totalFacturado;
    private final DoubleProperty promedioRemito;
    
    public FacturacionMensual(int anio, int mes, String mesNombre, 
                             int cantidadRemitos, double totalFacturado) {
        this.anio = new SimpleIntegerProperty(anio);
        this.mes = new SimpleIntegerProperty(mes);
        this.mesNombre = new SimpleStringProperty(mesNombre);
        this.cantidadRemitos = new SimpleIntegerProperty(cantidadRemitos);
        this.totalFacturado = new SimpleDoubleProperty(totalFacturado);
        this.promedioRemito = new SimpleDoubleProperty(
            cantidadRemitos > 0 ? totalFacturado / cantidadRemitos : 0
        );
    }
    
    // Properties
    public IntegerProperty anioProperty() { return anio; }
    public IntegerProperty mesProperty() { return mes; }
    public StringProperty mesNombreProperty() { return mesNombre; }
    public IntegerProperty cantidadRemitosProperty() { return cantidadRemitos; }
    public DoubleProperty totalFacturadoProperty() { return totalFacturado; }
    public DoubleProperty promedioRemitoProperty() { return promedioRemito; }
    
    // Getters
    public int getAnio() { return anio.get(); }
    public int getMes() { return mes.get(); }
    public String getMesNombre() { return mesNombre.get(); }
    public int getCantidadRemitos() { return cantidadRemitos.get(); }
    public double getTotalFacturado() { return totalFacturado.get(); }
    public double getPromedioRemito() { return promedioRemito.get(); }
    
    // Setters
    public void setAnio(int anio) { this.anio.set(anio); }
    public void setMes(int mes) { this.mes.set(mes); }
    public void setMesNombre(String mesNombre) { this.mesNombre.set(mesNombre); }
    public void setCantidadRemitos(int cantidad) { this.cantidadRemitos.set(cantidad); }
    public void setTotalFacturado(double total) { this.totalFacturado.set(total); }
}