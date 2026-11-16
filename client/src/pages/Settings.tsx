import React, { useEffect, useState } from 'react'
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { Card } from '../components/Card'
import { getYearlyGoals, getWeeklyGoals, updateYearlyTarget, updateWeeklyTarget } from '../api/goals'
import { getCalendarStatus, calendarAuthUrl, disconnectCalendar } from '../api/calendar'
import type { YearlyGoal, WeeklyGoal } from '../types'

export function Settings() {
  const year = new Date().getFullYear()
  const [yearlyGoals, setYearlyGoals] = useState<YearlyGoal[]>([])
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Integration status
  const [calConnected, setCalConnected] = useState(false)
  const [calEmail, setCalEmail]         = useState('')

  // Local edits state
  const [yearlyEdits, setYearlyEdits] = useState<Record<string, { target: string; q1: string; q2: string; q3: string; q4: string }>>({})
  const [weeklyEdits, setWeeklyEdits] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      getYearlyGoals(year),
      getWeeklyGoals(),
      getCalendarStatus(),
    ]).then(([yearly, weekly, cal]) => {
        setYearlyGoals(yearly.goals)
        setWeeklyGoals(weekly.goals)
        setCalConnected(cal.connected)
        setCalEmail(cal.email || '')

        const ye: typeof yearlyEdits = {}
        for (const g of yearly.goals) {
          ye[g.goal_key] = {
            target: String(g.target),
            q1: String(g.q1 ?? ''),
            q2: String(g.q2 ?? ''),
            q3: String(g.q3 ?? ''),
            q4: String(g.q4 ?? ''),
          }
        }
        setYearlyEdits(ye)

        const we: typeof weeklyEdits = {}
        for (const g of weekly.goals) {
          we[g.goal_key] = String(g.target)
        }
        setWeeklyEdits(we)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        ...yearlyGoals.map((g) => {
          const e = yearlyEdits[g.goal_key]
          if (!e) return Promise.resolve()
          return updateYearlyTarget(g.goal_key, {
            target: parseFloat(e.target) || g.target,
            q1: parseFloat(e.q1) || undefined,
            q2: parseFloat(e.q2) || undefined,
            q3: parseFloat(e.q3) || undefined,
            q4: parseFloat(e.q4) || undefined,
            label: g.label,
            unit: g.unit,
          }, year)
        }),
        ...weeklyGoals.map((g) => {
          const t = parseFloat(weeklyEdits[g.goal_key]) || g.target
          return updateWeeklyTarget(g.goal_key, t, year)
        }),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-sm)' }}>
        Update your targets for {year}. Changes take effect immediately on the dashboard.
      </p>

      {loading ? (
        <div style={{ height: 200, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Yearly targets */}
          <Card>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-5)' }}>
              Yearly Targets
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {yearlyGoals.map((goal) => {
                const e = yearlyEdits[goal.goal_key] || { target: '', q1: '', q2: '', q3: '', q4: '' }
                return (
                  <div key={goal.goal_key}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                      {goal.label}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                        ({goal.direction === 'below' ? 'stay under' : 'reach'} {goal.unit})
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
                      {(['target', 'q1', 'q2', 'q3', 'q4'] as const).map((field) => (
                        <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                            {field === 'target' ? 'Full year' : field.toUpperCase()}
                          </span>
                          <input
                            type="number"
                            value={e[field]}
                            onChange={(ev) =>
                              setYearlyEdits((prev) => ({
                                ...prev,
                                [goal.goal_key]: { ...e, [field]: ev.target.value },
                              }))
                            }
                            style={inputStyle}
                            onFocus={(ev) => { ev.currentTarget.style.borderColor = 'var(--color-accent)' }}
                            onBlur={(ev) => { ev.currentTarget.style.borderColor = 'var(--color-border)' }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Weekly targets */}
          <Card>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-5)' }}>
              Weekly Targets
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              {weeklyGoals.map((goal) => (
                <label key={goal.goal_key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {goal.label}
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                      ({goal.unit})
                    </span>
                  </span>
                  <input
                    type="number"
                    value={weeklyEdits[goal.goal_key] || ''}
                    onChange={(e) =>
                      setWeeklyEdits((prev) => ({ ...prev, [goal.goal_key]: e.target.value }))
                    }
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                  />
                </label>
              ))}
            </div>
          </Card>

          {/* Integrations */}
          <Card>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-5)' }}>
              Integrations
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <IntegrationRow
                name="Google Calendar"
                description="Shows today's and tomorrow's events on your dashboard"
                connected={calConnected}
                detail={calEmail}
                authUrl={calendarAuthUrl()}
                onDisconnect={async () => {
                  await disconnectCalendar()
                  setCalConnected(false)
                  setCalEmail('')
                }}
                accentColor="#4285F4"
              />
            </div>
          </Card>

          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 28px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                border: 'none',
                transition: 'opacity var(--transition-fast)',
              }}
            >
              {saving ? 'Saving...' : 'Save targets'}
            </button>
            {saved && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 500 }}>
                ✓ Saved!
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  backgroundColor: 'var(--color-bg)',
  outline: 'none',
  width: '100%',
  transition: 'border-color var(--transition-fast)',
}

// ── IntegrationRow ────────────────────────────────────────────────────────────

interface IntegrationRowProps {
  name: string
  description: string
  connected: boolean
  detail?: string
  authUrl: string
  onDisconnect: () => Promise<void>
  accentColor?: string
}

function IntegrationRow({ name, description, connected, detail, authUrl, onDisconnect, accentColor = 'var(--color-accent)' }: IntegrationRowProps) {
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    await onDisconnect()
    setDisconnecting(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-4)',
      backgroundColor: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      gap: 'var(--space-4)',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 200 }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 'var(--radius-md)',
          backgroundColor: `${accentColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}>
          {name === 'Google Calendar' ? '📅' : '🔗'}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{name}</span>
            {connected ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
            ) : (
              <XCircle size={14} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {connected && detail ? detail : description}
          </span>
        </div>
      </div>

      {connected ? (
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            cursor: disconnecting ? 'not-allowed' : 'pointer',
          }}
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
      ) : (
        <a
          href={authUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: accentColor,
            color: '#fff',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={12} />
          Connect
        </a>
      )}
    </div>
  )
}
