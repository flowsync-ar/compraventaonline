"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import SellerAvatar from "./SellerAvatar"
import ConfirmModal from "./ConfirmModal"
import type { SellerRow, QuestionWithBuyer, AnsweredQuestionForBuyer } from "@/lib/supabase/types"
import {
  type NotifKind,
  type NotifTray,
  loadNotifTray,
  saveNotifTray,
  emptyNotifTray,
  isClosed,
  isDeleted,
  isOutOfInbox,
  closeNotif,
  restoreNotif,
  deleteNotif,
  emptyClosed,
  closedCount,
} from "@/lib/notificationTray"
import { communityLanguageRejection, flaggedLanguageTerms } from "@/lib/communityLanguage"
import LanguageHighlightField from "./LanguageHighlightField"

function NotifCloseButton({ onClick, label = "Cerrar notificación" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="shrink-0 h-5 w-5 rounded-md text-text-muted hover:text-foreground hover:bg-card-border/40 text-[11px] font-bold leading-none cursor-pointer"
      title={label}
      aria-label={label}
    >
      ✕
    </button>
  )
}

interface SaleNotification {
  id: string
  amount: number
  created_at: string
  listings: { products: { name: string } | null } | null
  buyer: { name: string } | null
}

export default function HeaderSessionBar() {
  const router = useRouter()
  // Lazy Supabase client init — only created after first browser render.
  // This prevents prerender errors when env vars are not set at build time.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<SellerRow | null>(null)
  const [mounted, setMounted] = useState(false)

  // Shopping cart (local state — not yet backend-connected)
  const [showCart, setShowCart] = useState(false)
  const [cartItems, setCartItems] = useState<{ id: string; name: string; price: number; quantity: number; currencySymbol?: string }[]>([])

  // Profile dropdown
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Questions / notifications — two directions:
  // 1) "notifications": questions asked ON this seller's listings (they answer).
  // 2) "answeredNotifications": questions THIS user asked elsewhere that just
  //    got answered (they read). Same bell, same panel, different sections.
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifTab, setNotifTab] = useState<"inbox" | "closed">("inbox")
  const [notifications, setNotifications] = useState<QuestionWithBuyer[]>([])
  const [answeredNotifications, setAnsweredNotifications] = useState<AnsweredQuestionForBuyer[]>([])
  const [unreadReceivedCount, setUnreadReceivedCount] = useState(0)
  const [unreadAnsweredCount, setUnreadAnsweredCount] = useState(0)

  // 3) "salesNotifications": new PENDING sales on this seller's listings,
  // still needing them to confirm receipt (see /ventas) — "unread" here
  // just means PENDING, same trick the "Transferencias por confirmar"
  // dashboard section already uses; no separate read-tracking column.
  const [salesNotifications, setSalesNotifications] = useState<SaleNotification[]>([])
  const [unreadSalesCount, setUnreadSalesCount] = useState(0)
  const [notifTray, setNotifTray] = useState<NotifTray>(emptyNotifTray)
  const [confirmEmptyClosed, setConfirmEmptyClosed] = useState(false)
  const unreadCount = unreadReceivedCount + unreadAnsweredCount + unreadSalesCount
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyingAnsweredId, setReplyingAnsweredId] = useState<string | null>(null)
  const [answeredReplyText, setAnsweredReplyText] = useState("")

  // Refs for click-outside detection
  const cartRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setShowCart(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Load cart from localStorage (cart is not auth-gated). Older builds
  // wrote a fake demo cart (miel + salame, ids l1/l2) whenever storage
  // was empty — strip those leftovers so a real session starts empty.
  const loadCart = () => {
    const saved = localStorage.getItem("cart")
    if (!saved) {
      setCartItems([])
      return
    }
    try {
      const parsed = JSON.parse(saved) as { id?: string }[]
      const real = parsed.filter((item) => item.id !== "l1" && item.id !== "l2")
      if (real.length !== parsed.length) {
        localStorage.setItem("cart", JSON.stringify(real))
      }
      setCartItems(real as typeof cartItems)
    } catch {
      setCartItems([])
    }
  }

  // Load seller profile — retries up to 5 times with backoff.
  // Needed because the DB trigger may not have committed yet when the
  // auth confirmation callback fires (e.g. clicking the email link).
  const loadProfile = async (userId: string, attempt = 1) => {
    const { data, error } = await getSupabase()
      .from("sellers")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error || !data) {
      if (attempt < 5) {
        setTimeout(() => loadProfile(userId, attempt + 1), attempt * 800)
      } else {
        setProfile(null)
      }
      return
    }
    setProfile(data)
  }

  const persistTray = (updater: (prev: NotifTray) => NotifTray) => {
    setNotifTray((prev) => {
      const next = updater(prev)
      if (profile) saveNotifTray(profile.id, next)
      return next
    })
  }

  const handleCloseNotif = (kind: NotifKind, id: string) => {
    persistTray((prev) => closeNotif(prev, kind, id))
    if (kind === "sale") setUnreadSalesCount((c) => Math.max(0, c - 1))
    if (kind === "answered") setUnreadAnsweredCount((c) => Math.max(0, c - 1))
    if (kind === "question") {
      const q = notifications.find((n) => n.id === id)
      if (q && !q.is_read_by_seller) setUnreadReceivedCount((c) => Math.max(0, c - 1))
    }
  }

  const handleRestoreNotif = (kind: NotifKind, id: string) => {
    persistTray((prev) => restoreNotif(prev, kind, id))
    if (kind === "sale") setUnreadSalesCount((c) => c + 1)
    if (kind === "answered") setUnreadAnsweredCount((c) => c + 1)
    if (kind === "question") {
      const q = notifications.find((n) => n.id === id)
      if (q && !q.is_read_by_seller) setUnreadReceivedCount((c) => c + 1)
    }
  }

  const handleDeleteClosed = (kind: NotifKind, id: string) => {
    persistTray((prev) => deleteNotif(prev, kind, id))
  }

  // Auth state — subscribe to Supabase session changes
  useEffect(() => {
    setMounted(true)
    loadCart()
    window.addEventListener("cart-change", loadCart)

    // Get initial session
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true)
        loadProfile(session.user.id)
      }
    })

    // Keep in sync with auth changes (login, logout, token refresh)
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setIsLoggedIn(true)
          loadProfile(session.user.id)
        } else {
          setIsLoggedIn(false)
          setProfile(null)
          setUnreadReceivedCount(0)
          setUnreadAnsweredCount(0)
          setNotifications([])
          setAnsweredNotifications([])
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("cart-change", loadCart)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The dashboard ("Mis Datos") updates name/avatar_url directly in the DB
  // via the browser client — this component's own `profile` state has no
  // way to know that happened (loadProfile only runs once, on mount/auth
  // change), so without this it stays stale until a full page reload.
  useEffect(() => {
    const handleProfileUpdated = () => {
      getSupabase().auth.getSession().then(({ data: { session } }) => {
        if (session?.user) loadProfile(session.user.id)
      })
    }
    window.addEventListener("profile-updated", handleProfileUpdated)
    return () => window.removeEventListener("profile-updated", handleProfileUpdated)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) {
      setNotifTray(emptyNotifTray())
      return
    }
    setNotifTray(loadNotifTray(profile.id))
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load notifications when the panel opens
  useEffect(() => {
    if (!showNotifications || !profile) return

    const fetchNotifications = async () => {
      const { data } = await getSupabase()
        .from("questions")
        .select(`
          *,
          buyer:sellers!questions_buyer_id_fkey ( * ),
          listing:listings!questions_listing_id_fkey (
            id,
            product:products ( name )
          )
        `)
        .in(
          "listing_id",
          // Get all listing IDs owned by this seller
          (await getSupabase().from("listings").select("id").eq("seller_id", profile.id)).data?.map((l) => l.id) ?? []
        )
        .order("created_at", { ascending: false })
        .limit(50)

      const typedData = (data ?? []) as unknown as QuestionWithBuyer[]
      setNotifications(typedData)

      const unanswered = typedData.filter((q) => !q.is_read_by_seller).length
      setUnreadReceivedCount(unanswered)
    }

    // Questions this user asked (as buyer) that a seller answered and this
    // user hasn't seen yet.
    const fetchAnsweredNotifications = async () => {
      const { data } = await getSupabase()
        .from("questions")
        .select(`
          id, question, answer, updated_at,
          listing:listings!questions_listing_id_fkey (
            id,
            product:products ( name )
          )
        `)
        .eq("buyer_id", profile.id)
        .eq("is_read_by_buyer", false)
        .not("answer", "is", null)
        .order("updated_at", { ascending: false })
        .limit(50)

      const typedData = (data ?? []) as unknown as AnsweredQuestionForBuyer[]
      setAnsweredNotifications(typedData)
      setUnreadAnsweredCount(typedData.length)
    }

    // New sales on this seller's listings still PENDING confirmation.
    const fetchSalesNotifications = async () => {
      const { data } = await getSupabase()
        .from("orders")
        .select(`
          id, amount, created_at,
          listings ( products ( name ) ),
          buyer:sellers!orders_buyer_id_fkey ( name )
        `)
        .eq("seller_id", profile.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(20)

      const typedData = (data ?? []) as unknown as SaleNotification[]
      setSalesNotifications(typedData)
      setUnreadSalesCount(typedData.length)
    }

    fetchNotifications()
    fetchAnsweredNotifications()
    fetchSalesNotifications()
  }, [showNotifications, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll unread count every 15s (keeping existing behavior — Realtime is out of scope)
  useEffect(() => {
    if (!profile) {
      setUnreadReceivedCount(0)
      setUnreadAnsweredCount(0)
      setUnreadSalesCount(0)
      return
    }

    const checkUnread = async () => {
      const tray = loadNotifTray(profile.id)

      const { data: listingIds } = await getSupabase()
        .from("listings")
        .select("id")
        .eq("seller_id", profile.id)

      if (!listingIds?.length) {
        setUnreadReceivedCount(0)
      } else {
        const { data: unreadQs } = await getSupabase()
          .from("questions")
          .select("id")
          .in("listing_id", listingIds.map((l) => l.id))
          .eq("is_read_by_seller", false)

        setUnreadReceivedCount(
          (unreadQs ?? []).filter((q) => !isOutOfInbox(tray, "question", q.id)).length
        )
      }

      const { data: answeredRows } = await getSupabase()
        .from("questions")
        .select("id")
        .eq("buyer_id", profile.id)
        .eq("is_read_by_buyer", false)
        .not("answer", "is", null)

      setUnreadAnsweredCount(
        (answeredRows ?? []).filter((q) => !isOutOfInbox(tray, "answered", q.id)).length
      )

      const { data: saleRows } = await getSupabase()
        .from("orders")
        .select("id")
        .eq("seller_id", profile.id)
        .eq("status", "PENDING")

      setUnreadSalesCount(
        (saleRows ?? []).filter((s) => !isOutOfInbox(tray, "sale", s.id)).length
      )
    }

    checkUnread()

    // 5 min is plenty for a notification badge (not a chat) — the previous
    // 15s interval ran unconditionally, including in backgrounded tabs, and
    // was the single biggest driver of Supabase egress/request volume: it
    // scaled with (logged-in tabs × time), not with actual activity. Pausing
    // while hidden and re-checking the instant the tab regains focus keeps
    // it feeling fresh without paying for tabs nobody is looking at.
    let intervalId: ReturnType<typeof setInterval> | null = null
    const startPolling = () => {
      if (intervalId) return
      intervalId = setInterval(checkUnread, 5 * 60 * 1000)
    }
    const stopPolling = () => {
      if (!intervalId) return
      clearInterval(intervalId)
      intervalId = null
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkUnread()
        startPolling()
      } else {
        stopPolling()
      }
    }

    if (document.visibilityState === "visible") startPolling()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendReply = async (questionId: string) => {
    if (!replyText.trim()) return
    const languageError = communityLanguageRejection(replyText)
    if (languageError) {
      alert(languageError)
      return
    }

    const { error } = await getSupabase()
      .from("questions")
      .update({ answer: replyText, status: "ANSWERED", is_read_by_buyer: false })
      .eq("id", questionId)

    if (error) {
      alert("Error al enviar la respuesta.")
      return
    }

    fetch(`/api/questions/${questionId}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "answered" }),
    }).catch(() => {})

    setReplyingToId(null)
    setReplyText("")

    // Refresh notifications list
    setNotifications((prev) =>
      prev.map((n) => (n.id === questionId ? { ...n, answer: replyText, status: "ANSWERED" } : n))
    )
  }

  const handleMarkAllAsRead = async () => {
    if (!profile) return

    const { data: listingIds } = await getSupabase()
      .from("listings")
      .select("id")
      .eq("seller_id", profile.id)

    if (!listingIds?.length) return

    await getSupabase()
      .from("questions")
      .update({ is_read_by_seller: true })
      .in("listing_id", listingIds.map((l) => l.id))
      .eq("is_read_by_seller", false)

    setUnreadReceivedCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read_by_seller: true })))
  }

  // Hide (or unhide) a question from the listing's public Q&A — the buyer
  // who asked it still sees it in their own view (see listings/[id]/page.tsx),
  // it just disappears for everyone else. Soft toggle, not a delete.
  const handleToggleHidden = async (questionId: string, currentlyHidden: boolean) => {
    const { error } = await getSupabase()
      .from("questions")
      .update({ hidden_by_seller: !currentlyHidden })
      .eq("id", questionId)

    if (error) {
      alert("No se pudo actualizar la visibilidad de la consulta.")
      return
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === questionId ? { ...n, hidden_by_seller: !currentlyHidden } : n))
    )
  }

  const handleMarkAnsweredAsRead = async () => {
    if (!profile || answeredNotifications.length === 0) return

    await getSupabase()
      .from("questions")
      .update({ is_read_by_buyer: true })
      .eq("buyer_id", profile.id)
      .eq("is_read_by_buyer", false)

    setUnreadAnsweredCount(0)
    setAnsweredNotifications([])
  }

  // Lets the buyer keep the conversation going after the seller answers —
  // inserts a new question row on the same listing instead of leaving them
  // stuck with no way to reply from here.
  const handleSendFollowUp = async (n: AnsweredQuestionForBuyer) => {
    if (!answeredReplyText.trim() || !n.listing?.id || !profile) return
    const languageError = communityLanguageRejection(answeredReplyText)
    if (languageError) {
      alert(languageError)
      return
    }

    const { data: inserted, error } = await getSupabase()
      .from("questions")
      .insert({
        listing_id: n.listing.id,
        question: answeredReplyText,
        buyer_id: profile.id,
      })
      .select("id")
      .single()

    if (error) {
      alert("Error al enviar tu mensaje.")
      return
    }

    await getSupabase().from("questions").update({ is_read_by_buyer: true }).eq("id", n.id)

    if (inserted) {
      fetch(`/api/questions/${inserted.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "asked" }),
      }).catch(() => {})
    }

    setReplyingAnsweredId(null)
    setAnsweredReplyText("")
    setAnsweredNotifications((prev) => prev.filter((a) => a.id !== n.id))
    setUnreadAnsweredCount((prev) => Math.max(0, prev - 1))
  }

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    // Hard redirect on purpose: a client-side router.push() left the user
    // stranded on whatever page they signed out from (e.g. /compras kept
    // rendering its already-loaded, now-stale data since that page has no
    // reason to react to auth changes on its own). A full reload guarantees
    // a clean, logged-out "/" every time, from anywhere.
    window.location.href = "/"
  }

  const updateCart = (newItems: typeof cartItems) => {
    setCartItems(newItems)
    localStorage.setItem("cart", JSON.stringify(newItems))
    window.dispatchEvent(new Event("cart-change"))
  }

  const handleEmptyCart = () => updateCart([])

  const handleRemoveOne = (id: string) => {
    const updated = cartItems
      .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0)
    updateCart(updated)
  }

  const handleAddOne = (id: string) => {
    updateCart(cartItems.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)))
  }

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const inboxSales = salesNotifications.filter((s) => !isOutOfInbox(notifTray, "sale", s.id))
  const inboxAnswered = answeredNotifications.filter((n) => !isOutOfInbox(notifTray, "answered", n.id))
  const inboxQuestions = notifications.filter((n) => !isOutOfInbox(notifTray, "question", n.id))
  const closedSales = salesNotifications.filter((s) => isClosed(notifTray, "sale", s.id))
  const closedAnswered = answeredNotifications.filter((n) => isClosed(notifTray, "answered", n.id))
  const closedQuestions = notifications.filter((n) => isClosed(notifTray, "question", n.id))
  const closedTotal = closedSales.length + closedAnswered.length + closedQuestions.length

  if (!mounted) {
    // SSR placeholder to avoid layout shifts
    return (
      <div className="flex items-center gap-4">
        <div className="h-[38px] w-[90px] rounded-xl bg-card-bg border border-card-border opacity-50 hidden sm:block" />
        <div className="h-[38px] w-[80px] rounded-xl bg-card-bg border border-card-border opacity-50" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Mobile search indicator */}
      <Link href="/search" className="hidden p-2 text-text-muted hover:text-foreground transition-colors md:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </Link>

      {/* CTA Vender */}
      <Link
        href="/dashboard?tab=publish"
        className="sell-cta-pulse hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-blue px-3.5 py-2 text-xs font-extrabold uppercase tracking-wide text-white border border-accent-blue/30 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        Vender
      </Link>

      {isLoggedIn ? (
        <div className="flex items-center gap-1.5 sm:gap-4 relative">

          {/* User Profile Indicator / Dropdown */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowCart(false)
              }}
              title={profile ? `Bienvenido, ${profile.name}` : undefined}
              className="flex items-center gap-2 bg-card-bg border border-card-border/50 pl-1.5 pr-1.5 md:pr-3 py-1 rounded-full shadow-sm hover:border-card-border transition-colors cursor-pointer select-none"
            >
              <div className="relative h-7 w-7 shrink-0 rounded-full overflow-hidden shadow-sm">
                <SellerAvatar src={profile?.avatar_url} alt={profile?.name ?? "Vendedor"} />
              </div>
              <span className="hidden md:inline-block text-xs font-bold text-foreground max-w-[105px] truncate">
                {profile ? `Bienvenido, ${profile.name}` : "Cargando..."}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted hidden md:block">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {showUserMenu && (
              <div className="fixed md:absolute right-4 md:right-0 top-[125px] md:top-auto md:mt-3 w-52 rounded-2xl bg-card-bg-solid border border-card-border p-2.5 shadow-2xl z-50 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-1 border-b border-card-border/30 mb-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Mi Cuenta</p>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-gold">
                    <rect x="3" y="3" width="7" height="9" rx="1"></rect>
                    <rect x="14" y="3" width="7" height="5" rx="1"></rect>
                    <rect x="14" y="12" width="7" height="9" rx="1"></rect>
                    <rect x="3" y="16" width="7" height="5" rx="1"></rect>
                  </svg>
                  Mi Panel / Perfil
                </Link>
                <Link
                  href="/dashboard?tab=publish"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-accent-blue hover:bg-accent-blue/10 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  Vender
                </Link>
                <Link
                  href="/compras"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all w-full text-left cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
                    <path d="M6 2 2 6v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6l-4-4z"></path>
                    <line x1="2" y1="6" x2="22" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  Mis Compras
                </Link>
                <Link
                  href="/ventas"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all w-full text-left cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  Mis Ventas
                  {unreadSalesCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center h-4 min-w-4 px-1 text-[9px] font-extrabold text-white bg-accent-gold rounded-full">
                      {unreadSalesCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/favoritos"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all w-full text-left cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                  </svg>
                  Mis Favoritos
                </Link>
                <div className="border-t border-card-border/30 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>

          {/* Shopping Cart */}
          <div ref={cartRef} className="relative">
            <button
              onClick={() => {
                setShowCart(!showCart)
                setShowUserMenu(false)
              }}
              className="relative p-2 text-text-muted hover:text-foreground transition-colors hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center rounded-xl bg-card-bg border border-card-border/80 hover:border-card-border h-9 w-9 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 w-5 text-[9px] font-extrabold leading-none text-white bg-accent-gold rounded-full border border-background shadow-md">
                  {totalItems}
                </span>
              )}
            </button>

            {showCart && (
              <div className="fixed md:absolute right-4 left-4 md:right-0 md:left-auto top-[125px] md:top-auto md:mt-3 w-auto md:w-80 rounded-2xl bg-card-bg-solid border border-card-border p-4 shadow-2xl z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-card-border/50 pb-2">
                  <h4 className="font-heading text-xs font-extrabold text-foreground uppercase tracking-wider">Mi Carrito</h4>
                  <span className="text-[10px] font-bold text-text-muted">{totalItems} artículos</span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-muted">
                    Tu carrito está vacío.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-card-border/10 last:border-b-0 animate-in fade-in duration-200">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/listings/${item.id}`}
                              onClick={() => setShowCart(false)}
                              className="font-bold text-foreground hover:text-accent-gold transition-colors block truncate cursor-pointer"
                              title={`Ver detalle de ${item.name}`}
                            >
                              {item.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-text-muted">Cant:</span>
                              <div className="flex items-center gap-1 bg-card-border/20 rounded-lg p-0.5 border border-card-border/30">
                                <button
                                  onClick={() => handleRemoveOne(item.id)}
                                  className="p-1 rounded-md text-text-muted hover:text-red-500 hover:bg-card-border/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center h-5 w-5"
                                  title={item.quantity === 1 ? "Quitar artículo" : "Reducir cantidad"}
                                >
                                  {item.quantity === 1 ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                  )}
                                </button>
                                <span className="font-bold text-[11px] px-1 min-w-[12px] text-center">{item.quantity}</span>
                                <button
                                  onClick={() => handleAddOne(item.id)}
                                  className="p-1 rounded-md text-text-muted hover:text-accent-gold hover:bg-card-border/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center h-5 w-5"
                                  title="Aumentar cantidad"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-extrabold text-foreground whitespace-nowrap">
                              {item.currencySymbol ?? "$"}{(item.price * item.quantity).toLocaleString("es-AR")}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-[9px] text-text-muted">
                                ({item.currencySymbol ?? "$"}{(item.price).toLocaleString("es-AR")} c/u)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-card-border/50 pt-2 flex justify-between items-center text-xs">
                      <span className="text-text-muted">Total:</span>
                      <span className="font-extrabold text-accent-gold text-sm">
                        {cartItems[0]?.currencySymbol ?? "$"}{totalPrice.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={handleEmptyCart}
                        className="py-2 text-[10px] font-bold rounded-lg border border-red-500/20 hover:border-red-500 text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
                      >
                        Vaciar
                      </button>
                      <button
                        onClick={() => { setShowCart(false); router.push("/carrito"); }}
                        className="py-2 text-[10px] font-extrabold rounded-lg bg-gradient-to-r from-accent-gold to-accent-gold-hover text-white shadow-md hover:opacity-95 transition-all cursor-pointer"
                      >
                        Comprar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Notifications bell */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setNotifTab("inbox")
                setShowCart(false)
                setShowUserMenu(false)
              }}
              className="relative p-2 text-text-muted hover:text-foreground transition-colors hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center rounded-xl bg-card-bg border border-card-border/80 hover:border-card-border h-9 w-9 shadow-sm"
              title="Notificaciones"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 w-5 text-[9px] font-extrabold leading-none text-white bg-red-500 rounded-full border border-background shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed md:absolute right-4 left-4 md:right-0 md:left-auto top-[125px] md:top-auto md:mt-3 w-auto md:w-96 rounded-2xl bg-card-bg-solid border border-card-border p-4 shadow-2xl z-50 flex flex-col gap-3 max-h-[70vh] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex shrink-0 border-b border-card-border">
                  <button
                    type="button"
                    onClick={() => setNotifTab("inbox")}
                    className={`flex-1 pb-2.5 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                      notifTab === "inbox"
                        ? "border-accent-gold text-foreground"
                        : "border-transparent text-text-muted hover:text-foreground"
                    }`}
                  >
                    Nuevas{unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifTab("closed")}
                    className={`flex-1 pb-2.5 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                      notifTab === "closed"
                        ? "border-accent-gold text-foreground"
                        : "border-transparent text-text-muted hover:text-foreground"
                    }`}
                  >
                    Cerradas{closedCount(notifTray) > 0 ? ` (${closedCount(notifTray)})` : ""}
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                {notifTab === "inbox" && inboxSales.length > 0 && (
                  <>
                    <div className="flex justify-between items-center border-b border-card-border/30 pb-2">
                      <span className="text-xs font-heading font-extrabold text-foreground uppercase tracking-wider">💰 Ventas Nuevas</span>
                    </div>

                    <div className="flex flex-col gap-3 pr-1">
                      {inboxSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="p-3 rounded-xl border bg-accent-gold/5 border-accent-gold/20 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <Link
                              href="/ventas"
                              onClick={() => setShowNotifications(false)}
                              className="font-bold text-foreground line-clamp-1 hover:text-accent-gold"
                            >
                              {sale.listings?.products?.name ?? "Publicación"}
                            </Link>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-text-muted">
                                {new Date(sale.created_at).toLocaleDateString("es-AR")}
                              </span>
                              <NotifCloseButton onClick={() => handleCloseNotif("sale", sale.id)} />
                            </div>
                          </div>
                          <p className="text-text-muted">
                            Comprador: <span className="font-bold text-foreground/80">{sale.buyer?.name ?? "—"}</span> · ${Number(sale.amount).toLocaleString("es-AR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {notifTab === "inbox" && inboxAnswered.length > 0 && (
                  <>
                    <div className="flex justify-between items-center border-b border-card-border/30 pb-2">
                      <span className="text-xs font-heading font-extrabold text-foreground uppercase tracking-wider">Te Respondieron</span>
                      <button
                        onClick={handleMarkAnsweredAsRead}
                        className="text-[10px] text-accent-gold hover:underline font-bold cursor-pointer"
                      >
                        Marcar como leídas
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 pr-1">
                      {inboxAnswered.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-xl border bg-accent-green/5 border-accent-green/20 flex flex-col gap-2 text-xs"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <Link
                              href={`/listings/${n.listing?.id ?? "#"}`}
                              onClick={() => setShowNotifications(false)}
                              className="font-bold text-foreground line-clamp-1 hover:text-accent-green transition-colors"
                            >
                              {n.listing?.product?.name ?? "Publicación"}
                            </Link>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-text-muted">
                                {new Date(n.updated_at).toLocaleDateString("es-AR")}
                              </span>
                              <NotifCloseButton onClick={() => handleCloseNotif("answered", n.id)} />
                            </div>
                          </div>
                          <p className="text-text-muted italic line-clamp-1">Tu consulta: &quot;{n.question}&quot;</p>
                          <div className="bg-background/40 p-2.5 rounded-lg border border-card-border/40">
                            <span className="text-[9px] font-bold text-accent-green block mb-0.5 uppercase">Respuesta del vendedor:</span>
                            <p className="text-foreground leading-relaxed">&quot;{n.answer}&quot;</p>
                          </div>

                          {replyingAnsweredId === n.id ? (
                            <div className="flex flex-col gap-2">
                              <LanguageHighlightField
                                as="textarea"
                                value={answeredReplyText}
                                onChange={setAnsweredReplyText}
                                terms={flaggedLanguageTerms(answeredReplyText)}
                                placeholder="Escribí tu respuesta..."
                                className="w-full h-16 bg-background border border-card-border rounded-lg p-2 text-xs text-foreground resize-none"
                                required
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setReplyingAnsweredId(null)
                                    setAnsweredReplyText("")
                                  }}
                                  className="text-[10px] font-bold text-text-muted hover:text-foreground cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSendFollowUp(n)}
                                  disabled={!answeredReplyText.trim()}
                                  className="text-[10px] font-bold text-white bg-accent-gold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                                >
                                  Enviar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReplyingAnsweredId(n.id)
                                setAnsweredReplyText("")
                              }}
                              className="self-start text-[10px] font-bold text-accent-gold hover:underline cursor-pointer"
                            >
                              Responder
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {notifTab === "inbox" && (
                <>
                <div className="flex justify-between items-center border-b border-card-border/30 pb-2">
                  <span className="text-xs font-heading font-extrabold text-foreground uppercase tracking-wider">Preguntas Recibidas</span>
                  {unreadReceivedCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-accent-gold hover:underline font-bold cursor-pointer"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 pr-1">
                  {inboxQuestions.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-6">No tenés ninguna consulta por el momento.</p>
                  ) : (
                    inboxQuestions.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border flex flex-col gap-2 text-xs transition-colors ${
                          !n.answer ? "bg-accent-gold/5 border-accent-gold/20" : "bg-card-bg border-card-border/50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <span className="text-[9px] font-bold text-text-muted block uppercase">Publicación:</span>
                            <Link
                              href={`/listings/${n.listing?.id ?? "#"}`}
                              onClick={() => setShowNotifications(false)}
                              className="font-bold text-foreground hover:text-accent-gold transition-colors line-clamp-1"
                            >
                              {n.listing?.product?.name ?? "Publicación"}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] text-text-muted">
                              {new Date(n.created_at).toLocaleDateString("es-AR")}
                            </span>
                            <NotifCloseButton onClick={() => handleCloseNotif("question", n.id)} />
                          </div>
                        </div>

                        <div className="bg-background/40 p-2.5 rounded-lg border border-card-border/40">
                          <span className="text-[9px] font-bold text-text-muted block mb-0.5">{n.buyer?.name ?? "Comprador"} pregunta:</span>
                          <p className="text-foreground leading-relaxed italic">&quot;{n.question}&quot;</p>
                        </div>

                        <button
                          onClick={() => handleToggleHidden(n.id, n.hidden_by_seller)}
                          className="self-start text-[10px] font-bold text-text-muted hover:text-foreground underline decoration-dotted cursor-pointer"
                        >
                          {n.hidden_by_seller ? "👁️ Volver a mostrar en la publicación" : "🙈 Ocultar de la publicación"}
                        </button>

                        {n.answer ? (
                          <div className="bg-accent-green/5 p-2.5 rounded-lg border border-accent-green/15 flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-accent-green block uppercase">Respondiste:</span>
                            <p className="text-text-muted">&quot;{n.answer}&quot;</p>
                          </div>
                        ) : (
                          <div className="mt-1">
                            {replyingToId === n.id ? (
                              <div className="flex flex-col gap-2">
                                <LanguageHighlightField
                                  as="textarea"
                                  value={replyText}
                                  onChange={setReplyText}
                                  terms={flaggedLanguageTerms(replyText)}
                                  placeholder="Escribí tu respuesta..."
                                  className="w-full h-16 bg-background border border-card-border rounded-lg p-2 text-xs text-foreground resize-none"
                                  required
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setReplyingToId(null)
                                      setReplyText("")
                                    }}
                                    className="px-2.5 py-1 text-[10px] rounded-lg border border-card-border hover:bg-card-bg/25 text-text-muted cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleSendReply(n.id)}
                                    disabled={!replyText.trim()}
                                    className="px-2.5 py-1 text-[10px] rounded-lg bg-gradient-to-r from-accent-gold to-accent-gold-hover text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                                  >
                                    Enviar Respuesta
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setReplyingToId(n.id)
                                  setReplyText("")
                                }}
                                className="w-full py-1.5 text-center text-[10px] font-bold rounded-lg border border-accent-gold/30 hover:border-accent-gold text-accent-gold hover:bg-accent-gold/5 transition-all cursor-pointer"
                              >
                                Responder Consulta
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                </>
                )}

                {notifTab === "closed" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text-muted">
                        {closedTotal === 0
                          ? "No hay notificaciones cerradas."
                          : "Si cerraste una por error, restaurála. Vaciar no se puede deshacer."}
                      </span>
                      {closedTotal > 0 && (
                        <button
                          type="button"
                          onClick={() => setConfirmEmptyClosed(true)}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer shrink-0"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {closedSales.map((sale) => (
                        <div key={sale.id} className="p-2.5 rounded-xl border border-card-border/50 bg-card-bg/40 flex flex-col gap-1 text-xs opacity-80">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-foreground line-clamp-1">{sale.listings?.products?.name ?? "Venta"}</span>
                            <NotifCloseButton label="Borrar de forma permanente" onClick={() => handleDeleteClosed("sale", sale.id)} />
                          </div>
                          <button type="button" onClick={() => handleRestoreNotif("sale", sale.id)} className="self-start text-[10px] font-bold text-accent-gold hover:underline cursor-pointer">
                            Restaurar
                          </button>
                        </div>
                      ))}
                      {closedAnswered.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl border border-card-border/50 bg-card-bg/40 flex flex-col gap-1 text-xs opacity-80">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-foreground line-clamp-1">{n.listing?.product?.name ?? "Respuesta"}</span>
                            <NotifCloseButton label="Borrar de forma permanente" onClick={() => handleDeleteClosed("answered", n.id)} />
                          </div>
                          <button type="button" onClick={() => handleRestoreNotif("answered", n.id)} className="self-start text-[10px] font-bold text-accent-gold hover:underline cursor-pointer">
                            Restaurar
                          </button>
                        </div>
                      ))}
                      {closedQuestions.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl border border-card-border/50 bg-card-bg/40 flex flex-col gap-1 text-xs opacity-80">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-foreground line-clamp-1">{n.listing?.product?.name ?? "Consulta"}</span>
                            <NotifCloseButton label="Borrar de forma permanente" onClick={() => handleDeleteClosed("question", n.id)} />
                          </div>
                          <button type="button" onClick={() => handleRestoreNotif("question", n.id)} className="self-start text-[10px] font-bold text-accent-gold hover:underline cursor-pointer">
                            Restaurar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Login CTA */
        <Link href="/login" className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-3.5 py-2 text-xs font-extrabold text-white border border-transparent shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          INGRESAR
        </Link>
      )}

      <ConfirmModal
        isOpen={confirmEmptyClosed}
        type="danger"
        title="Vaciar notificaciones cerradas"
        description="Se van a eliminar todas las notificaciones cerradas. No se pueden recuperar. Las ventas y las preguntas en tus publicaciones no se tocan."
        confirmText="Vaciar"
        cancelText="Cancelar"
        onCancel={() => setConfirmEmptyClosed(false)}
        onConfirm={() => {
          persistTray((prev) => emptyClosed(prev))
          setConfirmEmptyClosed(false)
        }}
      />
    </div>
  )
}
