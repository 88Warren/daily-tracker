import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import basicAuth from 'express-basic-auth'
import { initDb } from './db/database'
import logsRouter from './routes/logs'
import goalsRouter from './routes/goals'
import metricsRouter from './routes/metrics'
import calendarRouter from './routes/calendar'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production'

// ── Health check — must be before basic auth so probes always succeed ─────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Basic auth (production only) ──────────────────────────────────────────────
if (IS_PROD && process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS) {
  app.use(basicAuth({
    users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASS },
    challenge: true,
    realm: 'Tracker',
  }))
}

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }))
app.use(express.json())

// ── Static client build (production) ─────────────────────────────────────────
if (IS_PROD) {
  const clientBuild = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientBuild))
}

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/logs',     logsRouter)
app.use('/api/goals',    goalsRouter)
app.use('/api/metrics',  metricsRouter)
app.use('/api/calendar', calendarRouter)

// ── SPA fallback (production) ─────────────────────────────────────────────────
if (IS_PROD) {
  app.get('*path', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
  })
}

// ── Startup ───────────────────────────────────────────────────────────────────
initDb()

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

export default app
