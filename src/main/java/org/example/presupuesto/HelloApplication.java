package org.example.presupuesto;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;
import org.example.presupuesto.controllers.DashboardView;
import org.example.presupuesto.dao.DatabaseManager;

public class HelloApplication extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        System.out.println("🚀 Iniciando aplicación DICOR...");
        DatabaseManager.initializeDatabase();
        
        DashboardView dashboardView = new DashboardView();
        Scene scene = new Scene(dashboardView, 1000, 700);

        stage.setTitle("DICOR - Sistema de Gestión");
        stage.setScene(scene);
        stage.centerOnScreen();
        stage.show();
        
        System.out.println("✅ Aplicación iniciada correctamente");
    }
    
    @Override
    public void stop() {
        System.out.println("🛑 Cerrando aplicación...");
        DatabaseManager.closeConnection();
        System.out.println("👋 Aplicación cerrada");
    }

    public static void main(String[] args) {
        launch();
    }
}