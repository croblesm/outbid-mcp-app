import { describe, expect, it } from "vitest"
import { safeNextPath } from "./safe-next-path"

const origin = "http://localhost:5173"

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/oauth/consent?authorization_id=1", "/", origin)).toBe(`${origin}/oauth/consent?authorization_id=1`)
  })

  it("never returns a protocol-relative or other-site URL", () => {
    for (const next of ["//evil.com", "/.//evil.com", "/..//evil.com", "/%2e//evil.com", "/./\\evil.com", "https://evil.com"]) {
      const out = safeNextPath(next, "/", origin)
      expect(out === "/" || out.startsWith(`${origin}/`), `${next} -> ${out}`).toBe(true)
    }
  })
})
