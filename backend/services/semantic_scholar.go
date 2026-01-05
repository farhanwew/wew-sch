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
	// Using regular search endpoint (not bulk) for better relevance ranking
	SemanticScholarAPIURL   = "https://api.semanticscholar.org/graph/v1/paper/search"
	SemanticScholarPaperURL = "https://api.semanticscholar.org/graph/v1/paper"
)

var httpClient = &http.Client{
	Timeout: 30 * time.Second,
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

	q.Add("fields", "title,authors,year,abstract,citationCount,externalIds,openAccessPdf")
	// Note: regular /paper/search sorts by relevance by default (no sort param needed)
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

// GetPaperByID fetches a single paper by its Semantic Scholar ID
func GetPaperByID(paperID string) (*models.Paper, error) {
	url := fmt.Sprintf("%s/%s?fields=title,authors,year,abstract,citationCount,externalIds,openAccessPdf", SemanticScholarPaperURL, paperID)

	log.Printf("[DEBUG] Requesting paper: %s", url)

	resp, err := httpClient.Get(url)
	if err != nil {
		log.Printf("[ERROR] HTTP request failed: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		log.Printf("[RATE LIMIT] 429 Too Many Requests")
		return nil, fmt.Errorf("rate limit exceeded")
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ERROR] API returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("API error: %s", resp.Status)
	}

	var s2Paper models.S2Paper
	if err := json.Unmarshal(body, &s2Paper); err != nil {
		return nil, err
	}

	paper := s2Paper.ToPaper()
	return &paper, nil
}

// GetPaperWithCitations fetches a paper with its citations and references
func GetPaperWithCitations(paperID string, citationLimit int, referenceLimit int) (*models.PaperWithGraph, error) {
	// Build URL with citations and references
	url := fmt.Sprintf("%s/%s?fields=title,authors,year,abstract,citationCount,externalIds,openAccessPdf,citations,references,citations.title,citations.authors,citations.year,citations.citationCount,citations.externalIds,citations.openAccessPdf,references.title,references.authors,references.year,references.citationCount,references.externalIds,references.openAccessPdf",
		SemanticScholarPaperURL, paperID)

	log.Printf("[DEBUG] Requesting paper with citations: %s", url)

	resp, err := httpClient.Get(url)
	if err != nil {
		log.Printf("[ERROR] HTTP request failed: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		log.Printf("[RATE LIMIT] 429 Too Many Requests")
		return nil, fmt.Errorf("rate limit exceeded - please wait and try again")
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ERROR] API returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("API error: %s", resp.Status)
	}

	var s2Response models.S2PaperWithCitations
	if err := json.Unmarshal(body, &s2Response); err != nil {
		log.Printf("[ERROR] JSON parse failed: %v", err)
		return nil, err
	}

	log.Printf("[SUCCESS] Got paper with %d citations, %d references", len(s2Response.Citations), len(s2Response.References))

	// Build graph
	return s2Response.ToPaperWithGraph(citationLimit, referenceLimit), nil
}
