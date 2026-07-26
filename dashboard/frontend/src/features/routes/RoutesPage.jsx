import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2, AlertCircle, Navigation2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../shared/components/Modal.jsx'
import { fetchRoutes, createRoute, updateRoute, deleteRoute } from '../../api/routesApi.js'

const RoutesPage = () => {
  const [routes, setRoutes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const addInputRef = useRef(null)

  // Edit modal
  const [editTarget, setEditTarget] = useState(null)
  const [editName, setEditName] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const editInputRef = useRef(null)

  // Delete modal
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadRoutes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRoutes()
      setRoutes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoutes()
  }, [loadRoutes])

  // ── Add ────────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setAddName('')
    setShowAddModal(true)
    setTimeout(() => addInputRef.current?.focus(), 50)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addName.trim()) return
    setAddLoading(true)
    try {
      const created = await createRoute({ name: addName.trim() })
      setRoutes((prev) => [created, ...prev])
      toast.success(`Route "${created.name}" added`)
      setShowAddModal(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEditModal = (route) => {
    setEditTarget(route)
    setEditName(route.name)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editName.trim() || !editTarget) return
    setEditLoading(true)
    try {
      const updated = await updateRoute(editTarget._id, { name: editName.trim() })
      setRoutes((prev) => prev.map((r) => (r._id === updated._id ? updated : r)))
      toast.success(`Route updated to "${updated.name}"`)
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
    const target = routes.find((r) => r._id === confirmDeleteId)
    setDeletingId(confirmDeleteId)
    try {
      await deleteRoute(confirmDeleteId)
      setRoutes((prev) => prev.filter((r) => r._id !== confirmDeleteId))
      toast.success(`Route "${target?.name}" deleted`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const filtered = routes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const confirmTarget = routes.find((r) => r._id === confirmDeleteId)

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading routes…</p>
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
          <p className="text-lg font-semibold text-foreground">Failed to load routes</p>
          <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
          <button
            onClick={loadRoutes}
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
      {/* ── Add Route Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Route">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="add-route-name" className="block text-sm font-semibold text-foreground">
              Route Name
            </label>
            <div className="relative">
              <Navigation2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="add-route-name"
                ref={addInputRef}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Route 12 — City Center"
                className="h-10 w-full rounded-lg border border-border/60 bg-muted/40 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15"
                required
              />
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
              disabled={addLoading || !addName.trim()}
              className="flex h-10 min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 shrink-0" /> Add Route</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Route Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Route">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-route-name" className="block text-sm font-semibold text-foreground">
              Route Name
            </label>
            <div className="relative">
              <Navigation2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="edit-route-name"
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Route 12 — City Center"
                className="h-10 w-full rounded-lg border border-border/60 bg-muted/40 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15"
                required
              />
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
              disabled={editLoading || !editName.trim()}
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
              <h3 className="text-lg font-bold text-foreground">Delete Route</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">"{confirmTarget?.name}"</span>?{' '}
                This action cannot be undone.
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
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Navigation2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            <span className="font-bold text-foreground">{filtered.length}</span>{' '}
            route{filtered.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search routes…"
              className="h-9 w-full sm:w-56 pl-9 pr-4 rounded-xl bg-muted/60 border border-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Add Route
          </button>
        </div>
      </div>

      {/* ── Desktop Table ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30 text-left">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    {search
                      ? `No routes matching "${search}"`
                      : 'No routes yet. Click "Add Route" to create one.'}
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr
                    key={r._id}
                    className={`row-hover transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                          <Navigation2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(r._id)}
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
            {search ? `No routes matching "${search}"` : 'No routes yet.'}
          </p>
        ) : (
          filtered.map((r) => (
            <div key={r._id} className="rounded-2xl bg-card border border-border/40 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <Navigation2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-3">
                <button
                  onClick={() => openEditModal(r)}
                  className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => setConfirmDeleteId(r._id)}
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

export default RoutesPage
