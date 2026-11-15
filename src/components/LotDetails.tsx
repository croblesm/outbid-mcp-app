import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { LotPhoto } from "@/components/LotCard"
import type { Lot } from "@/lib/types"

type Props = {
  lot: Lot | undefined
  open: boolean
  signedIn: boolean
  onOpenChange: (open: boolean) => void
  onBid: (lot: Lot) => void
}

export function LotDetails({ lot, open, signedIn, onOpenChange, onBid }: Props) {
  return (
    <Dialog open={open && lot !== undefined} onOpenChange={onOpenChange}>
      {lot && (
        <DialogContent className="max-h-[85svh] gap-5 overflow-y-auto p-0 sm:max-w-2xl">
          <div className="aspect-[16/9] overflow-hidden">
            <LotPhoto lot={lot} />
          </div>
          <div className="grid gap-4 px-6">
            <DialogTitle className="font-heading text-2xl leading-snug font-semibold text-balance">
              {lot.title}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              {lot.description ?? "No description yet."}
            </DialogDescription>
            <p className="text-base text-muted-foreground">
              Starts at ${lot.startingPrice}. Each bid adds at least $
              {lot.increment}.
            </p>
          </div>
          <DialogFooter className="mx-0 mb-0 items-center px-6 sm:justify-between">
            <span className="numeral text-4xl">
              ${lot.current ?? lot.startingPrice}
            </span>
            <Button
              className="h-11 rounded-full px-5 text-base font-semibold"
              disabled={!signedIn || lot.mine}
              onClick={() => onBid(lot)}
            >
              {lot.mine ? "You're winning" : `Bid $${lot.minimum}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
