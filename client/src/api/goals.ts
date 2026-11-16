import api from './client'
import type { YearlyGoalsResponse, WeeklyGoalsResponse } from '../types'

export async function getYearlyGoals(year?: number): Promise<YearlyGoalsResponse> {
  const res = await api.get<YearlyGoalsResponse>('/goals/yearly', {
    params: year ? { year } : {},
  })
  return res.data
}

export async function addYearlyEntry(payload: {
  goal_key: string
  value: number
  date?: string
  note?: string
}): Promise<void> {
  await api.post('/goals/yearly', payload)
}

export async function getWeeklyGoals(week?: string): Promise<WeeklyGoalsResponse> {
  const res = await api.get<WeeklyGoalsResponse>('/goals/weekly', {
    params: week ? { week } : {},
  })
  return res.data
}

export async function updateYearlyTarget(
  goalKey: string,
  payload: { target: number; q1?: number; q2?: number; q3?: number; q4?: number; label?: string; unit?: string },
  year?: number
): Promise<void> {
  await api.put(`/goals/yearly/targets/${goalKey}`, payload, {
    params: year ? { year } : {},
  })
}

export async function updateWeeklyTarget(
  goalKey: string,
  target: number,
  year?: number
): Promise<void> {
  await api.put(`/goals/weekly/targets/${goalKey}`, { target }, {
    params: year ? { year } : {},
  })
}
