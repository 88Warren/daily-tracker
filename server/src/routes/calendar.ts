/**
 * Google Calendar OAuth2 integration — read-only event display.
 *
 * Flow:
 *   1. GET  /api/calendar/auth       → redirects to Google OAuth
 *   2. GET  /api/calendar/callback   → exchanges code for tokens, stores in DB
 *   3. GET  /api/calendar/status     → { connected: bool, email?: string }
 *   4. GET  /api/calendar/today      → events for today + tomorrow
 *   5. DELETE /api/calendar/disconnect → removes stored tokens
 */

import { Router, Request, Response } from 'express'
import { google } from 'googleapis'
import { getDb } from '../db/database'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

const router = Router()

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  || 'http://localhost:3001/api/calendar/callback'

function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

interface CalTokenRow {
  access_token: string
  refresh_token: string
  expiry_date: number
  email: string
}

function getCalTokens(): CalTokenRow | null {
  const db = getDb()
  return db.prepare("SELECT * FROM oauth_tokens WHERE provider = 'google_calendar'").get() as CalTokenRow | null
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/calendar/auth
router.get('/auth', (_req: Request, res: Response) => {
  if (!CLIENT_ID) {
    res.status(503).json({ error: 'Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' })
    return
  }

  const oauth2Client = getOAuthClient()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  })

  res.redirect(url)
})

// GET /api/calendar/callback
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query as { code?: string; error?: string }

  if (error || !code) {
    res.redirect('/?calendar=error')
    return
  }

  const oauth2Client = getOAuthClient()

  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  // Get user email
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const userInfo = await oauth2.userinfo.get()
  const email = userInfo.data.email || ''

  const db = getDb()
  db.prepare(`
    INSERT INTO oauth_tokens (provider, access_token, refresh_token, expiry_date, email)
    VALUES ('google_calendar', @access_token, @refresh_token, @expiry_date, @email)
    ON CONFLICT(provider) DO UPDATE SET
      access_token  = @access_token,
      refresh_token = COALESCE(@refresh_token, refresh_token),
      expiry_date   = @expiry_date,
      email         = @email
  `).run({
    access_token:  tokens.access_token  || '',
    refresh_token: tokens.refresh_token || null,
    expiry_date:   tokens.expiry_date   || 0,
    email,
  })

  res.redirect('/?calendar=connected')
})

// GET /api/calendar/status
router.get('/status', (_req: Request, res: Response) => {
  const tokens = getCalTokens()
  if (!tokens) {
    res.json({ connected: false })
    return
  }
  res.json({ connected: true, email: tokens.email })
})

// GET /api/calendar/today?days=2
router.get('/today', async (req: Request, res: Response) => {
  const tokens = getCalTokens()
  if (!tokens) {
    res.json({ connected: false, events: [] })
    return
  }

  const days = Math.min(Number(req.query.days) || 2, 7)

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date:   tokens.expiry_date,
  })

  // Auto-save refreshed tokens
  oauth2Client.on('tokens', (newTokens) => {
    const db = getDb()
    db.prepare(`
      UPDATE oauth_tokens
      SET access_token = @access_token, expiry_date = @expiry_date
      WHERE provider = 'google_calendar'
    `).run({
      access_token: newTokens.access_token || tokens.access_token,
      expiry_date:  newTokens.expiry_date  || tokens.expiry_date,
    })
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const timeMin = startOfDay(new Date()).toISOString()
  const timeMax = endOfDay(addDays(new Date(), days - 1)).toISOString()

  const eventsRes = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  })

  const rawEvents = eventsRes.data.items || []

  const events = rawEvents.map((e) => {
    const start = e.start?.dateTime || e.start?.date || ''
    const end   = e.end?.dateTime   || e.end?.date   || ''
    const isAllDay = !e.start?.dateTime

    return {
      id:        e.id,
      title:     e.summary || '(No title)',
      start,
      end,
      all_day:   isAllDay,
      date_label: start ? format(new Date(start), isAllDay ? 'd MMM' : 'd MMM · HH:mm') : '',
      location:  e.location || null,
      color:     e.colorId  || null,
    }
  })

  res.json({ connected: true, events })
})

// DELETE /api/calendar/disconnect
router.delete('/disconnect', (_req: Request, res: Response) => {
  const db = getDb()
  db.prepare("DELETE FROM oauth_tokens WHERE provider = 'google_calendar'").run()
  res.json({ disconnected: true })
})

export default router
