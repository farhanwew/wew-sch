package handlers

import (
	"backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GET /api/paper/:id
func GetPaperHandler(c *gin.Context) {
	paperID := c.Param("id")

	paper, err := services.GetPaperByID(paperID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"paper": paper})
}

// GET /api/paper/:id/graph
// Query params:
//   - citations: max citations to include (default 20)
//   - references: max references to include (default 20)
func BuildGraphHandler(c *gin.Context) {
	paperID := c.Param("id")

	// Parse query params with defaults
	citationLimit := 20
	referenceLimit := 20

	if c.Query("citations") != "" {
		if val, err := strconv.Atoi(c.Query("citations")); err == nil {
			citationLimit = val
		}
	}
	if c.Query("references") != "" {
		if val, err := strconv.Atoi(c.Query("references")); err == nil {
			referenceLimit = val
		}
	}

	// Cap limits to avoid huge responses
	if citationLimit > 50 {
		citationLimit = 50
	}
	if referenceLimit > 50 {
		referenceLimit = 50
	}

	result, err := services.GetPaperWithCitations(paperID, citationLimit, referenceLimit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/paper/:id/deep-graph
// Builds a graph with inter-connections between citation and reference nodes
// Query params:
//   - citations: max citations to include (default 15)
//   - references: max references to include (default 15)
func BuildDeepGraphHandler(c *gin.Context) {
	paperID := c.Param("id")

	// Parse query params with defaults (lower default for deep graph due to more API calls)
	citationLimit := 15
	referenceLimit := 15

	if c.Query("citations") != "" {
		if val, err := strconv.Atoi(c.Query("citations")); err == nil {
			citationLimit = val
		}
	}
	if c.Query("references") != "" {
		if val, err := strconv.Atoi(c.Query("references")); err == nil {
			referenceLimit = val
		}
	}

	// Cap limits to avoid huge responses and too many API calls
	if citationLimit > 30 {
		citationLimit = 30
	}
	if referenceLimit > 30 {
		referenceLimit = 30
	}

	result, err := services.GetDeepGraph(paperID, citationLimit, referenceLimit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
