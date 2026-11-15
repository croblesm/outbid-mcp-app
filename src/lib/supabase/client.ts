import { supabase } from '@/lib/supabase'

// The consent block asks for a client; hand it the app's one client so both share the session.
export function createClient() {
  return supabase
}
