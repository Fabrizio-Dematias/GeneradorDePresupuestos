package org.example.presupuesto.controllers;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import org.example.presupuesto.dao.RemitoDAO;
import org.example.presupuesto.dao.ProductoDAO;

import java.text.NumberFormat;
import java.util.Locale;

public class DashboardView extends VBox {

    private Label badgeRemitos;
    private Label badgeClientes;
    private Label badgeProductos;
    private Label badgeHistorial;
    private Label valueRemitos;
    private Label valueFacturacion;
    private Label valueProductos;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);

    public DashboardView() {
        setSpacing(30);
        setPadding(new Insets(40));
        setStyle("-fx-background-color: #f3f4f6;");

        HBox header = createHeader();
        HBox stats = createStats();
        GridPane modules = createModules();
        
        // Agregar ScrollPane para que se vean todos los módulos
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setContent(modules);
        scrollPane.setFitToWidth(true);
        scrollPane.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        scrollPane.setPadding(new Insets(10, 0, 0, 0));
        VBox.setVgrow(scrollPane, Priority.ALWAYS);

        getChildren().addAll(header, stats, scrollPane);
        cargarEstadisticas();
    }

    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: linear-gradient(to right, #1e3c72, #2a5298); -fx-background-radius: 10;");

        Label title = new Label("📊 Panel de Control - DICOR");
        title.setFont(Font.font("System", FontWeight.BOLD, 28));
        title.setTextFill(Color.WHITE);

        Label subtitle = new Label("Gestión de Remitos y Productos");
        subtitle.setFont(Font.font("System", 14));
        subtitle.setTextFill(Color.web("#e0e7ff"));

        VBox titleBox = new VBox(5);
        titleBox.getChildren().addAll(title, subtitle);

        header.getChildren().add(titleBox);
        return header;
    }

    private HBox createStats() {
        HBox stats = new HBox(20);
        stats.setAlignment(Pos.CENTER);

        VBox stat1 = createStatBox("📄", "Total Remitos", "0", "#3b82f6");
        valueRemitos = (Label) ((VBox) stat1.getChildren().get(0)).getChildren().get(2);
        
        VBox stat2 = createStatBox("💰", "Facturación Total", "$0", "#10b981");
        valueFacturacion = (Label) ((VBox) stat2.getChildren().get(0)).getChildren().get(2);
        
        VBox stat3 = createStatBox("📦", "Productos", "0", "#f59e0b");
        valueProductos = (Label) ((VBox) stat3.getChildren().get(0)).getChildren().get(2);

        stats.getChildren().addAll(stat1, stat2, stat3);
        return stats;
    }

    private VBox createStatBox(String icon, String label, String value, String color) {
        VBox box = new VBox(10);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(20));
        box.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.1), 10, 0, 0, 2);");
        box.setPrefWidth(250);

        VBox content = new VBox(10);
        content.setAlignment(Pos.CENTER);

        Label iconLabel = new Label(icon);
        iconLabel.setFont(Font.font(40));

        Label titleLabel = new Label(label);
        titleLabel.setFont(Font.font("System", FontWeight.NORMAL, 12));
        titleLabel.setTextFill(Color.web("#6b7280"));

        Label valueLabel = new Label(value);
        valueLabel.setFont(Font.font("System", FontWeight.BOLD, 24));
        valueLabel.setTextFill(Color.web(color));

        content.getChildren().addAll(iconLabel, titleLabel, valueLabel);
        box.getChildren().add(content);
        return box;
    }

    private GridPane createModules() {
        GridPane modules = new GridPane();
        modules.setHgap(20);
        modules.setVgap(20);
        modules.setAlignment(Pos.CENTER);
        modules.setPadding(new Insets(20, 0, 20, 0));

        // Módulo 1: Nuevo Remito
        VBox module1 = createModuleBox(
            "📝",
            "Nuevo Remito",
            "Crear remito",
            "#3b82f6"
        );
        module1.setOnMouseClicked(e -> abrirNuevoRemito());
        module1.setCursor(javafx.scene.Cursor.HAND);

        // Módulo 2: Lista de Remitos
        VBox module2 = createModuleBox(
            "📋",
            "Lista de Remitos",
            "Ver todos los remitos",
            "#8b5cf6"
        );

        badgeRemitos = new Label("0 remitos");
        badgeRemitos.setStyle("-fx-background-color: #a78bfa; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 15; -fx-font-size: 11px;");
        ((VBox) module2.getChildren().get(0)).getChildren().add(badgeRemitos);

        module2.setOnMouseClicked(e -> verListaRemitos());
        module2.setCursor(javafx.scene.Cursor.HAND);

        // Módulo 3: Productos
        VBox module3 = createModuleBox(
            "📦",
            "Productos",
            "Gestión de productos",
            "#10b981"
        );

        badgeProductos = new Label("0 productos");
        badgeProductos.setStyle("-fx-background-color: #34d399; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 15; -fx-font-size: 11px;");
        ((VBox) module3.getChildren().get(0)).getChildren().add(badgeProductos);

        module3.setOnMouseClicked(e -> verProductos());
        module3.setCursor(javafx.scene.Cursor.HAND);

        // Módulo 4: Historial de Precios
        VBox module4 = createModuleBox(
            "📜",
            "Historial de Precios",
            "Auditoría de cambios",
            "#7c3aed"
        );

        badgeHistorial = new Label("0 cambios");
        badgeHistorial.setStyle("-fx-background-color: #a78bfa; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 15; -fx-font-size: 11px;");
        ((VBox) module4.getChildren().get(0)).getChildren().add(badgeHistorial);

        module4.setOnMouseClicked(e -> verHistorialPrecios());
        module4.setCursor(javafx.scene.Cursor.HAND);

        modules.add(module1, 0, 0);
        modules.add(module2, 1, 0);
        modules.add(module3, 0, 1);
        modules.add(module4, 1, 1);

        return modules;
    }

    private VBox createModuleBox(String icon, String title, String description, String color) {
        VBox box = new VBox(15);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(30));
        box.setPrefSize(300, 200);
        
        final String baseStyle = 
            "-fx-background-color: white; " +
            "-fx-background-radius: 15; " +
            "-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.15), 15, 0, 0, 5); " +
            "-fx-border-color: " + color + "; " +
            "-fx-border-width: 0 0 4 0; " +
            "-fx-border-radius: 15;";

        final String hoverStyle = 
            "-fx-background-color: " + color + "15; " +
            "-fx-background-radius: 15; " +
            "-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.25), 20, 0, 0, 8); " +
            "-fx-border-color: " + color + "; " +
            "-fx-border-width: 0 0 4 0; " +
            "-fx-border-radius: 15; " +
            "-fx-scale-x: 1.02; " +
            "-fx-scale-y: 1.02;";
        
        box.setStyle(baseStyle);

        // Crear labels ANTES de agregar eventos
        Label iconLabel = new Label(icon);
        iconLabel.setFont(Font.font(50));
        iconLabel.setVisible(true);
        iconLabel.setManaged(true);

        Label titleLabel = new Label(title);
        titleLabel.setFont(Font.font("System", FontWeight.BOLD, 18));
        titleLabel.setTextFill(Color.BLACK);
        titleLabel.setVisible(true);
        titleLabel.setManaged(true);
        titleLabel.setStyle("-fx-text-fill: black;"); // Forzar color en CSS también

        Label descLabel = new Label(description);
        descLabel.setFont(Font.font("System", 12));
        descLabel.setTextFill(Color.web("#374151"));
        descLabel.setVisible(true);
        descLabel.setManaged(true);
        descLabel.setStyle("-fx-text-fill: #374151;"); // Forzar color en CSS también

        VBox content = new VBox(10);
        content.setAlignment(Pos.CENTER);
        content.setVisible(true);
        content.setManaged(true);
        content.getChildren().addAll(iconLabel, titleLabel, descLabel);

        box.getChildren().add(content);

        // Eventos de hover DESPUÉS de crear todo
        box.setOnMouseEntered(e -> {
            box.setStyle(hoverStyle);
        });

        box.setOnMouseExited(e -> {
            box.setStyle(baseStyle);
        });

        return box;
    }

    private void cargarEstadisticas() {
        try {
            // Cargar estadísticas de remitos
            int totalRemitos = RemitoDAO.contarRemitos();
            badgeRemitos.setText(totalRemitos + " remitos");
            valueRemitos.setText(String.valueOf(totalRemitos));

            // Cargar facturación total
            double facturacionTotal = RemitoDAO.obtenerFacturacionTotal();
            valueFacturacion.setText(currencyFormatter.format(facturacionTotal));

            // Cargar total de productos
            int totalProductos = ProductoDAO.contarProductos();
            badgeProductos.setText(totalProductos + " productos");
            valueProductos.setText(String.valueOf(totalProductos));

            // Cargar total de cambios de precios
            int totalCambios = org.example.presupuesto.dao.HistorialPreciosDAO.contarRegistros();
            badgeHistorial.setText(totalCambios + " cambios");

            System.out.println("✅ Estadísticas cargadas: " + totalRemitos + " remitos, " + 
                             currencyFormatter.format(facturacionTotal) + " facturado, " + 
                             totalProductos + " productos, " + totalCambios + " cambios");

        } catch (Exception e) {
            System.err.println("❌ Error al cargar estadísticas: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void abrirNuevoRemito() {
        try {
            javafx.fxml.FXMLLoader loader = new javafx.fxml.FXMLLoader(
                getClass().getResource("/org/example/presupuesto/views/remito-form.fxml")
            );
            javafx.scene.Parent root = loader.load();

            Scene scene = new Scene(root, 1000, 700);
            Stage stage = new Stage();
            stage.setTitle("Nuevo Remito - DICOR");
            stage.setScene(scene);
            stage.setOnHidden(event -> cargarEstadisticas());
            stage.show();

        } catch (Exception e) {
            System.err.println("❌ Error al abrir formulario de remito: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void verListaRemitos() {
        ListaRemitosView listaView = new ListaRemitosView();
        Scene scene = new Scene(listaView, 1200, 700);
        Stage stage = new Stage();
        stage.setTitle("Lista de Remitos - DICOR");
        stage.setScene(scene);
        stage.setOnHidden(event -> cargarEstadisticas());
        stage.show();
    }

    private void verProductos() {
        ProductosView productosView = new ProductosView();
        Scene scene = new Scene(productosView, 1200, 700);
        Stage stage = new Stage();
        stage.setTitle("Catálogo de Productos - DICOR");
        stage.setScene(scene);
        stage.setOnHidden(event -> cargarEstadisticas());
        stage.show();
    }

    private void verHistorialPrecios() {
        HistorialPreciosView historialView = new HistorialPreciosView();
        Scene scene = new Scene(historialView, 1200, 700);
        Stage stage = new Stage();
        stage.setTitle("Historial de Cambios de Precios - DICOR");
        stage.setScene(scene);
        stage.setOnHidden(event -> cargarEstadisticas());
        stage.show();
    }
}