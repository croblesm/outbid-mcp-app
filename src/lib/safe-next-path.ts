export const safeNextPath = (path: unknown, fallback = '/', origin?: string) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return fallback

  const currentOrigin = origin ?? window.location.origin

  try {
    const url = new URL(path, currentOrigin)
    // Return the absolute URL: a pathname like "/.//evil.com" normalizes to "//evil.com", a protocol-relative redirect.
    return url.origin === currentOrigin ? url.href : fallback
  } catch {
    return fallback
  }
}
