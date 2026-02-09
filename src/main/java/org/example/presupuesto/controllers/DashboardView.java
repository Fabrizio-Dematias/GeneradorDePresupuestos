package org.example.presupuesto.controllers;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Label;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import javafx.fxml.FXMLLoader;
import org.example.presupuesto.dao.DatabaseManager;
import org.example.presupuesto.dao.RemitoDAO;

import java.text.NumberFormat;
import java.util.Locale;

public class DashboardView extends VBox {
    
    private Label totalRemitosLabel;
    private Label totalFacturadoLabel;
    private Label ultimoRemitoLabel;
    private Label badgeRemitos;
    
    private final Locale localeAR = new Locale("es", "AR");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(localeAR);
    
    public DashboardView() {
        setSpacing(20);
        setPadding(new Insets(30));
        setStyle("-fx-background-color: #f3f4f6;");
        
        HBox header = createHeader();
        VBox stats = createStats();
        VBox modules = createModules();
        
        getChildren().addAll(header, stats, modules);
        cargarEstadisticas();
    }
    
    private HBox createHeader() {
        HBox header = new HBox();
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(15);
        header.setPadding(new Insets(20));
        header.setStyle("-fx-background-color: #1e3c72; -fx-background-radius: 10;");
        
        Label title = new Label("🏢 DICOR - Sistema de Gestión");
        title.setFont(Font.font("System", FontWeight.BOLD, 24));
        title.setTextFill(Color.WHITE);
        
        header.getChildren().add(title);
        return header;
    }
    
    private VBox createStats() {
        VBox container = new VBox(10);
        Label title = new Label("📊 Estadísticas");
        title.setFont(Font.font("System", FontWeight.BOLD, 18));
        
        HBox statsBox = new HBox(20);
        
        VBox stat1 = createStatCard("📄 Remitos creados", "0");
        totalRemitosLabel = (Label) ((VBox) stat1.getChildren().get(0)).getChildren().get(1);
        
        VBox stat2 = createStatCard("💰 Total facturado", "$0.00");
        totalFacturadoLabel = (Label) ((VBox) stat2.getChildren().get(0)).getChildren().get(1);
        totalFacturadoLabel.setTextFill(Color.GREEN);
        
        VBox stat3 = createStatCard("📋 Último remito", "0001-001");
        ultimoRemitoLabel = (Label) ((VBox) stat3.getChildren().get(0)).getChildren().get(1);
        ultimoRemitoLabel.setTextFill(Color.BLUE);
        
        statsBox.getChildren().addAll(stat1, stat2, stat3);
        container.getChildren().addAll(title, statsBox);
        return container;
    }
    
    private VBox createStatCard(String label, String value) {
        VBox card = new VBox(5);
        card.setPadding(new Insets(20));
        card.setPrefWidth(200);
        card.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        
        VBox content = new VBox(5);
        Label labelText = new Label(label);
        labelText.setStyle("-fx-font-size: 12px; -fx-text-fill: gray;");
        Label valueText = new Label(value);
        valueText.setFont(Font.font("System", FontWeight.BOLD, 32));
        
        content.getChildren().addAll(labelText, valueText);
        card.getChildren().add(content);
        return card;
    }
    
    private VBox createModules() {
        VBox container = new VBox(15);
        Label title = new Label("🚀 Módulos Principales");
        title.setFont(Font.font("System", FontWeight.BOLD, 18));
        
        HBox modulesBox = new HBox(20);
        
        VBox module1 = createModuleCard("📝", "Nuevo Remito", "Crear nuevo remito", true);
        module1.setOnMouseClicked(e -> abrirNuevoRemito());
        module1.setStyle(module1.getStyle() + "; -fx-cursor: hand;");
        
        VBox module2 = createModuleCard("📄", "Ver Remitos", "Lista de remitos", true);
        badgeRemitos = new Label("0 remitos");
        badgeRemitos.setStyle("-fx-background-color: #667eea; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 15; -fx-font-size: 11px;");
        module2.getChildren().add(badgeRemitos);
        module2.setOnMouseClicked(e -> verListaRemitos());
        module2.setStyle(module2.getStyle() + "; -fx-cursor: hand;");
        
        VBox module3 = createModuleCard("📦", "Productos", "Próximamente", false);
        Label badge = new Label("Próximamente");
        badge.setStyle("-fx-background-color: orange; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 15; -fx-font-size: 11px;");
        module3.getChildren().add(badge);
        
        modulesBox.getChildren().addAll(module1, module2, module3);
        container.getChildren().addAll(title, modulesBox);
        return container;
    }
    
    private VBox createModuleCard(String icon, String title, String subtitle, boolean enabled) {
        VBox card = new VBox(10);
        card.setAlignment(Pos.CENTER);
        card.setPadding(new Insets(30));
        card.setPrefWidth(250);
        card.setPrefHeight(200);
        
        if (enabled) {
            card.setStyle("-fx-background-color: white; -fx-background-radius: 10;");
        } else {
            card.setStyle("-fx-background-color: lightgray; -fx-background-radius: 10;");
        }
        
        Label iconLabel = new Label(icon);
        iconLabel.setFont(Font.font(48));
        if (!enabled) iconLabel.setOpacity(0.5);
        
        Label titleLabel = new Label(title);
        titleLabel.setFont(Font.font("System", FontWeight.BOLD, 18));
        if (!enabled) titleLabel.setTextFill(Color.GRAY);
        
        Label subtitleLabel = new Label(subtitle);
        subtitleLabel.setStyle("-fx-font-size: 13px; -fx-text-fill: gray;");
        
        card.getChildren().addAll(iconLabel, titleLabel, subtitleLabel);
        return card;
    }
    
    private void cargarEstadisticas() {
        try {
            int totalRemitos = RemitoDAO.contarRemitos();
            totalRemitosLabel.setText(String.valueOf(totalRemitos));
            badgeRemitos.setText(totalRemitos + " remitos");
            
            double totalFacturado = RemitoDAO.obtenerTotalFacturado();
            totalFacturadoLabel.setText(currencyFormatter.format(totalFacturado));
            
            String siguienteNumero = DatabaseManager.getNextRemitoNumber();
            String[] parts = siguienteNumero.split("-");
            int ultimoNum = Integer.parseInt(parts[1]) - 1;
            if (ultimoNum > 0) {
                ultimoRemitoLabel.setText(String.format("0001-%03d", ultimoNum));
            } else {
                ultimoRemitoLabel.setText("Sin remitos");
            }
            
            System.out.println("📊 Estadísticas cargadas");
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
        }
    }
    
    private void abrirNuevoRemito() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/org/example/presupuesto/views/remito-form.fxml"));
            Scene scene = new Scene(loader.load(), 900, 700);
            Stage stage = new Stage();
            stage.setTitle("Nuevo Remito - DICOR");
            stage.setScene(scene);
            stage.centerOnScreen();
            stage.setOnHidden(event -> cargarEstadisticas());
            stage.show();
        } catch (Exception e) {
            e.printStackTrace();
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setContentText("Error: " + e.getMessage());
            alert.showAndWait();
        }
    }
    
    private void verListaRemitos() {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Próximamente");
        alert.setHeaderText("Lista de Remitos");
        alert.setContentText("Esta funcionalidad estará disponible pronto.");
        alert.showAndWait();
    }
}