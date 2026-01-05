package database

import "log"

func RunMigrations() error {
	migrations := []string{
		// Projects table
		`CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			paper_count INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Saved papers table
		`CREATE TABLE IF NOT EXISTS saved_papers (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			paper_id TEXT NOT NULL,
			title TEXT NOT NULL,
			authors TEXT DEFAULT '[]',
			year INTEGER DEFAULT 0,
			abstract TEXT DEFAULT '',
			citation_count INTEGER DEFAULT 0,
			doi TEXT DEFAULT '',
			is_primary INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)`,

		// Graph data table
		`CREATE TABLE IF NOT EXISTS graph_data (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL UNIQUE,
			nodes TEXT DEFAULT '[]',
			edges TEXT DEFAULT '[]',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_saved_papers_project_id ON saved_papers(project_id)`,
		`CREATE INDEX IF NOT EXISTS idx_graph_data_project_id ON graph_data(project_id)`,
	}

	for _, migration := range migrations {
		_, err := DB.Exec(migration)
		if err != nil {
			log.Printf("[DB] Migration error: %v\nQuery: %s", err, migration)
			return err
		}
	}

	return nil
}
