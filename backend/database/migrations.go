package database

import "log"

func RunMigrations() error {
	migrations := []string{
		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			name TEXT DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Projects table
		`CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			paper_count INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Saved papers table
		`CREATE TABLE IF NOT EXISTS saved_papers (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			paper_id TEXT NOT NULL,
			title TEXT NOT NULL,
			authors TEXT DEFAULT '[]',
			year INTEGER DEFAULT 0,
			abstract TEXT DEFAULT '',
			citation_count INTEGER DEFAULT 0,
			doi TEXT DEFAULT '',
			is_primary INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Graph data table
		`CREATE TABLE IF NOT EXISTS graph_data (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
			nodes TEXT DEFAULT '[]',
			edges TEXT DEFAULT '[]',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, migration := range migrations {
		_, err := DB.Exec(migration)
		if err != nil {
			log.Printf("[DB] Migration error: %v\nQuery: %s", err, migration)
			return err
		}
	}

	// Create indexes (IF NOT EXISTS is supported in PostgreSQL 9.5+)
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_saved_papers_project_id ON saved_papers(project_id)`,
		`CREATE INDEX IF NOT EXISTS idx_graph_data_project_id ON graph_data(project_id)`,
	}

	for _, idx := range indexes {
		_, err := DB.Exec(idx)
		if err != nil {
			log.Printf("[DB] Index creation error: %v\nQuery: %s", err, idx)
			// Don't fail on index errors, they might already exist
		}
	}

	return nil
}
