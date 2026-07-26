import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Navigation2, Bus, Car,
  ChevronLeft, ChevronRight, Shield, X, Activity, MessageSquare,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Main Menu',
    items: [
      { label: 'Overview', path: '/',        icon: LayoutDashboard },
      { label: 'Drivers',  path: '/drivers', icon: Users },
      { label: 'Routes',   path: '/routes',  icon: Navigation2 },
      { label: 'Buses',    path: '/buses',   icon: Bus },
      { label: 'Trips',    path: '/trips',   icon: Car },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { label: 'Chatbot',  path: '/chatbot', icon: MessageSquare, badge: 'AI' },
    ],
  },
]

const AppSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const location = useLocation()

  const sidebarContent = (
    <div
      className={`flex h-full flex-col bg-sidebar transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 border-b border-white/8 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/30 ring-1 ring-white/10">
          <Shield className="h-4.5 w-4.5 h-[18px] w-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white tracking-tight truncate">Driver Monitor</p>
              <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase mt-0.5">
                Fleet Safety
              </p>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-all md:hidden"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Nav groups ─────────────────────────────────────────────────── */}
      <nav className={`flex-1 overflow-y-auto space-y-1 ${collapsed ? 'px-2 pt-4' : 'px-3 pt-4'}`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Group label */}
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-primary/25 via-primary/15 to-transparent text-white'
                        : 'text-white/55 hover:bg-white/6 hover:text-white/90'
                    }`}
                  >
                    {/* Active left border accent */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary shadow-sm shadow-primary/50" />
                    )}

                    <item.icon
                      className={`shrink-0 transition-all duration-200 ${
                        collapsed ? 'h-5 w-5 mx-auto' : 'h-[18px] w-[18px]'
                      } ${active ? 'text-primary' : 'group-hover:scale-105'}`}
                    />

                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {/* Per-item badge (e.g. "AI") */}
                        {item.badge && !active && (
                          <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300 leading-none">
                            {item.badge}
                          </span>
                        )}
                        {active && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/80" />
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Separator between groups */}
            {!collapsed && <div className="my-2 mx-3 h-px bg-white/8" />}
          </div>
        ))}
      </nav>

      {/* ── System status bar ───────────────────────────────────────────── */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl bg-white/4 border border-white/6 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/70 truncate">System Online</p>
              <p className="text-[10px] text-white/35 mt-0.5">All services running</p>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          </div>
        </div>
      )}

      {/* ── Collapse toggle ─────────────────────────────────────────────── */}
      <div className="border-t border-white/8 p-3">
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-white/40 hover:bg-white/6 hover:text-white/70 transition-all md:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block shrink-0">{sidebarContent}</aside>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onMobileClose}
        />
        <aside
          className={`relative z-10 h-full shadow-2xl transform transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}

export default AppSidebar
