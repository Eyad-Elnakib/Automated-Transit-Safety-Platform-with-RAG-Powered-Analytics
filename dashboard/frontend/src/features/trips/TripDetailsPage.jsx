import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Clock, MapPin, User, Shield, Car, CheckCircle, Loader2, Route } from 'lucide-react'
import { fetchTrip } from '../../api/tripsApi.js'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'
import MockMap from '../../shared/components/MockMap.jsx'

/** Readable violation type labels. */
const VLABEL = {
  drowsy:          'Drowsy Driving',
  cellphone:       'Phone Use',
  cigarettes:      'Smoking (Cigarette)',
  vape:            'Smoking (Vape)',
  no_belt:         'No Seat Belt',
  hands_off_wheel: 'Hands Off Wheel',
}

const fmtDuration = (start, end) => {
  if (!start || !end) return '—'
  const ms = new Date(end) - new Date(start)
  if (ms <= 0) return '0m'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const TripDetailsPage = () => {
  const { id } = useParams()
  const [trip, setTrip]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetchTrip(id)
      .then(setTrip)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">Trip not found</p>
          <p className="text-sm text-muted-foreground">The trip you're looking for doesn't exist.</p>
          <Link
            to="/trips"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Trips
          </Link>
        </div>
      </div>
    )
  }

  const violations = trip.violations ?? []

  return (
    <div className="space-y-6">
      <Link
        to="/trips"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Trips
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Trip Details</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {trip.active
                  ? 'Currently in progress'
                  : `Started ${new Date(trip.startTime).toLocaleString()}`}
              </p>
            </div>
            <ScoreBadge score={trip.score} size="md" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Duration</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {trip.active ? 'In Progress' : fmtDuration(trip.startTime, trip.endTime)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Date</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {new Date(trip.startTime).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Driver</span>
              </div>
              {trip.driver ? (
                <Link
                  to={`/drivers/${trip.driver._id}`}
                  className="text-lg font-semibold text-primary hover:underline"
                >
                  {trip.driver.name}
                </Link>
              ) : (
                <p className="text-lg font-bold text-foreground">—</p>
              )}
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Route className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Route / Bus</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {trip.route?.name ?? '—'}
                {trip.bus && ` · ${trip.bus.busId}`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm lg:w-[400px]">
          <h3 className="text-lg font-semibold text-foreground mb-4">Route Map</h3>
          <MockMap />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-lg font-semibold text-foreground">Violations</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            {violations.length} total
          </span>
        </div>

        {violations.length === 0 ? (
          <div className="flex items-center gap-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Clean Trip!</p>
              <p className="text-sm text-emerald-600/70 dark:text-emerald-500/70">No violations recorded during this trip.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 -mx-2">
            {violations.map((v, i) => (
              <div key={v._id || i} className="flex items-start gap-4 rounded-xl p-4 hover:bg-muted/50 transition-all -mx-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{VLABEL[v.type] ?? v.type}</p>
                    <span className="text-xs font-medium text-red-500 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10">
                      {v.confidence != null ? `${Math.round(v.confidence * 100)}%` : 'Violation'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(v.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TripDetailsPage