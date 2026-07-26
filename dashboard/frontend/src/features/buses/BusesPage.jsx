import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2, AlertCircle, Bus } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../shared/components/Modal.jsx'
import { fetchBuses, createBus, updateBus, deleteBus } from '../../api/busesApi.js'

const CAPACITIES = [27, 50]

const CapacityBadge = ({ capacity }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      capacity === 50
        ? 'bg-primary/10 text-primary'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
    }`}
  >
    {capacity} seats
  </span>
)

const BusesPage = () => {
  const [buses, setBuses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addCapacity, setAddCapacity] = useState(27)
  const [addLoading, setAddLoading] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState(null)
  const [editCapacity, setEditCapacity] = useState(27)
  const [editLoading, setEditLoading] = useState(false)

  // Delete modal
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadBuses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBuses()
      setBuses(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBuses()
  }, [loadBuses])

  // ── Add ────────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setAddCapacity(27)
    setShowAddModal(true)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      const created = await createBus({ capacity: addCapacity })
      setBuses((prev) => [created, ...prev])
      toast.success(`Bus ${created.busId} added (${created.capacity} seats)`)
      setShowAddModal(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEditModal = (bus) => {
    setEditTarget(bus)
    setEditCapacity(bus.capacity)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editTarget) return
    setEditLoading(true)
    try {
      const updated = await updateBus(editTarget._id, { capacity: editCapacity })
      setBuses((prev) => prev.map((b) => (b._id === updated._id ? updated : b)))
      toast.success(`${updated.busId} updated to ${updated.capacity} seats`)
      setEditTarget(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDeleteId) return
    const target = buses.find((b) => b._id === confirmDeleteId)
    setDeletingId(confirmDeleteId)
    try {
      await deleteBus(confirmDeleteId)
      setBuses((prev) => prev.filter((b) => b._id !== confirmDeleteId))
      toast.success(`Bus ${target?.busId} deleted`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const filtered = buses.filter((b) =>
    b.busId.toLowerCase().includes(search.toLowerCase()) ||
    String(b.capacity).includes(search)
  )

  const confirmTarget = buses.find((b) => b._id === confirmDeleteId)

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading buses…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-semibold text-foreground">Failed to load buses</p>
          <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
          <button
            onClick={loadBuses}
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
      {/* ── Add Bus Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Bus" size="comfortable">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-foreground">Bus ID</span>
            <div className="flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2">
              <Bus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm italic text-muted-foreground">Auto-generated (BUS-XXX)</span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-foreground">Capacity</span>
            <div className="grid grid-cols-2 gap-2">
              {CAPACITIES.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setAddCapacity(cap)}
                  className={`h-10 rounded-lg border-2 text-sm font-semibold transition-all ${
                    addCapacity === cap
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border/50 text-muted-foreground hover:border-primary/35 hover:text-foreground'
                  }`}
                >
                  {cap} seats
                </button>
              ))}
            </div>
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
              disabled={addLoading}
              className="flex h-10 min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 shrink-0" /> Add Bus</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Bus Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Bus Capacity" size="comfortable">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-foreground">Bus ID</span>
            <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2">
              <Bus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-mono text-sm text-foreground">{editTarget?.busId}</span>
              <span className="text-xs text-muted-foreground">(read-only)</span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-foreground">Capacity</span>
            <div className="grid grid-cols-2 gap-2">
              {CAPACITIES.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setEditCapacity(cap)}
                  className={`h-10 rounded-lg border-2 text-sm font-semibold transition-all ${
                    editCapacity === cap
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border/50 text-muted-foreground hover:border-primary/35 hover:text-foreground'
                  }`}
                >
                  {cap} seats
                </button>
              ))}
            </div>
          </div>
          <div className="-mx-5 mt-5 flex gap-2 border-t border-border/40 bg-muted/20 px-5 pt-4">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              disabled={editLoading}
              className="flex h-10 min-h-10 flex-1 items-center justify-center rounded-lg border border-border/60 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="flex h-10 min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border/40 p-6 shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <Trash2 className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete Bus</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-semibold font-mono text-foreground">{confirmTarget?.busId}</span>{' '}
                ({confirmTarget?.capacity} seats)? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
                className="flex-1 h-10 rounded-xl border border-border/60 text-sm font-semibold text-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Bus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            <span className="font-bold text-foreground">{filtered.length}</span>{' '}
            bus{filtered.length !== 1 ? 'es' : ''} in fleet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or capacity…"
              className="h-9 w-full sm:w-56 pl-9 pr-4 rounded-xl bg-muted/60 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Add Bus
          </button>
        </div>
      </div>

      {/* ── Desktop Table ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30 text-left">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bus ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Added</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    {search
                      ? `No buses matching "${search}"`
                      : 'No buses yet. Click "Add Bus" to add one.'}
                  </td>
                </tr>
              ) : (
                filtered.map((b, idx) => (
                  <tr
                    key={b._id}
                    className={`row-hover transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                          <Bus className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-mono font-semibold text-foreground">{b.busId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <CapacityBadge capacity={b.capacity} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(b)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(b._id)}
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
      </div>

      {/* ── Mobile Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {search ? `No buses matching "${search}"` : 'No buses yet.'}
          </p>
        ) : (
          filtered.map((b) => (
            <div key={b._id} className="rounded-2xl bg-card border border-border/40 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    <Bus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-semibold text-foreground">{b.busId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Added {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <CapacityBadge capacity={b.capacity} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-3">
                <button
                  onClick={() => openEditModal(b)}
                  className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => setConfirmDeleteId(b._id)}
                  className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
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

export default BusesPage
