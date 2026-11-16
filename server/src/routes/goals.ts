import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { getISOWeekBounds } from '../utils/dates'

const router = Router()

// ── Yearly goals ─────────────────────────────────────────────────────────────

// GET /api/goals/yearly?year=2025
router.get('/yearly', (req: Request, res: Response) => {
  const db = getDb()
  const year = Number(req.query.year) || new Date().getFullYear()

  const targets = db
    .prepare('SELECT * FROM goal_targets WHERE year = ?')
    .all(year)

  const totals = db
    .prepare(`
      SELECT goal_key, SUM(value) as total
      FROM goal_entries
      WHERE year = ?
      GROUP BY goal_key
    `)
    .all(year) as Array<{ goal_key: string; total: number }>

  const totalsMap: Record<string, number> = {}
  for (const t of totals) {
    totalsMap[t.goal_key] = t.total
  }

  // Alcohol units also roll up from daily habit_logs
  const alcoholFromLogs = db
    .prepare(`
      SELECT COALESCE(SUM(value), 0) as total
      FROM habit_logs
      WHERE habit_key = 'alcohol_units'
        AND strftime('%Y', date) = ?
    `)
    .get(String(year)) as { total: number }

  totalsMap['alcohol_units'] = (totalsMap['alcohol_units'] || 0) + (alcoholFromLogs?.total || 0)

  // Count drink-free days for the year
  const drinkFreeDays = db
    .prepare(`
      SELECT COUNT(*) as count
      FROM habit_logs
      WHERE habit_key = 'drink_free'
        AND value = 1
        AND strftime('%Y', date) = ?
    `)
    .get(String(year)) as { count: number }

  const goals = (targets as Array<Record<string, unknown>>).map((t) => ({
    ...t,
    current: totalsMap[t.goal_key as string] || 0,
    drink_free_days: t.goal_key === 'alcohol_units' ? (drinkFreeDays?.count || 0) : undefined,
  }))

  res.json({ year, goals })
})

// POST /api/goals/yearly — add an entry (increment a goal)
// Body: { goal_key, value, date?, note? }
router.post('/yearly', (req: Request, res: Response) => {
  const db = getDb()
  const { goal_key, value, date, note } = req.body as {
    goal_key: string
    value: number
    date?: string
    note?: string
  }

  if (!goal_key || value === undefined) {
    res.status(400).json({ error: 'goal_key and value are required' })
    return
  }

  const year = new Date().getFullYear()
  const entryDate = date || new Date().toISOString().slice(0, 10)

  const stmt = db.prepare(`
    INSERT INTO goal_entries (date, year, goal_key, value, note)
    VALUES (@date, @year, @goal_key, @value, @note)
  `)

  const result = stmt.run({ date: entryDate, year, goal_key, value, note: note ?? null })
  res.status(201).json({ id: result.lastInsertRowid, date: entryDate, year, goal_key, value })
})

// ── Yearly targets (settings) ─────────────────────────────────────────────────

// PUT /api/goals/yearly/targets/:goal_key
router.put('/yearly/targets/:goal_key', (req: Request, res: Response) => {
  const db = getDb()
  const { goal_key } = req.params
  const year = Number(req.query.year) || new Date().getFullYear()
  const { target, q1, q2, q3, q4, label, unit } = req.body

  db.prepare(`
    UPDATE goal_targets
    SET target = @target, q1 = @q1, q2 = @q2, q3 = @q3, q4 = @q4,
        label = @label, unit = @unit
    WHERE year = @year AND goal_key = @goal_key
  `).run({ target, q1, q2, q3, q4, label, unit, year, goal_key })

  res.json({ updated: true })
})

// ── Weekly goals ──────────────────────────────────────────────────────────────

// GET /api/goals/weekly?week=2025-W34  (or defaults to current week)
router.get('/weekly', (req: Request, res: Response) => {
  const db = getDb()
  const weekParam = req.query.week as string | undefined
  const { start, end } = getISOWeekBounds(weekParam)
  const year = new Date(start).getFullYear()

  const targets = db
    .prepare('SELECT * FROM weekly_goal_targets WHERE year = ?')
    .all(year)

  // Weights sessions: count habit_logs entries for the week
  const weightsSessions = db
    .prepare(`
      SELECT COUNT(*) as count
      FROM habit_logs
      WHERE habit_key = 'weights_session'
        AND value = 1
        AND date >= ? AND date <= ?
    `)
    .get(start, end) as { count: number }

  // Run and walk miles: sum from daily habit_logs
  const runMiles = db
    .prepare(`
      SELECT COALESCE(SUM(value), 0) as total
      FROM habit_logs
      WHERE habit_key = 'run_miles'
        AND date >= ? AND date <= ?
    `)
    .get(start, end) as { total: number }

  const walkMiles = db
    .prepare(`
      SELECT COALESCE(SUM(value), 0) as total
      FROM habit_logs
      WHERE habit_key = 'walk_miles'
        AND date >= ? AND date <= ?
    `)
    .get(start, end) as { total: number }

  const actuals: Record<string, number> = {
    weights_sessions: weightsSessions?.count || 0,
    run_miles: runMiles?.total || 0,
    walk_miles: walkMiles?.total || 0,
  }

  const goals = (targets as Array<Record<string, unknown>>).map((t) => ({
    ...t,
    current: actuals[t.goal_key as string] || 0,
  }))

  res.json({ week_start: start, week_end: end, goals })
})

// PUT /api/goals/weekly/targets/:goal_key
router.put('/weekly/targets/:goal_key', (req: Request, res: Response) => {
  const db = getDb()
  const { goal_key } = req.params
  const year = Number(req.query.year) || new Date().getFullYear()
  const { target } = req.body

  db.prepare(`
    UPDATE weekly_goal_targets SET target = ? WHERE year = ? AND goal_key = ?
  `).run(target, year, goal_key)

  res.json({ updated: true })
})

export default router
