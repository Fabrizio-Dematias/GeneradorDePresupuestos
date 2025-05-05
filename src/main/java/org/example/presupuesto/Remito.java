package org.example.presupuesto;

import javafx.beans.property.*;

public class Remito {
    private final StringProperty codigo;
    private final IntegerProperty cantidad;
    private final StringProperty descripcion;
    private final DoubleProperty precioUnitario;
    private final DoubleProperty bonificacion;
    private final DoubleProperty precioTotal;

    public Remito(String codigo, int cantidad, String descripcion, double precioUnitario, double bonificacion) {
        this.codigo = new SimpleStringProperty(codigo);
        this.cantidad = new SimpleIntegerProperty(cantidad);
        this.descripcion = new SimpleStringProperty(descripcion);
        this.precioUnitario = new SimpleDoubleProperty(precioUnitario);
        this.bonificacion = new SimpleDoubleProperty(bonificacion);
        this.precioTotal = new SimpleDoubleProperty(
                cantidad * precioUnitario * (1 - bonificacion / 100)
        );
    }

    public StringProperty codigoProperty() { return codigo; }
    public IntegerProperty cantidadProperty() { return cantidad; }
    public StringProperty descripcionProperty() { return descripcion; }
    public DoubleProperty precioUnitarioProperty() { return precioUnitario; }
    public DoubleProperty bonificacionProperty() { return bonificacion; }
    public DoubleProperty precioTotalProperty() { return precioTotal; }
}