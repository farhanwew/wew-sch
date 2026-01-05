package database

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ============ Project Queries ============

type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PaperCount  int       `json:"paperCount"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func GetAllProjects() ([]Project, error) {
	rows, err := DB.Query(`
		SELECT id, name, description, paper_count, created_at, updated_at 
		FROM projects 
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.PaperCount, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}

	if projects == nil {
		projects = []Project{}
	}

	return projects, nil
}

func GetProjectByID(id string) (*Project, error) {
	var p Project
	err := DB.QueryRow(`
		SELECT id, name, description, paper_count, created_at, updated_at 
		FROM projects WHERE id = ?
	`, id).Scan(&p.ID, &p.Name, &p.Description, &p.PaperCount, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return &p, nil
}

func CreateProject(name, description string) (*Project, error) {
	id := uuid.New().String()
	now := time.Now()

	_, err := DB.Exec(`
		INSERT INTO projects (id, name, description, paper_count, created_at, updated_at)
		VALUES (?, ?, ?, 0, ?, ?)
	`, id, name, description, now, now)

	if err != nil {
		return nil, err
	}

	return &Project{
		ID:          id,
		Name:        name,
		Description: description,
		PaperCount:  0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func UpdateProject(id, name, description string) error {
	_, err := DB.Exec(`
		UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?
	`, name, description, time.Now(), id)
	return err
}

func DeleteProject(id string) error {
	_, err := DB.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return err
}

// ============ Saved Paper Queries ============

type SavedPaper struct {
	ID            string    `json:"id"`
	ProjectID     string    `json:"projectId"`
	PaperID       string    `json:"paperId"`
	Title         string    `json:"title"`
	Authors       []string  `json:"authors"`
	Year          int       `json:"year"`
	Abstract      string    `json:"abstract"`
	CitationCount int       `json:"citationCount"`
	DOI           string    `json:"doi,omitempty"`
	IsPrimary     bool      `json:"isPrimary"`
	CreatedAt     time.Time `json:"createdAt"`
}

func GetPapersByProjectID(projectID string) ([]SavedPaper, error) {
	rows, err := DB.Query(`
		SELECT id, project_id, paper_id, title, authors, year, abstract, citation_count, doi, is_primary, created_at
		FROM saved_papers WHERE project_id = ? ORDER BY created_at DESC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var papers []SavedPaper
	for rows.Next() {
		var p SavedPaper
		var authorsJSON string
		var isPrimary int

		err := rows.Scan(&p.ID, &p.ProjectID, &p.PaperID, &p.Title, &authorsJSON, &p.Year, &p.Abstract, &p.CitationCount, &p.DOI, &isPrimary, &p.CreatedAt)
		if err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(authorsJSON), &p.Authors)
		p.IsPrimary = isPrimary == 1

		papers = append(papers, p)
	}

	if papers == nil {
		papers = []SavedPaper{}
	}

	return papers, nil
}

func AddPaperToProject(projectID string, paper SavedPaper) (*SavedPaper, error) {
	id := uuid.New().String()
	now := time.Now()

	authorsJSON, _ := json.Marshal(paper.Authors)
	isPrimary := 0
	if paper.IsPrimary {
		isPrimary = 1
	}

	_, err := DB.Exec(`
		INSERT INTO saved_papers (id, project_id, paper_id, title, authors, year, abstract, citation_count, doi, is_primary, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, projectID, paper.PaperID, paper.Title, string(authorsJSON), paper.Year, paper.Abstract, paper.CitationCount, paper.DOI, isPrimary, now)

	if err != nil {
		return nil, err
	}

	// Update paper count
	DB.Exec(`UPDATE projects SET paper_count = paper_count + 1, updated_at = ? WHERE id = ?`, now, projectID)

	paper.ID = id
	paper.ProjectID = projectID
	paper.CreatedAt = now
	return &paper, nil
}

func RemovePaperFromProject(projectID, paperID string) error {
	_, err := DB.Exec(`DELETE FROM saved_papers WHERE project_id = ? AND id = ?`, projectID, paperID)
	if err != nil {
		return err
	}

	// Update paper count
	DB.Exec(`UPDATE projects SET paper_count = paper_count - 1, updated_at = ? WHERE id = ?`, time.Now(), projectID)
	return nil
}

// ============ Graph Data Queries ============

type GraphNode struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Authors       []string `json:"authors"`
	Year          int      `json:"year"`
	CitationCount int      `json:"citationCount"`
	Abstract      string   `json:"abstract"`
	IsPrimary     bool     `json:"isPrimary"`
	DOI           string   `json:"doi,omitempty"`
	PdfUrl        string   `json:"pdfUrl,omitempty"`
	ArxivId       string   `json:"arxivId,omitempty"`
}

type GraphEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type GraphData struct {
	ID        string      `json:"id"`
	ProjectID string      `json:"projectId"`
	Nodes     []GraphNode `json:"nodes"`
	Edges     []GraphEdge `json:"edges"`
	CreatedAt time.Time   `json:"createdAt"`
	UpdatedAt time.Time   `json:"updatedAt"`
}

func GetGraphByProjectID(projectID string) (*GraphData, error) {
	var g GraphData
	var nodesJSON, edgesJSON string

	err := DB.QueryRow(`
		SELECT id, project_id, nodes, edges, created_at, updated_at
		FROM graph_data WHERE project_id = ?
	`, projectID).Scan(&g.ID, &g.ProjectID, &nodesJSON, &edgesJSON, &g.CreatedAt, &g.UpdatedAt)

	if err != nil {
		return nil, err
	}

	json.Unmarshal([]byte(nodesJSON), &g.Nodes)
	json.Unmarshal([]byte(edgesJSON), &g.Edges)

	return &g, nil
}

func SaveGraphData(projectID string, nodes []GraphNode, edges []GraphEdge) (*GraphData, error) {
	id := uuid.New().String()
	now := time.Now()

	nodesJSON, _ := json.Marshal(nodes)
	edgesJSON, _ := json.Marshal(edges)

	// Upsert - insert or replace
	_, err := DB.Exec(`
		INSERT OR REPLACE INTO graph_data (id, project_id, nodes, edges, created_at, updated_at)
		VALUES (
			COALESCE((SELECT id FROM graph_data WHERE project_id = ?), ?),
			?, ?, ?, 
			COALESCE((SELECT created_at FROM graph_data WHERE project_id = ?), ?),
			?
		)
	`, projectID, id, projectID, string(nodesJSON), string(edgesJSON), projectID, now, now)

	if err != nil {
		return nil, err
	}

	return &GraphData{
		ID:        id,
		ProjectID: projectID,
		Nodes:     nodes,
		Edges:     edges,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}
