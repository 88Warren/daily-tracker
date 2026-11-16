import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'

const router = Router()

// GET /api/metrics/latest — most recent weight and body fat
router.get('/latest', (_req: Request, res: Response) => {
  const db = getDb()

  const latest = db
    .prepare(`
      SELECT * FROM body_metrics
      ORDER BY date DESC
      LIMIT 1
    `)
    .get()

  const latestBodyFat = db
    .prepare(`
      SELECT * FROM body_metrics
      WHERE body_fat_pct IS NOT NULL
      ORDER BY date DESC
      LIMIT 1
    `)
    .get()

  res.json({ latest: latest || null, latest_body_fat: latestBodyFat || null })
})

// GET /api/metrics/history?start=2025-01-01&end=2025-12-31
router.get('/history', (req: Request, res: Response) => {
  const db = getDb()
  const { start, end } = req.query as { start?: string; end?: string }

  let rows
  if (start && end) {
    rows = db
      .prepare('SELECT * FROM body_metrics WHERE date >= ? AND date <= ? ORDER BY date')
      .all(start, end)
  } else {
    rows = db
      .prepare('SELECT * FROM body_metrics ORDER BY date')
      .all()
  }

  res.json({ metrics: rows })
})

// POST /api/metrics — log weight or body fat (or both)
// Body: { date?, weight_kg?, body_fat_pct? }
router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { date, weight_kg, body_fat_pct } = req.body as {
    date?: string
    weight_kg?: number
    body_fat_pct?: number
  }

  if (weight_kg === undefined && body_fat_pct === undefined) {
    res.status(400).json({ error: 'At least one of weight_kg or body_fat_pct is required' })
    return
  }

  const entryDate = date || new Date().toISOString().slice(0, 10)

  db.prepare(`
    INSERT INTO body_metrics (date, weight_kg, body_fat_pct)
    VALUES (@date, @weight_kg, @body_fat_pct)
    ON CONFLICT(date) DO UPDATE SET
      weight_kg    = COALESCE(@weight_kg, weight_kg),
      body_fat_pct = COALESCE(@body_fat_pct, body_fat_pct)
  `).run({ date: entryDate, weight_kg: weight_kg ?? null, body_fat_pct: body_fat_pct ?? null })

  const row = db.prepare('SELECT * FROM body_metrics WHERE date = ?').get(entryDate)
  res.status(201).json(row)
})

export default router
