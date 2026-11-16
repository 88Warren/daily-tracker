import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { getMetricsHistory } from '../api/metrics'
import { getYearlyGoals } from '../api/goals'
import { Card } from '../components/Card'
import type { BodyMetric, YearlyGoal } from '../types'
import { format, parseISO, startOfYear, endOfYear } from 'date-fns'

type TabId = 'weight' | 'bodyfat' | 'yearly'

export function History() {
  const [metrics, setMetrics]     = useState<BodyMetric[]>([])
  const [yearlyGoals, setYearlyGoals] = useState<YearlyGoal[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('weight')

  const year = new Date().getFullYear()

  useEffect(() => {
    const start = format(startOfYear(new Date()), 'yyyy-MM-dd')
    const end   = format(endOfYear(new Date()),   'yyyy-MM-dd')

    Promise.all([
      getMetricsHistory(start, end),
      getYearlyGoals(year),
    ]).then(([metricsData, goalsData]) => {
      setMetrics(metricsData.metrics)
      setYearlyGoals(goalsData.goals)
    }).finally(() => setLoading(false))
  }, [])

  const weightData = metrics
    .filter((m) => m.weight_kg !== null)
    .map((m) => ({ date: format(parseISO(m.date), 'd MMM'), value: m.weight_kg }))

  const bfData = metrics
    .filter((m) => m.body_fat_pct !== null)
    .map((m) => ({ date: format(parseISO(m.date), 'd MMM'), value: m.body_fat_pct }))

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'weight',  label: 'Weight'    },
    { id: 'bodyfat', label: 'Body Fat'  },
    { id: 'yearly',  label: `${year} Goals` },
  ]

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        History
      </h1>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-1)',
        marginBottom: 'var(--space-6)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-1)',
        width: 'fit-content',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              backgroundColor: activeTab === tab.id ? 'var(--color-accent-light)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ height: 300, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }} />
      ) : (
        <>
          {activeTab === 'weight' && (
            <MetricChart
              title="Weight"
              unit="kg"
              data={weightData}
              color="var(--color-accent)"
              emptyMsg="No weight entries yet. Log your weight from the dashboard."
            />
          )}

          {activeTab === 'bodyfat' && (
            <MetricChart
              title="Body Fat"
              unit="%"
              data={bfData}
              color="#f59e0b"
              emptyMsg="No body fat entries yet. Measure every 4 weeks and log from the dashboard."
            />
          )}

          {activeTab === 'yearly' && (
            <YearlyProgressView goals={yearlyGoals} year={year} />
          )}
        </>
      )}
    </main>
  )
}

// ── Metric chart ──────────────────────────────────────────────────────────────

interface MetricChartProps {
  title: string
  unit: string
  data: Array<{ date: string; value: number | null }>
  color: string
  emptyMsg: string
}

function MetricChart({ title, unit, data, color, emptyMsg }: MetricChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
          {emptyMsg}
        </p>
      </Card>
    )
  }

  const values = data.map((d) => d.value as number).filter(Boolean)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {[
          { label: 'Latest',  value: data[data.length - 1]?.value?.toFixed(1) },
          { label: 'Average', value: avg.toFixed(1) },
          { label: 'Range',   value: `${min.toFixed(1)} – ${max.toFixed(1)}` },
        ].map((s) => (
          <Card key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{s.value} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400 }}>{unit}</span></div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-5)' }}>
          {title} ({unit})
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
              formatter={(v: number) => [`${v} ${unit}`, title]}
            />
            <ReferenceLine y={avg} stroke="var(--color-text-muted)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ── Yearly progress view ──────────────────────────────────────────────────────

function YearlyProgressView({ goals, year }: { goals: YearlyGoal[]; year: number }) {
  if (goals.length === 0) {
    return (
      <Card>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
          No yearly goals found.
        </p>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-5)' }}>
          {year} Goals — Full Year Overview
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {goals.map((g) => {
            const pct = Math.min(g.current / g.target, 1)
            const done = g.direction === 'above' ? g.current >= g.target : g.current <= g.target

            const quarters = [
              { label: 'Q1', target: g.q1 },
              { label: 'Q2', target: g.q2 },
              { label: 'Q3', target: g.q3 },
              { label: 'Q4', target: g.q4 },
            ].filter((q) => q.target !== null)

            return (
              <div key={g.goal_key}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{g.label}</span>
                    {done && (
                      <span style={{
                        fontSize: 'var(--text-xs)', fontWeight: 600,
                        color: 'var(--color-success)',
                        backgroundColor: 'var(--color-success-light)',
                        padding: '1px 7px', borderRadius: 'var(--radius-full)',
                      }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {g.direction === 'above'
                      ? `${g.current} / ${g.target} ${g.unit}`
                      : `${g.current.toFixed(1)} / ${g.target} ${g.unit} (${g.direction === 'below' ? 'stay under' : ''})`
                    }
                  </span>
                </div>

                {/* Progress track */}
                <div style={{ position: 'relative', height: 10, backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'visible' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(pct * 100, 100)}%`,
                    backgroundColor: done
                      ? 'var(--color-success)'
                      : g.direction === 'below' && pct > 0.9 ? 'var(--color-danger)'
                      : 'var(--color-accent)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width var(--transition-base)',
                  }} />
                  {/* Quarter markers */}
                  {quarters.map((q) => {
                    const qPct = Math.min(((q.target as number) / g.target) * 100, 100)
                    return (
                      <div key={q.label} style={{
                        position: 'absolute', top: -3,
                        left: `${qPct}%`,
                        width: 2, height: 16,
                        backgroundColor: 'var(--color-text-muted)',
                        transform: 'translateX(-50%)',
                        borderRadius: 'var(--radius-full)',
                      }} />
                    )
                  })}
                </div>

                {/* Quarter labels */}
                {quarters.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)', paddingLeft: `${(quarters[0].target as number / g.target * 100) - 2}%` }}>
                    {quarters.map((q) => (
                      <span key={q.label} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {q.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
