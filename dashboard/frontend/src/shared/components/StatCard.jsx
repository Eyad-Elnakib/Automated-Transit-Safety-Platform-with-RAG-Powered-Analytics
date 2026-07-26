const variantConfig = {
  blue: {
    gradient: 'stat-gradient-blue',
    glow: 'shadow-blue-500/20',
    ring: 'from-blue-400/20 to-blue-600/5',
    text: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
  emerald: {
    gradient: 'stat-gradient-emerald',
    glow: 'shadow-emerald-500/20',
    ring: 'from-emerald-400/20 to-emerald-600/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  amber: {
    gradient: 'stat-gradient-amber',
    glow: 'shadow-amber-500/20',
    ring: 'from-amber-400/20 to-amber-600/5',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  rose: {
    gradient: 'stat-gradient-rose',
    glow: 'shadow-rose-500/20',
    ring: 'from-rose-400/20 to-rose-600/5',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
  violet: {
    gradient: 'stat-gradient-violet',
    glow: 'shadow-violet-500/20',
    ring: 'from-violet-400/20 to-violet-600/5',
    text: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500',
  },
}

const StatCard = ({ title, value, icon: Icon, trend, trendUp, variant = 'blue', subtitle }) => {
  const cfg = variantConfig[variant] ?? variantConfig.blue

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl bg-card border border-border/40
        p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5
        transition-all duration-300 cursor-default
      `}
    >
      {/* Ambient background ring */}
      <div
        className={`absolute -top-6 -right-6 h-28 w-28 rounded-full bg-gradient-to-br ${cfg.ring} blur-xl`}
      />

      <div className="relative z-10">
        {/* Top row: label + icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground tracking-tight leading-none">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${cfg.text}`}>
                <span>{trendUp ? '↑' : '↓'}</span>
                <span>{trend}</span>
              </div>
            )}
          </div>

          <div
            className={`
              flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
              ${cfg.gradient} shadow-lg ${cfg.glow}
              transition-transform duration-300 group-hover:scale-110
            `}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="mt-4 h-0.5 w-full rounded-full bg-border/50 overflow-hidden">
          <div
            className={`h-full rounded-full ${cfg.bar} transition-all duration-700`}
            style={{ width: '60%' }}
          />
        </div>
      </div>
    </div>
  )
}

export default StatCard
