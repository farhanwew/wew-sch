package services

import (
	"backend/models"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const (
	SemanticScholarAPIURL = "https://api.semanticscholar.org/graph/v1/paper/search/bulk"
)

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

func SearchPapers(query string, limit int, offset int) (models.PaperSearchResult, error) {
	// Build request URL with query parameters
	req, err := http.NewRequest("GET", SemanticScholarAPIURL, nil)
	if err != nil {
		log.Printf("[ERROR] Failed to create request: %v", err)
		return models.PaperSearchResult{}, err
	}
	q := req.URL.Query()
	q.Add("query", query)
	q.Add("limit", fmt.Sprintf("%d", limit))

	q.Add("fields", "title,authors,year,abstract,citationCount,externalIds")
	q.Add("sort", "citationCount:desc") // Sort by most cited first
	req.URL.RawQuery = q.Encode()

	log.Printf("[DEBUG] Requesting: %s", req.URL.String())

	resp, err := httpClient.Do(req)

	if err != nil {
		log.Printf("[ERROR] HTTP request failed: %v", err)
		return models.PaperSearchResult{}, err
	}

	defer resp.Body.Close()

	// Read body for debugging
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[ERROR] Failed to read response body: %v", err)
		return models.PaperSearchResult{}, err
	}

	// Handle different status codes
	if resp.StatusCode == http.StatusTooManyRequests {
		log.Printf("[RATE LIMIT] 429 Too Many Requests - Wait 5 minutes!")
		log.Printf("[RATE LIMIT] Response: %s", string(body))
		return models.PaperSearchResult{}, fmt.Errorf("rate limit exceeded - please wait 5 minutes and try again")
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ERROR] API returned status %d: %s", resp.StatusCode, string(body))
		return models.PaperSearchResult{}, fmt.Errorf("API error: %s", resp.Status)
	}

	log.Printf("[SUCCESS] Got response, parsing JSON...")

	// Parse JSON response
	var s2Response models.S2SearchResponse
	err = json.Unmarshal(body, &s2Response)
	if err != nil {
		log.Printf("[ERROR] JSON parse failed: %v", err)
		log.Printf("[ERROR] Response body: %s", string(body))
		return models.PaperSearchResult{}, err
	}

	log.Printf("[SUCCESS] Found %d papers (total: %d)", len(s2Response.Data), s2Response.Total)

	// Transform to PaperSearchResult
	return s2Response.ToPaperSearchResult(), nil
}
