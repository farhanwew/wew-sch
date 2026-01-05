package models

type Paper struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Authors       []string `json:"authors"`
	Year          int      `json:"year"`
	DOI           *string  `json:"doi,omitempty"`
	CitationCount int      `json:"citationCount"`
	Abstract      string   `json:"abstract,omitempty"`
	IsPrimary     bool     `json:"isPrimary,omitempty"`
}

type PaperSearchResult struct {
	Papers []Paper `json:"papers"`
	Total  int     `json:"total,omitempty"`
}
