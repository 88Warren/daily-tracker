import api from './client'
import type { MetricsLatestResponse, MetricsHistoryResponse, BodyMetric } from '../types'

export async function getLatestMetrics(): Promise<MetricsLatestResponse> {
  const res = await api.get<MetricsLatestResponse>('/metrics/latest')
  return res.data
}

export async function getMetricsHistory(start?: string, end?: string): Promise<MetricsHistoryResponse> {
  const res = await api.get<MetricsHistoryResponse>('/metrics/history', {
    params: start && end ? { start, end } : {},
  })
  return res.data
}

export async function logMetric(payload: {
  date?: string
  weight_kg?: number
  body_fat_pct?: number
}): Promise<BodyMetric> {
  const res = await api.post<BodyMetric>('/metrics', payload)
  return res.data
}
