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
import org.example.presupuesto.utils.NavigationManager;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public class HistorialPreciosView extends VBox {
    
    private TableView<HistorialPrecio> tablaHistorial;
    private TextField searchField;
    private ComboBox<String> cmbCategoria;
    private Label totalRegistrosLabel;
    private ObservableList<HistorialPrecio> todosLosRegistros;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    private final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    
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
        header.setStyle("-fx-background-color: #6d28d9; -fx-background-radius: 10;");
        
        // Botón Volver
        Button btnVolver = new Button("← Volver");
        btnVolver.setStyle(
            "-fx-background-color: #8b5cf6; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        );
        btnVolver.setOnAction(e -> {
            DashboardView dashboard = new DashboardView();
            NavigationManager.getInstance().navigateTo(dashboard);
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
            "-fx-background-color: #8b5cf6; " +
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
        searchField.textProperty().addListener((obs, old, newValue) -> filtrarHistorial());
        
        // Filtro por categoría
        Label lblCategoria = new Label("Categoría:");
        lblCategoria.setStyle("-fx-font-weight: bold; -fx-font-size: 13px;");
        
        cmbCategoria = new ComboBox<>();
        cmbCategoria.getItems().addAll("TODAS", "CARBONES", "INTERRUPTORES", "REPUESTOS VARIOS");
        cmbCategoria.setValue("TODAS");
        cmbCategoria.setPrefWidth(180);
        cmbCategoria.setStyle("-fx-font-size: 13px;");
        cmbCategoria.setOnAction(e -> filtrarHistorial());
        
        // Label de total
        totalRegistrosLabel = new Label("Total: 0 cambios");
        totalRegistrosLabel.setStyle("-fx-font-size: 14px; -fx-font-weight: bold; -fx-text-fill: #1f2937;");
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
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
        TableColumn<HistorialPrecio, LocalDateTime> colFecha = new TableColumn<>("Fecha/Hora");
        colFecha.setCellValueFactory(new PropertyValueFactory<>("fechaCambio"));
        colFecha.setPrefWidth(140);
        colFecha.setStyle("-fx-alignment: CENTER;");
        colFecha.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(LocalDateTime value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setText("");
                } else {
                    setText(value.format(dateTimeFormatter));
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
        colDescripcion.setPrefWidth(300);
        
        // Columna Categoría
        TableColumn<HistorialPrecio, String> colCategoria = new TableColumn<>("Categoría");
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colCategoria.setPrefWidth(130);
        colCategoria.setStyle("-fx-alignment: CENTER;");
        
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
                    setStyle("-fx-text-fill: #ef4444;");
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
        
        // Columna Cambio
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
                    String signo = value >= 0 ? "+" : "";
                    setText(signo + String.format("%.1f%%", value));
                    
                    if (value > 0) {
                        setStyle("-fx-font-weight: bold; -fx-text-fill: #10b981;");
                    } else if (value < 0) {
                        setStyle("-fx-font-weight: bold; -fx-text-fill: #ef4444;");
                    }
                }
            }
        });
        
        tablaHistorial.getColumns().addAll(
            colFecha, colCodigo, colDescripcion, colCategoria, 
            colPrecioAnterior, colPrecioNuevo, colCambio
        );
        
        container.getChildren().add(tablaHistorial);
        
        return container;
    }
    
    private void cargarHistorial() {
        try {
            List<HistorialPrecio> registros = HistorialPreciosDAO.obtenerTodoElHistorial();
            todosLosRegistros = FXCollections.observableArrayList(registros);
            tablaHistorial.setItems(todosLosRegistros);
            
            totalRegistrosLabel.setText("Total: " + registros.size() + " cambios");
            System.out.println("✅ Historial cargado: " + registros.size() + " registros");
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar historial: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudo cargar el historial: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void filtrarHistorial() {
        String textoBusqueda = searchField.getText();
        String categoriaSeleccionada = cmbCategoria.getValue();
        
        // Si no hay filtros, mostrar todo
        if ((textoBusqueda == null || textoBusqueda.trim().isEmpty()) && 
            (categoriaSeleccionada == null || categoriaSeleccionada.equals("TODAS"))) {
            tablaHistorial.setItems(todosLosRegistros);
            totalRegistrosLabel.setText("Total: " + todosLosRegistros.size() + " cambios");
            return;
        }
        
        // Aplicar filtros combinados
        ObservableList<HistorialPrecio> filtrados = todosLosRegistros;
        
        // Filtro por categoría
        if (categoriaSeleccionada != null && !categoriaSeleccionada.equals("TODAS")) {
            final String catFinal = categoriaSeleccionada;
            filtrados = filtrados.filtered(registro -> 
                registro.getCategoria() != null && registro.getCategoria().equals(catFinal)
            );
        }
        
        // Filtro por texto
        if (textoBusqueda != null && !textoBusqueda.trim().isEmpty()) {
            String filtroLower = textoBusqueda.toLowerCase();
            filtrados = filtrados.filtered(registro ->
                registro.getProductoCodigo().toLowerCase().contains(filtroLower) ||
                registro.getProductoDescripcion().toLowerCase().contains(filtroLower)
            );
        }
        
        tablaHistorial.setItems(filtrados);
        totalRegistrosLabel.setText("Mostrando: " + filtrados.size() + " de " + todosLosRegistros.size() + " cambios");
    }
}