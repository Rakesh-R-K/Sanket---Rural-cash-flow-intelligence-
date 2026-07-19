import type { Risk } from '../lib/api'

const META: Record<Risk, { icon: string; label: string; cls: string }> = {
  alert: { icon: '⏺', label: 'ALERT', cls: 'risk-alert' },
  warning: { icon: '▲', label: 'WARNING', cls: 'risk-warning' },
  watch: { icon: '◐', label: 'WATCH', cls: 'risk-watch' },
  healthy: { icon: '✓', label: 'HEALTHY', cls: 'risk-healthy' },
}

export function RiskBadge({ risk, small }: { risk: Risk; small?: boolean }) {
  const m = META[risk]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${m.cls} ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}>
      <span aria-hidden>{m.icon}</span>{m.label}
    </span>
  )
}

export const SECTOR_LABEL: Record<string, string> = {
  dairy: 'Dairy', poultry: 'Poultry', food_processing: 'Food Processing',
  handicrafts: 'Handicrafts', rural_retail: 'Rural Retail',
}

export const SECTOR_ICON: Record<string, string> = {
  dairy: '🐄', poultry: '🐔', food_processing: '🏭',
  handicrafts: '🧵', rural_retail: '🏪',
}

export const fmtINR = (n: number) =>
  '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN') + (n < 0 ? ' short' : '')
