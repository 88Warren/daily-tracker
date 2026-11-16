import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react'
import { Card } from './Card'
import { getCalendarStatus, getCalendarToday, calendarAuthUrl } from '../api/calendar'
import type { CalendarEvent } from '../api/calendar'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'

export function CalendarCard() {
  const [connected, setConnected] = useState(false)
  const [email, setEmail] = useState('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCalendarStatus().then((s) => {
      setConnected(s.connected)
      setEmail(s.email || '')
      if (s.connected) {
        getCalendarToday(2)
          .then((r) => setEvents(r.events))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Handle OAuth return via query param
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
      getCalendarStatus().then((s) => {
        setConnected(s.connected)
        setEmail(s.email || '')
        if (s.connected) getCalendarToday(2).then((r) => setEvents(r.events))
      })
    }
  }, [])

  const todayEvents  = events.filter((e) => isToday(parseISO(e.start || e.end)))
  const tomorrowEvents = events.filter((e) => isTomorrow(parseISO(e.start || e.end)))

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Calendar
          </h3>
        </div>
        {connected && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{email}</span>
        )}
      </div>

      {!connected ? (
        <ConnectPrompt service="Google Calendar" authUrl={calendarAuthUrl()} />
      ) : loading ? (
        <SkeletonEvents />
      ) : events.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-5) 0' }}>
          No events in the next 2 days
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {todayEvents.length > 0 && (
            <EventGroup label="Today" events={todayEvents} />
          )}
          {tomorrowEvents.length > 0 && (
            <EventGroup label="Tomorrow" events={tomorrowEvents} />
          )}
        </div>
      )}
    </Card>
  )
}

function EventGroup({ label, events }: { label: string; events: CalendarEvent[] }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {events.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

function EventItem({ event }: { event: CalendarEvent }) {
  const timeLabel = event.all_day
    ? 'All day'
    : format(parseISO(event.start), 'HH:mm')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      backgroundColor: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      borderLeft: '3px solid var(--color-accent)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 1 }}>
        <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {timeLabel}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </div>
        {event.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.location}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectPrompt({ service, authUrl }: { service: string; authUrl: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Connect {service} to see your upcoming events
      </p>
      <a
        href={authUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '8px 16px',
          backgroundColor: 'var(--color-accent)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        <ExternalLink size={14} />
        Connect {service}
      </a>
    </div>
  )
}

function SkeletonEvents() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 44, backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }} />
      ))}
    </div>
  )
}
