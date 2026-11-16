import React from 'react'
import { YearlyGoals } from '../components/YearlyGoals'
import { WeeklyGoals } from '../components/WeeklyGoals'
import { DailyHabits } from '../components/DailyHabits'
import { BodyMetrics } from '../components/BodyMetrics'
import { CalendarCard } from '../components/CalendarCard'

const layoutStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: 'var(--space-6) var(--space-5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-10)',
}

export function Dashboard() {
  return (
    <main style={layoutStyle}>
      {/* Daily habits — most time-sensitive */}
      <DailyHabits />

      {/* Weekly progress */}
      <WeeklyGoals />

      {/* Yearly goals */}
      <YearlyGoals />

      {/* Bottom row: body metrics + calendar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--space-6)',
        alignItems: 'start',
      }}>
        <section>
          <h2 style={sectionTitleStyle}>Body Metrics</h2>
          <BodyMetrics />
        </section>

        <section>
          <h2 style={sectionTitleStyle}>Upcoming</h2>
          <CalendarCard />
        </section>
      </div>
    </main>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-base)',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 'var(--space-4)',
}
