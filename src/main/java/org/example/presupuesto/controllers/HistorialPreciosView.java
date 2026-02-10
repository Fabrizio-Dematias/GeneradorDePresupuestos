package org.example.presupuesto.controllers;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import org.example.presupuesto.dao.HistorialPreciosDAO;
import org.example.presupuesto.models.HistorialPrecio;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class HistorialPreciosView extends VBox {
    
    private TableView<HistorialPrecio> tablaHistorial;
    private TextField searchField;
    private Label totalRegistrosLabel;
    private ComboBox<String> cmbCategoria;
    private ObservableList<HistorialPrecio> todosLosRegistros;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public HistorialPreciosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox toolbar = createToolbar();
        VBox tableContainer = createTable();
        
        getChildren().addAll(header, toolbar, tableContainer);
        cargarHistorial();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #7c3aed; -fx-background-radius: 10;");
        
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
        
        Label title = new Label("📜 Historial de Cambios de Precios");
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
        searchField.setPromptText("🔍 Buscar por código o descripción...");
        searchField.setPrefWidth(300);
        searchField.setStyle("-fx-font-size: 14px; -fx-padding: 8;");
        searchField.textProperty().addListener((obs, old, newValue) -> filtrarHistorial(newValue));
        
        // Filtro por categoría
        Label lblCategoria = new Label("Categoría:");
        lblCategoria.setStyle("-fx-font-weight: bold;");
        
        cmbCategoria = new ComboBox<>();
        cmbCategoria.getItems().addAll("TODAS", "CARBONES", "INTERRUPTORES");
        cmbCategoria.setValue("TODAS");
        cmbCategoria.setPrefWidth(150);
        cmbCategoria.setOnAction(e -> filtrarPorCategoria());
        
        // Label de total
        totalRegistrosLabel = new Label("Total: 0 registros");
        totalRegistrosLabel.setStyle("-fx-font-size: 14px; -fx-font-weight: bold;");
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        // Botón refrescar
        Button btnRefrescar = new Button("🔄 Refrescar");
        btnRefrescar.setStyle("-fx-font-size: 13px; -fx-padding: 8 15;");
        btnRefrescar.setOnAction(e -> cargarHistorial());
        
        toolbar.getChildren().addAll(searchField, lblCategoria, cmbCategoria, totalRegistrosLabel, spacer, btnRefrescar);
        container.getChildren().add(toolbar);
        
        return container;
    }
    
    private VBox createTable() {
        VBox container = new VBox(10);
        
        tablaHistorial = new TableView<>();
        tablaHistorial.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        tablaHistorial.setPrefHeight(500);
        
        // Columna Fecha
        TableColumn<HistorialPrecio, String> colFecha = new TableColumn<>("Fecha");
        colFecha.setCellValueFactory(new PropertyValueFactory<>("fechaCambio"));
        colFecha.setPrefWidth(150);
        colFecha.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(String fecha, boolean empty) {
                super.updateItem(fecha, empty);
                if (empty || fecha == null) {
                    setText("");
                } else {
                    // Mostrar solo fecha y hora sin milisegundos
                    setText(fecha.substring(0, Math.min(fecha.length(), 19)));
                }
            }
        });
        
        // Columna Código
        TableColumn<HistorialPrecio, String> colCodigo = new TableColumn<>("Código");
        colCodigo.setCellValueFactory(new PropertyValueFactory<>("productoCodigo"));
        colCodigo.setPrefWidth(100);
        colCodigo.setStyle("-fx-alignment: CENTER;");
        
        // Columna Descripción
        TableColumn<HistorialPrecio, String> colDescripcion = new TableColumn<>("Descripción");
        colDescripcion.setCellValueFactory(new PropertyValueFactory<>("productoDescripcion"));
        colDescripcion.setPrefWidth(250);
        
        // Columna Precio Anterior
        TableColumn<HistorialPrecio, Double> colPrecioAnterior = new TableColumn<>("Precio Anterior");
        colPrecioAnterior.setCellValueFactory(new PropertyValueFactory<>("precioAnterior"));
        colPrecioAnterior.setPrefWidth(130);
        colPrecioAnterior.setStyle("-fx-alignment: CENTER-RIGHT;");
        colPrecioAnterior.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setText("");
                } else {
                    setText(currencyFormatter.format(value));
                    setStyle("-fx-text-fill: #6b7280;");
                }
            }
        });
        
        // Columna Precio Nuevo
        TableColumn<HistorialPrecio, Double> colPrecioNuevo = new TableColumn<>("Precio Nuevo");
        colPrecioNuevo.setCellValueFactory(new PropertyValueFactory<>("precioNuevo"));
        colPrecioNuevo.setPrefWidth(130);
        colPrecioNuevo.setStyle("-fx-alignment: CENTER-RIGHT;");
        colPrecioNuevo.setCellFactory(column -> new TableCell<>() {
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
        
        // Columna Cambio %
        TableColumn<HistorialPrecio, Double> colCambio = new TableColumn<>("Cambio %");
        colCambio.setCellValueFactory(new PropertyValueFactory<>("porcentajeCambio"));
        colCambio.setPrefWidth(100);
        colCambio.setStyle("-fx-alignment: CENTER;");
        colCambio.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setText("");
                } else {
                    setText(String.format("%+.2f%%", value));
                    if (value > 0) {
                        setStyle("-fx-font-weight: bold; -fx-text-fill: #10b981;");
                    } else if (value < 0) {
                        setStyle("-fx-font-weight: bold; -fx-text-fill: #ef4444;");
                    }
                }
            }
        });
        
        // Columna Categoría
        TableColumn<HistorialPrecio, String> colCategoria = new TableColumn<>("Categoría");
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colCategoria.setPrefWidth(120);
        colCategoria.setStyle("-fx-alignment: CENTER;");
        
        tablaHistorial.getColumns().addAll(colFecha, colCodigo, colDescripcion, colPrecioAnterior, colPrecioNuevo, colCambio, colCategoria);
        container.getChildren().add(tablaHistorial);
        
        return container;
    }
    
    private void cargarHistorial() {
        try {
            List<HistorialPrecio> historial = HistorialPreciosDAO.obtenerTodoElHistorial();
            todosLosRegistros = FXCollections.observableArrayList(historial);
            tablaHistorial.setItems(todosLosRegistros);
            
            totalRegistrosLabel.setText("Total: " + historial.size() + " registros");
            System.out.println("✅ Historial cargado: " + historial.size() + " registros");
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar historial: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudo cargar el historial: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void filtrarHistorial(String filtro) {
        if (filtro == null || filtro.trim().isEmpty()) {
            filtrarPorCategoria(); // Aplicar filtro de categoría si existe
            return;
        }
        
        String filtroLower = filtro.toLowerCase();
        ObservableList<HistorialPrecio> filtrados = todosLosRegistros.filtered(registro ->
            registro.getProductoCodigo().toLowerCase().contains(filtroLower) ||
            registro.getProductoDescripcion().toLowerCase().contains(filtroLower)
        );
        
        tablaHistorial.setItems(filtrados);
        totalRegistrosLabel.setText("Mostrando: " + filtrados.size() + " de " + todosLosRegistros.size() + " registros");
    }
    
    private void filtrarPorCategoria() {
        String categoria = cmbCategoria.getValue();
        
        if (categoria.equals("TODAS")) {
            cargarHistorial();
        } else {
            try {
                List<HistorialPrecio> historial = HistorialPreciosDAO.obtenerHistorialPorCategoria(categoria);
                todosLosRegistros = FXCollections.observableArrayList(historial);
                tablaHistorial.setItems(todosLosRegistros);
                totalRegistrosLabel.setText("Total: " + historial.size() + " registros (" + categoria + ")");
            } catch (Exception e) {
                System.err.println("❌ Error al filtrar por categoría: " + e.getMessage());
            }
        }
    }
}