import React, { useEffect, useState } from 'react'
import { Scale, Percent, AlertCircle } from 'lucide-react'
import { Card } from './Card'
import { getLatestMetrics, logMetric } from '../api/metrics'
import type { BodyMetric } from '../types'
import { format, differenceInDays, parseISO } from 'date-fns'

export function BodyMetrics() {
  const [latest, setLatest] = useState<BodyMetric | null>(null)
  const [latestBF, setLatestBF] = useState<BodyMetric | null>(null)
  const [loading, setLoading] = useState(true)
  const [weightInput, setWeightInput] = useState('')
  const [bfInput, setBfInput] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = () =>
    getLatestMetrics()
      .then((r) => {
        setLatest(r.latest)
        setLatestBF(r.latest_body_fat)
      })
      .finally(() => setLoading(false))

  useEffect(() => { refresh() }, [])

  async function handleSave() {
    const weight = weightInput ? parseFloat(weightInput) : undefined
    const bf = bfInput ? parseFloat(bfInput) : undefined
    if (!weight && !bf) return

    setSaving(true)
    await logMetric({ weight_kg: weight, body_fat_pct: bf })
    setWeightInput('')
    setBfInput('')
    await refresh()
    setSaving(false)
  }

  const daysSinceBF = latestBF?.date
    ? differenceInDays(new Date(), parseISO(latestBF.date))
    : null

  const bfDue = daysSinceBF === null || daysSinceBF >= 28

  return (
    <Card>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Body Metrics
        </h3>
      </div>

      {loading ? (
        <div style={{ height: 60, backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }} />
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <MetricStat
              icon={<Scale size={16} />}
              label="Weight"
              value={latest?.weight_kg ? `${latest.weight_kg} kg` : '—'}
              sub={latest?.date ? `${format(parseISO(latest.date), 'd MMM')}` : 'Not logged'}
            />
            <MetricStat
              icon={<Percent size={16} />}
              label="Body Fat"
              value={latestBF?.body_fat_pct ? `${latestBF.body_fat_pct}%` : '—'}
              sub={latestBF?.date ? `${format(parseISO(latestBF.date), 'd MMM')} · ${daysSinceBF}d ago` : 'Not logged'}
              alert={bfDue}
            />
          </div>

          {/* Body fat due reminder */}
          {bfDue && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-warning-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-warning)',
              fontWeight: 500,
            }}>
              <AlertCircle size={14} />
              Body fat measurement due (every 4 weeks)
            </div>
          )}

          {/* Log form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="number"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="Weight (kg)"
                disabled={saving}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              />
              <input
                type="number"
                value={bfInput}
                onChange={(e) => setBfInput(e.target.value)}
                placeholder="Body fat (%)"
                disabled={saving}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || (!weightInput && !bfInput)}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: saving || (!weightInput && !bfInput) ? 'not-allowed' : 'pointer',
                opacity: !weightInput && !bfInput ? 0.5 : 1,
                border: 'none',
                transition: 'opacity var(--transition-fast)',
              }}
            >
              {saving ? 'Saving...' : 'Log metrics'}
            </button>
          </div>
        </>
      )}
    </Card>
  )
}

function MetricStat({
  icon, label, value, sub, alert = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  alert?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-1)' }}>
        <span style={{ color: alert ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  backgroundColor: 'var(--color-bg)',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
}
