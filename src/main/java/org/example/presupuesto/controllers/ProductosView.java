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
import org.example.presupuesto.dao.ProductoDAO;
import org.example.presupuesto.models.Producto;
import org.example.presupuesto.utils.NavigationManager;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

public class ProductosView extends VBox {
    
    private TableView<Producto> tablaProductos;
    private TextField searchField;
    private ComboBox<String> comboCategoria;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public ProductosView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        HBox toolbar = createToolbar();
        VBox tableContainer = createTable();
        
        getChildren().addAll(header, toolbar, tableContainer);
        
        cargarProductos();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #10b981; -fx-background-radius: 10;");
        
        Button btnVolver = new Button("← Volver");
        btnVolver.setStyle(
            "-fx-background-color: #059669; " +
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
            "-fx-background-color: #047857; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        btnVolver.setOnMouseExited(e -> btnVolver.setStyle(
            "-fx-background-color: #059669; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        Label title = new Label("📦 Gestión de Productos");
        title.setFont(Font.font("System", FontWeight.BOLD, 24));
        title.setTextFill(Color.WHITE);
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        header.getChildren().addAll(btnVolver, title, spacer);
        return header;
    }
    
    private HBox createToolbar() {
        HBox toolbar = new HBox(15);
        toolbar.setAlignment(Pos.CENTER_LEFT);
        toolbar.setPadding(new Insets(10));
        toolbar.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        
        Label lblBuscar = new Label("🔍 Buscar:");
        lblBuscar.setFont(Font.font("System", FontWeight.BOLD, 14));
        
        searchField = new TextField();
        searchField.setPromptText("Código o descripción...");
        searchField.setPrefWidth(250);
        searchField.textProperty().addListener((obs, oldVal, newVal) -> filtrarProductos());
        
        Label lblCategoria = new Label("Categoría:");
        lblCategoria.setFont(Font.font("System", FontWeight.BOLD, 14));
        
        comboCategoria = new ComboBox<>();
        comboCategoria.getItems().addAll("TODAS", "CARBONES", "INTERRUPTORES", "REPUESTOS VARIOS");
        comboCategoria.setValue("TODAS");
        comboCategoria.setOnAction(e -> filtrarProductos());
        
        Button btnNuevo = new Button("➕ Nuevo Producto");
        btnNuevo.setStyle("-fx-background-color: #10b981; -fx-text-fill: white; -fx-font-size: 13px; -fx-padding: 8 15; -fx-cursor: hand;");
        btnNuevo.setOnAction(e -> mostrarDialogoNuevoProducto());
        
        Button btnActualizarPrecios = new Button("💲 Actualizar Precios");
        btnActualizarPrecios.setStyle("-fx-background-color: #f59e0b; -fx-text-fill: white; -fx-font-size: 13px; -fx-padding: 8 15; -fx-cursor: hand;");
        btnActualizarPrecios.setOnAction(e -> mostrarDialogoActualizarPrecios());
        
        Button btnRefrescar = new Button("🔄 Refrescar");
        btnRefrescar.setStyle("-fx-background-color: #3b82f6; -fx-text-fill: white; -fx-font-size: 13px; -fx-padding: 8 15; -fx-cursor: hand;");
        btnRefrescar.setOnAction(e -> cargarProductos());
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        toolbar.getChildren().addAll(lblBuscar, searchField, lblCategoria, comboCategoria, spacer, btnNuevo, btnActualizarPrecios, btnRefrescar);
        return toolbar;
    }
    
