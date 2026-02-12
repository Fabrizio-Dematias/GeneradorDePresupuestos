package org.example.presupuesto.controllers;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.geometry.Side;
import javafx.scene.chart.*;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import org.example.presupuesto.dao.ReportesDAO;
import org.example.presupuesto.models.EstadisticaProducto;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class ProductosMasVendidosView extends VBox {
    
    private ComboBox<String> cmbPeriodo;
    private TableView<EstadisticaProducto> tabla;
    private BarChart<Number, String> grafico;
    private ObservableList<EstadisticaProducto> datosEstadisticas;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public ProductosMasVendidosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox toolbar = createToolbar();
        HBox contenido = createContenido();
        
        getChildren().addAll(header, toolbar, contenido);
        cargarDatos();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #059669; -fx-background-radius: 10;");
        
        // Botón Volver
        Button btnVolver = new Button("← Volver");
        btnVolver.setStyle(
            "-fx-background-color: #10b981; " +
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
        
        btnVolver.setOnMouseEntered(e -> btnVolver.setStyle(
            "-fx-background-color: #059669; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        btnVolver.setOnMouseExited(e -> btnVolver.setStyle(
            "-fx-background-color: #10b981; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        Label title = new Label("📊 Productos Más Vendidos");
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
        
        // Selector de período
        Label lblPeriodo = new Label("Período:");
        lblPeriodo.setStyle("-fx-font-weight: bold; -fx-font-size: 13px;");
        
        cmbPeriodo = new ComboBox<>();
        cmbPeriodo.getItems().addAll("Último mes", "Últimos 3 meses", "Últimos 6 meses", "Último año", "Todo el tiempo");
        cmbPeriodo.setValue("Todo el tiempo");
        cmbPeriodo.setPrefWidth(150);
        cmbPeriodo.setOnAction(e -> cargarDatos());
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        Button btnRefrescar = new Button("🔄 Actualizar");
        btnRefrescar.setStyle("-fx-font-size: 13px; -fx-padding: 8 15;");
        btnRefrescar.setOnAction(e -> cargarDatos());
        
        toolbar.getChildren().addAll(lblPeriodo, cmbPeriodo, spacer, btnRefrescar);
        container.getChildren().add(toolbar);
        
        return container;
    }
    
    private HBox createContenido() {
        HBox contenido = new HBox(20);
        contenido.setAlignment(Pos.TOP_CENTER);
        HBox.setHgrow(contenido, Priority.ALWAYS);
        
        // Panel izquierdo: Gráfico
        VBox panelGrafico = createGrafico();
        HBox.setHgrow(panelGrafico, Priority.ALWAYS);
        
        // Panel derecho: Tabla
        VBox panelTabla = createTabla();
        panelTabla.setPrefWidth(600);
        
        contenido.getChildren().addAll(panelGrafico, panelTabla);
        
        return contenido;
    }
    
    private VBox createGrafico() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("Top 10 Productos por Cantidad");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setTextFill(Color.web("#1f2937"));
        
        // Crear ejes
        NumberAxis xAxis = new NumberAxis();
        xAxis.setLabel("Cantidad Vendida");
        
        CategoryAxis yAxis = new CategoryAxis();
        yAxis.setLabel("Producto");
        yAxis.setSide(Side.LEFT);
        
        // Crear gráfico de barras horizontal
        grafico = new BarChart<>(xAxis, yAxis);
        grafico.setTitle("");
        grafico.setLegendVisible(false);
        grafico.setPrefHeight(500);
        grafico.setStyle("-fx-bar-fill: #10b981;");
        
        VBox.setVgrow(grafico, Priority.ALWAYS);
        
        container.getChildren().addAll(titulo, grafico);
        
        return container;
    }
    
    private VBox createTabla() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("Detalle de Ventas");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setTextFill(Color.web("#1f2937"));
        
        tabla = new TableView<>();
        tabla.setPrefHeight(500);
        tabla.setStyle("-fx-font-size: 12px;");
        
        // Columna Posición
        TableColumn<EstadisticaProducto, String> colPos = new TableColumn<>("#");
        colPos.setPrefWidth(40);
        colPos.setStyle("-fx-alignment: CENTER;");
        colPos.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty) {
                    setText("");
                } else {
                    setText(String.valueOf(getIndex() + 1));
                    setStyle("-fx-font-weight: bold; -fx-text-fill: #059669;");
                }
            }
        });
        
        // Columna Código
        TableColumn<EstadisticaProducto, String> colCodigo = new TableColumn<>("Código");
        colCodigo.setCellValueFactory(new PropertyValueFactory<>("codigo"));
        colCodigo.setPrefWidth(80);
        colCodigo.setStyle("-fx-alignment: CENTER;");
        
        // Columna Descripción
        TableColumn<EstadisticaProducto, String> colDescripcion = new TableColumn<>("Descripción");
        colDescripcion.setCellValueFactory(new PropertyValueFactory<>("descripcion"));
        colDescripcion.setPrefWidth(250);
        
        // Columna Categoría
        TableColumn<EstadisticaProducto, String> colCategoria = new TableColumn<>("Categoría");
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colCategoria.setPrefWidth(120);
        colCategoria.setStyle("-fx-alignment: CENTER;");
        
        // Columna Cantidad
        TableColumn<EstadisticaProducto, Integer> colCantidad = new TableColumn<>("Cantidad");
        colCantidad.setCellValueFactory(new PropertyValueFactory<>("cantidadVendida"));
        colCantidad.setPrefWidth(100);
        colCantidad.setStyle("-fx-alignment: CENTER;");
        colCantidad.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Integer value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setText("");
                } else {
                    setText(String.valueOf(value) + " unidades");
                    setStyle("-fx-font-weight: bold; -fx-text-fill: #10b981;");
                }
            }
        });
        
        tabla.getColumns().addAll(colPos, colCodigo, colDescripcion, colCategoria, colCantidad);
        
        VBox.setVgrow(tabla, Priority.ALWAYS);
        
        container.getChildren().addAll(titulo, tabla);
        
        return container;
    }
    
    private void cargarDatos() {
        try {
            String periodo = cmbPeriodo.getValue();
            
            // Siempre ordenar por cantidad vendida
            List<EstadisticaProducto> estadisticas = ReportesDAO.obtenerProductosMasVendidos(10, periodo);
            
            datosEstadisticas = FXCollections.observableArrayList(estadisticas);
            tabla.setItems(datosEstadisticas);
            
            // Actualizar gráfico
            actualizarGrafico(estadisticas);
            
            System.out.println("✅ Datos cargados: " + estadisticas.size() + " productos - " + periodo);
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar datos: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudieron cargar las estadísticas: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void actualizarGrafico(List<EstadisticaProducto> estadisticas) {
        grafico.getData().clear();
        
        XYChart.Series<Number, String> series = new XYChart.Series<>();
        series.setName("Cantidad Vendida");
        
        // Invertir el orden para que el #1 quede arriba
        for (int i = estadisticas.size() - 1; i >= 0; i--) {
            EstadisticaProducto est = estadisticas.get(i);
            
            String label = est.getCodigo() + " - " + 
                          (est.getDescripcion().length() > 25 ? 
                           est.getDescripcion().substring(0, 25) + "..." : 
                           est.getDescripcion());
            
            double valor = est.getCantidadVendida();
            
            XYChart.Data<Number, String> data = new XYChart.Data<>(valor, label);
            series.getData().add(data);
        }
        
        grafico.getData().add(series);
        
        // Aplicar colores al gráfico
        grafico.applyCss();
        grafico.layout();
        
        // Colorear las barras con degradado verde
        int index = 0;
        for (XYChart.Data<Number, String> data : series.getData()) {
            if (data.getNode() != null) {
                // Colores del verde más oscuro al más claro
                String[] colores = {
                    "#065f46", "#047857", "#059669", "#10b981", "#34d399",
                    "#6ee7b7", "#a7f3d0", "#d1fae5", "#ecfdf5", "#f0fdf4"
                };
                int colorIndex = Math.min(index, colores.length - 1);
                data.getNode().setStyle("-fx-bar-fill: " + colores[colorIndex] + ";");
            }
            index++;
        }
    }
}