"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api, type Payout, type Vendor } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { Plus, Loader2, ArrowRightLeft, RefreshCw, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STATUS_OPTIONS = ["All", "Draft", "Submitted", "Approved", "Rejected"] as const

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    Submitted: "bg-info/10 text-info border-info/20",
    Approved: "bg-success/10 text-success border-success/20",
    Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${map[status] ?? ""}`}>
      {status}
    </span>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function PayoutsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  // ── Robust role detection: context may still be hydrating on first render
  const role = user?.role ?? (typeof window !== "undefined" 
    ? (() => { try { return JSON.parse(localStorage.getItem("auth_user") ?? "{}")?.role } catch { return null } })()
    : null)
  const isOPS = role === "OPS"

  const [payouts, setPayouts] = useState<Payout[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  // ─── "EncodedUrl" logic — we pack all filters into a single base64 param 'q' ───
  const q = searchParams.get("q") || ""
  let filters: { status?: string; vendor_id?: string } = {}
  try {
    if (q) filters = JSON.parse(atob(decodeURIComponent(q)))
  } catch (e) {
    console.error("Failed to decode filters", e)
  }

  function setFilter(newFilters: typeof filters) {
    const json = JSON.stringify(newFilters)
    const encoded = encodeURIComponent(btoa(json))
    router.replace(`/payouts?q=${encoded}`)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ payouts }, { vendors }] = await Promise.all([
        api.payouts.list(filters),
        api.vendors.list(),
      ])
      setPayouts(payouts)
      setVendors(vendors)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load payouts")
    } finally {
      setLoading(false)
    }
  }, [q]) // reload when 'q' changes

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto animate-fade-in">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Payouts
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
            {payouts.length} Transactions Found
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Sync
          </Button>
          {isOPS && (
            <Link href="/payouts/new">
              <Button size="sm" className="h-7 text-[10px] font-black uppercase tracking-wider gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Payout
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Separator />

      {/* compact filters bar */}
      <div className="flex items-center gap-3 p-2 rounded-md bg-muted/30 border border-dashed">
        <div className="flex items-center gap-1.5">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status:</span>
           <Select 
            value={filters.status || "All"} 
            onValueChange={(v) => setFilter({ ...filters, status: v === "All" ? undefined : v })}
           >
            <SelectTrigger className="h-7 text-[10px] w-28 bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="text-[10px]">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vendor:</span>
           <Select 
            value={filters.vendor_id || "all"} 
            onValueChange={(v) => setFilter({ ...filters, vendor_id: v === "all" ? undefined : v })}
           >
            <SelectTrigger className="h-7 text-[10px] w-40 bg-background">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[10px]">All Vendors</SelectItem>
              {vendors.map((v) => <SelectItem key={v._id} value={v._id} className="text-[10px]">{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {q && (
          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground ml-auto"
            onClick={() => router.replace("/payouts")}>
            Reset Filters
          </Button>
        )}
      </div>

      {/* compact table */}
      <div className="rounded-lg border shadow-sm outline-none bg-card overflow-hidden transition-all">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2 opacity-40">
            <Search className="h-6 w-6" />
            <p className="text-[11px] font-medium">No results found for current filters</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Vendor", "Amount", "Mode", "Status", "Requested", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-black uppercase tracking-tighter text-muted-foreground/70">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => {
                const vendor = typeof p.vendor_id === "object" ? p.vendor_id : null
                return (
                  <tr key={p._id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold leading-tight">{vendor?.name ?? "Unknown"}</span>
                        <span className="text-[9px] text-muted-foreground tabular-nums opacity-60">ID: {p._id.slice(-8)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-bold tabular-nums text-primary">{fmt(p.amount)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{p.mode}</span>
                    </td>
                    <td className="px-3 py-2.5">{statusBadge(p.status)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/payouts/${encodeURIComponent(btoa(p._id))}`}>
                        <Button variant="outline" size="sm" className="h-6 text-[9px] font-bold uppercase tracking-widest px-2 group-hover:border-primary transition-all">
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-5 w-5 animate-spin text-primary/30" /></div>}>
      <PayoutsContent />
    </Suspense>
  )
}
