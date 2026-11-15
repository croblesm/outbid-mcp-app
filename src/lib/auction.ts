import { supabase } from "./supabase"
import { bidderName, latest, summarize } from "./lots"
import type { Auction } from "./types"

const BUCKET = "lots"
const photoPath = (lotId: number) => `${lotId}.jpg`

export const auction: Auction = {
  async load() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    // shortcut: loads bids newest first and PostgREST returns at most 1,000 rows, so prices stay right but bid counts cap at 1,000; when to upgrade: a view with max(amount) and count per lot
    const [lots, bids, files] = await Promise.all([
      supabase.from("lots").select("id, title, description, starting_price, increment"),
      supabase.from("bids").select("id, lot_id, amount, bidder, user_id, created_at").order("id", { ascending: false }),
      supabase.storage.from(BUCKET).list(),
    ])
    if (lots.error) throw lots.error
    if (bids.error) throw bids.error
    if (files.error) throw files.error
    const photoVersion = new Map(files.data.map((f) => [f.name, f.updated_at]))
    const photoUrl = (lotId: number) => {
      const version = photoVersion.get(photoPath(lotId))
      return version
        ? `${supabase.storage.from(BUCKET).getPublicUrl(photoPath(lotId)).data.publicUrl}?v=${encodeURIComponent(version)}`
        : null
    }
    return {
      lots: summarize(lots.data, bids.data, session?.user.id ?? null, photoUrl),
      feed: latest(bids.data, lots.data),
    }
  },

  async signIn(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Keep the path and query: the OAuth consent page sends people here to sign in and come back.
      options: { emailRedirectTo: location.href },
    })
    if (error) throw error
  },

  async signOut() {
    // local: the default (global) also revokes Claude's OAuth session for this user, so the connector breaks.
    const { error } = await supabase.auth.signOut({ scope: "local" })
    if (error) throw error
  },

  async rename(name) {
    // Fires USER_UPDATED, so onBidder hands the header the new name. place_bid reads it from auth.users.
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } })
    if (error) throw error
  },

  onBidder(cb) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      cb(session ? bidderName(session.user.email ?? "", session.user.user_metadata.display_name) : null)
      // A session restored from storage can belong to a stack that was since reset or destroyed: ask the
      // server, and drop it if the user is gone. setTimeout: no Supabase calls inside this callback.
      if (event === "INITIAL_SESSION" && session) {
        setTimeout(async () => {
          const { error } = await supabase.auth.getUser()
          if (error) await supabase.auth.signOut({ scope: "local" })
        })
      }
    })
    return () => data.subscription.unsubscribe()
  },

  async bid(lotId, amount) {
    // The database checks the minimum under a row lock; the client only proposes.
    const { error } = await supabase.rpc("place_bid", { lot_id: lotId, amount })
    if (error) throw new Error(error.message)
  },


  onBid(cb) {
    // Realtime doesn't replay what a dropped connection missed (a background tab loses it easily), so reload
    // whenever the channel (re)joins and whenever the tab is shown again.
    const channel = supabase
      .channel("bids")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, () => cb())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") cb()
      })
    const onVisible = () => {
      if (document.visibilityState === "visible") cb()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      supabase.removeChannel(channel)
    }
  },

  onWatching(cb) {
    const channel = supabase.channel("room", {
      config: { presence: { key: crypto.randomUUID() } },
    })
    channel
      .on("presence", { event: "sync" }, () => cb(Object.keys(channel.presenceState()).length))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ at: Date.now() })
      })
    return () => {
      supabase.removeChannel(channel)
    }
  },
}
