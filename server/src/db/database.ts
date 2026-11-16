import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = process.env.DB_PATH || path.join(__dirname, '../../../data')
const DB_FILE = path.join(DB_DIR, 'tracker.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true })
    db = new Database(DB_FILE)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDb(): void {
  const db = getDb()

  db.exec(`
    -- Daily habit logs: one row per habit per day
    CREATE TABLE IF NOT EXISTS habit_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,          -- ISO date: 2025-08-20
      habit_key   TEXT NOT NULL,          -- e.g. 'weights_session', 'drink_free', 'alcohol_units'
      value       REAL NOT NULL DEFAULT 1,
      note        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, habit_key)
    );

    -- Yearly goal progress: running totals keyed by year + goal
    CREATE TABLE IF NOT EXISTS goal_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,          -- date the entry was logged
      year        INTEGER NOT NULL,
      goal_key    TEXT NOT NULL,          -- e.g. 'running_miles', 'tourist_parkrun', 'alcohol_units'
      value       REAL NOT NULL,          -- amount to add (can be negative to correct)
      note        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Body metrics: weight and body fat
    CREATE TABLE IF NOT EXISTS body_metrics (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL UNIQUE,
      weight_kg       REAL,
      body_fat_pct    REAL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Yearly goal targets (editable via settings)
    CREATE TABLE IF NOT EXISTS goal_targets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      year        INTEGER NOT NULL,
      goal_key    TEXT NOT NULL,
      target      REAL NOT NULL,
      direction   TEXT NOT NULL DEFAULT 'above', -- 'above' = more is better, 'below' = less is better
      label       TEXT NOT NULL,
      unit        TEXT NOT NULL DEFAULT '',
      q1          REAL,
      q2          REAL,
      q3          REAL,
      q4          REAL,
      UNIQUE(year, goal_key)
    );

    -- Weekly goal targets
    CREATE TABLE IF NOT EXISTS weekly_goal_targets (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      year      INTEGER NOT NULL,
      goal_key  TEXT NOT NULL,
      target    REAL NOT NULL,
      label     TEXT NOT NULL,
      unit      TEXT NOT NULL DEFAULT '',
      UNIQUE(year, goal_key)
    );

    -- OAuth tokens for external integrations (Google Calendar)
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      provider      TEXT NOT NULL UNIQUE,  -- 'google_calendar'
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      expires_at    INTEGER,               -- reserved for future use
      expiry_date   INTEGER,               -- unix ms (Google)
      athlete_name  TEXT,                  -- reserved for future use
      athlete_id    INTEGER,               -- reserved for future use
      email         TEXT,                  -- Google account email
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  seedDefaultTargets(db)
  console.log('Database initialised')
}

function seedDefaultTargets(db: Database.Database): void {
  const year = new Date().getFullYear()

  const yearlyTargets = [
    { goal_key: 'alcohol_units', target: 400, direction: 'below', label: 'Alcohol Units',    unit: 'units',   q1: 100, q2: 200, q3: 300, q4: 400 },
    { goal_key: 'running_miles', target: 280, direction: 'above', label: 'Running',           unit: 'miles',   q1: 70,  q2: 140, q3: 210, q4: 280 },
    { goal_key: 'tourist_parkrun', target: 10, direction: 'above', label: 'Tourist Parkruns', unit: 'parkruns', q1: 2,  q2: 5,   q3: 8,   q4: 10  },
    { goal_key: 'trelai_parkrun',  target: 16, direction: 'above', label: 'Trelai Parkruns',  unit: 'parkruns', q1: 4,  q2: 8,   q3: 12,  q4: 16  },
    { goal_key: 'audiobooks',      target: 12, direction: 'above', label: 'Audiobooks',       unit: 'books',   q1: 3,  q2: 6,   q3: 9,   q4: 12  },
    { goal_key: 'books',           target: 16, direction: 'above', label: 'Books',            unit: 'books',   q1: 4,  q2: 8,   q3: 12,  q4: 16  },
  ]

  const insert = db.prepare(`
    INSERT OR IGNORE INTO goal_targets (year, goal_key, target, direction, label, unit, q1, q2, q3, q4)
    VALUES (@year, @goal_key, @target, @direction, @label, @unit, @q1, @q2, @q3, @q4)
  `)

  for (const t of yearlyTargets) {
    insert.run({ year, ...t })
  }

  const weeklyTargets = [
    { goal_key: 'weights_sessions', target: 4,  label: 'Weights Sessions', unit: 'sessions' },
    { goal_key: 'run_miles',        target: 6,  label: 'Run Miles',        unit: 'miles'    },
    { goal_key: 'walk_miles',       target: 10, label: 'Walk Miles',       unit: 'miles'    },
  ]

  const insertWeekly = db.prepare(`
    INSERT OR IGNORE INTO weekly_goal_targets (year, goal_key, target, label, unit)
    VALUES (@year, @goal_key, @target, @label, @unit)
  `)

  for (const t of weeklyTargets) {
    insertWeekly.run({ year, ...t })
  }
}
