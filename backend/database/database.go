package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/wewscholar.db"
	}

	// Ensure data directory exists
	if err := os.MkdirAll("data", 0755); err != nil {
		log.Fatal("[DB] Failed to create data directory:", err)
	}

	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("[DB] Failed to open database:", err)
	}

	// Test connection
	if err = DB.Ping(); err != nil {
		log.Fatal("[DB] Failed to ping database:", err)
	}

	log.Println("[DB] Connected to SQLite:", dbPath)

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