    private VBox createTable() {
        VBox container = new VBox(10);
        container.setPadding(new Insets(10));
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        VBox.setVgrow(container, Priority.ALWAYS);
        
        Label titulo = new Label("Lista de Productos");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setPadding(new Insets(10));
        
        tablaProductos = new TableView<>();
        VBox.setVgrow(tablaProductos, Priority.ALWAYS);
        
        TableColumn<Producto, String> colCodigo = new TableColumn<>("Código");
        colCodigo.setCellValueFactory(new PropertyValueFactory<>("codigo"));
        colCodigo.setPrefWidth(100);
        
        TableColumn<Producto, String> colDescripcion = new TableColumn<>("Descripción");
        colDescripcion.setCellValueFactory(new PropertyValueFactory<>("descripcion"));
        colDescripcion.setPrefWidth(350);
        
        TableColumn<Producto, String> colCategoria = new TableColumn<>("Categoría");
        colCategoria.setCellValueFactory(new PropertyValueFactory<>("categoria"));
        colCategoria.setPrefWidth(150);
        
        TableColumn<Producto, Double> colPrecio = new TableColumn<>("Precio");
        colPrecio.setCellValueFactory(new PropertyValueFactory<>("precioUnitario"));
        colPrecio.setPrefWidth(150);
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
        
        TableColumn<Producto, Void> colAcciones = new TableColumn<>("Acciones");
        colAcciones.setPrefWidth(150);
        colAcciones.setCellFactory(column -> new TableCell<>() {
            private final Button btnEditar = new Button("✏️");
            private final Button btnEliminar = new Button("🗑️");
            
            {
                btnEditar.setStyle("-fx-background-color: #3b82f6; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10; -fx-cursor: hand;");
                btnEliminar.setStyle("-fx-background-color: #ef4444; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10; -fx-cursor: hand;");
                
                btnEditar.setOnAction(e -> {
                    Producto producto = getTableView().getItems().get(getIndex());
                    mostrarDialogoEditarProducto(producto);
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
                    HBox buttons = new HBox(5, btnEditar, btnEliminar);
                    buttons.setAlignment(Pos.CENTER);
                    setGraphic(buttons);
                }
            }
        });
        
        tablaProductos.getColumns().addAll(colCodigo, colDescripcion, colCategoria, colPrecio, colAcciones);
        
        container.getChildren().addAll(titulo, tablaProductos);
        return container;
    }
    
    private void cargarProductos() {
        try {
            List<Producto> productos = ProductoDAO.obtenerTodosLosProductos();
            ObservableList<Producto> items = FXCollections.observableArrayList(productos);
            tablaProductos.setItems(items);
            System.out.println("✅ Cargados " + productos.size() + " productos");
        } catch (Exception e) {
            System.err.println("❌ Error al cargar productos: " + e.getMessage());
            e.printStackTrace();
            mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudieron cargar los productos.");
        }
    }
    
    private void filtrarProductos() {
        String textoBusqueda = searchField.getText().toLowerCase();
        String categoriaSeleccionada = comboCategoria.getValue();
        
        try {
            List<Producto> todosProductos = ProductoDAO.obtenerTodosLosProductos();
            
            List<Producto> filtrados = todosProductos.stream()
                .filter(p -> {
                    boolean matchTexto = textoBusqueda.isEmpty() || 
                        p.getCodigo().toLowerCase().contains(textoBusqueda) ||
                        p.getDescripcion().toLowerCase().contains(textoBusqueda);
                    
                    boolean matchCategoria = categoriaSeleccionada.equals("TODAS") || 
                        p.getCategoria().equals(categoriaSeleccionada);
                    
                    return matchTexto && matchCategoria;
                })
                .toList();
            
            ObservableList<Producto> items = FXCollections.observableArrayList(filtrados);
            tablaProductos.setItems(items);
            
        } catch (Exception e) {
            System.err.println("❌ Error al filtrar productos: " + e.getMessage());
        }
    }
    
    private void mostrarDialogoNuevoProducto() {
        Dialog<Producto> dialog = new Dialog<>();
        dialog.setTitle("Nuevo Producto");
        dialog.setHeaderText("Agregar nuevo producto");
        
        // Vincular al Stage principal
        try {
            Stage owner = NavigationManager.getInstance().getPrimaryStage();
            if (owner != null) {
                dialog.initOwner(owner);
            }
        } catch (Exception e) {
            System.err.println("⚠️ No se pudo vincular Dialog al Stage principal");
        }
        
        ButtonType btnGuardar = new ButtonType("Guardar", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(btnGuardar, ButtonType.CANCEL);
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20));
        
        TextField txtCodigo = new TextField();
        txtCodigo.setPromptText("Código");
        
        TextField txtDescripcion = new TextField();
        txtDescripcion.setPromptText("Descripción");
        
        ComboBox<String> comboCategoria = new ComboBox<>();
        comboCategoria.getItems().addAll("CARBONES", "INTERRUPTORES", "REPUESTOS VARIOS");
        comboCategoria.setValue("CARBONES");
        
        TextField txtPrecio = new TextField();
        txtPrecio.setPromptText("Precio");
        
        grid.add(new Label("Código:"), 0, 0);
        grid.add(txtCodigo, 1, 0);
        grid.add(new Label("Descripción:"), 0, 1);
        grid.add(txtDescripcion, 1, 1);
        grid.add(new Label("Categoría:"), 0, 2);
        grid.add(comboCategoria, 1, 2);
        grid.add(new Label("Precio:"), 0, 3);
        grid.add(txtPrecio, 1, 3);
        
        dialog.getDialogPane().setContent(grid);
        
        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == btnGuardar) {
                try {
                    double precio = Double.parseDouble(txtPrecio.getText());
                    String codigo = txtCodigo.getText();
                    String descripcion = txtDescripcion.getText();
                    String categoria = comboCategoria.getValue();
                    
                    // Usar agregarProducto en vez de crear
                    if (ProductoDAO.agregarProducto(codigo, descripcion, precio, categoria)) {
                        return new Producto(0, codigo, descripcion, precio, categoria);
                    }
                    return null;
                } catch (NumberFormatException e) {
                    mostrarAlerta(Alert.AlertType.ERROR, "Error", "El precio debe ser un número válido.");
                    return null;
                }
            }
            return null;
        });
        
        dialog.showAndWait().ifPresent(producto -> {
            if (producto != null) {
                cargarProductos();
                mostrarAlerta(Alert.AlertType.INFORMATION, "Éxito", "Producto creado correctamente.");
            }
        });
    }
    
    private void mostrarDialogoEditarProducto(Producto producto) {
        Dialog<Boolean> dialog = new Dialog<>();
        dialog.setTitle("Editar Producto");
        dialog.setHeaderText("Editar producto: " + producto.getCodigo());
        
        // Vincular al Stage principal
        try {
            Stage owner = NavigationManager.getInstance().getPrimaryStage();
            if (owner != null) {
                dialog.initOwner(owner);
            }
        } catch (Exception e) {
            System.err.println("⚠️ No se pudo vincular Dialog al Stage principal");
        }
        
        ButtonType btnGuardar = new ButtonType("Guardar", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(btnGuardar, ButtonType.CANCEL);
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20));
        
        TextField txtCodigo = new TextField(producto.getCodigo());
        txtCodigo.setEditable(false); // El código no se puede cambiar
        
        TextField txtDescripcion = new TextField(producto.getDescripcion());
        TextField txtPrecio = new TextField(String.valueOf(producto.getPrecioUnitario()));
        
        grid.add(new Label("Código:"), 0, 0);
        grid.add(txtCodigo, 1, 0);
        grid.add(new Label("Descripción:"), 0, 1);
        grid.add(txtDescripcion, 1, 1);
        grid.add(new Label("Precio:"), 0, 2);
        grid.add(txtPrecio, 1, 2);
        
        dialog.getDialogPane().setContent(grid);
        
        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == btnGuardar) {
                try {
                    double precio = Double.parseDouble(txtPrecio.getText());
                    return ProductoDAO.actualizarProducto(producto.getCodigo(), txtDescripcion.getText(), precio);
                } catch (NumberFormatException e) {
                    mostrarAlerta(Alert.AlertType.ERROR, "Error", "El precio debe ser un número válido.");
                    return false;
                }
            }
            return false;
        });
        
        dialog.showAndWait().ifPresent(actualizado -> {
            if (actualizado) {
                cargarProductos();
                mostrarAlerta(Alert.AlertType.INFORMATION, "Éxito", "Producto actualizado correctamente.");
            } else {
                mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudo actualizar el producto.");
            }
        });
    }
    
    private void eliminarProducto(Producto producto) {
        if (mostrarConfirmacion("Confirmar eliminación", 
            "¿Estás seguro de eliminar el producto \"" + producto.getDescripcion() + "\"?")) {
            
            if (ProductoDAO.eliminarProducto(producto.getCodigo())) {
                cargarProductos();
                mostrarAlerta(Alert.AlertType.INFORMATION, "Éxito", "Producto eliminado correctamente.");
            } else {
                mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudo eliminar el producto.");
            }
        }
    }
    
    private void mostrarDialogoActualizarPrecios() {
        Dialog<Double> dialog = new Dialog<>();
        dialog.setTitle("Actualizar Precios Masivamente");
        dialog.setHeaderText("Aplicar porcentaje de aumento a productos por categoría");
        
        // Vincular al Stage principal
        try {
            Stage owner = NavigationManager.getInstance().getPrimaryStage();
            if (owner != null) {
                dialog.initOwner(owner);
            }
        } catch (Exception e) {
            System.err.println("⚠️ No se pudo vincular Dialog al Stage principal");
        }
        
        ButtonType btnAplicar = new ButtonType("Aplicar", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(btnAplicar, ButtonType.CANCEL);
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20));
        
        ComboBox<String> comboCategoria = new ComboBox<>();
        comboCategoria.getItems().addAll("TODAS", "CARBONES", "INTERRUPTORES", "REPUESTOS VARIOS");
        comboCategoria.setValue("TODAS");
        
        TextField txtPorcentaje = new TextField();
        txtPorcentaje.setPromptText("Ej: 10 para 10%");
        
        grid.add(new Label("Categoría:"), 0, 0);
        grid.add(comboCategoria, 1, 0);
        grid.add(new Label("Porcentaje de aumento (%):"), 0, 1);
        grid.add(txtPorcentaje, 1, 1);
        
        dialog.getDialogPane().setContent(grid);
        
        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == btnAplicar) {
                try {
                    return Double.parseDouble(txtPorcentaje.getText());
                } catch (NumberFormatException e) {
                    mostrarAlerta(Alert.AlertType.ERROR, "Error", "El porcentaje debe ser un número válido.");
                    return null;
                }
            }
            return null;
        });
        
        dialog.showAndWait().ifPresent(porcentaje -> {
            if (porcentaje != null) {
                String categoria = comboCategoria.getValue();
                
                if (mostrarConfirmacion("Confirmar actualización masiva",
                    "¿Estás seguro de aplicar un aumento del " + porcentaje + "% a la categoría " + categoria + "?\n\nEsta acción no se puede deshacer.")) {
                    
                    int productosActualizados = ProductoDAO.actualizarPreciosPorCategoria(categoria, porcentaje);
                    
                    if (productosActualizados > 0) {
                        cargarProductos();
                        mostrarAlerta(Alert.AlertType.INFORMATION, "Éxito", 
                            "Se actualizaron " + productosActualizados + " productos con un aumento del " + porcentaje + "%");
                    } else {
                        mostrarAlerta(Alert.AlertType.ERROR, "Error", "No se pudieron actualizar los precios.");
                    }
                }
            }
        });
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
    
    /**
     * Muestra un Alert de confirmación vinculado al Stage principal
     */
    private boolean mostrarConfirmacion(String titulo, String contenido) {
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(contenido);
        
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