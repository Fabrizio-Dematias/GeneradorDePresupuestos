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
import org.example.presupuesto.dao.ProductoDAO;
import org.example.presupuesto.models.Producto;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class ProductosView extends VBox {
    
    private TableView<Producto> tablaProductos;
    private TextField searchField;
    private Label totalProductosLabel;
    private ObservableList<Producto> todosLosProductos;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public ProductosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox toolbar = createToolbar();
        VBox tableContainer = createTable();
        
        getChildren().addAll(header, toolbar, tableContainer);
        cargarProductos();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #1e3c72; -fx-background-radius: 10;");
        
        Label title = new Label("📦 Catálogo de Productos");
        title.setFont(Font.font("System", FontWeight.BOLD, 24));
        title.setTextFill(Color.WHITE);
        
        header.getChildren().add(title);
        return header;
    }
    
    private VBox createToolbar() {
        VBox container = new VBox(10);
        
        HBox toolbar = new HBox(15);
        toolbar.setAlignment(Pos.CENTER_LEFT);
        
        // Campo de búsqueda
        searchField = new TextField();
        searchField.setPromptText("🔍 Buscar por código o descripción...");
        searchField.setPrefWidth(350);
        searchField.setStyle("-fx-font-size: 14px; -fx-padding: 8;");
        searchField.textProperty().addListener((obs, old, newValue) -> filtrarProductos(newValue));
        
        // Label de total
        totalProductosLabel = new Label("Total: 0 productos");
        totalProductosLabel.setStyle("-fx-font-size: 14px; -fx-font-weight: bold;");
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        // Botones
        Button btnNuevo = new Button("➕ Nuevo Producto");
        btnNuevo.setStyle("-fx-background-color: #10b981; -fx-text-fill: white; -fx-font-size: 13px; -fx-padding: 8 15; -fx-cursor: hand;");
        btnNuevo.setOnAction(e -> abrirFormularioNuevo());
        
        Button btnRefrescar = new Button("🔄 Refrescar");
        btnRefrescar.setStyle("-fx-font-size: 13px; -fx-padding: 8 15;");
        btnRefrescar.setOnAction(e -> cargarProductos());
        
        toolbar.getChildren().addAll(searchField, totalProductosLabel, spacer, btnNuevo, btnRefrescar);
        container.getChildren().add(toolbar);
        
        return container;
    }
    
    private VBox createTable() {
        VBox container = new VBox(10);
        
        tablaProductos = new TableView<>();
        tablaProductos.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        tablaProductos.setPrefHeight(450);
        
        // Columna Código
        TableColumn<Producto, String> colCodigo = new TableColumn<>("Código");
        colCodigo.setCellValueFactory(new PropertyValueFactory<>("codigo"));
        colCodigo.setPrefWidth(100);
        colCodigo.setStyle("-fx-alignment: CENTER;");
        
        // Columna Descripción
        TableColumn<Producto, String> colDescripcion = new TableColumn<>("Descripción");
        colDescripcion.setCellValueFactory(new PropertyValueFactory<>("descripcion"));
        colDescripcion.setPrefWidth(550);
        
        // Columna Precio
        TableColumn<Producto, Double> colPrecio = new TableColumn<>("Precio Unitario");
        colPrecio.setCellValueFactory(new PropertyValueFactory<>("precioUnitario"));
        colPrecio.setPrefWidth(150);
        colPrecio.setStyle("-fx-alignment: CENTER-RIGHT;");
        colPrecio.setCellFactory(column -> new TableCell<>() {
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
        TableColumn<Producto, Void> colAcciones = new TableColumn<>("Acciones");
        colAcciones.setPrefWidth(200);
        colAcciones.setCellFactory(column -> new TableCell<>() {
            private final Button btnEditar = new Button("✏️ Editar");
            private final Button btnEliminar = new Button("🗑️");
            
            {
                btnEditar.setStyle("-fx-background-color: #3b82f6; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10;");
                btnEliminar.setStyle("-fx-background-color: #ef4444; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10;");
                
                btnEditar.setOnAction(e -> {
                    Producto producto = getTableView().getItems().get(getIndex());
                    editarProducto(producto);
                });
                
                btnEliminar.setOnAction(e -> {
                    Producto producto = getTableView().getItems().get(getIndex());
                    eliminarProducto(producto);
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
                    buttons.getChildren().addAll(btnEditar, btnEliminar);
                    setGraphic(buttons);
                }
            }
        });
        
        tablaProductos.getColumns().addAll(colCodigo, colDescripcion, colPrecio, colAcciones);
        container.getChildren().add(tablaProductos);
        
        return container;
    }
    
    private void cargarProductos() {
        try {
            List<Producto> productos = ProductoDAO.obtenerTodosLosProductos();
            todosLosProductos = FXCollections.observableArrayList(productos);
            tablaProductos.setItems(todosLosProductos);
            
            totalProductosLabel.setText("Total: " + productos.size() + " productos");
            System.out.println("✅ Productos cargados: " + productos.size());
            
        } catch (Exception e) {
            System.err.println("❌ Error al cargar productos: " + e.getMessage());
            e.printStackTrace();
            
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setContentText("No se pudieron cargar los productos: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void filtrarProductos(String filtro) {
        if (filtro == null || filtro.trim().isEmpty()) {
            tablaProductos.setItems(todosLosProductos);
            totalProductosLabel.setText("Total: " + todosLosProductos.size() + " productos");
            return;
        }
        
        String filtroLower = filtro.toLowerCase();
        ObservableList<Producto> filtrados = todosLosProductos.filtered(producto ->
            producto.getCodigo().toLowerCase().contains(filtroLower) ||
            producto.getDescripcion().toLowerCase().contains(filtroLower)
        );
        
        tablaProductos.setItems(filtrados);
        totalProductosLabel.setText("Mostrando: " + filtrados.size() + " de " + todosLosProductos.size() + " productos");
    }
    
    private void abrirFormularioNuevo() {
        mostrarFormularioProducto(null);
    }
    
    private void editarProducto(Producto producto) {
        mostrarFormularioProducto(producto);
    }
    
    private void mostrarFormularioProducto(Producto producto) {
        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.setTitle(producto == null ? "Nuevo Producto" : "Editar Producto");
        dialog.setHeaderText(producto == null ? "Agregar nuevo producto al catálogo" : "Modificar producto");
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20));
        
        TextField txtCodigo = new TextField();
        txtCodigo.setPromptText("Ej: 401");
        TextField txtDescripcion = new TextField();
        txtDescripcion.setPromptText("Ej: Amoladora 4 1/2");
        TextField txtPrecio = new TextField();
        txtPrecio.setPromptText("Ej: 1500.50");
        
        if (producto != null) {
            txtCodigo.setText(producto.getCodigo());
            txtCodigo.setEditable(false); // No permitir cambiar el código
            txtDescripcion.setText(producto.getDescripcion());
            txtPrecio.setText(String.valueOf(producto.getPrecioUnitario()));
        }
        
        grid.add(new Label("Código:"), 0, 0);
        grid.add(txtCodigo, 1, 0);
        grid.add(new Label("Descripción:"), 0, 1);
        grid.add(txtDescripcion, 1, 1);
        grid.add(new Label("Precio Unitario:"), 0, 2);
        grid.add(txtPrecio, 1, 2);
        
        dialog.getDialogPane().setContent(grid);
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);
        
        dialog.showAndWait().ifPresent(response -> {
            if (response == ButtonType.OK) {
                try {
                    String codigo = txtCodigo.getText().trim();
                    String descripcion = txtDescripcion.getText().trim();
                    double precio = Double.parseDouble(txtPrecio.getText().trim());
                    
                    if (codigo.isEmpty() || descripcion.isEmpty()) {
                        throw new IllegalArgumentException("Código y descripción son obligatorios");
                    }
                    
                    boolean exito;
                    if (producto == null) {
                        exito = ProductoDAO.agregarProducto(codigo, descripcion, precio);
                    } else {
                        exito = ProductoDAO.actualizarProducto(codigo, descripcion, precio);
                    }
                    
                    if (exito) {
                        cargarProductos();
                        Alert alert = new Alert(Alert.AlertType.INFORMATION);
                        alert.setTitle("Éxito");
                        alert.setContentText("Producto " + (producto == null ? "agregado" : "actualizado") + " correctamente");
                        alert.showAndWait();
                    }
                    
                } catch (NumberFormatException e) {
                    Alert alert = new Alert(Alert.AlertType.ERROR);
                    alert.setTitle("Error");
                    alert.setContentText("El precio debe ser un número válido");
                    alert.showAndWait();
                } catch (Exception e) {
                    Alert alert = new Alert(Alert.AlertType.ERROR);
                    alert.setTitle("Error");
                    alert.setContentText("Error: " + e.getMessage());
                    alert.showAndWait();
                }
            }
        });
    }
    
    private void eliminarProducto(Producto producto) {
        Alert confirmacion = new Alert(Alert.AlertType.CONFIRMATION);
        confirmacion.setTitle("Confirmar eliminación");
        confirmacion.setHeaderText("¿Eliminar producto " + producto.getCodigo() + "?");
        confirmacion.setContentText(producto.getDescripcion() + "\n\nEsta acción no se puede deshacer.");
        
        confirmacion.showAndWait().ifPresent(response -> {
            if (response == ButtonType.OK) {
                boolean eliminado = ProductoDAO.eliminarProducto(producto.getCodigo());
                
                if (eliminado) {
                    Alert success = new Alert(Alert.AlertType.INFORMATION);
                    success.setTitle("Producto eliminado");
                    success.setContentText("El producto se eliminó correctamente.");
                    success.showAndWait();
                    cargarProductos();
                } else {
                    Alert error = new Alert(Alert.AlertType.ERROR);
                    error.setTitle("Error");
                    error.setContentText("No se pudo eliminar el producto.");
                    error.showAndWait();
                }
            }
        });
    }
}