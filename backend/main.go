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

	// Auth routes (public)
	r.POST("/api/auth/register", handlers.RegisterHandler)
	r.POST("/api/auth/login", handlers.LoginHandler)
	r.GET("/api/auth/me", handlers.AuthMiddleware(), handlers.GetMeHandler)

	// Routes
	// Search
	r.GET("/api/search", handlers.SearchPapersHandler)

	// Paper & Graph (public - for viewing)
	r.GET("/api/paper/:id", handlers.GetPaperHandler)
	r.GET("/api/paper/:id/graph", handlers.BuildGraphHandler)
	r.GET("/api/paper/:id/deep-graph", handlers.BuildDeepGraphHandler)

	// Projects - GET uses optional auth (returns user's projects if logged in)
	r.GET("/api/projects", handlers.OptionalAuthMiddleware(), handlers.GetProjectsHandler)
	r.GET("/api/projects/:id", handlers.GetProjectHandler)
	r.GET("/api/projects/:id/graph", handlers.GetGraphHandler)

	// Projects - Protected routes (require auth)
	authProjects := r.Group("/api/projects")
	authProjects.Use(handlers.AuthMiddleware())
	{
		authProjects.POST("", handlers.CreateProjectHandler)
		authProjects.PUT("/:id", handlers.UpdateProjectHandler)
		authProjects.DELETE("/:id", handlers.DeleteProjectHandler)
		authProjects.POST("/:id/papers", handlers.AddPaperToProjectHandler)
		authProjects.DELETE("/:id/papers/:paperId", handlers.RemovePaperFromProjectHandler)
		authProjects.POST("/:id/graph", handlers.SaveGraphHandler)
	}

	// Get port from environment or default to 8000
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	r.Run(":" + port)
}
