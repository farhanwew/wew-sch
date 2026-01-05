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
