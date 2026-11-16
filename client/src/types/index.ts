// ── Yearly goals ─────────────────────────────────────────────────────────────

export interface YearlyGoal {
  id: number
  year: number
  goal_key: string
  target: number
  direction: 'above' | 'below'
  label: string
  unit: string
  q1: number | null
  q2: number | null
  q3: number | null
  q4: number | null
  current: number
  drink_free_days?: number
}

// ── Weekly goals ──────────────────────────────────────────────────────────────

export interface WeeklyGoal {
  id: number
  year: number
  goal_key: string
  target: number
  label: string
  unit: string
  current: number
}

// ── Habit logs ────────────────────────────────────────────────────────────────

export interface HabitLog {
  id: number
  date: string
  habit_key: string
  value: number
  note?: string
  created_at: string
}

export type HabitKey =
  | 'drink_free'
  | 'alcohol_units'
  | 'weights_session'
  | 'run_miles'
  | 'walk_miles'
  | 'protein_g'
  | 'calories'

// ── Body metrics ──────────────────────────────────────────────────────────────

export interface BodyMetric {
  id: number
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  created_at: string
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface DailyLogsResponse {
  date: string
  logs: HabitLog[]
}

export interface YearlyGoalsResponse {
  year: number
  goals: YearlyGoal[]
}

export interface WeeklyGoalsResponse {
  week_start: string
  week_end: string
  goals: WeeklyGoal[]
}

export interface MetricsLatestResponse {
  latest: BodyMetric | null
  latest_body_fat: BodyMetric | null
}

export interface MetricsHistoryResponse {
  metrics: BodyMetric[]
}

// ── Integration statuses ──────────────────────────────────────────────────────

export interface IntegrationStatus {
  calendar: { connected: boolean; email?: string }
}
