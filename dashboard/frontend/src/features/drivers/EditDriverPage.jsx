import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Hash, Loader2, Shield, Car, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { fetchDriver, updateDriver } from '../../api/driversApi.js'

const EditDriverPage = () => {
  const { id }     = useParams()
  const navigate   = useNavigate()

  const [name,      setName]      = useState('')
  const [driverId,  setDriverId]  = useState('')
  const [readOnly,  setReadOnly]  = useState({ avgScore: 0, totalTrips: 0 })
  const [fetching,  setFetching]  = useState(true)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    fetchDriver(id)
      .then((d) => {
        setName(d.name)
        setDriverId(d.id)
        setReadOnly({ avgScore: d.avgScore ?? 0, totalTrips: d.totalTrips ?? 0 })
      })
      .catch((err) => {
        toast.error('Failed to load driver: ' + err.message)
        navigate('/drivers')
      })
      .finally(() => setFetching(false))
  }, [id, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !driverId.trim()) return
    setSaving(true)
    try {
      await updateDriver(id, { id: driverId.trim(), name: name.trim() })
      toast.success('Driver updated successfully')
      navigate('/drivers')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-up">
      {/* Back link */}
      <Link
        to="/drivers"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Drivers
      </Link>

      <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
        {/* Colour strip */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-primary/40" />

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">Edit Driver</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update driver's ID and name. Score and trip data are read-only.
            </p>
          </div>

          {/* Read-only stats */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/40 border border-border/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Avg Score</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{readOnly.avgScore}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Read-only</p>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Total Trips</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{readOnly.totalTrips}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Read-only</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Driver Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* ID */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Driver ID</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  placeholder="e.g. DRV-009"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Link
                to="/drivers"
                className="flex-1 h-11 rounded-xl border border-border/60 text-sm font-semibold text-foreground hover:bg-muted/60 transition-all flex items-center justify-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim() || !driverId.trim()}
                className="flex-1 h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><TrendingUp className="h-4 w-4" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditDriverPage
