import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"

// Loaded only on its own route: it needs the Supabase client, and the starting point (mock data) has no env.
const ConsentPage = lazy(() => import("./ConsentPage.tsx").then((m) => ({ default: m.ConsentPage })))

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {location.pathname === "/oauth/consent" ? (
      <Suspense>
        <ConsentPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
)
