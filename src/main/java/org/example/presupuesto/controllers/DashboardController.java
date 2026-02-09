package org.example.presupuesto.controllers;

import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.control.Alert;
import javafx.stage.Stage;
import org.example.presupuesto.dao.DatabaseManager;
import org.example.presupuesto.dao.RemitoDAO;

import java.text.NumberFormat;
import java.util.Locale;

public class DashboardController {
    
    @FXML private Label totalRemitosLabel;
    @FXML private Label totalFacturadoLabel;
    @FXML private Label ultimoRemitoLabel;
    @FXML private Label badgeRemitos;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    @FXML
    public void initialize() {
        cargarEstadisticas();
    }
    
    /**
     * Carga las estadísticas desde la base de datos
     */
    private void cargarEstadisticas() {
        try {
            // Total de remitos
            int totalRemitos = RemitoDAO.contarRemitos();
            totalRemitosLabel.setText(String.valueOf(totalRemitos));
            badgeRemitos.setText(totalRemitos + " remitos");
            
            // Total facturado
            double totalFacturado = RemitoDAO.obtenerTotalFacturado();
            totalFacturadoLabel.setText(currencyFormatter.format(totalFacturado));
            
            // Último número de remito
            String siguienteNumero = DatabaseManager.getNextRemitoNumber();
            // Restar 1 para mostrar el último creado
            String[] parts = siguienteNumero.split("-");
            int ultimoNum = Integer.parseInt(parts[1]) - 1;
            if (ultimoNum > 0) {
                ultimoRemitoLabel.setText(String.format("0001-%03d", ultimoNum));
            } else {
                ultimoRemitoLabel.setText("Sin remitos");
            }
            
            System.out.println("📊 Estadísticas cargadas: " + totalRemitos + " remitos, " + currencyFormatter.format(totalFacturado));
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar estadísticas: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Abre la ventana para crear un nuevo remito
     */
    @FXML
    private void abrirNuevoRemito() {
        try {
            System.out.println("📝 Abriendo formulario de nuevo remito...");
            
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/org/example/presupuesto/views/remito-form.fxml"));
            Scene scene = new Scene(loader.load(), 900, 700);
            
            Stage stage = new Stage();
            stage.setTitle("Nuevo Remito - DICOR");
            stage.setScene(scene);
            stage.centerOnScreen();
            
            // Cuando se cierre la ventana, actualizar estadísticas
            stage.setOnHidden(event -> cargarEstadisticas());
            
            stage.show();
            
        } catch (Exception e) {
            System.err.println("❌ Error al abrir nuevo remito: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setHeaderText("No se pudo abrir el formulario de remito");
            alert.setContentText(e.getMessage());
            alert.showAndWait();
        }
    }
    
    /**
     * Abre la ventana con la lista de remitos
     */
    @FXML
    private void verListaRemitos() {
        System.out.println("📋 Lista de remitos - Próximamente en Fase 1");
        
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Próximamente");
        alert.setHeaderText("Lista de Remitos");
        alert.setContentText("Esta funcionalidad estará disponible en breve.\n\nPor ahora podés crear nuevos remitos y se van guardando en la base de datos.");
        alert.showAndWait();
    }
}