package database

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ============ User Queries ============

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func GetUserByEmail(email string) (*User, error) {
	var u User
	err := DB.QueryRow(`
		SELECT id, email, password_hash, name, created_at, updated_at 
		FROM users WHERE email = $1
	`, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByID(id string) (*User, error) {
	var u User
	err := DB.QueryRow(`
		SELECT id, email, password_hash, name, created_at, updated_at 
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return &u, nil
}

func CreateUser(email, passwordHash, name string) (*User, error) {
	id := uuid.New().String()
	now := time.Now()

	_, err := DB.Exec(`
		INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, email, passwordHash, name, now, now)

	if err != nil {
		return nil, err
	}

	return &User{
		ID:        id,
		Email:     email,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// ============ Project Queries ============

type Project struct {
	ID          string    `json:"id"`
	UserID      *string   `json:"userId,omitempty"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PaperCount  int       `json:"paperCount"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func GetAllProjects() ([]Project, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, name, description, paper_count, created_at, updated_at 
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
		err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Description, &p.PaperCount, &p.CreatedAt, &p.UpdatedAt)
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

func GetProjectsByUserID(userID string) ([]Project, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, name, description, paper_count, created_at, updated_at 
		FROM projects 
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Description, &p.PaperCount, &p.CreatedAt, &p.UpdatedAt)
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
		SELECT id, user_id, name, description, paper_count, created_at, updated_at 
		FROM projects WHERE id = $1
	`, id).Scan(&p.ID, &p.UserID, &p.Name, &p.Description, &p.PaperCount, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return &p, nil
}

func CreateProject(name, description string, userID *string) (*Project, error) {
	id := uuid.New().String()
	now := time.Now()

	_, err := DB.Exec(`
		INSERT INTO projects (id, user_id, name, description, paper_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 0, $5, $6)
	`, id, userID, name, description, now, now)

	if err != nil {
		return nil, err
	}

	return &Project{
		ID:          id,
		UserID:      userID,
		Name:        name,
		Description: description,
		PaperCount:  0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func UpdateProject(id, name, description string) error {
	_, err := DB.Exec(`
		UPDATE projects SET name = $1, description = $2, updated_at = $3 WHERE id = $4
	`, name, description, time.Now(), id)
	return err
}

func DeleteProject(id string) error {
	_, err := DB.Exec(`DELETE FROM projects WHERE id = $1`, id)
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
		FROM saved_papers WHERE project_id = $1 ORDER BY created_at DESC
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
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, id, projectID, paper.PaperID, paper.Title, string(authorsJSON), paper.Year, paper.Abstract, paper.CitationCount, paper.DOI, isPrimary, now)

	if err != nil {
		return nil, err
	}

	// Update paper count
	DB.Exec(`UPDATE projects SET paper_count = paper_count + 1, updated_at = $1 WHERE id = $2`, now, projectID)

	paper.ID = id
	paper.ProjectID = projectID
	paper.CreatedAt = now
	return &paper, nil
}

func RemovePaperFromProject(projectID, paperID string) error {
	_, err := DB.Exec(`DELETE FROM saved_papers WHERE project_id = $1 AND id = $2`, projectID, paperID)
	if err != nil {
		return err
	}

	// Update paper count
	DB.Exec(`UPDATE projects SET paper_count = paper_count - 1, updated_at = $1 WHERE id = $2`, time.Now(), projectID)
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
		FROM graph_data WHERE project_id = $1
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

	// PostgreSQL upsert using ON CONFLICT
	_, err := DB.Exec(`
		INSERT INTO graph_data (id, project_id, nodes, edges, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (project_id) DO UPDATE SET
			nodes = EXCLUDED.nodes,
			edges = EXCLUDED.edges,
			updated_at = EXCLUDED.updated_at
	`, id, projectID, string(nodesJSON), string(edgesJSON), now, now)

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
