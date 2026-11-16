import React from 'react'

interface QuickButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'success' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  disabled?: boolean
  icon?: React.ReactNode
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
  },
  success: {
    backgroundColor: 'var(--color-success)',
    color: '#fff',
  },
  danger: {
    backgroundColor: 'var(--color-danger)',
    color: '#fff',
  },
  neutral: {
    backgroundColor: 'var(--color-surface-alt)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
}

export function QuickButton({
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
}: QuickButtonProps) {
  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { padding: '6px 12px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-sm)' }
      : { padding: '10px 18px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-md)' }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
        border: 'none',
        ...variantStyles[variant],
        ...sizeStyle,
      }}
      onMouseDown={(e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(0.96)'
      }}
      onMouseUp={(e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(1)'
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {label}
    </button>
  )
}
