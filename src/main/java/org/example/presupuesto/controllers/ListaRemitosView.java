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
import org.example.presupuesto.dao.RemitoDAO;
import org.example.presupuesto.utils.NavigationManager;

import java.awt.Desktop;
import java.io.File;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class ListaRemitosView extends VBox {
    
    private TableView<RemitoDAO.RemitoResumen> tablaRemitos;
    private TextField searchField;
    private Label totalRemitosLabel;
    private Label totalFacturacionLabel;
    private ObservableList<RemitoDAO.RemitoResumen> todosLosRemitos;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public ListaRemitosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox toolbar = createToolbar();
        HBox stats = createStats();
        VBox tableContainer = createTable();
        
        getChildren().addAll(header, toolbar, stats, tableContainer);
        cargarRemitos();
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
        searchField.setPromptText("🔍 Buscar por número, cliente o CUIT...");
        searchField.setPrefWidth(350);
        searchField.setStyle("-fx-font-size: 14px; -fx-padding: 8;");
        searchField.textProperty().addListener((obs, old, newValue) -> filtrarRemitos());
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        Button btnRefrescar = new Button("🔄 Refrescar");
        btnRefrescar.setStyle("-fx-font-size: 13px; -fx-padding: 8 15;");
        btnRefrescar.setOnAction(e -> cargarRemitos());
        
        toolbar.getChildren().addAll(searchField, spacer, btnRefrescar);
        container.getChildren().add(toolbar);
        
        return container;
    }
    
    private HBox createStats() {
        HBox stats = new HBox(20);
        stats.setAlignment(Pos.CENTER);
        
        VBox stat1 = createStatBox("📄", "Total Remitos", "0", "#8b5cf6");
        totalRemitosLabel = (Label) ((VBox) stat1.getChildren().get(0)).getChildren().get(2);
        
        VBox stat2 = createStatBox("💰", "Facturación Total", "$0", "#10b981");
        totalFacturacionLabel = (Label) ((VBox) stat2.getChildren().get(0)).getChildren().get(2);
        
        stats.getChildren().addAll(stat1, stat2);
        return stats;
    }
    
    private VBox createStatBox(String icon, String label, String value, String color) {
        VBox box = new VBox(10);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(20));
        box.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.1), 10, 0, 0, 2);");
        box.setPrefWidth(300);
        
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
    
    private VBox createTable() {
        VBox container = new VBox(10);
        
        tablaRemitos = new TableView<>();
        tablaRemitos.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        tablaRemitos.setPrefHeight(400);
        
        // Columna Número
        TableColumn<RemitoDAO.RemitoResumen, String> colNumero = new TableColumn<>("Número");
        colNumero.setCellValueFactory(new PropertyValueFactory<>("numero"));
        colNumero.setPrefWidth(120);
        colNumero.setStyle("-fx-alignment: CENTER;");
        
        // Columna Fecha (String, ya formateada desde la BD)
        TableColumn<RemitoDAO.RemitoResumen, String> colFecha = new TableColumn<>("Fecha");
        colFecha.setCellValueFactory(new PropertyValueFactory<>("fecha"));
        colFecha.setPrefWidth(100);
        colFecha.setStyle("-fx-alignment: CENTER;");
        
        // Columna Cliente
        TableColumn<RemitoDAO.RemitoResumen, String> colCliente = new TableColumn<>("Cliente");
        colCliente.setCellValueFactory(new PropertyValueFactory<>("clienteNombre"));
        colCliente.setPrefWidth(250);
        
        // Columna CUIT
        TableColumn<RemitoDAO.RemitoResumen, String> colCuit = new TableColumn<>("CUIT");
        colCuit.setCellValueFactory(new PropertyValueFactory<>("clienteCUIT"));
        colCuit.setPrefWidth(130);
        colCuit.setStyle("-fx-alignment: CENTER;");
        
        // Columna Total
        TableColumn<RemitoDAO.RemitoResumen, Double> colTotal = new TableColumn<>("Total");
        colTotal.setCellValueFactory(new PropertyValueFactory<>("total"));
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
        
        // Columna Acciones
        TableColumn<RemitoDAO.RemitoResumen, Void> colAcciones = new TableColumn<>("Acciones");
        colAcciones.setPrefWidth(200);
        colAcciones.setCellFactory(column -> new TableCell<>() {
            private final Button btnVer = new Button("👁️ Ver");
            private final Button btnEliminar = new Button("🗑️");
            
            {
                btnVer.setStyle("-fx-background-color: #3b82f6; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10;");
                btnEliminar.setStyle("-fx-background-color: #ef4444; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10;");
                
                btnVer.setOnAction(e -> {
                    RemitoDAO.RemitoResumen remito = getTableView().getItems().get(getIndex());
                    verPDF(remito);
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
                    buttons.getChildren().addAll(btnVer, btnEliminar);
                    setGraphic(buttons);
                }
            }
        });
        
        tablaRemitos.getColumns().addAll(colNumero, colFecha, colCliente, colCuit, colTotal, colAcciones);
        container.getChildren().add(tablaRemitos);
        
        return container;
    }
    
    private void cargarRemitos() {
        try {
            List<RemitoDAO.RemitoResumen> remitos = RemitoDAO.obtenerTodosLosRemitos();
            todosLosRemitos = FXCollections.observableArrayList(remitos);
            tablaRemitos.setItems(todosLosRemitos);
            
            // Actualizar estadísticas
            totalRemitosLabel.setText(String.valueOf(remitos.size()));
            
            double totalFacturacion = remitos.stream()
                .mapToDouble(RemitoDAO.RemitoResumen::getTotal)
                .sum();
            totalFacturacionLabel.setText(currencyFormatter.format(totalFacturacion));
            
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
    
    private void filtrarRemitos() {
        String textoBusqueda = searchField.getText();
        
        if (textoBusqueda == null || textoBusqueda.trim().isEmpty()) {
            tablaRemitos.setItems(todosLosRemitos);
            return;
        }
        
        String filtroLower = textoBusqueda.toLowerCase();
        ObservableList<RemitoDAO.RemitoResumen> filtrados = todosLosRemitos.filtered(remito ->
            remito.getNumero().toLowerCase().contains(filtroLower) ||
            remito.getClienteNombre().toLowerCase().contains(filtroLower) ||
            remito.getClienteCUIT().toLowerCase().contains(filtroLower)
        );
        
        tablaRemitos.setItems(filtrados);
    }
    
    private void verPDF(RemitoDAO.RemitoResumen remito) {
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
                alert.setTitle("PDF no encontrado");
                alert.setContentText("El archivo PDF no existe en la ruta: " + rutaPDF);
                alert.showAndWait();
                return;
            }
            
            // Abrir el PDF con la aplicación predeterminada
            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().open(pdfFile);
                System.out.println("✅ PDF abierto: " + rutaPDF);
            } else {
                Alert alert = new Alert(Alert.AlertType.WARNING);
                alert.setTitle("No se puede abrir");
                alert.setContentText("No se puede abrir el PDF automáticamente.\nRuta: " + rutaPDF);
                alert.showAndWait();
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error al abrir PDF: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudo abrir el PDF: " + e.getMessage());
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
                    // Eliminar también el archivo PDF
                    try {
                        if (remito.getRutaPDF() != null && !remito.getRutaPDF().isEmpty()) {
                            File pdfFile = new File(remito.getRutaPDF());
                            if (pdfFile.exists()) {
                                pdfFile.delete();
                                System.out.println("✅ PDF eliminado: " + remito.getRutaPDF());
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("⚠️ No se pudo eliminar el PDF: " + e.getMessage());
                    }
                    
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