package org.example.presupuesto.utils;

import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.stage.Stage;

/**
 * Gestor de navegación centralizado
 * Maneja el cambio de vistas en una única ventana
 */
public class NavigationManager {
    
    private static NavigationManager instance;
    private Stage primaryStage;
    private Scene scene;
    
    private NavigationManager() {}
    
    public static NavigationManager getInstance() {
        if (instance == null) {
            instance = new NavigationManager();
        }
        return instance;
    }
    
    public void initialize(Stage stage) {
        this.primaryStage = stage;
    }
    
    public void navigateTo(Pane view) {
        if (scene == null) {
            scene = new Scene(view, 1400, 900);
            primaryStage.setScene(scene);
        } else {
            scene.setRoot(view);
        }
    }
    
    public Stage getPrimaryStage() {
        return primaryStage;
    }
    
    public Scene getScene() {
        return scene;
    }
}