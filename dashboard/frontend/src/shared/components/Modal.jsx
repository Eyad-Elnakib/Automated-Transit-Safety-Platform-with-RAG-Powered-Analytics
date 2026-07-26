import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Full-viewport overlay via portal (avoids overflow/transform ancestors breaking `fixed` + blur).
 * Always vertically & horizontally centered.
 *
 * @param {'compact'|'comfortable'} size — compact ≈ 24rem, comfortable ≈ 28rem
 */
const SIZE_WIDTH = {
  compact:     'w-[min(100%,24rem)]',
  comfortable: 'w-[min(100%,28rem)]',
}

const Modal = ({ isOpen, onClose, title, children, size = 'compact' }) => {
  const widthClass = SIZE_WIDTH[size] ?? SIZE_WIDTH.compact

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ isolation: 'isolate' }}
    >
      {/* Full-screen dim + blur (covers full viewport — portal avoids main/sidebar clipping) */}
      <div
        role="presentation"
        className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />

      {/* Panel — above backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          relative z-10 ${widthClass} max-h-[calc(100dvh-2rem)] shrink-0 overflow-y-auto overflow-x-hidden
          rounded-2xl bg-card border border-border/50 shadow-2xl shadow-black/30
          animate-scale-in
        `}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-3.5">
          <h2
            id="modal-title"
            className="text-base font-bold text-foreground tracking-tight leading-tight pr-2"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
