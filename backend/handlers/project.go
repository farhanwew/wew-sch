package handlers

import (
	"backend/database"
	"database/sql"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
)

var projectIDRegex = regexp.MustCompile(`^[a-zA-Z0-9-]{1,64}$`)

func validateProjectID(c *gin.Context, param string) bool {
	val := c.Param(param)
	if val == "" || !projectIDRegex.MatchString(val) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID format"})
		c.Abort()
		return false
	}
	return true
}

// GET /api/projects
func GetProjectsHandler(c *gin.Context) {
	userID, exists := c.Get("userID")

	var projects []database.Project
	var err error

	if exists && userID != nil {
		projectType := c.Query("type") // optional: "auto" or "custom"
		if projectType != "" {
			projects, err = database.GetProjectsByUserIDAndType(userID.(string), projectType)
		} else {
			projects, err = database.GetProjectsByUserID(userID.(string))
		}
	} else {
		projects = []database.Project{}
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

// GET /api/projects/:id
func GetProjectHandler(c *gin.Context) {
	if !validateProjectID(c, "id") {
		return
	}
	id := c.Param("id")

	project, err := database.GetProjectByID(id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
		return
	}

	// Enforce ownership if project belongs to a user
	userID, _ := c.Get("userID")
	if project.UserID != nil {
		if userID == nil || userID.(string) != *project.UserID {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
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
	ProjectType string `json:"projectType"` // "auto" or "custom", defaults to "auto"
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

	projectType := req.ProjectType
	if projectType != "auto" && projectType != "custom" {
		projectType = "auto"
	}

	userIDStr := userID.(string)
	project, err := database.CreateProject(req.Name, req.Description, projectType, &userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
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
	if !validateProjectID(c, "id") {
		return
	}
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project updated"})
}

// DELETE /api/projects/:id
func DeleteProjectHandler(c *gin.Context) {
	if !validateProjectID(c, "id") {
		return
	}
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this project"})
		return
	}

	err = database.DeleteProject(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
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
	if !validateProjectID(c, "id") {
		return
	}
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"paper": savedPaper})
}

// DELETE /api/projects/:id/papers/:paperId
func RemovePaperFromProjectHandler(c *gin.Context) {
	if !validateProjectID(c, "id") {
		return
	}
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	if project.UserID == nil || *project.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to modify this project"})
		return
	}

	err = database.RemovePaperFromProject(projectID, paperID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
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
	if !validateProjectID(c, "id") {
		return
	}
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Update project paper count
	database.DB.Exec(`UPDATE projects SET paper_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, len(req.Nodes), projectID)

	c.JSON(http.StatusCreated, gin.H{"graph": graphData})
}

// GET /api/projects/:id/graph
func GetGraphHandler(c *gin.Context) {
	if !validateProjectID(c, "id") {
		return
	}
	projectID := c.Param("id")

	// Check project ownership before returning graph
	project, err := database.GetProjectByID(projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Graph not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch graph"})
		return
	}

	userID, _ := c.Get("userID")
	if project.UserID != nil {
		if userID == nil || userID.(string) != *project.UserID {
			c.JSON(http.StatusNotFound, gin.H{"error": "Graph not found"})
			return
		}
	}

	graphData, err := database.GetGraphByProjectID(projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Graph not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch graph"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"graph": graphData})
}
