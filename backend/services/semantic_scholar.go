package services

import (
	"backend/models"
	"bytes"
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

	// Retry configuration
	maxRetries     = 5
	initialBackoff = 1 * time.Second
	maxBackoff     = 30 * time.Second
)

var httpClient = &http.Client{
	Timeout: 30 * time.Second,
}

// doRequestWithRetry performs an HTTP request with exponential backoff retry on rate limit errors
func doRequestWithRetry(req *http.Request) (*http.Response, []byte, error) {
	backoff := initialBackoff

	for attempt := 1; attempt <= maxRetries; attempt++ {
		log.Printf("[DEBUG] Attempt %d/%d: %s %s", attempt, maxRetries, req.Method, req.URL.String())

		resp, err := httpClient.Do(req)
		if err != nil {
			log.Printf("[ERROR] HTTP request failed on attempt %d: %v", attempt, err)
			return nil, nil, err
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Printf("[ERROR] Failed to read response body: %v", err)
			return nil, nil, err
		}

		// If not rate limited, return the response
		if resp.StatusCode != http.StatusTooManyRequests {
			return resp, body, nil
		}

		// Rate limited - retry with backoff
		log.Printf("[RATE LIMIT] 429 Too Many Requests on attempt %d/%d", attempt, maxRetries)
		log.Printf("[RATE LIMIT] Response: %s", string(body))

		if attempt < maxRetries {
			log.Printf("[RETRY] Waiting %v before retry...", backoff)
			time.Sleep(backoff)
			// Exponential backoff with cap
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
		}
	}

	return nil, nil, fmt.Errorf("rate limit exceeded after %d retries - please wait and try again later", maxRetries)
}

