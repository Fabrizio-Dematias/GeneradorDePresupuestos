package org.example.presupuesto.utils;

import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.stage.Stage;

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
        this.scene = new Scene(new Pane(), 1400, 900);
        stage.setScene(scene);
    }
    
    public void navigateTo(Pane view) {
        if (scene != null) {
            scene.setRoot(view);
            System.out.println("✅ Navegación a: " + view.getClass().getSimpleName());
        }
    }
    
    public Scene getScene() {
        return scene;
    }
    
    public Stage getPrimaryStage() {
        return primaryStage;
    }
}