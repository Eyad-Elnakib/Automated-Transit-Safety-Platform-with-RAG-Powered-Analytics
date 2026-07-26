import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Camera, AlertCircle } from 'lucide-react'

const WEBCAM_URL = (import.meta.env.VITE_WEBCAM_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')

/**
 * Builds the absolute URL for a violation snapshot.
 * imagePath is stored as "storage/snapshots/<type>/<filename>.png"
 * → http://localhost:4000/storage/snapshots/<type>/<filename>.png
 */
const buildImageUrl = (imagePath) => {
  if (!imagePath) return null
  // Guard against double slashes
  const clean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${WEBCAM_URL}${clean}`
}

const formatConfidence = (conf) =>
  typeof conf === 'number' ? `${(conf * 100).toFixed(1)}%` : '—'

const formatTime = (ts) => {
  if (!ts) return ''
  try { return new Date(ts).toLocaleString() } catch { return '' }
}

// ── Single image panel ────────────────────────────────────────────────────────

function ViolationImage({ violation }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'error'
  const url = buildImageUrl(violation?.imagePath)

  // Reset whenever the violation (src) changes
  useEffect(() => { setStatus(url ? 'loading' : 'error') }, [url])

  return (
    <div className="relative w-full h-full">
      {/* Actual image — hidden while loading or on error */}
      {url && (
        <img
          src={url}
          alt={`${violation?.type ?? 'violation'} detection`}
          className={`w-full h-full object-cover transition-opacity duration-200 ${status === 'ok' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      )}

      {/* Loading skeleton */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
          <Camera className="h-8 w-8 text-gray-600" />
        </div>
      )}

      {/* Error / missing fallback */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-800 text-gray-500">
          <AlertCircle className="h-7 w-7 opacity-40" />
          <span className="text-xs opacity-60">
            {url ? 'Image failed to load' : 'No image available'}
          </span>
          {/* Debug: uncomment to verify the URL in dev tools */}
          {/* <span className="text-[10px] opacity-30 px-3 text-center break-all">{url}</span> */}
        </div>
      )}
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────

/**
 * ViolationSlider
 *
 * Props:
 *   violations  {Array}  – list of Violation documents (same type)
 */
const ViolationSlider = ({ violations = [] }) => {
  const [idx, setIdx] = useState(0)

  // Clamp index when violations array shrinks
  const safeIdx = Math.min(idx, Math.max(0, violations.length - 1))
  const total = violations.length

  if (!total) return null

  const v    = violations[safeIdx]
  const prev = () => setIdx((i) => Math.max(0, i - 1))
  const next = () => setIdx((i) => Math.min(total - 1, i + 1))

  return (
    <div className="rounded-xl overflow-hidden bg-gray-900 shadow-inner">
      {/* ── Image area ─────────────────────────────────────────────────────── */}
      <div className="relative aspect-video bg-gray-800 select-none">
        <ViolationImage key={v._id ?? safeIdx} violation={v} />

        {/* ── Navigation (only when > 1) ───────────────────────────────────── */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              disabled={safeIdx === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              disabled={safeIdx === total - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Counter pill */}
            <div className="absolute top-2 right-2 z-10 bg-black/60 rounded-md px-2 py-0.5 text-xs text-white font-medium">
              {safeIdx + 1}&nbsp;/&nbsp;{total}
            </div>
          </>
        )}

        {/* ── Confidence + timestamp overlay ───────────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
          <p className="text-white text-xs font-semibold">
            Confidence: {formatConfidence(v?.confidence)}
          </p>
          <p className="text-gray-300 text-xs mt-0.5">{formatTime(v?.timestamp)}</p>
        </div>
      </div>

      {/* ── Dot indicators (for 2-8 images) ──────────────────────────────── */}
      {total > 1 && total <= 8 && (
        <div className="flex justify-center gap-1 py-2 bg-gray-900">
          {violations.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ViolationSlider
