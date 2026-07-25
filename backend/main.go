package main

import (
	"backend/database"
	"backend/handlers"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

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

	// Security headers middleware
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "0")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	})

	// General rate limiting
	r.Use(handlers.GeneralRateLimitMiddleware())

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
	r.POST("/api/auth/register", handlers.AuthRateLimitMiddleware(), handlers.RegisterHandler)
	r.POST("/api/auth/login", handlers.AuthRateLimitMiddleware(), handlers.LoginHandler)
	r.GET("/api/auth/me", handlers.AuthMiddleware(), handlers.GetMeHandler)
	r.POST("/api/auth/logout", handlers.LogoutHandler)

	// Routes
	// Search
	r.GET("/api/search", handlers.SearchPapersHandler)

	// Paper & Graph (public - for viewing)
	r.GET("/api/paper/:id", handlers.GetPaperHandler)
	r.GET("/api/paper/:id/graph", handlers.BuildGraphHandler)
	r.GET("/api/paper/:id/deep-graph", handlers.BuildDeepGraphHandler)

	// Projects - GET uses optional auth (returns user's projects if logged in)
	r.GET("/api/projects", handlers.OptionalAuthMiddleware(), handlers.GetProjectsHandler)
	r.GET("/api/projects/:id", handlers.OptionalAuthMiddleware(), handlers.GetProjectHandler)
	r.GET("/api/projects/:id/graph", handlers.OptionalAuthMiddleware(), handlers.GetGraphHandler)

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

	// Graceful shutdown
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("Server starting on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	database.CloseDB()
	log.Println("Server exited")
}
