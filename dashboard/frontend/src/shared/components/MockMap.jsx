const MockMap = () => (
  <div className="relative h-64 w-full overflow-hidden rounded-xl bg-muted border border-border/30">
    <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect fill="hsl(220 10% 95%)" width="400" height="200" className="dark:fill-slate-800" />
      <path
        d="M 30 150 Q 80 80 150 100 T 250 70 T 370 50"
        stroke="hsl(221 83% 53%)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="8 4"
        className="opacity-80"
      />
      <circle cx="30" cy="150" r="8" fill="hsl(160 60% 45%)" className="drop-shadow-lg" />
      <circle cx="370" cy="50" r="8" fill="hsl(0 84% 60%)" className="drop-shadow-lg" />
      <circle cx="30" cy="150" r="16" fill="hsl(160 60% 45%)" className="opacity-30" />
      <circle cx="370" cy="50" r="16" fill="hsl(0 84% 60%)" className="opacity-30" />
      <text x="45" y="160" fontSize="11" fontWeight="600" fill="hsl(160 60% 45%)">
        Start
      </text>
      <text x="320" y="42" fontSize="11" fontWeight="600" fill="hsl(0 84% 60%)">
        End
      </text>
      <path
        d="M 30 150 Q 80 80 150 100 T 250 70 T 370 50"
        stroke="hsl(221 83% 53%)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        opacity="0.15"
      />
    </svg>
    <div className="absolute bottom-3 left-3 rounded-lg bg-card/90 px-2.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm border border-border/20">
      Route Map (Preview)
    </div>
  </div>
)

export default MockMap