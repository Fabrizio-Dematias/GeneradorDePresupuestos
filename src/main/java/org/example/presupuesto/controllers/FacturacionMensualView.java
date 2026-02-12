package org.example.presupuesto.controllers;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.chart.*;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import org.example.presupuesto.dao.ReportesDAO;
import org.example.presupuesto.models.FacturacionMensual;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class FacturacionMensualView extends VBox {
    
    private ComboBox<String> cmbAnio;
    private TableView<FacturacionMensual> tabla;
    private LineChart<String, Number> graficoLinea;
    private BarChart<String, Number> graficoBarra;
    private ObservableList<FacturacionMensual> datosFacturacion;
    
    private Label lblTotalPeriodo;
    private Label lblPromedioMensual;
    private Label lblMejorMes;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public FacturacionMensualView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox toolbar = createToolbar();
        HBox estadisticas = createEstadisticas();
        HBox graficos = createGraficos();
        VBox tablaContainer = createTabla();
        
        getChildren().addAll(header, toolbar, estadisticas, graficos, tablaContainer);
        cargarDatos();
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
            "-fx-background-color: #8b5cf6; " +
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
            "-fx-background-color: #6d28d9; " +
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
        
        Label title = new Label("💰 Facturación Mensual");
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
        
        // Selector de año
        Label lblAnio = new Label("Año:");
        lblAnio.setStyle("-fx-font-weight: bold; -fx-font-size: 13px;");
        
        cmbAnio = new ComboBox<>();
        cmbAnio.getItems().add("Todos");
        
        // Cargar años disponibles
        List<Integer> anios = ReportesDAO.obtenerAniosDisponibles();
        for (Integer anio : anios) {
            cmbAnio.getItems().add(String.valueOf(anio));
        }
        
        cmbAnio.setValue("Todos");
        cmbAnio.setPrefWidth(120);
        cmbAnio.setOnAction(e -> cargarDatos());
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        Button btnRefrescar = new Button("🔄 Actualizar");
        btnRefrescar.setStyle("-fx-font-size: 13px; -fx-padding: 8 15;");
        btnRefrescar.setOnAction(e -> cargarDatos());
        
        toolbar.getChildren().addAll(lblAnio, cmbAnio, spacer, btnRefrescar);
        container.getChildren().add(toolbar);
        
        return container;
    }
    
    private HBox createEstadisticas() {
        HBox stats = new HBox(20);
        stats.setAlignment(Pos.CENTER);
        
        VBox stat1 = createStatBox("💵", "Total Período", "$0", "#10b981");
        lblTotalPeriodo = (Label) ((VBox) stat1.getChildren().get(0)).getChildren().get(2);
        
        VBox stat2 = createStatBox("📊", "Promedio Mensual", "$0", "#3b82f6");
        lblPromedioMensual = (Label) ((VBox) stat2.getChildren().get(0)).getChildren().get(2);
        
        VBox stat3 = createStatBox("🏆", "Mejor Mes", "-", "#f59e0b");
        lblMejorMes = (Label) ((VBox) stat3.getChildren().get(0)).getChildren().get(2);
        
        stats.getChildren().addAll(stat1, stat2, stat3);
        return stats;
    }
    
    private VBox createStatBox(String icon, String label, String value, String color) {
        VBox box = new VBox(10);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(20));
        box.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.1), 10, 0, 0, 2);");
        box.setPrefWidth(280);
        
        VBox content = new VBox(10);
        content.setAlignment(Pos.CENTER);
        
        Label iconLabel = new Label(icon);
        iconLabel.setFont(Font.font(40));
        
        Label titleLabel = new Label(label);
        titleLabel.setFont(Font.font("System", FontWeight.NORMAL, 12));
        titleLabel.setTextFill(Color.web("#6b7280"));
        
        Label valueLabel = new Label(value);
        valueLabel.setFont(Font.font("System", FontWeight.BOLD, 22));
        valueLabel.setTextFill(Color.web(color));
        
        content.getChildren().addAll(iconLabel, titleLabel, valueLabel);
        box.getChildren().add(content);
        return box;
    }
    
    private HBox createGraficos() {
        HBox graficos = new HBox(20);
        graficos.setAlignment(Pos.TOP_CENTER);
        HBox.setHgrow(graficos, Priority.ALWAYS);
        
        // Gráfico de líneas
        VBox panelLinea = createGraficoLinea();
        HBox.setHgrow(panelLinea, Priority.ALWAYS);
        
        // Gráfico de barras
        VBox panelBarra = createGraficoBarra();
        HBox.setHgrow(panelBarra, Priority.ALWAYS);
        
        graficos.getChildren().addAll(panelLinea, panelBarra);
        
        return graficos;
    }
    
    private VBox createGraficoLinea() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("Evolución Mensual");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setTextFill(Color.web("#1f2937"));
        
        CategoryAxis xAxis = new CategoryAxis();
        xAxis.setLabel("Mes");
        
        NumberAxis yAxis = new NumberAxis();
        yAxis.setLabel("Facturación ($)");
        
        graficoLinea = new LineChart<>(xAxis, yAxis);
        graficoLinea.setTitle("");
        graficoLinea.setLegendVisible(false);
        graficoLinea.setPrefHeight(300);
        graficoLinea.setCreateSymbols(true);
        
        VBox.setVgrow(graficoLinea, Priority.ALWAYS);
        
        container.getChildren().addAll(titulo, graficoLinea);
        
        return container;
    }
    
    private VBox createGraficoBarra() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("Facturación por Mes");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setTextFill(Color.web("#1f2937"));
        
        CategoryAxis xAxis = new CategoryAxis();
        xAxis.setLabel("Mes");
        
        NumberAxis yAxis = new NumberAxis();
        yAxis.setLabel("Total ($)");
        
        graficoBarra = new BarChart<>(xAxis, yAxis);
        graficoBarra.setTitle("");
        graficoBarra.setLegendVisible(false);
        graficoBarra.setPrefHeight(300);
        
        VBox.setVgrow(graficoBarra, Priority.ALWAYS);
        
        container.getChildren().addAll(titulo, graficoBarra);
        
        return container;
    }
    
    private VBox createTabla() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("Detalle Mensual");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setTextFill(Color.web("#1f2937"));
        
        tabla = new TableView<>();
        tabla.setPrefHeight(250);
        tabla.setStyle("-fx-font-size: 12px;");
        
        // Columna Mes
        TableColumn<FacturacionMensual, String> colMes = new TableColumn<>("Mes");
        colMes.setCellValueFactory(new PropertyValueFactory<>("mesNombre"));
        colMes.setPrefWidth(180);
        
        // Columna Cantidad Remitos
        TableColumn<FacturacionMensual, Integer> colCantidad = new TableColumn<>("Remitos");
        colCantidad.setCellValueFactory(new PropertyValueFactory<>("cantidadRemitos"));
        colCantidad.setPrefWidth(100);
        colCantidad.setStyle("-fx-alignment: CENTER;");
        
        // Columna Total Facturado
        TableColumn<FacturacionMensual, Double> colTotal = new TableColumn<>("Total Facturado");
        colTotal.setCellValueFactory(new PropertyValueFactory<>("totalFacturado"));
        colTotal.setPrefWidth(180);
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
        
        // Columna Promedio por Remito
        TableColumn<FacturacionMensual, Double> colPromedio = new TableColumn<>("Promedio/Remito");
        colPromedio.setCellValueFactory(new PropertyValueFactory<>("promedioRemito"));
        colPromedio.setPrefWidth(180);
        colPromedio.setStyle("-fx-alignment: CENTER-RIGHT;");
        colPromedio.setCellFactory(column -> new TableCell<>() {
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
        
        tabla.getColumns().addAll(colMes, colCantidad, colTotal, colPromedio);
        
        VBox.setVgrow(tabla, Priority.ALWAYS);
        
        container.getChildren().addAll(titulo, tabla);
        
        return container;
    }
    
    private void cargarDatos() {
        try {
            String anioSeleccionado = cmbAnio.getValue();
            Integer anioFiltro = anioSeleccionado.equals("Todos") ? null : Integer.parseInt(anioSeleccionado);
            
            List<FacturacionMensual> facturacion = ReportesDAO.obtenerFacturacionMensual(anioFiltro);
            datosFacturacion = FXCollections.observableArrayList(facturacion);
            tabla.setItems(datosFacturacion);
            
            // Actualizar gráficos
            actualizarGraficos(facturacion);
            
            // Actualizar estadísticas
            actualizarEstadisticas(facturacion);
            
            System.out.println("✅ Facturación mensual cargada: " + facturacion.size() + " meses");
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar facturación mensual: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudo cargar la facturación mensual: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void actualizarGraficos(List<FacturacionMensual> facturacion) {
        // Limpiar gráficos
        graficoLinea.getData().clear();
        graficoBarra.getData().clear();
        
        XYChart.Series<String, Number> serieLinea = new XYChart.Series<>();
        serieLinea.setName("Facturación");
        
        XYChart.Series<String, Number> serieBarra = new XYChart.Series<>();
        serieBarra.setName("Total");
        
        for (FacturacionMensual fact : facturacion) {
            String label = fact.getMesNombre();
            double valor = fact.getTotalFacturado();
            
            serieLinea.getData().add(new XYChart.Data<>(label, valor));
            serieBarra.getData().add(new XYChart.Data<>(label, valor));
        }
        
        graficoLinea.getData().add(serieLinea);
        graficoBarra.getData().add(serieBarra);
        
        // Aplicar estilos
        graficoLinea.applyCss();
        graficoLinea.layout();
        graficoBarra.applyCss();
        graficoBarra.layout();
        
        // Colorear barras
        int index = 0;
        for (XYChart.Data<String, Number> data : serieBarra.getData()) {
            if (data.getNode() != null) {
                data.getNode().setStyle("-fx-bar-fill: #10b981;");
            }
            index++;
        }
    }
    
    private void actualizarEstadisticas(List<FacturacionMensual> facturacion) {
        if (facturacion.isEmpty()) {
            lblTotalPeriodo.setText("$0");
            lblPromedioMensual.setText("$0");
            lblMejorMes.setText("-");
            return;
        }
        
        // Calcular total del período
        double totalPeriodo = facturacion.stream()
            .mapToDouble(FacturacionMensual::getTotalFacturado)
            .sum();
        
        lblTotalPeriodo.setText(currencyFormatter.format(totalPeriodo));
        
        // Calcular promedio mensual
        double promedioMensual = totalPeriodo / facturacion.size();
        lblPromedioMensual.setText(currencyFormatter.format(promedioMensual));
        
        // Encontrar mejor mes
        FacturacionMensual mejorMes = facturacion.stream()
            .max((f1, f2) -> Double.compare(f1.getTotalFacturado(), f2.getTotalFacturado()))
            .orElse(null);
        
        if (mejorMes != null) {
            lblMejorMes.setText(mejorMes.getMesNombre());
            lblMejorMes.setStyle("-fx-font-size: 18px; -fx-font-weight: bold; -fx-text-fill: #f59e0b;");
        }
    }
}