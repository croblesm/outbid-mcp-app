export function Watching({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-base text-muted-foreground">
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <span className="numeral text-lg text-foreground">{count}</span> watching
    </span>
  )
}
