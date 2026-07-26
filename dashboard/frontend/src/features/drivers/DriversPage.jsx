import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Loader2, AlertCircle, Eye, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'
import Modal from '../../shared/components/Modal.jsx'
import { fetchDrivers, createDriver, deleteDriver } from '../../api/driversApi.js'

/* ── Helpers ─────────────────────────────────────────────────────────── */
const getInitials = (name) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
]
const avatarColor = (id) => AVATAR_COLORS[(id?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

/* ── Score mini-bar ──────────────────────────────────────────────────── */
const ScoreBar = ({ score }) => {
  const pct = Math.max(0, Math.min(100, score ?? 0))
  const color =
    pct >= 90 ? 'bg-emerald-500' :
    pct >= 75 ? 'bg-blue-500'    :
    pct >= 60 ? 'bg-amber-500'   :
                'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden hidden lg:block">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ScoreBadge score={score} />
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */
const DriversPage = () => {
  const [drivers,         setDrivers]         = useState([])
  const [search,          setSearch]          = useState('')
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [deletingId,      setDeletingId]      = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showAddModal,    setShowAddModal]    = useState(false)
  const [addName,         setAddName]         = useState('')
  const [addLoading,      setAddLoading]      = useState(false)
  const addInputRef = useRef(null)

  const loadDrivers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDrivers()
      setDrivers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDrivers() }, [loadDrivers])

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    const target = drivers.find((d) => d._id === confirmDeleteId)
    setDeletingId(confirmDeleteId)
    try {
      await deleteDriver(confirmDeleteId)
      setDrivers((prev) => prev.filter((d) => d._id !== confirmDeleteId))
      toast.success(`Driver "${target?.name}" deleted`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const openAddModal = () => {
    setAddName('')
    setShowAddModal(true)
    setTimeout(() => addInputRef.current?.focus(), 80)
  }

  const handleAddDriver = async (e) => {
    e.preventDefault()
    if (!addName.trim()) return
    setAddLoading(true)
    try {
      const newDriver = await createDriver({ name: addName.trim() })
      setDrivers((prev) => [newDriver, ...prev])
      toast.success(`Driver "${newDriver.name}" added as ${newDriver.id}`)
      setShowAddModal(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase())
  )

  const confirmTarget = drivers.find((d) => d._id === confirmDeleteId)

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading drivers…</p>
        </div>
      </div>
    )
  }

  /* ── Error ───────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-semibold text-foreground">Failed to load drivers</p>
          <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
          <button
            onClick={loadDrivers}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Delete confirm ─────────────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border/40 p-6 shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <Trash2 className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete Driver</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Remove{' '}
                <span className="font-semibold text-foreground">{confirmTarget?.name}</span>{' '}
                (<span className="font-mono text-xs">{confirmTarget?.id}</span>)?
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
                className="flex-1 h-10 rounded-xl border border-border/60 text-sm font-semibold text-foreground hover:bg-muted/60 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!!deletingId}
                className="flex-1 h-10 rounded-xl bg-destructive text-sm font-semibold text-white hover:bg-destructive/90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Driver Modal ──────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Driver">
        <form onSubmit={handleAddDriver} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="add-driver-name" className="block text-sm font-semibold text-foreground">
              Driver Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="add-driver-name"
                ref={addInputRef}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Enter full name"
                className="h-10 w-full rounded-lg border border-border/60 bg-muted/40 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15"
                required
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A unique Driver ID (DRV-XXX) will be assigned automatically.
            </p>
          </div>
          <div className="-mx-5 mt-5 flex gap-2 border-t border-border/40 bg-muted/20 px-5 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              disabled={addLoading}
              className="flex h-10 min-h-10 flex-1 items-center justify-center rounded-lg border border-border/60 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading || !addName.trim()}
              className="flex h-10 min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 shrink-0" /> Add Driver</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            <span className="font-bold text-foreground">{filtered.length}</span>{' '}
            driver{filtered.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or ID…"
              className="h-9 w-full sm:w-56 pl-9 pr-4 rounded-xl bg-muted/60 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
        </div>
      </div>

      {/* ── Desktop Table ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                Driver
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                ID
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                Safety Score
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                Trips
              </th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-sm text-muted-foreground">
                  {search
                    ? `No drivers matching "${search}"`
                    : 'No drivers found. Click "Add Driver" to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((d, i) => (
                <tr
                  key={d._id}
                  className={`row-hover transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                >
                  {/* Driver */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(d.name)} text-xs font-bold text-white shadow-sm`}
                      >
                        {getInitials(d.name)}
                      </div>
                      <span className="font-semibold text-foreground">{d.name}</span>
                    </div>
                  </td>
                  {/* ID */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-0.5">
                      {d.id}
                    </span>
                  </td>
                  {/* Score */}
                  <td className="px-5 py-3.5">
                    <ScoreBar score={d.avgScore} />
                  </td>
                  {/* Trips */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-medium">
                      {d.totalTrips}
                      <span className="text-xs text-muted-foreground/60">trips</span>
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/drivers/${d._id}`}
                        title="View details"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> View
                      </Link>
                      <Link
                        to={`/drivers/${d._id}/edit`}
                        title="Edit driver"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Link>
                      <button
                        onClick={() => setConfirmDeleteId(d._id)}
                        title="Delete driver"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {search ? `No drivers matching "${search}"` : 'No drivers found.'}
          </p>
        ) : (
          filtered.map((d) => (
            <div
              key={d._id}
              className="rounded-2xl bg-card border border-border/40 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(d.name)} text-sm font-bold text-white shadow-sm`}
                  >
                    {getInitials(d.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{d.id}</p>
                  </div>
                </div>
                <ScoreBadge score={d.avgScore} />
              </div>

              {/* Score bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Safety Score</span>
                  <span>{d.totalTrips} trips</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (d.avgScore ?? 0) >= 90 ? 'bg-emerald-500' :
                      (d.avgScore ?? 0) >= 75 ? 'bg-blue-500'    :
                      (d.avgScore ?? 0) >= 60 ? 'bg-amber-500'   :
                      'bg-red-500'
                    }`}
                    style={{ width: `${d.avgScore ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/30 pt-3">
                <Link
                  to={`/drivers/${d._id}`}
                  className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Eye className="h-3 w-3" /> View
                </Link>
                <Link
                  to={`/drivers/${d._id}/edit`}
                  className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
                <button
                  onClick={() => setConfirmDeleteId(d._id)}
                  className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default DriversPage
