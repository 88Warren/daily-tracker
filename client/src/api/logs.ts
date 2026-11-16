import api from './client'
import type { DailyLogsResponse, HabitLog } from '../types'

export async function getDailyLogs(date: string): Promise<DailyLogsResponse> {
  const res = await api.get<DailyLogsResponse>('/logs', { params: { date } })
  return res.data
}

export async function upsertLog(payload: {
  date: string
  habit_key: string
  value: number
  note?: string
}): Promise<HabitLog> {
  const res = await api.post<HabitLog>('/logs', payload)
  return res.data
}

export async function deleteLog(id: number): Promise<void> {
  await api.delete(`/logs/${id}`)
}
