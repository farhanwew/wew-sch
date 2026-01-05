package models

type S2SearchResponse struct {
	Total int       `json:"total"`
	Token *string   `json:"token,omitempty"` // For /search/bulk pagination
	Data  []S2Paper `json:"data"`
}

type S2Paper struct {
	PaperId       string           `json:"paperId"`
	Title         string           `json:"title"`
	Abstract      string           `json:"abstract,omitempty"`
	Year          int              `json:"year"`
	CitationCount int              `json:"citationCount"`
	Authors       []S2Author       `json:"authors"`
	ExternalIds   *S2ExternalIds   `json:"externalIds,omitempty"`
	OpenAccessPdf *S2OpenAccessPdf `json:"openAccessPdf,omitempty"`
}

type S2OpenAccessPdf struct {
	Url    string `json:"url"`
	Status string `json:"status,omitempty"`
}

type S2Author struct {
	AuthorId string `json:"authorId"`
	Name     string `json:"name"`
}

type S2ExternalIds struct {
	DOI      string `json:"DOI,omitempty"`
	ArXiv    string `json:"ArXiv,omitempty"`
	CorpusId int    `json:"CorpusId,omitempty"`
}

func (s S2Paper) ToPaper() Paper {
	var doi *string
	if s.ExternalIds != nil && s.ExternalIds.DOI != "" {
		doi = &s.ExternalIds.DOI
	}
	var pdfUrl *string
	if s.OpenAccessPdf != nil && s.OpenAccessPdf.Url != "" {
		pdfUrl = &s.OpenAccessPdf.Url
	}
	var arxivId *string
	if s.ExternalIds != nil && s.ExternalIds.ArXiv != "" {
		arxivId = &s.ExternalIds.ArXiv
	}
	authors := make([]string, len(s.Authors))
	for i, author := range s.Authors {
		authors[i] = author.Name
	}
	return Paper{
		ID:            s.PaperId,
		Title:         s.Title,
		Authors:       authors,
		Year:          s.Year,
		DOI:           doi,
		PdfUrl:        pdfUrl,
		ArxivId:       arxivId,
		CitationCount: s.CitationCount,
		Abstract:      s.Abstract,
	}
}

func (r S2SearchResponse) ToPaperSearchResult() PaperSearchResult {
	papers := make([]Paper, len(r.Data))
	for i, s2Paper := range r.Data {
		papers[i] = s2Paper.ToPaper()
	}
	return PaperSearchResult{
		Papers: papers,
		Total:  r.Total,
	}
}

// S2PaperWithCitations is the response when requesting citations and references
type S2PaperWithCitations struct {
	S2Paper
	Citations  []S2Paper `json:"citations"`
	References []S2Paper `json:"references"`
}

// ToPaperWithGraph converts S2 response to our graph structure
func (p S2PaperWithCitations) ToPaperWithGraph(citationLimit, referenceLimit int) *PaperWithGraph {
	// Primary paper as first node
	primaryPaper := p.S2Paper.ToPaper()
	primaryPaper.IsPrimary = true

	nodes := []Paper{primaryPaper}
	edges := []GraphEdge{}

	// Add citations (papers that cite this paper)
	citationCount := 0
	for _, citation := range p.Citations {
		if citationCount >= citationLimit {
			break
		}
		if citation.PaperId == "" || citation.Title == "" {
			continue
		}

		paper := citation.ToPaper()
		nodes = append(nodes, paper)

		// Edge: citation -> primary (citation points to this paper)
		edges = append(edges, GraphEdge{
			Source: citation.PaperId,
			Target: p.PaperId,
		})
		citationCount++
	}

	// Add references (papers this paper cites)
	referenceCount := 0
	for _, reference := range p.References {
		if referenceCount >= referenceLimit {
			break
		}
		if reference.PaperId == "" || reference.Title == "" {
			continue
		}

		paper := reference.ToPaper()
		nodes = append(nodes, paper)

		// Edge: primary -> reference (this paper cites reference)
		edges = append(edges, GraphEdge{
			Source: p.PaperId,
			Target: reference.PaperId,
		})
		referenceCount++
	}

	return &PaperWithGraph{
		Paper: primaryPaper,
		Graph: GraphData{
			Nodes: nodes,
			Edges: edges,
		},
	}
}
