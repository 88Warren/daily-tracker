import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Dumbbell, Droplets, Wine, WineOff, Flame, Ruler,
} from 'lucide-react'
import { Card } from './Card'
import { getDailyLogs, upsertLog } from '../api/logs'
import type { HabitLog } from '../types'

interface DailyHabitsProps {
  date?: string
}

interface HabitDef {
  key: string
  label: string
  icon: React.ReactNode
  type: 'toggle' | 'counter' | 'value'
  unit?: string
  target?: number
  targetMax?: number
  color?: string
  description?: string
}

const HABITS: HabitDef[] = [
  {
    key: 'drink_free',
    label: 'Drink Free',
    icon: <WineOff size={18} />,
    type: 'toggle',
    color: 'var(--color-success)',
    description: 'No alcohol today',
  },
  {
    key: 'alcohol_units',
    label: 'Alcohol Units',
    icon: <Wine size={18} />,
    type: 'value',
    unit: 'units',
    color: 'var(--color-warning)',
    description: 'Enter units consumed',
  },
  {
    key: 'weights_session',
    label: 'Weights Session',
    icon: <Dumbbell size={18} />,
    type: 'toggle',
    color: 'var(--color-accent)',
    description: 'Completed a gym session',
  },
  {
    key: 'protein_g',
    label: 'Protein',
    icon: <Flame size={18} />,
    type: 'value',
    unit: 'g',
    target: 140,
    targetMax: 150,
    color: '#f97316',
    description: '140–150g target',
  },
  {
    key: 'calories',
    label: 'Calories',
    icon: <Droplets size={18} />,
    type: 'value',
    unit: 'kcal',
    target: 2400,
    color: '#8b5cf6',
    description: '~2400 kcal target',
  },
  {
    key: 'run_miles',
    label: 'Run Miles',
    icon: <Ruler size={18} />,
    type: 'value',
    unit: 'mi',
    color: 'var(--color-accent)',
    description: 'Miles run today',
  },
  {
    key: 'walk_miles',
    label: 'Walk Miles',
    icon: <Ruler size={18} />,
    type: 'value',
    unit: 'mi',
    color: 'var(--color-success)',
    description: 'Miles walked today',
  },
]

function getLogValue(logs: HabitLog[], key: string): number | null {
  const log = logs.find((l) => l.habit_key === key)
  return log ? log.value : null
}

