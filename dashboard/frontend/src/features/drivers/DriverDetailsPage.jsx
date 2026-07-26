import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Car, Shield, Pencil, Loader2,
  ChevronDown, CheckCircle, AlertTriangle, Clock, Bus, Navigation2, Calendar,
} from 'lucide-react'
import { fetchDriver, fetchDriverTrips } from '../../api/driversApi.js'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'
import ViolationSlider from '../../shared/components/ViolationSlider.jsx'

/* ── Helpers ─────────────────────────────────────────────────────────── */
const getInitials = (name) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

const fmt = (d, style = 'date') => {
  if (!d) return '—'
  try {
    return style === 'date'
      ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

const VIOLATION_META = {
  drowsy:          { label: 'Drowsy Driving',  color: 'bg-amber-100  text-amber-700  dark:bg-amber-500/15  dark:text-amber-400',  dot: '#f59e0b' },
  cellphone:       { label: 'Phone Use',       color: 'bg-blue-100   text-blue-700   dark:bg-blue-500/15   dark:text-blue-400',   dot: '#3b82f6' },
  cigarettes:      { label: 'Smoking',         color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', dot: '#f97316' },
  vape:            { label: 'Vaping',          color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400', dot: '#a855f7' },
  no_belt:         { label: 'No Seat Belt',    color: 'bg-red-100    text-red-700    dark:bg-red-500/15    dark:text-red-400',    dot: '#ef4444' },
  hands_off_wheel: { label: 'Hands Off Wheel', color: 'bg-cyan-100   text-cyan-700   dark:bg-cyan-500/15   dark:text-cyan-400',   dot: '#06b6d4' },
}
const TYPE_ORDER = ['drowsy', 'cellphone', 'cigarettes', 'vape', 'no_belt', 'hands_off_wheel']

const groupByType = (violations = []) => {
  const g = {}
  for (const v of violations) {
    if (!g[v.type]) g[v.type] = []
    g[v.type].push(v)
  }
  return g
}

/* ── Score Ring ──────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 60 }) {
  const sw = 5
  const r  = (size - sw) / 2
  const c  = 2 * Math.PI * r
  const s  = Math.max(0, Math.min(100, score ?? 0))
  const offset = c - (s / 100) * c

  const color =
    s >= 90 ? '#10b981' :
    s >= 75 ? '#3b82f6' :
    s >= 60 ? '#f59e0b' :
              '#ef4444'

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="currentColor" strokeWidth={sw}
          className="text-muted/30"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease' }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-foreground leading-none">{s}</span>
    </div>
  )
}

/* ── Accordion body with CSS transition ─────────────────────────────── */
function AccordionBody({ expanded, children }) {
  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    setHeight(expanded ? ref.current.scrollHeight : 0)
  }, [expanded])

  return (
    <div
      style={{ maxHeight: height, overflow: 'hidden', transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)' }}
    >
      <div ref={ref}>{children}</div>
    </div>
  )
}

/* ── TripCard ─────────────────────────────────────────────────────────── */
function TripCard({ trip, index }) {
  const [expanded, setExpanded] = useState(false)

  const violations   = trip.violations || []
  const totalV       = violations.length
  const score        = typeof trip.score === 'number' ? trip.score : 100
  const grouped      = groupByType(violations)
  const orderedTypes = TYPE_ORDER.filter((t) => grouped[t]?.length)

  const routeName = trip.route?.name || '—'
  const busId     = trip.bus?.busId  || '—'
  const startDay  = fmt(trip.startTime, 'date')
  const startTime = fmt(trip.startTime, 'time')
  const endTime   = trip.endTime ? fmt(trip.endTime, 'time') : null
  const isActive  = trip.active

  return (
    <div
      className={`rounded-2xl bg-card border shadow-sm overflow-hidden transition-all duration-200 ${
        expanded ? 'border-primary/30 shadow-primary/5' : 'border-border/40'
      }`}
    >
      {/* ── Accordion header ─────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
      >
        {/* Score ring */}
        <ScoreRing score={score} size={56} />

        {/* Info block */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">Trip #{index + 1}</span>
            <ScoreBadge score={score} />
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 px-2 py-0.5 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )}
            {totalV > 0 && (
              <span className="rounded-md bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-semibold">
                {totalV} violation{totalV !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Route / bus / time */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Navigation2 className="h-3 w-3 shrink-0" />
              {routeName}
            </span>
            <span className="flex items-center gap-1">
              <Bus className="h-3 w-3 shrink-0" />
              {busId}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {startDay}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {startTime}{endTime ? ` – ${endTime}` : ''}
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Expandable body ─────────────────────────────────────────── */}
      <AccordionBody expanded={expanded}>
        <div className="border-t border-border/30 px-5 py-5 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Navigation2 className="h-4 w-4 text-primary/60 shrink-0" />
              <span className="font-medium text-foreground">{routeName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-primary/60 shrink-0" />
              <span className="font-medium text-foreground">{busId}</span>
              {trip.bus?.capacity && (
                <span className="text-xs text-muted-foreground">· {trip.bus.capacity} seats</span>
              )}
            </div>
          </div>

          {/* Violations */}
          {orderedTypes.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                No violations — perfect trip!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">Violations Recorded</h4>
              </div>
              {orderedTypes.map((type) => {
                const meta  = VIOLATION_META[type] || { label: type, color: 'bg-muted text-foreground', dot: '#6b7280' }
                const items = grouped[type]
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.dot }}
                      />
                      <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {items.length} detection{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ViolationSlider violations={items} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </AccordionBody>
    </div>
  )
}

/* ── DriverDetailsPage ────────────────────────────────────────────────── */
const DriverDetailsPage = () => {
  const { id } = useParams()
  const [driver,       setDriver]       = useState(null)
  const [trips,        setTrips]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tripsLoading, setTripsLoading] = useState(true)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    fetchDriver(id)
      .then(setDriver)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchDriverTrips(id)
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">Driver not found</p>
          <p className="text-sm text-muted-foreground">{error || "This driver doesn't exist."}</p>
          <Link to="/drivers" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Drivers
          </Link>
        </div>
      </div>
    )
  }

  /* ── Score colour ─────────────────────────────────────────────────── */
  const score = driver.avgScore ?? 0
  const scoreColor =
    score >= 90 ? 'bg-emerald-500' :
    score >= 75 ? 'bg-blue-500'    :
    score >= 60 ? 'bg-amber-500'   :
                  'bg-red-500'

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Top nav ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/drivers"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Drivers
        </Link>
        <Link
          to={`/drivers/${id}/edit`}
          className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/80 transition-all"
        >
          <Pencil className="h-4 w-4" /> Edit Driver
        </Link>
      </div>

      {/* ── Profile card ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
        {/* Top gradient strip */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-primary/40" />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 text-xl font-bold text-primary ring-4 ring-primary/10">
              {getInitials(driver.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground truncate">{driver.name}</h2>
              <p className="text-sm font-mono text-muted-foreground mt-0.5">{driver.id}</p>
            </div>
            <ScoreBadge score={driver.avgScore} showLabel />
          </div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Avg score with mini ring */}
            <div className="rounded-xl bg-muted/40 p-4 flex items-center gap-3">
              <ScoreRing score={score} size={52} />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Score</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{driver.avgScore ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">All trips</p>
              </div>
            </div>

            {/* Total trips */}
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-medium text-muted-foreground">Total Trips</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{driver.totalTrips ?? 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
            </div>

            {/* Score progress bar */}
            <div className="rounded-xl bg-muted/40 p-4 col-span-2 sm:col-span-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Score Progress</p>
              <div className="h-2 w-full rounded-full bg-border/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreColor} transition-all duration-700`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>0</span>
                <span className="font-semibold">{score}/100</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trip History ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Trip History</h3>
          {!tripsLoading && (
            <span className="text-sm text-muted-foreground">
              {trips.length} trip{trips.length !== 1 ? 's' : ''} total
            </span>
          )}
        </div>

        {tripsLoading ? (
          <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Loading trips…</span>
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border/40 p-10 text-center shadow-sm">
            <Car className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No trips recorded yet.</p>
            <p className="text-xs text-muted-foreground mt-1 opacity-70">
              Start a trip from the Webcam Monitor page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip, i) => (
              <TripCard key={trip._id} trip={trip} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DriverDetailsPage
