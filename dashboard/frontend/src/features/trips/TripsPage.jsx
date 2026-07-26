import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ChevronRight, Search, Loader2, Car } from 'lucide-react'
import { fetchTrips } from '../../api/tripsApi.js'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'

/** Format a duration between two ISO date strings into "Xh Ym". */
const fmtDuration = (start, end) => {
  if (!start || !end) return '—'
  const ms = new Date(end) - new Date(start)
  if (ms <= 0) return '0m'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const TripsPage = () => {
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetchTrips()
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return trips
    const q = search.toLowerCase()
    return trips.filter(
      (t) =>
        (t.driver?.name || '').toLowerCase().includes(q) ||
        (t.route?.name  || '').toLowerCase().includes(q) ||
        (t._id || '').toLowerCase().includes(q),
    )
  }, [trips, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{filtered.length} trips recorded</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trips..."
            className="h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">No trips found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Try a different search term.' : 'No trips have been recorded yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Violations</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t._id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <span className="text-foreground font-medium">{t.driver?.name ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">{t.route?.name ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">
                          {t.active ? 'In Progress' : fmtDuration(t.startTime, t.endTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ScoreBadge score={t.score} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground text-sm">
                          {new Date(t.startTime).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            (t.violations?.length ?? 0) > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {t.violations?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/trips/${t._id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group/link"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                          <ChevronRight className="h-3 w-3 opacity-0 -ml-1 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filtered.map((t) => (
              <Link
                key={t._id}
                to={`/trips/${t._id}`}
                className="block rounded-2xl bg-card border border-border/40 p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{t.driver?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.route?.name ?? '—'} · {new Date(t.startTime).toLocaleDateString()}
                    </p>
                  </div>
                  <ScoreBadge score={t.score} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{t.active ? 'In Progress' : fmtDuration(t.startTime, t.endTime)}</span>
                    <span className={(t.violations?.length ?? 0) > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}>
                      {t.violations?.length ?? 0} violations
                    </span>
                  </div>
                  <span className="text-sm font-medium text-primary flex items-center gap-1">
                    View <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default TripsPage