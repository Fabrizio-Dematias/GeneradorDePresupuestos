package org.example.presupuesto.controllers;

import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import org.example.presupuesto.dao.RemitoDAO;
import org.example.presupuesto.dao.ProductoDAO;

import java.text.NumberFormat;
import java.util.Locale;

public class DashboardController {

    @FXML
    private VBox dashboardContainer;

    @FXML
    private Label lblTotalRemitos;

    @FXML
    private Label lblFacturacionTotal;

    @FXML
    private Label lblTotalProductos;

    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);

    @FXML
    public void initialize() {
        cargarEstadisticas();
    }

    private void cargarEstadisticas() {
        try {
            // Cargar total de remitos
            int totalRemitos = RemitoDAO.contarRemitos();
            if (lblTotalRemitos != null) {
                lblTotalRemitos.setText(String.valueOf(totalRemitos));
            }

            // Cargar facturación total
            double facturacionTotal = RemitoDAO.obtenerFacturacionTotal();
            if (lblFacturacionTotal != null) {
                lblFacturacionTotal.setText(currencyFormatter.format(facturacionTotal));
            }

            // Cargar total de productos
            int totalProductos = ProductoDAO.contarProductos();
            if (lblTotalProductos != null) {
                lblTotalProductos.setText(String.valueOf(totalProductos));
            }

            System.out.println("✅ Estadísticas cargadas en DashboardController");

        } catch (Exception e) {
            System.err.println("❌ Error al cargar estadísticas: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void refrescarEstadisticas() {
        cargarEstadisticas();
    }
}