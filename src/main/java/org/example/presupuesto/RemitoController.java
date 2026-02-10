package org.example.presupuesto;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.control.TableCell;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.stage.FileChooser;

import org.example.presupuesto.dao.DatabaseManager;
import org.example.presupuesto.dao.RemitoDAO;
import org.example.presupuesto.dao.ProductoDAO;
import org.example.presupuesto.models.Producto;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.awt.Color;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Element;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.draw.LineSeparator;

public class RemitoController {

    @FXML private ImageView logoImage;

    @FXML private TableView<Remito> tablaProductos;
    @FXML private TableColumn<Remito, String> colCodigo;
    @FXML private TableColumn<Remito, Integer> colCantidad;
    @FXML private TableColumn<Remito, String> colDescripcion;
    @FXML private TableColumn<Remito, Double> colUnitario;
    @FXML private TableColumn<Remito, Double> colBonificacion;
    @FXML private TableColumn<Remito, Double> colTotal;

    @FXML private TextField inputCodigo;
    @FXML private TextField inputCantidad;
    @FXML private TextField inputDescripcion;
    @FXML private TextField inputPrecioUnitario;
    @FXML private TextField inputBonificacion;
    @FXML private TextField totalField;
    @FXML private TextField remitoNumero;
    @FXML private DatePicker fecha;
    @FXML private TextField clienteNombre;
    @FXML private TextField clienteDomicilio;
    @FXML private TextField clienteCUIT;
    @FXML private Label lblEstadoCodigo;

    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);

    @FXML
    public void initialize() {
        // Cargar logo con manejo de errores
        try {
            Image logo = new Image(getClass().getResourceAsStream("/logo.png"));
            if (logo != null && !logo.isError()) {
                logoImage.setImage(logo);
            } else {
                System.err.println("⚠️  Advertencia: No se pudo cargar logo.png");
            }
        } catch (Exception e) {
            System.err.println("⚠️  Error al cargar logo: " + e.getMessage());
        }

        colCodigo.setCellValueFactory(cell -> cell.getValue().codigoProperty());
        colCantidad.setCellValueFactory(cell -> cell.getValue().cantidadProperty().asObject());
        colDescripcion.setCellValueFactory(cell -> cell.getValue().descripcionProperty());

        colUnitario.setCellValueFactory(cell -> cell.getValue().precioUnitarioProperty().asObject());
        colUnitario.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                setText(empty || value == null ? "" : currencyFormatter.format(value));
            }
        });

        colBonificacion.setCellValueFactory(cell -> cell.getValue().bonificacionProperty().asObject());

        colTotal.setCellValueFactory(cell -> cell.getValue().precioTotalProperty().asObject());
        colTotal.setCellFactory(column -> new TableCell<>() {
            @Override
            protected void updateItem(Double value, boolean empty) {
                super.updateItem(value, empty);
                setText(empty || value == null ? "" : currencyFormatter.format(Math.round(value * 100.0) / 100.0));
            }
        });
        
        // Obtener el próximo número de remito automáticamente
        String nextNumber = DatabaseManager.getNextRemitoNumber();
        remitoNumero.setText(nextNumber);
        System.out.println("📄 Próximo número de remito: " + nextNumber);
        
        // Configurar autocompletado por código
        inputCodigo.setOnAction(e -> buscarProductoPorCodigo());
        inputCodigo.focusedProperty().addListener((obs, oldVal, newVal) -> {
            if (!newVal) { // Cuando pierde el foco
                buscarProductoPorCodigo();
            }
        });
    }

    @FXML
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
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setHeaderText("Campos inválidos");
            alert.setContentText("Verificá que los campos numéricos estén bien escritos.");
            alert.showAndWait();
        }
    }

    @FXML
    private void eliminarProducto() {
        Remito seleccionado = tablaProductos.getSelectionModel().getSelectedItem();
        if (seleccionado != null) {
            tablaProductos.getItems().remove(seleccionado);
            recalcularTotal();
        } else {
            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("Eliminar producto");
            alert.setHeaderText(null);
            alert.setContentText("Seleccioná un producto de la tabla para eliminar.");
            alert.showAndWait();
        }
    }

    private void recalcularTotal() {
        double total = 0;
        for (Remito r : tablaProductos.getItems()) {
            total += r.precioTotalProperty().get();
        }
        totalField.setText(currencyFormatter.format(Math.round(total * 100.0) / 100.0));
    }

    @FXML
    private void exportarComoPDF() {
        try {
            // Validar que haya productos
            if (tablaProductos.getItems().isEmpty()) {
                Alert alert = new Alert(Alert.AlertType.WARNING);
                alert.setTitle("Sin productos");
                alert.setHeaderText(null);
                alert.setContentText("Debés agregar al menos un producto al remito.");
                alert.showAndWait();
                return;
            }
            
            // Validar datos del cliente
            if (clienteNombre.getText().trim().isEmpty()) {
                Alert alert = new Alert(Alert.AlertType.WARNING);
                alert.setTitle("Datos incompletos");
                alert.setHeaderText(null);
                alert.setContentText("Debés completar el nombre del cliente.");
                alert.showAndWait();
                return;
            }
            
            FileChooser fileChooser = new FileChooser();
            fileChooser.setTitle("Guardar remito como PDF");
            fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Archivo PDF", "*.pdf"));

            String cliente = clienteNombre.getText().replaceAll("[^a-zA-Z0-9]", "_");
            String nro = remitoNumero.getText().trim();
            fileChooser.setInitialFileName("remito_" + cliente + "_" + nro + ".pdf");

            File file = fileChooser.showSaveDialog(null);

            if (file != null) {
                Document document = new Document(PageSize.A4);
                PdfWriter.getInstance(document, new FileOutputStream(file));
                document.open();

                // Fuentes
                Font fontNormal = FontFactory.getFont(FontFactory.HELVETICA, 10);
                Font fontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
                Font fontRed = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(255, 0, 0));
                Font fontSmall = FontFactory.getFont(FontFactory.HELVETICA, 9);

                // Cabecera
                PdfPTable headerTable = new PdfPTable(2);
                headerTable.setWidths(new float[]{2.5f, 2});
                headerTable.setWidthPercentage(100);

                // Logo y datos del negocio
                PdfPTable datosNegocio = new PdfPTable(1);
                
                // Cargar logo (con manejo de errores)
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
                    System.err.println("⚠️  No se pudo cargar el logo en el PDF: " + logoEx.getMessage());
                    PdfPCell emptyCell = new PdfPCell(new Phrase(""));
                    emptyCell.setBorder(Rectangle.NO_BORDER);
                    emptyCell.setFixedHeight(45f);
                    datosNegocio.addCell(emptyCell);
                }

                datosNegocio.addCell(celdaTexto("DICOR CARBONES Y REPUESTOS", fontBold));
                datosNegocio.addCell(celdaTexto("de Fabrizio Dematias", fontNormal));
                datosNegocio.addCell(celdaTexto("Los Cóndores 4814 - B° Alejandro Centeno - Córdoba", fontNormal));
                datosNegocio.addCell(celdaTexto("dicorcarbones@gmail.com", fontNormal));

                // Datos del remito
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

                // Datos del cliente - MEJORADOS
                PdfPTable clienteTable = new PdfPTable(2);
                clienteTable.setWidthPercentage(100);
                clienteTable.setSpacingBefore(5f);
                clienteTable.setSpacingAfter(5f);
                
                clienteTable.addCell(celdaTexto("SEÑOR/RAZÓN SOCIAL: " + clienteNombre.getText(), fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("DOMICILIO: " + clienteDomicilio.getText(), fontNormal, Rectangle.BOX));
                
                // Formatear CUIT con guiones
                String cuitCliente = clienteCUIT.getText().trim();
                String cuitFormateado = formatearCUIT(cuitCliente);
                clienteTable.addCell(celdaTexto("CUIT: " + cuitFormateado, fontNormal, Rectangle.BOX));
                
                clienteTable.addCell(celdaTexto("CONDICIÓN IVA: Consumidor Final", fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("CONDICIONES DE VENTA: Contado", fontNormal, Rectangle.BOX, Element.ALIGN_LEFT, 2));

                document.add(clienteTable);
                document.add(new com.lowagie.text.Chunk(new LineSeparator(1f, 100, null, Element.ALIGN_CENTER, -2)));

                // Tabla de productos
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
                    // AGREGAR % en bonificación
                    tabla.addCell(new Phrase(String.format("%,.2f%%", item.bonificacionProperty().get()), fontNormal));
                    tabla.addCell(new Phrase("$" + String.format("%,.2f", item.precioTotalProperty().get()), fontNormal));
                }

                document.add(tabla);
                document.add(new Paragraph(" "));

                Paragraph totalParrafo = new Paragraph("TOTAL: " + totalField.getText(), fontBold);
                totalParrafo.setAlignment(Element.ALIGN_RIGHT);
                document.add(totalParrafo);
                
                // Agregar espacio
                document.add(new Paragraph(" "));
                
                // Campo de OBSERVACIONES
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
                
                // Guardar en base de datos
                guardarEnBaseDatos(file.getAbsolutePath());

                Alert alert = new Alert(Alert.AlertType.INFORMATION);
                alert.setTitle("PDF generado");
                alert.setHeaderText("¡Remito guardado exitosamente!");
                alert.setContentText("El remito se guardó en:\n" + file.getAbsolutePath() + "\n\nTambién se guardó en la base de datos.");
                alert.showAndWait();
            }

        } catch (Exception e) {
            e.printStackTrace();
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error al generar PDF");
            alert.setHeaderText("Ocurrió un error al guardar el PDF.");
            alert.setContentText(e.getMessage());
            alert.showAndWait();
        }
    }
    
    /**
     * Guarda el remito en la base de datos
     */
    private void guardarEnBaseDatos(String rutaPDF) {
        try {
            String numero = remitoNumero.getText();
            String fechaStr = fecha.getValue() != null ? fecha.getValue().toString() : "";
            String nombre = clienteNombre.getText();
            String domicilio = clienteDomicilio.getText();
            String cuit = clienteCUIT.getText();
            
            double total = 0;
            for (Remito r : tablaProductos.getItems()) {
                total += r.precioTotalProperty().get();
            }
            
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
    
    /**
     * Limpia el formulario después de guardar
     */
    private void limpiarFormulario() {
        clienteNombre.clear();
        clienteDomicilio.clear();
        clienteCUIT.clear();
        tablaProductos.getItems().clear();
        totalField.clear();
        limpiarCamposProducto();
    }
    
    /**
     * Busca un producto por código y autocompleta los campos
     */
    private void buscarProductoPorCodigo() {
        String codigo = inputCodigo.getText().trim();
        
        if (codigo.isEmpty()) {
            lblEstadoCodigo.setText("");
            return;
        }
        
        try {
            Producto producto = ProductoDAO.buscarPorCodigo(codigo);
            
            if (producto != null) {
                // Autocompletar descripción y precio
                inputDescripcion.setText(producto.getDescripcion());
                inputPrecioUnitario.setText(String.valueOf(producto.getPrecioUnitario()));
                
                // Mensaje de éxito
                lblEstadoCodigo.setText("✓ Producto encontrado");
                lblEstadoCodigo.setStyle("-fx-text-fill: #10b981; -fx-font-weight: bold;");
                
                // Focus en cantidad
                inputCantidad.requestFocus();
                
                System.out.println("✅ Producto autocompletado: " + producto.getDescripcion());
                
            } else {
                // Producto no encontrado
                lblEstadoCodigo.setText("⚠ Código no encontrado");
                lblEstadoCodigo.setStyle("-fx-text-fill: #ef4444; -fx-font-weight: bold;");
                inputDescripcion.clear();
                inputPrecioUnitario.clear();
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error al buscar producto: " + e.getMessage());
            lblEstadoCodigo.setText("✗ Error al buscar");
            lblEstadoCodigo.setStyle("-fx-text-fill: #ef4444;");
        }
    }
    
    /**
     * Limpia los campos del formulario de producto
     */
    @FXML
    private void limpiarCamposProducto() {
        inputCodigo.clear();
        inputCantidad.clear();
        inputDescripcion.clear();
        inputPrecioUnitario.clear();
        inputBonificacion.setText("0");
        lblEstadoCodigo.setText("");
        
        // Focus en código para empezar de nuevo
        inputCodigo.requestFocus();
    }
    
    /**
     * Formatea un CUIT agregando guiones si no los tiene
     */
    private String formatearCUIT(String cuit) {
        if (cuit == null || cuit.isEmpty()) {
            return "";
        }
        
        // Eliminar guiones existentes y espacios
        String cuitLimpio = cuit.replaceAll("[^0-9]", "");
        
        // Si tiene 11 dígitos, formatear como XX-XXXXXXXX-X
        if (cuitLimpio.length() == 11) {
            return cuitLimpio.substring(0, 2) + "-" + 
                   cuitLimpio.substring(2, 10) + "-" + 
                   cuitLimpio.substring(10);
        }
        
        // Si no tiene 11 dígitos, devolver como está
        return cuit;
    }

    private PdfPCell celdaTexto(String texto, Font fuente) {
        return celdaTexto(texto, fuente, Rectangle.NO_BORDER, Element.ALIGN_LEFT);
    }

    private PdfPCell celdaTexto(String texto, Font fuente, int borde) {
        return celdaTexto(texto, fuente, borde, Element.ALIGN_LEFT);
    }

    private PdfPCell celdaTexto(String texto, Font fuente, int borde, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
        celda.setBorder(borde);
        celda.setHorizontalAlignment(alineacion);
        celda.setPadding(5);
        return celda;
    }
    
    private PdfPCell celdaTexto(String texto, Font fuente, int borde, int alineacion, int colspan) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
        celda.setBorder(borde);
        celda.setHorizontalAlignment(alineacion);
        celda.setPadding(5);
        celda.setColspan(colspan);
        return celda;
    }
}