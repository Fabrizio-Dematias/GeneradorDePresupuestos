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
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import org.example.presupuesto.Remito;
import org.example.presupuesto.dao.DatabaseManager;
import org.example.presupuesto.dao.ProductoDAO;
import org.example.presupuesto.dao.RemitoDAO;
import org.example.presupuesto.models.Producto;
import org.example.presupuesto.utils.NavigationManager;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class NuevoRemitoView extends VBox {
    
    private TableView<Remito> tablaProductos;
    private TextField inputCodigo;
    private TextField inputCantidad;
    private TextField inputDescripcion;
    private TextField inputPrecioUnitario;
    private TextField inputBonificacion;
    private TextField totalField;
    private TextField remitoNumero;
    private DatePicker fecha;
    private TextField clienteNombre;
    private TextField clienteDomicilio;
    private TextField clienteCUIT;
    private Label lblEstadoCodigo;
    
    private ToggleGroup groupIVA;
    private ToggleGroup groupVenta;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public NuevoRemitoView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        ScrollPane scrollPane = new ScrollPane(createFormulario());
        scrollPane.setFitToWidth(true);
        scrollPane.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        VBox.setVgrow(scrollPane, Priority.ALWAYS);
        
        getChildren().addAll(header, scrollPane);
        
        // Obtener próximo número de remito
        String nextNumber = DatabaseManager.getNextRemitoNumber();
        remitoNumero.setText(nextNumber);
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #3b82f6; -fx-background-radius: 10;");
        
        // Botón Volver
        Button btnVolver = new Button("← Volver");
        btnVolver.setStyle(
            "-fx-background-color: #2563eb; " +
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
            "-fx-background-color: #1e40af; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        btnVolver.setOnMouseExited(e -> btnVolver.setStyle(
            "-fx-background-color: #2563eb; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        Label title = new Label("📝 Nuevo Remito");
        title.setFont(Font.font("System", FontWeight.BOLD, 24));
        title.setTextFill(Color.WHITE);
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        header.getChildren().addAll(btnVolver, title, spacer);
        return header;
    }
    
    private VBox createFormulario() {
        VBox form = new VBox(20);
        form.setPadding(new Insets(20));
        
        VBox datosRemito = createDatosRemito();
        VBox datosCliente = createDatosCliente();
        VBox agregarProducto = createAgregarProducto();
        VBox tablaContainer = createTablaProductos();
        HBox totalYAcciones = createTotalYAcciones();
        
        form.getChildren().addAll(datosRemito, datosCliente, agregarProducto, tablaContainer, totalYAcciones);
        
        return form;
    }
    
    private VBox createDatosRemito() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("📄 Datos del Remito");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setStyle("-fx-text-fill: #1f2937;");
        
        GridPane grid = new GridPane();
        grid.setHgap(15);
        grid.setVgap(10);
        grid.setPadding(new Insets(10, 0, 0, 0));
        
        Label lblNumero = new Label("N° Remito:");
        lblNumero.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        remitoNumero = new TextField();
        remitoNumero.setEditable(false);
        remitoNumero.setPrefWidth(150);
        remitoNumero.setStyle("-fx-background-color: #f3f4f6;");
        
        Label lblFecha = new Label("Fecha:");
        lblFecha.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        fecha = new DatePicker(LocalDate.now());
        fecha.setPrefWidth(180);
        
        grid.add(lblNumero, 0, 0);
        grid.add(remitoNumero, 1, 0);
        grid.add(lblFecha, 2, 0);
        grid.add(fecha, 3, 0);
        
        container.getChildren().addAll(titulo, grid);
        return container;
    }
    
    private VBox createDatosCliente() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("👤 Datos del Cliente");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setStyle("-fx-text-fill: #1f2937;");
        
        GridPane grid = new GridPane();
        grid.setHgap(15);
        grid.setVgap(15);
        grid.setPadding(new Insets(10, 0, 0, 0));
        
        Label lblNombre = new Label("Nombre / Razón Social:");
        lblNombre.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        clienteNombre = new TextField();
        clienteNombre.setPrefWidth(400);
        clienteNombre.setPromptText("Ingrese nombre del cliente");
        
        Label lblDomicilio = new Label("Domicilio:");
        lblDomicilio.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        clienteDomicilio = new TextField();
        clienteDomicilio.setPrefWidth(400);
        clienteDomicilio.setPromptText("Ingrese domicilio");
        
        Label lblCUIT = new Label("CUIT:");
        lblCUIT.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        clienteCUIT = new TextField();
        clienteCUIT.setPrefWidth(200);
        clienteCUIT.setPromptText("20-12345678-9");
        
        Label lblIVA = new Label("Condición IVA:");
        lblIVA.setStyle("-fx-font-weight: bold; -fx-font-size: 13px; -fx-text-fill: black;");
        
        groupIVA = new ToggleGroup();
        
        RadioButton rbConsumidorFinal = new RadioButton("Consumidor Final");
        rbConsumidorFinal.setToggleGroup(groupIVA);
        rbConsumidorFinal.setSelected(true);
        rbConsumidorFinal.setPrefWidth(150);
        rbConsumidorFinal.setStyle("-fx-text-fill: black;");
        
        RadioButton rbExento = new RadioButton("Exento");
        rbExento.setToggleGroup(groupIVA);
        rbExento.setPrefWidth(80);
        rbExento.setStyle("-fx-text-fill: black;");
        
        RadioButton rbRespInscripto = new RadioButton("Resp. Inscripto");
        rbRespInscripto.setToggleGroup(groupIVA);
        rbRespInscripto.setPrefWidth(130);
        rbRespInscripto.setStyle("-fx-text-fill: black;");
        
        RadioButton rbMonotributo = new RadioButton("Monotributo");
        rbMonotributo.setToggleGroup(groupIVA);
        rbMonotributo.setPrefWidth(110);
        rbMonotributo.setStyle("-fx-text-fill: black;");
        
        HBox ivaBox = new HBox(10, rbConsumidorFinal, rbExento, rbRespInscripto, rbMonotributo);
        ivaBox.setAlignment(Pos.CENTER_LEFT);
        
        Label lblCondiciones = new Label("Condiciones de Venta:");
        lblCondiciones.setStyle("-fx-font-weight: bold; -fx-font-size: 13px; -fx-text-fill: black;");
        
        groupVenta = new ToggleGroup();
        
        RadioButton rbContado = new RadioButton("Contado");
        rbContado.setToggleGroup(groupVenta);
        rbContado.setSelected(true);
        rbContado.setPrefWidth(100);
        rbContado.setStyle("-fx-text-fill: black;");
        
        RadioButton rbCuentaCorriente = new RadioButton("Cuenta Corriente");
        rbCuentaCorriente.setToggleGroup(groupVenta);
        rbCuentaCorriente.setPrefWidth(150);
        rbCuentaCorriente.setStyle("-fx-text-fill: black;");
        
        HBox ventaBox = new HBox(10, rbContado, rbCuentaCorriente);
        ventaBox.setAlignment(Pos.CENTER_LEFT);
        
        grid.add(lblNombre, 0, 0);
        grid.add(clienteNombre, 1, 0, 3, 1);
        
        grid.add(lblDomicilio, 0, 1);
        grid.add(clienteDomicilio, 1, 1, 3, 1);
        
        grid.add(lblCUIT, 0, 2);
        grid.add(clienteCUIT, 1, 2);
        
        grid.add(lblIVA, 0, 3);
        grid.add(ivaBox, 1, 3, 3, 1);
        
        grid.add(lblCondiciones, 0, 4);
        grid.add(ventaBox, 1, 4, 3, 1);
        
        container.getChildren().addAll(titulo, grid);
        return container;
    }
    
    private VBox createAgregarProducto() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("➕ Agregar Producto");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setStyle("-fx-text-fill: #1f2937;");
        
        GridPane grid = new GridPane();
        grid.setHgap(15);
        grid.setVgap(12);
        grid.setPadding(new Insets(10, 0, 0, 0));
        
        Label lblCodigo = new Label("Código:");
        lblCodigo.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        inputCodigo = new TextField();
        inputCodigo.setPromptText("Ej: 401");
        inputCodigo.setPrefWidth(150);
        inputCodigo.setOnAction(e -> buscarProductoPorCodigo());
        inputCodigo.focusedProperty().addListener((obs, oldVal, newVal) -> {
            if (!newVal) buscarProductoPorCodigo();
        });
        
        lblEstadoCodigo = new Label("");
        lblEstadoCodigo.setPrefWidth(150);
        
        Label lblDescripcion = new Label("Descripción:");
        lblDescripcion.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        inputDescripcion = new TextField();
        inputDescripcion.setPrefWidth(400);
        inputDescripcion.setPromptText("Se autocompleta al ingresar código");
        
        Label lblCantidad = new Label("Cantidad:");
        lblCantidad.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        inputCantidad = new TextField();
        inputCantidad.setPromptText("Ej: 2");
        inputCantidad.setPrefWidth(100);
        
        Label lblPrecio = new Label("Precio Unitario:");
        lblPrecio.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        inputPrecioUnitario = new TextField();
        inputPrecioUnitario.setPromptText("Se autocompleta");
        inputPrecioUnitario.setPrefWidth(150);
        
        Label lblBonif = new Label("Bonificación (%):");
        lblBonif.setStyle("-fx-font-weight: bold; -fx-text-fill: black;");
        inputBonificacion = new TextField("0");
        inputBonificacion.setPrefWidth(100);
        
        grid.add(lblCodigo, 0, 0);
        grid.add(inputCodigo, 1, 0);
        grid.add(lblEstadoCodigo, 2, 0, 2, 1);
        
        grid.add(lblDescripcion, 0, 1);
        grid.add(inputDescripcion, 1, 1, 3, 1);
        
        grid.add(lblCantidad, 0, 2);
        grid.add(inputCantidad, 1, 2);
        
        grid.add(lblPrecio, 2, 2);
        grid.add(inputPrecioUnitario, 3, 2);
        
        grid.add(lblBonif, 0, 3);
        grid.add(inputBonificacion, 1, 3);
        
        Button btnAgregar = new Button("✓ Agregar Producto");
        btnAgregar.setStyle(
            "-fx-background-color: #10b981; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 13px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        );
        btnAgregar.setOnAction(e -> agregarProducto());
        
        Button btnLimpiar = new Button("🗑️ Limpiar Campos");
        btnLimpiar.setStyle(
            "-fx-font-size: 13px; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand;"
        );
        btnLimpiar.setOnAction(e -> limpiarCamposProducto());
        
        HBox botones = new HBox(10, btnAgregar, btnLimpiar);
        botones.setAlignment(Pos.CENTER_LEFT);
        botones.setPadding(new Insets(10, 0, 0, 0));
        
        container.getChildren().addAll(titulo, grid, botones);
        return container;
    }
    
    private VBox createTablaProductos() {
        VBox container = new VBox(10);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label titulo = new Label("📦 Productos Agregados");
        titulo.setFont(Font.font("System", FontWeight.BOLD, 16));
        titulo.setStyle("-fx-text-fill: #1f2937;");
        
        tablaProductos = new TableView<>();
        tablaProductos.setPrefHeight(300);
        
        TableColumn<Remito, String> colCodigo = new TableColumn<>("Código");
        colCodigo.setCellValueFactory(new PropertyValueFactory<>("codigo"));
        colCodigo.setPrefWidth(100);
        colCodigo.setStyle("-fx-alignment: CENTER;");
        
        TableColumn<Remito, Integer> colCantidad = new TableColumn<>("Cantidad");
        colCantidad.setCellValueFactory(new PropertyValueFactory<>("cantidad"));
        colCantidad.setPrefWidth(100);
        colCantidad.setStyle("-fx-alignment: CENTER;");
        
        TableColumn<Remito, String> colDescripcion = new TableColumn<>("Descripción");
        colDescripcion.setCellValueFactory(new PropertyValueFactory<>("descripcion"));
        colDescripcion.setPrefWidth(300);
        
        TableColumn<Remito, Double> colUnitario = new TableColumn<>("P. Unitario");
        colUnitario.setCellValueFactory(new PropertyValueFactory<>("precioUnitario"));
        colUnitario.setPrefWidth(120);
        colUnitario.setStyle("-fx-alignment: CENTER-RIGHT;");
        colUnitario.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                setText(empty || value == null ? "" : currencyFormatter.format(value));
            }
        });
        
        TableColumn<Remito, Double> colBonif = new TableColumn<>("Bonif. %");
        colBonif.setCellValueFactory(new PropertyValueFactory<>("bonificacion"));
        colBonif.setPrefWidth(100);
        colBonif.setStyle("-fx-alignment: CENTER;");
        
        TableColumn<Remito, Double> colTotal = new TableColumn<>("P. Total");
        colTotal.setCellValueFactory(new PropertyValueFactory<>("precioTotal"));
        colTotal.setPrefWidth(120);
        colTotal.setStyle("-fx-alignment: CENTER-RIGHT;");
        colTotal.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                setText(empty || value == null ? "" : currencyFormatter.format(value));
                if (!empty && value != null) {
                    setStyle("-fx-font-weight: bold; -fx-text-fill: #10b981;");
                }
            }
        });
        
        TableColumn<Remito, Void> colAcciones = new TableColumn<>("Acciones");
        colAcciones.setPrefWidth(100);
        colAcciones.setStyle("-fx-alignment: CENTER;");
        colAcciones.setCellFactory(column -> new TableCell<>() {
            private final Button btnEliminar = new Button("🗑️");
            
            {
                btnEliminar.setStyle("-fx-background-color: #ef4444; -fx-text-fill: white; -fx-font-size: 11px; -fx-padding: 5 10; -fx-cursor: hand;");
                btnEliminar.setOnAction(e -> {
                    Remito remito = getTableView().getItems().get(getIndex());
                    tablaProductos.getItems().remove(remito);
                    recalcularTotal();
                });
            }
            
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                setGraphic(empty ? null : btnEliminar);
            }
        });
        
        tablaProductos.getColumns().addAll(colCodigo, colCantidad, colDescripcion, colUnitario, colBonif, colTotal, colAcciones);
        
        container.getChildren().addAll(titulo, tablaProductos);
        return container;
    }
    
    private HBox createTotalYAcciones() {
        HBox container = new HBox(20);
        container.setAlignment(Pos.CENTER_RIGHT);
        container.setStyle("-fx-background-color: white; -fx-background-radius: 10; -fx-padding: 20;");
        
        Label lblTotal = new Label("TOTAL:");
        lblTotal.setFont(Font.font("System", FontWeight.BOLD, 18));
        
        totalField = new TextField("$0");
        totalField.setEditable(false);
        totalField.setPrefWidth(200);
        totalField.setAlignment(Pos.CENTER_RIGHT);
        totalField.setStyle("-fx-font-size: 18px; -fx-font-weight: bold; -fx-background-color: #f3f4f6; -fx-text-fill: #10b981;");
        
        Button btnGuardar = new Button("💾 Guardar como PDF");
        btnGuardar.setStyle(
            "-fx-background-color: #3b82f6; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        );
        btnGuardar.setOnAction(e -> exportarComoPDF());
        
        btnGuardar.setOnMouseEntered(e -> btnGuardar.setStyle(
            "-fx-background-color: #2563eb; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        btnGuardar.setOnMouseExited(e -> btnGuardar.setStyle(
            "-fx-background-color: #3b82f6; " +
            "-fx-text-fill: white; " +
            "-fx-font-size: 14px; " +
            "-fx-font-weight: bold; " +
            "-fx-padding: 10 20; " +
            "-fx-cursor: hand; " +
            "-fx-background-radius: 5;"
        ));
        
        container.getChildren().addAll(lblTotal, totalField, btnGuardar);
        return container;
    }
    
    private void buscarProductoPorCodigo() {
        String codigo = inputCodigo.getText().trim();
        
        if (codigo.isEmpty()) {
            lblEstadoCodigo.setText("");
            return;
        }
        
        try {
            Producto producto = ProductoDAO.buscarPorCodigo(codigo);
            
            if (producto != null) {
                inputDescripcion.setText(producto.getDescripcion());
                inputPrecioUnitario.setText(String.valueOf(producto.getPrecioUnitario()));
                lblEstadoCodigo.setText("✓ Encontrado");
                lblEstadoCodigo.setStyle("-fx-text-fill: #10b981; -fx-font-weight: bold;");
                inputCantidad.requestFocus();
            } else {
                lblEstadoCodigo.setText("⚠ No encontrado");
                lblEstadoCodigo.setStyle("-fx-text-fill: #ef4444; -fx-font-weight: bold;");
                inputDescripcion.clear();
                inputPrecioUnitario.clear();
            }
        } catch (Exception e) {
            lblEstadoCodigo.setText("✗ Error");
            lblEstadoCodigo.setStyle("-fx-text-fill: #ef4444;");
        }
    }
    
    private void agregarProducto() {
        try {
            String codigo = inputCodigo.getText();
            int cantidad = Integer.parseInt(inputCantidad.getText());
            String descripcion = inputDescripcion.getText();
            double precioUnitario = Double.parseDouble(inputPrecioUnitario.getText());
            double bonificacion = Double.parseDouble(inputBonificacion.getText());
            
            Remito nuevo = new Remito(codigo, cantidad, descripcion, precioUnitario, bonificacion);
            tablaProductos.getItems().add(nuevo);
            
            limpiarCamposProducto();
            recalcularTotal();
            
        } catch (NumberFormatException e) {
            mostrarAlerta(Alert.AlertType.ERROR, "Error", "Verificá que los campos numéricos estén bien escritos.");
        }
    }
    
    private void limpiarCamposProducto() {
        inputCodigo.clear();
        inputCantidad.clear();
        inputDescripcion.clear();
        inputPrecioUnitario.clear();
        inputBonificacion.setText("0");
        lblEstadoCodigo.setText("");
        inputCodigo.requestFocus();
    }
    
    private void recalcularTotal() {
        double total = tablaProductos.getItems().stream()
            .mapToDouble(r -> r.precioTotalProperty().get())
            .sum();
        totalField.setText(currencyFormatter.format(total));
    }
    
    private void exportarComoPDF() {
        try {
            if (tablaProductos.getItems().isEmpty()) {
                mostrarAlerta(Alert.AlertType.WARNING, "Sin productos", "Debés agregar al menos un producto al remito.");
                return;
            }
            
            if (clienteNombre.getText().trim().isEmpty()) {
                mostrarAlerta(Alert.AlertType.WARNING, "Datos incompletos", "Debés completar el nombre del cliente.");
                return;
            }
            
            FileChooser fileChooser = new FileChooser();
            fileChooser.setTitle("Guardar remito como PDF");
            fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Archivo PDF", "*.pdf"));
            
            String cliente = clienteNombre.getText().replaceAll("[^a-zA-Z0-9]", "_");
            String nro = remitoNumero.getText().trim();
            fileChooser.setInitialFileName("remito_" + cliente + "_" + nro + ".pdf");
            
            File file = fileChooser.showSaveDialog(NavigationManager.getInstance().getPrimaryStage());
            
            if (file != null) {
                Document document = new Document(PageSize.A4);
                PdfWriter.getInstance(document, new FileOutputStream(file));
                document.open();
                
                com.lowagie.text.Font fontNormal = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 10);
                com.lowagie.text.Font fontBold = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10);
                com.lowagie.text.Font fontRed = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(255, 0, 0));
                
                PdfPTable headerTable = new PdfPTable(2);
                headerTable.setWidths(new float[]{2.5f, 2});
                headerTable.setWidthPercentage(100);
                
                PdfPTable datosNegocio = new PdfPTable(1);
                
                try {
                    InputStream logoStream = getClass().getResourceAsStream("/logo.png");
                    if (logoStream != null) {
                        byte[] logoBytes = logoStream.readAllBytes();
                        com.lowagie.text.Image logo = com.lowagie.text.Image.getInstance(logoBytes);
                        logo.scaleToFit(80, 35);
                        
                        PdfPCell logoCell = new PdfPCell(logo);
                        logoCell.setBorder(Rectangle.NO_BORDER);
                        logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                        logoCell.setPaddingTop(10f);
                        logoCell.setFixedHeight(45f);
                        datosNegocio.addCell(logoCell);
                        
                        logoStream.close();
                    } else {
                        PdfPCell emptyCell = new PdfPCell(new Phrase(""));
                        emptyCell.setBorder(Rectangle.NO_BORDER);
                        emptyCell.setFixedHeight(45f);
                        datosNegocio.addCell(emptyCell);
                    }
                } catch (Exception logoEx) {
                    System.err.println("⚠️ No se pudo cargar el logo en el PDF: " + logoEx.getMessage());
                    PdfPCell emptyCell = new PdfPCell(new Phrase(""));
                    emptyCell.setBorder(Rectangle.NO_BORDER);
                    emptyCell.setFixedHeight(45f);
                    datosNegocio.addCell(emptyCell);
                }
                
                datosNegocio.addCell(celdaTexto("DICOR CARBONES Y REPUESTOS", fontBold));
                datosNegocio.addCell(celdaTexto("de Fabrizio Dematias", fontNormal));
                datosNegocio.addCell(celdaTexto("Los Cóndores 4814 - B° Alejandro Centeno - Córdoba", fontNormal));
                datosNegocio.addCell(celdaTexto("dicorcarbones@gmail.com", fontNormal));
                
                PdfPTable datosRemito = new PdfPTable(1);
                datosRemito.addCell(celdaTexto("REMITO - ORIGINAL", fontBold, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
                datosRemito.addCell(celdaTexto("N° " + remitoNumero.getText(), fontNormal, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
                datosRemito.addCell(celdaTexto("Fecha: " + (fecha.getValue() != null ? fecha.getValue().toString() : ""), fontNormal, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
                datosRemito.addCell(celdaTexto("CUIT: 20-42258265-8", fontNormal, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
                datosRemito.addCell(celdaTexto("DOCUMENTO NO VÁLIDO COMO FACTURA", fontRed, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
                
                PdfPCell celdaIzquierda = new PdfPCell(datosNegocio);
                celdaIzquierda.setBorder(Rectangle.BOX);
                PdfPCell celdaDerecha = new PdfPCell(datosRemito);
                celdaDerecha.setBorder(Rectangle.BOX);
                headerTable.addCell(celdaIzquierda);
                headerTable.addCell(celdaDerecha);
                
                document.add(headerTable);
                document.add(new Paragraph(" "));
                
                PdfPTable clienteTable = new PdfPTable(2);
                clienteTable.setWidthPercentage(100);
                clienteTable.setSpacingBefore(5f);
                clienteTable.setSpacingAfter(5f);
                
                clienteTable.addCell(celdaTexto("SEÑOR/RAZÓN SOCIAL: " + clienteNombre.getText(), fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("DOMICILIO: " + clienteDomicilio.getText(), fontNormal, Rectangle.BOX));
                
                String cuitCliente = clienteCUIT.getText().trim();
                String cuitFormateado = formatearCUIT(cuitCliente);
                clienteTable.addCell(celdaTexto("CUIT: " + cuitFormateado, fontNormal, Rectangle.BOX));
                
                String condicionIVA = "Consumidor Final";
                if (groupIVA.getSelectedToggle() != null) {
                    RadioButton selected = (RadioButton) groupIVA.getSelectedToggle();
                    condicionIVA = selected.getText();
                }
                clienteTable.addCell(celdaTexto("CONDICIÓN IVA: " + condicionIVA, fontNormal, Rectangle.BOX));
                
                String condicionVenta = "Contado";
                if (groupVenta.getSelectedToggle() != null) {
                    RadioButton selected = (RadioButton) groupVenta.getSelectedToggle();
                    condicionVenta = selected.getText();
                }
                clienteTable.addCell(celdaTexto("CONDICIONES DE VENTA: " + condicionVenta, fontNormal, Rectangle.BOX, Element.ALIGN_LEFT, 2));
                
                document.add(clienteTable);
                document.add(new com.lowagie.text.Chunk(new LineSeparator(1f, 100, null, Element.ALIGN_CENTER, -2)));
                
                PdfPTable tabla = new PdfPTable(6);
                tabla.setWidths(new float[]{1.2f, 0.8f, 2.5f, 1.2f, 1.2f, 1.3f});
                tabla.setWidthPercentage(100);
                tabla.setSpacingBefore(10f);
                
                String[] headers = {"Código", "Cantidad", "Descripción", "P. Unitario", "Bonificación", "P. Total"};
                for (String h : headers) {
                    PdfPCell hCell = new PdfPCell(new Phrase(h, fontBold));
                    hCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    tabla.addCell(hCell);
                }
                
                for (Remito item : tablaProductos.getItems()) {
                    tabla.addCell(new Phrase(item.codigoProperty().get(), fontNormal));
                    tabla.addCell(new Phrase(String.valueOf(item.cantidadProperty().get()), fontNormal));
                    tabla.addCell(new Phrase(item.descripcionProperty().get(), fontNormal));
                    tabla.addCell(new Phrase("$" + String.format("%,.2f", item.precioUnitarioProperty().get()), fontNormal));
                    tabla.addCell(new Phrase(String.format("%,.2f%%", item.bonificacionProperty().get()), fontNormal));
                    tabla.addCell(new Phrase("$" + String.format("%,.2f", item.precioTotalProperty().get()), fontNormal));
                }
                
                document.add(tabla);
                document.add(new Paragraph(" "));
                
                Paragraph totalParrafo = new Paragraph("TOTAL: " + totalField.getText(), fontBold);
                totalParrafo.setAlignment(Element.ALIGN_RIGHT);
                document.add(totalParrafo);
                
                document.add(new Paragraph(" "));
                
                Paragraph observacionesTitulo = new Paragraph("OBSERVACIONES:", fontBold);
                document.add(observacionesTitulo);
                
                PdfPTable observacionesTable = new PdfPTable(1);
                observacionesTable.setWidthPercentage(100);
                observacionesTable.setSpacingBefore(5f);
                PdfPCell observacionesCell = new PdfPCell(new Phrase(" ", fontNormal));
                observacionesCell.setFixedHeight(30f);
                observacionesCell.setBorder(Rectangle.BOX);
                observacionesTable.addCell(observacionesCell);
                document.add(observacionesTable);
                
                document.close();
                
                guardarEnBaseDatos(file.getAbsolutePath());
                
                mostrarAlerta(Alert.AlertType.INFORMATION, "PDF generado", 
                    "¡Remito guardado exitosamente!\n\nEl remito se guardó en:\n" + file.getAbsolutePath() + "\n\nTambién se guardó en la base de datos.");
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            mostrarAlerta(Alert.AlertType.ERROR, "Error al generar PDF", "Ocurrió un error al guardar el PDF.\n" + e.getMessage());
        }
    }
    
    private void guardarEnBaseDatos(String rutaPDF) {
        try {
            String numero = remitoNumero.getText();
            String fechaStr = fecha.getValue() != null ? fecha.getValue().toString() : "";
            String nombre = clienteNombre.getText();
            String domicilio = clienteDomicilio.getText();
            String cuit = clienteCUIT.getText();
            
            double total = tablaProductos.getItems().stream()
                .mapToDouble(r -> r.precioTotalProperty().get())
                .sum();
            
            List<Remito> items = new ArrayList<>(tablaProductos.getItems());
            
            boolean guardado = RemitoDAO.guardarRemito(
                numero, fechaStr, nombre, domicilio, cuit, total, items, rutaPDF
            );
            
            if (guardado) {
                System.out.println("✅ Remito guardado en la base de datos");
                limpiarFormulario();
                String nextNumber = DatabaseManager.getNextRemitoNumber();
                remitoNumero.setText(nextNumber);
            } else {
                System.err.println("❌ Error al guardar en la base de datos");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error al guardar en BD: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private void limpiarFormulario() {
        clienteNombre.clear();
        clienteDomicilio.clear();
        clienteCUIT.clear();
        tablaProductos.getItems().clear();
        totalField.setText("$0");
        limpiarCamposProducto();
    }
    
    private String formatearCUIT(String cuit) {
        if (cuit == null || cuit.isEmpty()) {
            return "";
        }
        
        String cuitLimpio = cuit.replaceAll("[^0-9]", "");
        
        if (cuitLimpio.length() == 11) {
            return cuitLimpio.substring(0, 2) + "-" + 
                   cuitLimpio.substring(2, 10) + "-" + 
                   cuitLimpio.substring(10);
        }
        
        return cuit;
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
        
        // CLAVE: Vincular al Stage principal para evitar minimización
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
    
    private PdfPCell celdaTexto(String texto, com.lowagie.text.Font fuente) {
        return celdaTexto(texto, fuente, Rectangle.NO_BORDER, Element.ALIGN_LEFT);
    }
    
    private PdfPCell celdaTexto(String texto, com.lowagie.text.Font fuente, int borde) {
        return celdaTexto(texto, fuente, borde, Element.ALIGN_LEFT);
    }
    
    private PdfPCell celdaTexto(String texto, com.lowagie.text.Font fuente, int borde, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
        celda.setBorder(borde);
        celda.setHorizontalAlignment(alineacion);
        celda.setPadding(5);
        return celda;
    }
    
    private PdfPCell celdaTexto(String texto, com.lowagie.text.Font fuente, int borde, int alineacion, int colspan) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
        celda.setBorder(borde);
        celda.setHorizontalAlignment(alineacion);
        celda.setPadding(5);
        celda.setColspan(colspan);
        return celda;
    }
}