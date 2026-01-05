package models

type Paper struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Authors       []string `json:"authors"`
	Year          int      `json:"year"`
	DOI           *string  `json:"doi,omitempty"`
	PdfUrl        *string  `json:"pdfUrl,omitempty"`
	ArxivId       *string  `json:"arxivId,omitempty"`
	CitationCount int      `json:"citationCount"`
	Abstract      string   `json:"abstract,omitempty"`
	IsPrimary     bool     `json:"isPrimary,omitempty"`
}

type PaperSearchResult struct {
	Papers []Paper `json:"papers"`
	Total  int     `json:"total,omitempty"`
}

// GraphEdge represents a connection between two papers
type GraphEdge struct {
	Source string `json:"source"` // Paper ID that cites
	Target string `json:"target"` // Paper ID being cited
}

// GraphData contains nodes (papers) and edges (citations)
type GraphData struct {
	Nodes []Paper     `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

// PaperWithGraph is a paper with its citation graph
type PaperWithGraph struct {
	Paper Paper     `json:"paper"`
	Graph GraphData `json:"graph"`
}
