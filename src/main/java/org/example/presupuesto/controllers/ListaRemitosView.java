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
    private Label lblTotalRemitos;
    private Label lblFacturacionTotal;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public ListaRemitosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        HBox searchBar = createSearchBar();
        HBox stats = createStats();
        VBox tableContainer = createTable();
        
        getChildren().addAll(header, searchBar, stats, tableContainer);
        
        cargarRemitos();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #8b5cf6; -fx-background-radius: 10;");
        
        Button btnVolver = new Button("← Volver");
        btnVolver.setStyle(
            "-fx-background-color: #7c3aed; " +
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
            "-fx-background-color: #7c3aed; " +
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
    
    private HBox createSearchBar() {
        HBox searchBar = new HBox(15);
        searchBar.setAlignment(Pos.CENTER_LEFT);
        searchBar.setPadding(new Insets(10));
        searchBar.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        
        Label lblBuscar = new Label("🔍 Buscar:");
        lblBuscar.setFont(Font.font("System", FontWeight.BOLD, 14));
        
        searchField = new TextField();
        searchField.setPromptText("Número, cliente o CUIT...");
        searchField.setPrefWidth(300);
        searchField.textProperty().addListener((obs, oldVal, newVal) -> filtrarRemitos(newVal));
        
        Button btnRefrescar = new Button("🔄 Refrescar");
        btnRefrescar.setStyle(
            "-fx-background-color: #8b5cf6; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 13px; " +
            "-fx-padding: 8 15; " +
            "-fx-cursor: hand;"
        );
        btnRefrescar.setOnAction(e -> cargarRemitos());
        
        searchBar.getChildren().addAll(lblBuscar, searchField, btnRefrescar);
        return searchBar;
    }
    
    private HBox createStats() {
        HBox stats = new HBox(20);
        stats.setAlignment(Pos.CENTER);
        stats.setPadding(new Insets(10));
        
        VBox stat1 = createStatBox("📄", "Total Remitos", "0", "#8b5cf6");
        lblTotalRemitos = (Label) ((VBox) stat1.getChildren().get(0)).getChildren().get(2);
        
        VBox stat2 = createStatBox("💰", "Facturación Total", "$0", "#10b981");
        lblFacturacionTotal = (Label) ((VBox) stat2.getChildren().get(0)).getChildren().get(2);
        
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
        container.setPadding(new Insets(10));
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        VBox.setVgrow(container, Priority.ALWAYS);
        
        Label titulo = new Label("Remitos Guardados");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setPadding(new Insets(10));
        
        tablaRemitos = new TableView<>();
        VBox.setVgrow(tablaRemitos, Priority.ALWAYS);
        
        TableColumn<RemitoDAO.RemitoResumen, String> colNumero = new TableColumn<>("Número");
        colNumero.setCellValueFactory(new PropertyValueFactory<>("numero"));
        colNumero.setPrefWidth(100);
        
        TableColumn<RemitoDAO.RemitoResumen, String> colFecha = new TableColumn<>("Fecha");
        colFecha.setCellValueFactory(new PropertyValueFactory<>("fecha"));
        colFecha.setPrefWidth(120);
        
        TableColumn<RemitoDAO.RemitoResumen, String> colCliente = new TableColumn<>("Cliente");
        colCliente.setCellValueFactory(new PropertyValueFactory<>("clienteNombre"));
        colCliente.setPrefWidth(250);
        
        TableColumn<RemitoDAO.RemitoResumen, String> colCUIT = new TableColumn<>("CUIT");
        colCUIT.setCellValueFactory(new PropertyValueFactory<>("clienteCUIT"));
        colCUIT.setPrefWidth(150);
        
        TableColumn<RemitoDAO.RemitoResumen, Double> colTotal = new TableColumn<>("Total");
        colTotal.setCellValueFactory(new PropertyValueFactory<>("total"));
        colTotal.setPrefWidth(150);
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
        
        TableColumn<RemitoDAO.RemitoResumen, Void> colAcciones = new TableColumn<>("Acciones");
        colAcciones.setPrefWidth(200);
        colAcciones.setCellFactory(column -> new TableCell<>() {
            private final Button btnVerPDF = new Button("📄 Ver PDF");
            private final Button btnEliminar = new Button("🗑️");
            
            {
                btnVerPDF.setStyle("-fx-background-color: #3b82f6; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10; -fx-cursor: hand;");
                btnEliminar.setStyle("-fx-background-color: #ef4444; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10; -fx-cursor: hand;");
                
                btnVerPDF.setOnAction(e -> {
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
                    HBox buttons = new HBox(5, btnVerPDF, btnEliminar);
                    buttons.setAlignment(Pos.CENTER);
                    setGraphic(buttons);
                }
            }
        });
        
        tablaRemitos.getColumns().addAll(colNumero, colFecha, colCliente, colCUIT, colTotal, colAcciones);
        
        container.getChildren().addAll(titulo, tablaRemitos);
        return container;
    }
    
    private void cargarRemitos() {
        try {
            List<RemitoDAO.RemitoResumen> remitos = RemitoDAO.obtenerTodosLosRemitos();
            ObservableList<RemitoDAO.RemitoResumen> items = FXCollections.observableArrayList(remitos);
            tablaRemitos.setItems(items);
            
            // Actualizar estadísticas
            lblTotalRemitos.setText(String.valueOf(remitos.size()));
            
            double total = remitos.stream().mapToDouble(RemitoDAO.RemitoResumen::getTotal).sum();
            lblFacturacionTotal.setText(currencyFormatter.format(total));
            
            System.out.println("✅ Cargados " + remitos.size() + " remitos");
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar remitos: " + e.getMessage());
            e.printStackTrace();
            mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudieron cargar los remitos.");
        }
    }
    
    private void filtrarRemitos(String filtro) {
        if (filtro == null || filtro.trim().isEmpty()) {
            cargarRemitos();
            return;
        }
        
        try {
            List<RemitoDAO.RemitoResumen> todosLosRemitos = RemitoDAO.obtenerTodosLosRemitos();
            String filtroLower = filtro.toLowerCase();
            
            List<RemitoDAO.RemitoResumen> filtrados = todosLosRemitos.stream()
                .filter(r -> 
                    r.getNumero().toLowerCase().contains(filtroLower) ||
                    r.getClienteNombre().toLowerCase().contains(filtroLower) ||
                    r.getClienteCUIT().toLowerCase().contains(filtroLower)
                )
                .toList();
            
            ObservableList<RemitoDAO.RemitoResumen> items = FXCollections.observableArrayList(filtrados);
            tablaRemitos.setItems(items);
            
            lblTotalRemitos.setText(String.valueOf(filtrados.size()));
            double total = filtrados.stream().mapToDouble(RemitoDAO.RemitoResumen::getTotal).sum();
            lblFacturacionTotal.setText(currencyFormatter.format(total));
            
        } catch (Exception e) {
            System.err.println("❌ Error al filtrar remitos: " + e.getMessage());
        }
    }
    
    private void abrirPDF(RemitoDAO.RemitoResumen remito) {
        try {
            String rutaPDF = remito.getRutaPDF();
            File file = new File(rutaPDF);
            
            if (!file.exists()) {
                mostrarAlerta(Alert.AlertType.WARNING, "Archivo no encontrado", 
                    "El archivo PDF no existe en la ruta:\n" + rutaPDF);
                return;
            }
            
            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().open(file);
                System.out.println("✅ Abriendo PDF: " + rutaPDF);
            } else {
                mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se puede abrir el PDF en este sistema.");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error al abrir PDF: " + e.getMessage());
            e.printStackTrace();
            mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudo abrir el archivo PDF.");
        }
    }
    
    private void eliminarRemito(RemitoDAO.RemitoResumen remito) {
        if (mostrarConfirmacion("Confirmar eliminación", 
            "¿Estás seguro de eliminar el remito N° " + remito.getNumero() + "?\n\nEsta acción no se puede deshacer.")) {
            
            try {
                // Usar el ID en vez del número
                boolean eliminado = RemitoDAO.eliminarRemito(remito.getId());
                
                if (eliminado) {
                    System.out.println("✅ Remito eliminado: " + remito.getNumero() + " (ID: " + remito.getId() + ")");
                    cargarRemitos();
                    mostrarAlerta(Alert.AlertType.INFORMATION, "Remito eliminado", 
                        "El remito N° " + remito.getNumero() + " fue eliminado correctamente.");
                } else {
                    mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudo eliminar el remito.");
                }
                
            } catch (Exception e) {
                System.err.println("❌ Error al eliminar remito: " + e.getMessage());
                e.printStackTrace();
                mostrarAlerta(Alert.AlertType.ERROR, "Error", "Ocurrió un error al eliminar el remito.");
            }
        }
    }
    
    /**
     * Muestra un Alert correctamente vinculado al Stage principal
     * para evitar problemas en pantalla completa
     */
    private void mostrarAlerta(Alert.AlertType tipo, String titulo, String contenido) {
        Alert alert = new Alert(tipo);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(contenido);
        
        // Vincular al Stage principal para evitar minimización
        try {
            Stage owner = NavigationManager.getInstance().getPrimaryStage();
            if (owner != null) {
                alert.initOwner(owner);
            }
        } catch (Exception e) {
            System.err.println("⚠️ No se pudo vincular Alert al Stage principal");
        }
        
        alert.showAndWait();
    }
    
    private boolean mostrarConfirmacion(String titulo, String contenido) {
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(contenido);
        
        // Vincular al Stage principal
        try {
            Stage owner = NavigationManager.getInstance().getPrimaryStage();
            if (owner != null) {
                alert.initOwner(owner);
            }
        } catch (Exception e) {
            System.err.println("⚠️ No se pudo vincular Alert al Stage principal");
        }
        
        return alert.showAndWait().orElse(ButtonType.CANCEL) == ButtonType.OK;
    }
}