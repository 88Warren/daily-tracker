import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'

const router = Router()

// GET /api/logs?date=2025-08-20
router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)

  const logs = db.prepare('SELECT * FROM habit_logs WHERE date = ?').all(date)
  res.json({ date, logs })
})

// GET /api/logs/range?start=2025-08-01&end=2025-08-31
router.get('/range', (req: Request, res: Response) => {
  const db = getDb()
  const { start, end } = req.query as { start: string; end: string }

  if (!start || !end) {
    res.status(400).json({ error: 'start and end query params required' })
    return
  }

  const logs = db
    .prepare('SELECT * FROM habit_logs WHERE date >= ? AND date <= ? ORDER BY date')
    .all(start, end)
  res.json({ start, end, logs })
})

// POST /api/logs  — upsert a habit log for a date
// Body: { date, habit_key, value, note? }
router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { date, habit_key, value, note } = req.body as {
    date: string
    habit_key: string
    value: number
    note?: string
  }

  if (!date || !habit_key || value === undefined) {
    res.status(400).json({ error: 'date, habit_key, and value are required' })
    return
  }

  const stmt = db.prepare(`
    INSERT INTO habit_logs (date, habit_key, value, note)
    VALUES (@date, @habit_key, @value, @note)
    ON CONFLICT(date, habit_key) DO UPDATE SET
      value = @value,
      note  = @note
  `)

  const result = stmt.run({ date, habit_key, value, note: note ?? null })
  const row = db
    .prepare('SELECT * FROM habit_logs WHERE id = ?')
    .get(result.lastInsertRowid)

  res.status(201).json(row)
})

// DELETE /api/logs/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM habit_logs WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: 'Log not found' })
    return
  }

  db.prepare('DELETE FROM habit_logs WHERE id = ?').run(id)
  res.json({ deleted: true, id: Number(id) })
})

export default router
