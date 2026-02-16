package org.example.presupuesto;

import javafx.application.Application;
import javafx.stage.Stage;
import org.example.presupuesto.controllers.DashboardView;
import org.example.presupuesto.utils.NavigationManager;

import java.io.IOException;

public class HelloApplication extends Application {
    
    @Override
    public void start(Stage stage) throws IOException {
        // Inicializar el gestor de navegación
        NavigationManager navigationManager = NavigationManager.getInstance();
        navigationManager.initialize(stage);
        
        // Configurar ventana principal
        stage.setTitle("DICOR - Sistema de Gestión");
        stage.setWidth(1400);
        stage.setHeight(900);
        stage.setMaximized(true); // Iniciar maximizado por defecto
        
        // Navegar al Dashboard
        DashboardView dashboard = new DashboardView();
        navigationManager.navigateTo(dashboard);
        
        stage.show();
        
        System.out.println("✅ Aplicación iniciada correctamente");
    }

    public static void main(String[] args) {
        launch();
    }
}