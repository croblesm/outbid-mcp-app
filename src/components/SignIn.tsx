import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  /** The bidder's display name; the header never shows the full email. */
  name: string | null
  onSignIn: (email: string) => Promise<void>
  onRename: (name: string) => Promise<void>
  onSignOut: () => void
}

export function SignIn({ name, onSignIn, onRename, onSignOut }: Props) {
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)

  if (name) {
    return (
      <div className="flex items-center gap-3 text-base">
        {renaming === null ? (
          <button
            type="button"
            title="Change the name other bidders see"
            onClick={() => setRenaming(name)}
            className="max-w-64 truncate rounded-full text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {name}
          </button>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const next = renaming.trim()
              setRenaming(null)
              if (next && next !== name) await onRename(next)
            }}
          >
            <Input
              autoFocus
              aria-label="Display name"
              maxLength={40}
              value={renaming}
              onChange={(e) => setRenaming(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
              onBlur={() => setRenaming(null)}
              className="h-10 w-52 rounded-full bg-popover px-4 text-base md:text-base"
            />
          </form>
        )}
        <Button
          variant="ghost"
          className="h-10 rounded-full px-4 text-base"
          onClick={onSignOut}
        >
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setSending(true)
        try {
          await onSignIn(draft)
        } finally {
          setSending(false)
        }
      }}
    >
      <Input
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-11 w-60 rounded-full bg-popover px-4 text-base md:text-base"
      />
      <Button
        type="submit"
        disabled={sending}
        className="h-11 rounded-full px-5 text-base font-semibold"
      >
        {sending ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  )
}
