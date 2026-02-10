package org.example.presupuesto.controllers;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import org.example.presupuesto.dao.RemitoDAO;

import java.awt.Desktop;
import java.io.File;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class ListaRemitosView extends VBox {
    
    private TableView<RemitoDAO.RemitoResumen> tablaRemitos;
    private TextField searchField;
    private Label totalRemitosLabel;
    private ObservableList<RemitoDAO.RemitoResumen> todosLosRemitos;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public ListaRemitosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox toolbar = createToolbar();
        VBox tableContainer = createTable();
        
        getChildren().addAll(header, toolbar, tableContainer);
        cargarRemitos();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #8b5cf6; -fx-background-radius: 10;");
        
        // Botón Volver
        Button btnVolver = new Button("← Volver");
        btnVolver.setStyle(
            "-fx-background-color: #6d28d9; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        );
        btnVolver.setOnAction(e -> {
            Stage stage = (Stage) this.getScene().getWindow();
            stage.close();
        });
        
        // Hover effect
        btnVolver.setOnMouseEntered(e -> btnVolver.setStyle(
            "-fx-background-color: #5b21b6; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        btnVolver.setOnMouseExited(e -> btnVolver.setStyle(
            "-fx-background-color: #6d28d9; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        Label title = new Label("📋 Lista de Remitos");
        title.setFont(Font.font("System", FontWeight.BOLD, 24));
        title.setTextFill(Color.WHITE);
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        header.getChildren().addAll(btnVolver, title, spacer);
        return header;
    }
    
    private VBox createToolbar() {
        VBox container = new VBox(10);
        
        HBox toolbar = new HBox(15);
        toolbar.setAlignment(Pos.CENTER_LEFT);
        
        // Campo de búsqueda
        searchField = new TextField();
        searchField.setPromptText("🔍 Buscar por número o cliente...");
        searchField.setPrefWidth(350);
        searchField.setStyle("-fx-font-size: 14px; -fx-padding: 8;");
        searchField.textProperty().addListener((obs, old, newValue) -> filtrarRemitos(newValue));
        
        // Label de total
        totalRemitosLabel = new Label("Total: 0 remitos");
        totalRemitosLabel.setStyle("-fx-font-size: 14px; -fx-font-weight: bold;");
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        // Botón refrescar
        Button btnRefrescar = new Button("🔄 Refrescar");
        btnRefrescar.setStyle("-fx-font-size: 13px; -fx-padding: 8 15;");
        btnRefrescar.setOnAction(e -> cargarRemitos());
        
        toolbar.getChildren().addAll(searchField, totalRemitosLabel, spacer, btnRefrescar);
        container.getChildren().add(toolbar);
        
        return container;
    }
    
    private VBox createTable() {
        VBox container = new VBox(10);
        
        tablaRemitos = new TableView<>();
        tablaRemitos.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        tablaRemitos.setPrefHeight(450);
        
        // Columna Número
        TableColumn<RemitoDAO.RemitoResumen, String> colNumero = new TableColumn<>("Número");
        colNumero.setCellValueFactory(data -> new javafx.beans.property.SimpleStringProperty(data.getValue().getNumero()));
        colNumero.setPrefWidth(120);
        colNumero.setStyle("-fx-alignment: CENTER;");
        
        // Columna Fecha
        TableColumn<RemitoDAO.RemitoResumen, String> colFecha = new TableColumn<>("Fecha");
        colFecha.setCellValueFactory(data -> new javafx.beans.property.SimpleStringProperty(data.getValue().getFecha()));
        colFecha.setPrefWidth(100);
        colFecha.setStyle("-fx-alignment: CENTER;");
        
        // Columna Cliente
        TableColumn<RemitoDAO.RemitoResumen, String> colCliente = new TableColumn<>("Cliente");
        colCliente.setCellValueFactory(data -> new javafx.beans.property.SimpleStringProperty(data.getValue().getClienteNombre()));
        colCliente.setPrefWidth(300);
        
        // Columna Total
        TableColumn<RemitoDAO.RemitoResumen, Double> colTotal = new TableColumn<>("Total");
        colTotal.setCellValueFactory(data -> new javafx.beans.property.SimpleObjectProperty<>(data.getValue().getTotal()));
        colTotal.setPrefWidth(150);
        colTotal.setStyle("-fx-alignment: CENTER-RIGHT;");
        colTotal.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setText("");
                } else {
                    setText(currencyFormatter.format(value));
                    setStyle("-fx-font-weight: bold; -fx-text-fill: #10b981;");
                }
            }
        });
        
        // Columna Estado
        TableColumn<RemitoDAO.RemitoResumen, String> colEstado = new TableColumn<>("Estado");
        colEstado.setCellValueFactory(data -> new javafx.beans.property.SimpleStringProperty(data.getValue().getEstado()));
        colEstado.setPrefWidth(120);
        colEstado.setStyle("-fx-alignment: CENTER;");
        
        // Columna Acciones
        TableColumn<RemitoDAO.RemitoResumen, Void> colAcciones = new TableColumn<>("Acciones");
        colAcciones.setPrefWidth(220);
        colAcciones.setCellFactory(column -> new TableCell<>() {
            private final Button btnAbrir = new Button("📄 Ver PDF");
            private final Button btnEliminar = new Button("🗑️");
            
            {
                btnAbrir.setStyle("-fx-background-color: #3b82f6; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10;");
                btnEliminar.setStyle("-fx-background-color: #ef4444; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10;");
                
                btnAbrir.setOnAction(e -> {
                    RemitoDAO.RemitoResumen remito = getTableView().getItems().get(getIndex());
                    abrirPDF(remito);
                });
                
                btnEliminar.setOnAction(e -> {
                    RemitoDAO.RemitoResumen remito = getTableView().getItems().get(getIndex());
                    eliminarRemito(remito);
                });
            }
            
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty) {
                    setGraphic(null);
                } else {
                    HBox buttons = new HBox(8);
                    buttons.setAlignment(Pos.CENTER);
                    buttons.getChildren().addAll(btnAbrir, btnEliminar);
                    setGraphic(buttons);
                }
            }
        });
        
        tablaRemitos.getColumns().addAll(colNumero, colFecha, colCliente, colTotal, colEstado, colAcciones);
        container.getChildren().add(tablaRemitos);
        
        return container;
    }
    
    private void cargarRemitos() {
        try {
            List<RemitoDAO.RemitoResumen> remitos = RemitoDAO.obtenerTodosLosRemitos();
            todosLosRemitos = FXCollections.observableArrayList(remitos);
            tablaRemitos.setItems(todosLosRemitos);
            
            totalRemitosLabel.setText("Total: " + remitos.size() + " remitos");
            System.out.println("✅ Remitos cargados: " + remitos.size());
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar remitos: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudieron cargar los remitos: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void filtrarRemitos(String filtro) {
        if (filtro == null || filtro.trim().isEmpty()) {
            tablaRemitos.setItems(todosLosRemitos);
            totalRemitosLabel.setText("Total: " + todosLosRemitos.size() + " remitos");
            return;
        }
        
        String filtroLower = filtro.toLowerCase();
        ObservableList<RemitoDAO.RemitoResumen> filtrados = todosLosRemitos.filtered(remito ->
            remito.getNumero().toLowerCase().contains(filtroLower) ||
            remito.getClienteNombre().toLowerCase().contains(filtroLower) ||
            (remito.getClienteCUIT() != null && remito.getClienteCUIT().toLowerCase().contains(filtroLower))
        );
        
        tablaRemitos.setItems(filtrados);
        totalRemitosLabel.setText("Mostrando: " + filtrados.size() + " de " + todosLosRemitos.size() + " remitos");
    }
    
    private void abrirPDF(RemitoDAO.RemitoResumen remito) {
        try {
            String rutaPDF = remito.getRutaPDF();
            
            if (rutaPDF == null || rutaPDF.isEmpty()) {
                Alert alert = new Alert(Alert.AlertType.WARNING);
                alert.setTitle("PDF no encontrado");
                alert.setContentText("Este remito no tiene un PDF asociado.");
                alert.showAndWait();
                return;
            }
            
            File pdfFile = new File(rutaPDF);
            
            if (!pdfFile.exists()) {
                Alert alert = new Alert(Alert.AlertType.WARNING);
                alert.setTitle("Archivo no encontrado");
                alert.setContentText("El archivo PDF no existe en:\n" + rutaPDF);
                alert.showAndWait();
                return;
            }
            
            // Abrir el PDF con la aplicación predeterminada
            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().open(pdfFile);
                System.out.println("✅ PDF abierto: " + rutaPDF);
            } else {
                Alert alert = new Alert(Alert.AlertType.ERROR);
                alert.setTitle("Error");
                alert.setContentText("No se puede abrir el PDF automáticamente en este sistema.");
                alert.showAndWait();
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error al abrir PDF: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error al abrir PDF");
            alert.setContentText("No se pudo abrir el archivo PDF:\n" + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void eliminarRemito(RemitoDAO.RemitoResumen remito) {
        Alert confirmacion = new Alert(Alert.AlertType.CONFIRMATION);
        confirmacion.setTitle("Confirmar eliminación");
        confirmacion.setHeaderText("¿Eliminar remito " + remito.getNumero() + "?");
        confirmacion.setContentText(
            "Cliente: " + remito.getClienteNombre() + "\n" +
            "Total: " + currencyFormatter.format(remito.getTotal()) + "\n\n" +
            "Esta acción no se puede deshacer."
        );
        
        confirmacion.showAndWait().ifPresent(response -> {
            if (response == ButtonType.OK) {
                boolean eliminado = RemitoDAO.eliminarRemito(remito.getId());
                
                if (eliminado) {
                    Alert success = new Alert(Alert.AlertType.INFORMATION);
                    success.setTitle("Remito eliminado");
                    success.setContentText("El remito se eliminó correctamente.");
                    success.showAndWait();
                    cargarRemitos();
                } else {
                    Alert error = new Alert(Alert.AlertType.ERROR);
                    error.setTitle("Error");
                    error.setContentText("No se pudo eliminar el remito.");
                    error.showAndWait();
                }
            }
        });
    }
}