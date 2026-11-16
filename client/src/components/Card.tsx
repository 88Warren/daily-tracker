import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

const baseStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-sm)',
  padding: 'var(--space-5)',
}

export function Card({ children, className = '', style, onClick }: CardProps) {
  return (
    <div
      className={`card ${className}`}
      style={{ ...baseStyle, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
