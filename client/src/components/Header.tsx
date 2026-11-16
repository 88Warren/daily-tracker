import { format } from 'date-fns'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Settings, TrendingUp } from 'lucide-react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Header() {
  const today = new Date()
  const location = useLocation()

  const navItems = [
    { to: '/',        label: 'Dashboard',  Icon: LayoutDashboard },
    { to: '/history', label: 'History',    Icon: TrendingUp       },
    { to: '/settings',label: 'Settings',   Icon: Settings         },
  ]

  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}
      >
        {/* Left: brand + greeting */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
            <span
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--color-accent)',
                letterSpacing: '-0.02em',
              }}
            >
              Tracker
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {getGreeting()}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {format(today, 'EEEE d MMMM yyyy')}
          </div>
        </div>

        {/* Right: navigation */}
        <nav style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {navItems.map(({ to, label, Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
                  transition: 'background-color var(--transition-fast), color var(--transition-fast)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={16} />
                <span className="nav-label">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
