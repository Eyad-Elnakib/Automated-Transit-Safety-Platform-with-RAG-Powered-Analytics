import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Renders a coloured pill badge for a numeric safety score.
 *  ≥ 90  → green   (Excellent)
 *  ≥ 75  → amber   (Good)
 *  ≥ 60  → orange  (Fair)
 *  < 60  → red     (Poor)
 *  null/undefined → grey dash
 */
const ScoreBadge = ({ score, showLabel = false }) => {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        <Minus className="h-3 w-3" />
        N/A
      </span>
    )
  }

  const n = Number(score)

  let cfg
  if (n >= 90) {
    cfg = {
      bg:    'bg-emerald-50 dark:bg-emerald-500/15',
      text:  'text-emerald-700 dark:text-emerald-300',
      ring:  'ring-emerald-200 dark:ring-emerald-500/30',
      label: 'Excellent',
      Icon:  TrendingUp,
    }
  } else if (n >= 75) {
    cfg = {
      bg:    'bg-blue-50 dark:bg-blue-500/15',
      text:  'text-blue-700 dark:text-blue-300',
      ring:  'ring-blue-200 dark:ring-blue-500/30',
      label: 'Good',
      Icon:  TrendingUp,
    }
  } else if (n >= 60) {
    cfg = {
      bg:    'bg-amber-50 dark:bg-amber-500/15',
      text:  'text-amber-700 dark:text-amber-300',
      ring:  'ring-amber-200 dark:ring-amber-500/30',
      label: 'Fair',
      Icon:  Minus,
    }
  } else {
    cfg = {
      bg:    'bg-red-50 dark:bg-red-500/15',
      text:  'text-red-700 dark:text-red-300',
      ring:  'ring-red-200 dark:ring-red-500/30',
      label: 'Poor',
      Icon:  TrendingDown,
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <cfg.Icon className="h-3 w-3 shrink-0" />
      {n}
      {showLabel && <span className="font-semibold opacity-75">· {cfg.label}</span>}
    </span>
  )
}

export default ScoreBadge
