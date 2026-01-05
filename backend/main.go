package main

import (
	"backend/database"
	"backend/handlers"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file (ignore error if not exists, will use defaults)
	godotenv.Load()

	// Initialize database
	database.InitDB()

	r := gin.Default()

	// CORS middleware with configurable origins
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:5173,http://localhost:80,http://localhost,http://127.0.0.1:5173,http://127.0.0.1"
	}

	config := cors.Config{
		AllowOrigins:     strings.Split(corsOrigins, ","),
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}
	r.Use(cors.New(config))

	// Routes
	// Search
	r.GET("/api/search", handlers.SearchPapersHandler)

	// Paper & Graph
	r.GET("/api/paper/:id", handlers.GetPaperHandler)
	r.GET("/api/paper/:id/graph", handlers.BuildGraphHandler)

	// Projects (Library)
	r.GET("/api/projects", handlers.GetProjectsHandler)
	r.POST("/api/projects", handlers.CreateProjectHandler)
	r.GET("/api/projects/:id", handlers.GetProjectHandler)
	r.PUT("/api/projects/:id", handlers.UpdateProjectHandler)
	r.DELETE("/api/projects/:id", handlers.DeleteProjectHandler)

	// Project Papers
	r.POST("/api/projects/:id/papers", handlers.AddPaperToProjectHandler)
	r.DELETE("/api/projects/:id/papers/:paperId", handlers.RemovePaperFromProjectHandler)

	// Project Graph
	r.POST("/api/projects/:id/graph", handlers.SaveGraphHandler)
	r.GET("/api/projects/:id/graph", handlers.GetGraphHandler)

	// Get port from environment or default to 8000
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	r.Run(":" + port)
}
