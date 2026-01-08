package handlers

import (
	"backend/database"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/projects
func GetProjectsHandler(c *gin.Context) {
	// If user is authenticated, get their projects
	// Otherwise, return empty (or could return public projects)
	userID, exists := c.Get("userID")

	var projects []database.Project
	var err error

	if exists && userID != nil {
		projects, err = database.GetProjectsByUserID(userID.(string))
	} else {
		// Return empty for unauthenticated users
		projects = []database.Project{}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

// GET /api/projects/:id
func GetProjectHandler(c *gin.Context) {
	id := c.Param("id")

	project, err := database.GetProjectByID(id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get papers for this project
	papers, _ := database.GetPapersByProjectID(id)

	c.JSON(http.StatusOK, gin.H{
		"project": project,
		"papers":  papers,
	})
}

// POST /api/projects
type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func CreateProjectHandler(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	// Get userID from context (set by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required to create projects"})
		return
	}

	userIDStr := userID.(string)
	project, err := database.CreateProject(req.Name, req.Description, &userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"project": project})
}

// PUT /api/projects/:id
type UpdateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func UpdateProjectHandler(c *gin.Context) {
	id := c.Param("id")

	// Get userID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Check project ownership
	project, err := database.GetProjectByID(id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this project"})
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	err = database.UpdateProject(id, req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project updated"})
}

// DELETE /api/projects/:id
func DeleteProjectHandler(c *gin.Context) {
	id := c.Param("id")

	// Get userID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Check project ownership
	project, err := database.GetProjectByID(id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this project"})
		return
	}

	err = database.DeleteProject(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted"})
}

// POST /api/projects/:id/papers
type AddPaperRequest struct {
	PaperID       string   `json:"paperId" binding:"required"`
	Title         string   `json:"title" binding:"required"`
	Authors       []string `json:"authors"`
	Year          int      `json:"year"`
	Abstract      string   `json:"abstract"`
	CitationCount int      `json:"citationCount"`
	DOI           string   `json:"doi"`
	IsPrimary     bool     `json:"isPrimary"`
}

func AddPaperToProjectHandler(c *gin.Context) {
	projectID := c.Param("id")

	// Get userID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Check project ownership
	project, err := database.GetProjectByID(projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to modify this project"})
		return
	}

	var req AddPaperRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PaperID and Title are required"})
		return
	}

	paper := database.SavedPaper{
		PaperID:       req.PaperID,
		Title:         req.Title,
		Authors:       req.Authors,
		Year:          req.Year,
		Abstract:      req.Abstract,
		CitationCount: req.CitationCount,
		DOI:           req.DOI,
		IsPrimary:     req.IsPrimary,
	}

	savedPaper, err := database.AddPaperToProject(projectID, paper)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"paper": savedPaper})
}

// DELETE /api/projects/:id/papers/:paperId
func RemovePaperFromProjectHandler(c *gin.Context) {
	projectID := c.Param("id")
	paperID := c.Param("paperId")

	// Get userID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Check project ownership
	project, err := database.GetProjectByID(projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to modify this project"})
		return
	}

	err = database.RemovePaperFromProject(projectID, paperID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paper removed from project"})
}

// POST /api/projects/:id/graph
type SaveGraphRequest struct {
	Nodes []database.GraphNode `json:"nodes"`
	Edges []database.GraphEdge `json:"edges"`
}

func SaveGraphHandler(c *gin.Context) {
	projectID := c.Param("id")

	// Get userID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Check project ownership
	project, err := database.GetProjectByID(projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to modify this project"})
		return
	}

	var req SaveGraphRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	graphData, err := database.SaveGraphData(projectID, req.Nodes, req.Edges)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update project paper count
	database.DB.Exec(`UPDATE projects SET paper_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, len(req.Nodes), projectID)

	c.JSON(http.StatusCreated, gin.H{"graph": graphData})
}

// GET /api/projects/:id/graph
func GetGraphHandler(c *gin.Context) {
	projectID := c.Param("id")

	graphData, err := database.GetGraphByProjectID(projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Graph not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"graph": graphData})
}
