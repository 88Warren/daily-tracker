interface ProgressRingProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
}

export function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 7,
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)

  const color =
    pct >= 1 ? 'var(--color-success)' :
    pct >= 0.5 ? 'var(--color-accent)' :
    'var(--color-accent)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-1)',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset var(--transition-base)' }}
          />
        </svg>
        {/* Centre text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            /{max}
          </span>
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'center' }}>
          {label}
        </span>
      )}
      {sublabel && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          {sublabel}
        </span>
      )}
    </div>
  )
}
