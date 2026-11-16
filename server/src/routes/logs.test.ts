import request from 'supertest'
import app from '../index'
import { getDb } from '../db/database'

afterAll(() => {
  const db = getDb()
  db.prepare('DELETE FROM habit_logs').run()
})

describe('GET /api/logs', () => {
  it('returns logs for a date', async () => {
    const res = await request(app).get('/api/logs?date=2025-01-01')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('date', '2025-01-01')
    expect(Array.isArray(res.body.logs)).toBe(true)
  })
})

describe('POST /api/logs', () => {
  it('creates a habit log and returns it', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ date: '2025-01-10', habit_key: 'weights_session', value: 1 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      date: '2025-01-10',
      habit_key: 'weights_session',
      value: 1,
    })
  })

  it('upserts when same date + habit_key posted again', async () => {
    await request(app)
      .post('/api/logs')
      .send({ date: '2025-01-11', habit_key: 'protein_g', value: 100 })

    const res = await request(app)
      .post('/api/logs')
      .send({ date: '2025-01-11', habit_key: 'protein_g', value: 145 })

    expect(res.status).toBe(201)
    expect(res.body.value).toBe(145)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ date: '2025-01-12' }) // missing habit_key and value

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/logs/:id', () => {
  it('deletes an existing log', async () => {
    const create = await request(app)
      .post('/api/logs')
      .send({ date: '2025-01-15', habit_key: 'drink_free', value: 1 })

    const id = create.body.id
    const del = await request(app).delete(`/api/logs/${id}`)
    expect(del.status).toBe(200)
    expect(del.body.deleted).toBe(true)
  })

  it('returns 404 for non-existent log', async () => {
    const res = await request(app).delete('/api/logs/999999')
    expect(res.status).toBe(404)
  })
})
