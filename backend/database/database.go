package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://wewscholar:wewscholar_secret@localhost:5432/wewscholar?sslmode=disable"
	}

	var err error
	DB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("[DB] Failed to open database:", err)
	}

	// Test connection
	if err = DB.Ping(); err != nil {
		log.Fatal("[DB] Failed to ping database:", err)
	}

	log.Println("[DB] Connected to PostgreSQL")

	// Run migrations
	if err = RunMigrations(); err != nil {
		log.Fatal("[DB] Migration failed:", err)
	}

	log.Println("[DB] Migrations completed")
}

func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}
