package models

type S2SearchResponse struct {
	Total int       `json:"total"`
	Token *string   `json:"token,omitempty"` // For /search/bulk pagination
	Data  []S2Paper `json:"data"`
}

type S2Paper struct {
	PaperId       string         `json:"paperId"`
	Title         string         `json:"title"`
	Abstract      string         `json:"abstract,omitempty"`
	Year          int            `json:"year"`
	CitationCount int            `json:"citationCount"`
	Authors       []S2Author     `json:"authors"`
	ExternalIds   *S2ExternalIds `json:"externalIds,omitempty"`
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
