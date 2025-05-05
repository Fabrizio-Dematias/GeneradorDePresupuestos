package org.example.presupuesto;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.control.TableCell;
import javafx.scene.image.Image; // JavaFX Image
import javafx.scene.image.ImageView;
import javafx.stage.FileChooser;

import java.io.File;
import java.io.FileOutputStream;
import java.text.NumberFormat;
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

    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);

    @FXML
    public void initialize() {
        logoImage.setImage(new Image(getClass().getResourceAsStream("/logo.png")));

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

            inputCodigo.clear();
            inputCantidad.clear();
            inputDescripcion.clear();
            inputPrecioUnitario.clear();
            inputBonificacion.clear();

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

                // Cabecera
                PdfPTable headerTable = new PdfPTable(2);
                headerTable.setWidths(new float[]{2.5f, 2});
                headerTable.setWidthPercentage(100);

                // Logo y datos del negocio
                PdfPTable datosNegocio = new PdfPTable(1);
                com.lowagie.text.Image logo = com.lowagie.text.Image.getInstance(
                        new File(getClass().getResource("/logo.png").toURI()).getAbsolutePath()
                );
                logo.scaleToFit(80, 35); // tamaño ajustado
                PdfPCell logoCell = new PdfPCell(logo);
                logoCell.setBorder(Rectangle.NO_BORDER);
                logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                logoCell.setPaddingTop(10f);
                logoCell.setFixedHeight(45f);

                datosNegocio.addCell(logoCell);
                datosNegocio.addCell(celdaTexto("DICOR CARBONES Y REPUESTOS", fontBold));
                datosNegocio.addCell(celdaTexto("de Fabrizio Dematias", fontNormal));
                datosNegocio.addCell(celdaTexto("Los Cóndores 4814 - B° Alejandro Centeno - Córdoba", fontNormal));
                datosNegocio.addCell(celdaTexto("dicorcarboness@gmail.com", fontNormal));

                // Datos del remito
                PdfPTable datosRemito = new PdfPTable(1);
                datosRemito.addCell(celdaTexto("REMITO", fontBold, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
                datosRemito.addCell(celdaTexto("N° 0001-" + remitoNumero.getText(), fontNormal, Rectangle.NO_BORDER, Element.ALIGN_RIGHT));
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

                // Datos del cliente
                PdfPTable clienteTable = new PdfPTable(2);
                clienteTable.setWidthPercentage(100);
                clienteTable.setSpacingBefore(5f);
                clienteTable.setSpacingAfter(5f);
                clienteTable.addCell(celdaTexto("SEÑOR: " + clienteNombre.getText(), fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("DOMICILIO: " + clienteDomicilio.getText(), fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("IVA: ___________________________", fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("CONDICIONES DE VENTA: ____________________", fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto("CUIT CLIENTE: " + clienteCUIT.getText(), fontNormal, Rectangle.BOX));
                clienteTable.addCell(celdaTexto(" ", fontNormal, Rectangle.NO_BORDER));

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
                    tabla.addCell(new Phrase(String.format("%,.2f", item.bonificacionProperty().get()), fontNormal));
                    tabla.addCell(new Phrase("$" + String.format("%,.2f", item.precioTotalProperty().get()), fontNormal));
                }

                document.add(tabla);
                document.add(new Paragraph(" "));

                Paragraph totalParrafo = new Paragraph("TOTAL: " + totalField.getText(), fontBold);
                totalParrafo.setAlignment(Element.ALIGN_RIGHT);
                document.add(totalParrafo);

                document.close();

                Alert alert = new Alert(Alert.AlertType.INFORMATION);
                alert.setTitle("PDF generado");
                alert.setHeaderText(null);
                alert.setContentText("El remito se guardó correctamente.");
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


}
