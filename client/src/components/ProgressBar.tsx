interface ProgressBarProps {
  value: number          // current value
  max: number            // target value
  direction?: 'above' | 'below'  // above = more is better, below = less is better
  markers?: Array<{ value: number; label: string }>  // e.g. quarterly milestones
  height?: number
  showLabel?: boolean
}

export function ProgressBar({
  value,
  max,
  direction = 'above',
  markers = [],
  height = 8,
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)

  const getColor = () => {
    if (direction === 'below') {
      if (pct >= 100) return 'var(--color-danger)'
      if (pct >= 75) return 'var(--color-warning)'
      return 'var(--color-on-track)'
    } else {
      if (pct >= 100) return 'var(--color-on-track)'
      return 'var(--color-accent)'
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Track */}
      <div
        style={{
          position: 'relative',
          height,
          backgroundColor: 'var(--color-border)',
          borderRadius: 'var(--radius-full)',
          overflow: 'visible',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: getColor(),
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-base)',
          }}
        />

        {/* Quarter markers */}
        {markers.map((m) => {
          const markerPct = Math.min((m.value / max) * 100, 100)
          return (
            <div
              key={m.label}
              title={`${m.label}: ${m.value}`}
              style={{
                position: 'absolute',
                top: -2,
                left: `${markerPct}%`,
                width: 2,
                height: height + 4,
                backgroundColor: 'var(--color-text-muted)',
                borderRadius: 'var(--radius-full)',
                transform: 'translateX(-50%)',
              }}
            />
          )
        })}
      </div>

      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'var(--space-1)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>{value.toFixed(1)}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
