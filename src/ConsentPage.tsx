import { OAuthConsent } from "@/components/oauth-consent"

// /oauth/consent: where Supabase Auth sends Claude (or any MCP client) to ask the bidder for access.
export function ConsentPage() {
  const authorizationId = new URLSearchParams(location.search).get("authorization_id")
  return (
    <main className="mx-auto grid min-h-svh max-w-md content-center gap-8 px-4 py-10">
      <img src="/jsnation-logo.svg" alt="JSNation" className="h-10 w-auto self-start justify-self-start" />
      {/* Not signed in: the hook sends people to / with ?next=, and App brings them back here. */}
      <OAuthConsent authorizationId={authorizationId} signInPath="/" productName="Outbid" />
    </main>
  )
}