// doGetWithRetry is a convenience wrapper for GET requests with retry logic
func doGetWithRetry(url string) (*http.Response, []byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, nil, err
	}
	return doRequestWithRetry(req)
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

	// Use retry logic for the request
	resp, body, err := doRequestWithRetry(req)
	if err != nil {
		log.Printf("[ERROR] Request failed after retries: %v", err)
		return models.PaperSearchResult{}, err
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

	resp, body, err := doGetWithRetry(url)
	if err != nil {
		log.Printf("[ERROR] Request failed after retries: %v", err)
		return nil, err
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

// GetPapersBatch fetches multiple papers by their IDs using batch API
func GetPapersBatch(paperIDs []string) ([]models.S2PaperBatchItem, error) {
	if len(paperIDs) == 0 {
		return []models.S2PaperBatchItem{}, nil
	}

	// Semantic Scholar batch endpoint - max 500 papers per request
	url := fmt.Sprintf("%s/batch?fields=title,authors,year,abstract,citationCount,externalIds,openAccessPdf,references,citations", SemanticScholarPaperURL)

	// Create request body with paper IDs
	requestBody := map[string][]string{"ids": paperIDs}
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	log.Printf("[DEBUG] Batch requesting %d papers", len(paperIDs))

	resp, body, err := doRequestWithRetry(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ERROR] Batch API returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("API error: %s", resp.Status)
	}

	var papers []models.S2PaperBatchItem
	if err := json.Unmarshal(body, &papers); err != nil {
		log.Printf("[ERROR] JSON parse failed: %v", err)
		return nil, err
	}

	log.Printf("[SUCCESS] Got %d papers from batch API", len(papers))
	return papers, nil
}

// GetPaperWithCitations fetches a paper with its citations and references
func GetPaperWithCitations(paperID string, citationLimit int, referenceLimit int) (*models.PaperWithGraph, error) {
	// Build URL with citations and references - include abstract for all nested papers
	url := fmt.Sprintf("%s/%s?fields=title,authors,year,abstract,citationCount,externalIds,openAccessPdf,citations,references,citations.title,citations.authors,citations.year,citations.abstract,citations.citationCount,citations.externalIds,citations.openAccessPdf,references.title,references.authors,references.year,references.abstract,references.citationCount,references.externalIds,references.openAccessPdf",
		SemanticScholarPaperURL, paperID)

	log.Printf("[DEBUG] Requesting paper with citations: %s", url)

	resp, body, err := doGetWithRetry(url)
	if err != nil {
		log.Printf("[ERROR] Request failed after retries: %v", err)
		return nil, err
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

// GetDeepGraph builds a graph with inter-connections between citation and reference nodes
// This fetches the references of each node to find shared connections
func GetDeepGraph(paperID string, citationLimit int, referenceLimit int) (*models.PaperWithGraph, error) {
	// Step 1: Get the primary paper with its citations and references
	primaryData, err := GetPaperWithCitations(paperID, citationLimit, referenceLimit)
	if err != nil {
		return nil, err
	}

	// Collect all node IDs (excluding primary)
	nodeIDs := make([]string, 0)
	nodeIDSet := make(map[string]bool)
	nodeIDSet[paperID] = true // Mark primary as already processed

	for _, node := range primaryData.Graph.Nodes {
		if node.ID != paperID && node.ID != "" {
			nodeIDs = append(nodeIDs, node.ID)
			nodeIDSet[node.ID] = true
		}
	}

	if len(nodeIDs) == 0 {
		return primaryData, nil
	}

	log.Printf("[DEEP GRAPH] Found %d nodes, fetching their references for inter-connections", len(nodeIDs))

	// Step 2: Batch fetch references for all nodes (to find inter-connections)
	// We'll process in chunks to avoid hitting API limits
	chunkSize := 20 // Process 20 papers at a time
	additionalEdges := []models.GraphEdge{}

	for i := 0; i < len(nodeIDs); i += chunkSize {
		end := i + chunkSize
		if end > len(nodeIDs) {
			end = len(nodeIDs)
		}
		chunk := nodeIDs[i:end]

		// Fetch papers with their references
		papers, err := GetPapersBatch(chunk)
		if err != nil {
			log.Printf("[WARN] Batch fetch failed for chunk %d: %v", i/chunkSize, err)
			continue
		}

		// Find inter-connections: if a node's reference is also in our graph
		for _, paper := range papers {
			if paper.PaperId == "" {
				continue
			}

			// Check each reference
			for _, ref := range paper.References {
				if ref.PaperId == "" {
					continue
				}
				// If this reference is also a node in our graph, add an edge
				if nodeIDSet[ref.PaperId] {
					additionalEdges = append(additionalEdges, models.GraphEdge{
						Source: paper.PaperId,
						Target: ref.PaperId,
					})
				}
			}

			// Check each citation
			for _, cit := range paper.Citations {
				if cit.PaperId == "" {
					continue
				}
				// If this citation is also a node in our graph, add an edge
				if nodeIDSet[cit.PaperId] {
					additionalEdges = append(additionalEdges, models.GraphEdge{
						Source: cit.PaperId,
						Target: paper.PaperId,
					})
				}
			}
		}

		// Small delay between chunks to avoid rate limiting
		if end < len(nodeIDs) {
			time.Sleep(500 * time.Millisecond)
		}
	}

	log.Printf("[DEEP GRAPH] Found %d additional inter-connections", len(additionalEdges))

	// Step 3: Merge edges (avoid duplicates)
	edgeSet := make(map[string]bool)
	finalEdges := []models.GraphEdge{}

	// Add original edges
	for _, edge := range primaryData.Graph.Edges {
		key := edge.Source + "->" + edge.Target
		if !edgeSet[key] {
			edgeSet[key] = true
			finalEdges = append(finalEdges, edge)
		}
	}

	// Add new inter-connection edges
	for _, edge := range additionalEdges {
		key := edge.Source + "->" + edge.Target
		if !edgeSet[key] {
			edgeSet[key] = true
			finalEdges = append(finalEdges, edge)
		}
	}

	primaryData.Graph.Edges = finalEdges

	log.Printf("[DEEP GRAPH] Final graph: %d nodes, %d edges", len(primaryData.Graph.Nodes), len(finalEdges))

	return primaryData, nil
}
