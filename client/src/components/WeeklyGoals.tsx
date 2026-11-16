import React, { useEffect, useState } from 'react'
import { Dumbbell, Footprints, MapPin } from 'lucide-react'
import { Card } from './Card'
import { ProgressRing } from './ProgressRing'
import { getWeeklyGoals } from '../api/goals'
import { upsertLog } from '../api/logs'
import type { WeeklyGoal } from '../types'
import { format } from 'date-fns'

const GOAL_ICONS: Record<string, React.ReactNode> = {
  weights_sessions: <Dumbbell size={18} />,
  run_miles:        <MapPin size={18} />,
  walk_miles:       <Footprints size={18} />,
}

const GOAL_COLORS: Record<string, string> = {
  weights_sessions: 'var(--color-accent)',
  run_miles:        '#10b981',
  walk_miles:       '#f59e0b',
}

export function WeeklyGoals() {
  const [goals, setGoals]       = useState<WeeklyGoal[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [weightsAdding, setWeightsAdding] = useState(false)

  const refresh = async () => {
    const data = await getWeeklyGoals()
    setGoals(data.goals)
    setWeekStart(data.week_start)
    setWeekEnd(data.week_end)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  async function handleAddWeightsSession() {
    if (weightsAdding) return
    setWeightsAdding(true)
    const today = new Date().toISOString().slice(0, 10)
    await upsertLog({ date: today, habit_key: 'weights_session', value: 1 })
    await refresh()
    setWeightsAdding(false)
  }

  const weekLabel = weekStart && weekEnd
    ? `${format(new Date(weekStart + 'T12:00:00'), 'd MMM')} – ${format(new Date(weekEnd + 'T12:00:00'), 'd MMM')}`
    : ''

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <SectionTitle>This Week</SectionTitle>
        {weekLabel && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {weekLabel}
          </span>
        )}
      </div>

      {loading ? (
        <div style={gridStyle}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div style={gridStyle}>
          {goals.map((goal) => (
            <WeeklyGoalCard
              key={goal.goal_key}
              goal={goal}
              onAddWeightsSession={handleAddWeightsSession}
              weightsAdding={weightsAdding}
            />
          ))}
        </div>
      )}
    </section>
  )
}

interface WeeklyGoalCardProps {
  goal: WeeklyGoal
  onAddWeightsSession: () => void
  weightsAdding: boolean
}

function WeeklyGoalCard({ goal, onAddWeightsSession, weightsAdding }: WeeklyGoalCardProps) {
  const pct   = Math.min(goal.current / goal.target, 1)
  const done  = pct >= 1
  const color = GOAL_COLORS[goal.goal_key] || 'var(--color-accent)'

  const displayValue = Number.isInteger(goal.current)
    ? `${goal.current}`
    : `${goal.current.toFixed(1)}`

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
        <div style={{ flexShrink: 0 }}>
          <ProgressRing value={goal.current} max={goal.target} size={72} strokeWidth={6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <span style={{ color }}>{GOAL_ICONS[goal.goal_key]}</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{goal.label}</span>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            {displayValue} / {goal.target} {goal.unit}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <StatusPill done={done} pct={pct} />
            {goal.goal_key === 'weights_sessions' && (
              <button
                onClick={onAddWeightsSession}
                disabled={weightsAdding}
                style={{
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1.5px solid var(--color-accent)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-accent)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  cursor: weightsAdding ? 'not-allowed' : 'pointer',
                }}
              >
                + Session
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function StatusPill({ done, pct }: { done: boolean; pct: number }) {
  if (done) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px',
        backgroundColor: 'var(--color-success-light)',
        color: 'var(--color-success)',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)', fontWeight: 600,
      }}>
        ✓ Done
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px',
      backgroundColor: 'var(--color-accent-light)',
      color: 'var(--color-accent)',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--text-xs)', fontWeight: 500,
    }}>
      {Math.round(pct * 100)}%
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 'var(--text-base)', fontWeight: 600,
      color: 'var(--color-text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {children}
    </h2>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      height: 100,
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
    }} />
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 'var(--space-4)',
}
