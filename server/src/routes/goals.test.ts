import request from 'supertest'
import app from '../index'
import { getDb } from '../db/database'

afterAll(() => {
  const db = getDb()
  db.prepare('DELETE FROM goal_entries').run()
})

describe('GET /api/goals/yearly', () => {
  it('returns yearly goals with targets and current totals', async () => {
    const res = await request(app).get('/api/goals/yearly')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('year')
    expect(Array.isArray(res.body.goals)).toBe(true)
    expect(res.body.goals.length).toBeGreaterThan(0)

    const running = res.body.goals.find((g: any) => g.goal_key === 'running_miles')
    expect(running).toBeDefined()
    expect(running).toHaveProperty('target')
    expect(running).toHaveProperty('current')
  })
})

describe('POST /api/goals/yearly', () => {
  it('adds a goal entry and updates the total', async () => {
    // Get baseline
    const before = await request(app).get('/api/goals/yearly')
    const booksBefore = before.body.goals.find((g: any) => g.goal_key === 'books')
    const beforeTotal = booksBefore?.current || 0

    // Add an entry
    const add = await request(app)
      .post('/api/goals/yearly')
      .send({ goal_key: 'books', value: 1 })
    expect(add.status).toBe(201)

    // Check total updated
    const after = await request(app).get('/api/goals/yearly')
    const booksAfter = after.body.goals.find((g: any) => g.goal_key === 'books')
    expect(booksAfter.current).toBe(beforeTotal + 1)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await request(app).post('/api/goals/yearly').send({ value: 1 }) // missing goal_key
    expect(res.status).toBe(400)
  })
})

describe('GET /api/goals/weekly', () => {
  it('returns weekly goals with targets', async () => {
    const res = await request(app).get('/api/goals/weekly')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('week_start')
    expect(res.body).toHaveProperty('week_end')
    expect(Array.isArray(res.body.goals)).toBe(true)
    expect(res.body.goals.length).toBe(3)
  })
})
