import { Bell, Menu, Moon, Sun, Search, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const Topbar = ({ title, onMenuClick }) => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-card/90 backdrop-blur-md px-4 md:px-6 z-10">
      {/* Left: burger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight leading-none">
            {title}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
            Driver Monitoring System
          </p>
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search — visible md+ */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search…"
            className="h-9 w-48 pl-9 pr-4 rounded-xl bg-muted/70 border border-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:bg-muted focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          {isDark
            ? <Sun  className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            : <Moon className="h-[18px] w-[18px]" />
          }
        </button>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />

        {/* User avatar + name */}
        <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-all group">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow ring-2 ring-primary/20">
            <span className="text-[10px] font-bold text-white tracking-wide select-none">AD</span>
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">Admin</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </header>
  )
}

export default Topbar
