"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { api, type Payout, type AuditEntry, type Vendor, type AuthUser } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  SendHorizonal,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ACTION_COLORS: Record<string, string> = {
  CREATED: "text-muted-foreground",
  SUBMITTED: "text-info",
  APPROVED: "text-success",
  REJECTED: "text-destructive",
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    Submitted: "bg-info/10 text-info border-info/20",
    Approved: "bg-success/10 text-success border-success/20",
    Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${map[status] ?? ""}`}>
      {status}
    </span>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

export default function PayoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  // ── Robust role detection: context may still be hydrating on first render
  const role = user?.role ?? (typeof window !== "undefined" 
    ? (() => { try { return JSON.parse(localStorage.getItem("auth_user") ?? "{}")?.role } catch { return null } })()
    : null)
  const isOPS = role === "OPS"
  const isFINANCE = role === "FINANCE"

  // Decode the base64 ID from the URL
  let id = ""
  try {
    id = atob(decodeURIComponent(params.id as string))
  } catch (e) {
    console.error("Invalid ID format", e)
  }

  const [payout, setPayout] = useState<Payout | null>(null)
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

  const load = useCallback(async () => {
    if (!id) { router.replace("/payouts"); return }
    setLoading(true)
    try {
      const { payout, audits } = await api.payouts.detail(id)
      setPayout(payout)
      setAudits(audits)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load payout")
      router.replace("/payouts")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function handleAction(fn: () => Promise<any>, successMsg: string) {
    setActing(true)
    try {
      await fn()
      toast.success(successMsg)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActing(false)
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { toast.error("Reason required"); return }
    setRejecting(true)
    try {
      await api.payouts.reject(id, reason.trim())
      toast.success("Rejected")
      setRejectOpen(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reject failed")
    } finally {
      setRejecting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-4 w-4 animate-spin text-primary/40" /></div>
  if (!payout) return null

  const vendor = typeof payout.vendor_id === "object" ? (payout.vendor_id as Vendor) : null
  const creator = typeof payout.created_by === "object" ? (payout.created_by as AuthUser) : null

  const canSubmit = isOPS && payout.status === "Draft"
  const canApprove = isFINANCE && payout.status === "Submitted"
  const canReject = isFINANCE && payout.status === "Submitted"

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Link href="/payouts" className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b bg-muted/20">
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold tracking-tight">{vendor?.name ?? "Transaction"}</h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-60">ID: {payout._id}</p>
          </div>
          {statusBadge(payout.status)}
        </div>

        <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-8">
           <Info label="Amount" value={<span className="text-base font-black tabular-nums text-primary">{fmt(payout.amount)}</span>} />
           <Info label="Mode" value={<Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold">{payout.mode}</Badge>} />
           <Info label="Beneficiary" value={vendor?.name ?? "—"} />
           <Info label="Account/UPI" value={vendor?.bank_account || vendor?.upi_id || "—"} />
           <Info label="IFSC Code" value={<span className="font-mono text-[11px] font-bold">{vendor?.ifsc ?? "N/A"}</span>} />
           <Info label="Initiator" value={<span className="flex items-center gap-1">{creator?.name} <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{creator?.role}</Badge></span>} />
           
           {payout.note && <Info label="Transaction Memo" value={payout.note} className="col-span-2 p-2 bg-muted/30 rounded border border-dashed" />}
           
           {payout.decision_reason && (
             <div className="col-span-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
               <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1 flex items-center gap-1">
                 <AlertTriangle className="h-3 w-3" /> Rejection Conflict
               </p>
               <p className="text-[11px] font-medium text-destructive/80 leading-relaxed italic">"{payout.decision_reason}"</p>
             </div>
           )}
        </div>

        {(canSubmit || canApprove || canReject) && (
          <div className="p-4 border-t bg-muted/10 flex items-center justify-end gap-2">
            {canReject && (
              <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold uppercase tracking-wider text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRejectOpen(true)}>
                Reject Request
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" className="h-8 text-[11px] font-bold uppercase tracking-wider flex-1" onClick={() => handleAction(() => api.payouts.submit(id), "Submitted")} disabled={acting}>
                {acting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <SendHorizonal className="h-3 w-3 mr-2" />}
                Submit for Approval
              </Button>
            )}
            {canApprove && (
              <Button size="sm" className="h-8 text-[11px] font-bold uppercase tracking-wider bg-success hover:bg-success/90 text-success-foreground flex-1" onClick={() => handleAction(() => api.payouts.approve(id), "Approved")} disabled={acting}>
                {acting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <CheckCircle2 className="h-3 w-3 mr-2" />}
                Authorize Payout
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Immutable Audit Logs
        </h2>
        <div className="space-y-3 relative pl-4 border-l border-dashed border-muted ml-2">
          {audits.map((a, i) => (
            <div key={a._id} className="relative">
              <div className={`absolute -left-[20.5px] top-1 h-3 w-3 rounded-full border-2 bg-background ${i === audits.length - 1 ? "border-primary" : "border-muted-foreground/30"}`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${ACTION_COLORS[a.action]}`}>
                    {a.action}
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground tabular-nums">· {fmtDate(a.createdAt)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 font-medium leading-tight">
                  Actioned by <span className="text-foreground">{a.performer_name}</span> ({a.performer_role})
                </p>
                {a.note && <p className="text-[10px] text-muted-foreground italic bg-muted/40 p-1 px-2 rounded inline-block">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-xs font-bold uppercase tracking-wider">Rejection Reason</DialogTitle></DialogHeader>
          <form onSubmit={handleReject} className="space-y-3 pt-1">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="rej-r" className="text-[10px] font-bold uppercase text-muted-foreground">Detailed Explanation *</Label>
              <Textarea id="rej-r" value={reason} onChange={(e) => setReason(e.target.value)} className="text-[11px] resize-none h-24" placeholder="Mention why this cannot be approved..." autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px] font-bold uppercase" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" size="sm" className="h-8 text-[11px] font-bold uppercase" disabled={rejecting}>
                {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Rejection"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <div className="text-[11px] font-bold text-foreground/90">{value}</div>
    </div>
  )
}
