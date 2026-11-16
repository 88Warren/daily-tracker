import api from './client'

export interface CalendarStatus {
  connected: boolean
  email?: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  date_label: string
  location: string | null
  color: string | null
}

export interface CalendarTodayResponse {
  connected: boolean
  events: CalendarEvent[]
}

export async function getCalendarStatus(): Promise<CalendarStatus> {
  const res = await api.get<CalendarStatus>('/calendar/status')
  return res.data
}

export async function getCalendarToday(days = 2): Promise<CalendarTodayResponse> {
  const res = await api.get<CalendarTodayResponse>('/calendar/today', {
    params: { days },
  })
  return res.data
}

export function calendarAuthUrl(): string {
  return '/api/calendar/auth'
}

export async function disconnectCalendar(): Promise<void> {
  await api.delete('/calendar/disconnect')
}