export function DailyHabits({ date }: DailyHabitsProps) {
  const today = date || format(new Date(), 'yyyy-MM-dd')
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    getDailyLogs(today)
      .then((r) => setLogs(r.logs))
      .finally(() => setLoading(false))
  }, [today])

  async function handleToggle(key: string) {
    if (pendingKeys.has(key)) return
    const current = getLogValue(logs, key)
    const newValue = current === 1 ? 0 : 1

    // Optimistic update
    setPendingKeys((s) => new Set(s).add(key))
    setLogs((prev) => {
      const existing = prev.find((l) => l.habit_key === key)
      if (existing) return prev.map((l) => l.habit_key === key ? { ...l, value: newValue } : l)
      return [...prev, { id: -1, date: today, habit_key: key, value: newValue, created_at: '' }]
    })

    // Handle drink_free / alcohol_units mutual exclusion
    if (key === 'drink_free' && newValue === 1) {
      // If marking drink-free, clear alcohol units
      setLogs((prev) => prev.filter((l) => l.habit_key !== 'alcohol_units'))
      await upsertLog({ date: today, habit_key: 'alcohol_units', value: 0 })
    }

    await upsertLog({ date: today, habit_key: key, value: newValue })
    const r = await getDailyLogs(today)
    setLogs(r.logs)
    setPendingKeys((s) => { const n = new Set(s); n.delete(key); return n })
  }

  async function handleValueSubmit(key: string) {
    const raw = valueInputs[key]
    if (!raw) return
    const value = parseFloat(raw)
    if (isNaN(value)) return

    setPendingKeys((s) => new Set(s).add(key))
    setLogs((prev) => {
      const existing = prev.find((l) => l.habit_key === key)
      if (existing) return prev.map((l) => l.habit_key === key ? { ...l, value } : l)
      return [...prev, { id: -1, date: today, habit_key: key, value, created_at: '' }]
    })
    setValueInputs((v) => ({ ...v, [key]: '' }))

    // Logging alcohol units clears drink_free
    if (key === 'alcohol_units' && value > 0) {
      setLogs((prev) => prev.map((l) => l.habit_key === 'drink_free' ? { ...l, value: 0 } : l))
      await upsertLog({ date: today, habit_key: 'drink_free', value: 0 })
    }

    await upsertLog({ date: today, habit_key: key, value })
    const r = await getDailyLogs(today)
    setLogs(r.logs)
    setPendingKeys((s) => { const n = new Set(s); n.delete(key); return n })
  }

  if (loading) {
    return (
      <section>
        <SectionTitle>Today's Habits</SectionTitle>
        <div style={gridStyle}>
          {HABITS.map((h) => <SkeletonCard key={h.key} />)}
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionTitle>Today's Habits</SectionTitle>
      <div style={gridStyle}>
        {HABITS.map((habit) => {
          const val = getLogValue(logs, habit.key)
          const isPending = pendingKeys.has(habit.key)

          return (
            <HabitCard
              key={habit.key}
              habit={habit}
              value={val}
              isPending={isPending}
              inputValue={valueInputs[habit.key] || ''}
              onInputChange={(v) => setValueInputs((prev) => ({ ...prev, [habit.key]: v }))}
              onToggle={() => handleToggle(habit.key)}
              onValueSubmit={() => handleValueSubmit(habit.key)}
            />
          )
        })}
      </div>
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: HabitDef
  value: number | null
  isPending: boolean
  inputValue: string
  onInputChange: (v: string) => void
  onToggle: () => void
  onValueSubmit: () => void
}

function HabitCard({
  habit, value, isPending, inputValue, onInputChange, onToggle, onValueSubmit,
}: HabitCardProps) {
  const isLogged = value !== null && value !== 0
  const isActive = habit.type === 'toggle' && value === 1

  const getStatusColor = () => {
    if (!isLogged) return 'var(--color-not-logged)'
    if (habit.key === 'drink_free' && isActive) return 'var(--color-success)'
    if (habit.key === 'alcohol_units' && value !== null && value > 0) return 'var(--color-warning)'
    if (habit.key === 'protein_g' && value !== null) {
      if (value >= (habit.target || 0) && value <= (habit.targetMax || Infinity)) return 'var(--color-success)'
      if (value < (habit.target || 0)) return 'var(--color-warning)'
    }
    return habit.color || 'var(--color-accent)'
  }

  const getValueDisplay = () => {
    if (value === null || value === 0) return '—'
    if (habit.type === 'toggle') return isActive ? 'Yes' : 'No'
    return `${value}${habit.unit ? ' ' + habit.unit : ''}`
  }

  return (
    <Card
      style={{
        borderLeft: `3px solid ${isLogged ? (habit.color || 'var(--color-accent)') : 'var(--color-border)'}`,
        opacity: isPending ? 0.7 : 1,
        transition: 'opacity var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ color: habit.color || 'var(--color-accent)' }}>{habit.icon}</span>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{habit.label}</div>
            {habit.description && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {habit.description}
              </div>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: getStatusColor(),
          }}
        >
          {getValueDisplay()}
        </span>
      </div>

      {/* Action area */}
      {habit.type === 'toggle' ? (
        <ToggleButton active={isActive} onClick={onToggle} disabled={isPending} color={habit.color} />
      ) : (
        <ValueInput
          unit={habit.unit}
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onValueSubmit}
          disabled={isPending}
        />
      )}

      {/* Target indicator for protein */}
      {habit.key === 'protein_g' && value !== null && value > 0 && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <div
            style={{
              height: 4,
              backgroundColor: 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min((value / 150) * 100, 100)}%`,
                backgroundColor:
                  value >= 140 && value <= 150 ? 'var(--color-success)' :
                  value > 150 ? 'var(--color-warning)' : 'var(--color-accent)',
                transition: 'width var(--transition-base)',
              }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function ToggleButton({
  active, onClick, disabled, color,
}: {
  active: boolean
  onClick: () => void
  disabled: boolean
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '8px',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${active ? (color || 'var(--color-accent)') : 'var(--color-border)'}`,
        backgroundColor: active ? `${color || 'var(--color-accent)'}18` : 'transparent',
        color: active ? (color || 'var(--color-accent)') : 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-fast)',
      }}
    >
      {active ? '✓ Logged' : 'Tap to log'}
    </button>
  )
}

function ValueInput({
  unit, value, onChange, onSubmit, disabled,
}: {
  unit?: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        placeholder={unit ? `Enter ${unit}` : 'Enter value'}
        disabled={disabled}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          backgroundColor: 'var(--color-bg)',
          outline: 'none',
          transition: 'border-color var(--transition-fast)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-accent)',
          color: '#fff',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          cursor: disabled || !value ? 'not-allowed' : 'pointer',
          opacity: !value ? 0.5 : 1,
          border: 'none',
          transition: 'opacity var(--transition-fast)',
        }}
      >
        Save
      </button>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 'var(--text-base)',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 'var(--space-4)',
      }}
    >
      {children}
    </h2>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        height: 120,
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 'var(--space-4)',
}
