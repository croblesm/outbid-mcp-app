import lots from "./lots.json"
import type { LotRow } from "@/lib/lots"

// The catalog the app shows before there is a backend: the same rows the seed inserts.
export const lotRows: LotRow[] = lots.map((lot, i) => ({ id: i + 1, ...lot }))
