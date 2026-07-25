package handlers

import (
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
)

var paperIDRegex = regexp.MustCompile(`^[a-zA-Z0-9]{1,60}$`)

func validateParamID(c *gin.Context, param string) bool {
	val := c.Param(param)
	if val == "" || !paperIDRegex.MatchString(val) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		c.Abort()
		return false
	}
	return true
}
