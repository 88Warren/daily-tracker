import React, { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  Wine, MapPin, Trophy, BookOpen, Headphones, Plus,
} from 'lucide-react'
import { Card } from './Card'
import { ProgressBar } from './ProgressBar'
import { getYearlyGoals, addYearlyEntry } from '../api/goals'
import type { YearlyGoal } from '../types'

const GOAL_ICONS: Record<string, React.ReactNode> = {
  alcohol_units:   <Wine size={18} />,
  running_miles:   <MapPin size={18} />,
  tourist_parkrun: <Trophy size={18} />,
  trelai_parkrun:  <Trophy size={18} />,
  audiobooks:      <Headphones size={18} />,
  books:           <BookOpen size={18} />,
}

// Goals that have quick +1 increment buttons
const INCREMENT_GOALS = ['tourist_parkrun', 'trelai_parkrun', 'audiobooks', 'books']

// Goals that need a value entry (not just +1)
const VALUE_GOALS = ['running_miles', 'alcohol_units']

export function YearlyGoals() {
  const year = new Date().getFullYear()
  const [goals, setGoals] = useState<YearlyGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({})
  const prevGoalsRef = useRef<YearlyGoal[]>([])

  const fireConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
    })
  }

  const refresh = () =>
    getYearlyGoals(year)
      .then((r) => {
        // Check if any goal just crossed 100% for the first time
        const prev = prevGoalsRef.current
        for (const g of r.goals) {
          const old = prev.find((p) => p.goal_key === g.goal_key)
          if (old) {
            // For 'above' goals: just crossed the target
            if (g.direction === 'above' && old.current < g.target && g.current >= g.target) {
              fireConfetti()
            }
          }
        }
        prevGoalsRef.current = r.goals
        setGoals(r.goals)
      })
      .finally(() => setLoading(false))

  useEffect(() => { refresh() }, [])

  async function handleIncrement(goalKey: string) {
    if (pendingKeys.has(goalKey)) return
    setPendingKeys((s) => new Set(s).add(goalKey))
    setGoals((prev) =>
      prev.map((g) => g.goal_key === goalKey ? { ...g, current: g.current + 1 } : g)
    )
    await addYearlyEntry({ goal_key: goalKey, value: 1 })
    await refresh()
    setPendingKeys((s) => { const n = new Set(s); n.delete(goalKey); return n })
  }

  async function handleValueAdd(goalKey: string) {
    const raw = valueInputs[goalKey]
    if (!raw) return
    const value = parseFloat(raw)
    if (isNaN(value) || value <= 0) return

    setPendingKeys((s) => new Set(s).add(goalKey))
    setGoals((prev) =>
      prev.map((g) => g.goal_key === goalKey ? { ...g, current: g.current + value } : g)
    )
    setValueInputs((v) => ({ ...v, [goalKey]: '' }))
    await addYearlyEntry({ goal_key: goalKey, value })
    await refresh()
    setPendingKeys((s) => { const n = new Set(s); n.delete(goalKey); return n })
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <SectionTitle>{year} Goals</SectionTitle>
      </div>

      {loading ? (
        <div style={gridStyle}>
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div style={gridStyle}>
          {goals.map((goal) => (
            <YearlyGoalCard
              key={goal.goal_key}
              goal={goal}
              isPending={pendingKeys.has(goal.goal_key)}
              canIncrement={INCREMENT_GOALS.includes(goal.goal_key)}
              canAddValue={VALUE_GOALS.includes(goal.goal_key)}
              inputValue={valueInputs[goal.goal_key] || ''}
              onInputChange={(v) => setValueInputs((prev) => ({ ...prev, [goal.goal_key]: v }))}
              onIncrement={() => handleIncrement(goal.goal_key)}
              onValueAdd={() => handleValueAdd(goal.goal_key)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

interface YearlyGoalCardProps {
  goal: YearlyGoal
  isPending: boolean
  canIncrement: boolean
  canAddValue: boolean
  inputValue: string
  onInputChange: (v: string) => void
  onIncrement: () => void
  onValueAdd: () => void
}

function YearlyGoalCard({
  goal, isPending, canIncrement, canAddValue,
  inputValue, onInputChange, onIncrement, onValueAdd,
}: YearlyGoalCardProps) {
  const pct = goal.current / goal.target
  const done = pct >= 1

  const markers = [
    goal.q1 ? { value: goal.q1, label: 'Q1' } : null,
    goal.q2 ? { value: goal.q2, label: 'Q2' } : null,
    goal.q3 ? { value: goal.q3, label: 'Q3' } : null,
    goal.q4 ? { value: goal.q4, label: 'Q4' } : null,
  ].filter(Boolean) as Array<{ value: number; label: string }>

  const displayValue = goal.direction === 'below'
    ? `${goal.current.toFixed(1)} / ${goal.target} ${goal.unit}`
    : `${goal.current} / ${goal.target} ${goal.unit}`

  return (
    <Card
      style={{
        opacity: isPending ? 0.75 : 1,
        transition: 'opacity var(--transition-fast)',
        borderTop: done ? '3px solid var(--color-success)' : '3px solid transparent',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ color: done ? 'var(--color-success)' : 'var(--color-accent)' }}>
            {GOAL_ICONS[goal.goal_key] || <Trophy size={18} />}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{goal.label}</span>
        </div>
        {done && (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-success)',
            backgroundColor: 'var(--color-success-light)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            ✓ Done
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <ProgressBar
          value={goal.current}
          max={goal.target}
          direction={goal.direction}
          markers={markers}
          height={8}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {displayValue}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {Math.round(pct * 100)}%
        </span>
      </div>

      {/* Drink-free days (alcohol card only) */}
      {goal.goal_key === 'alcohol_units' && goal.drink_free_days !== undefined && (
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-success)',
          backgroundColor: 'var(--color-success-light)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-3)',
          fontWeight: 500,
        }}>
          🍃 {goal.drink_free_days} drink-free days this year
        </div>
      )}

      {/* Quarterly markers legend */}
      {markers.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          {markers.map((m) => (
            <div key={m.label} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              <span style={{ fontWeight: 500 }}>{m.label}</span> {m.value}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {canIncrement && (
        <button
          onClick={onIncrement}
          disabled={isPending}
          style={{
            width: '100%',
            padding: '8px',
            border: '1.5px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-1)',
          }}
        >
          <Plus size={14} /> Add one
        </button>
      )}

      {canAddValue && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onValueAdd()}
            placeholder={`Add ${goal.unit}`}
            disabled={isPending}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              backgroundColor: 'var(--color-bg)',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          />
          <button
            onClick={onValueAdd}
            disabled={isPending || !inputValue}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: isPending || !inputValue ? 'not-allowed' : 'pointer',
              opacity: !inputValue ? 0.5 : 1,
              border: 'none',
            }}
          >
            Add
          </button>
        </div>
      )}
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--color-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {children}
    </h2>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      height: 160,
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
    }} />
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 'var(--space-4)',
}
