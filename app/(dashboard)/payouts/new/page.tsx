"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, type Vendor } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Sparkles, Database, Landmark, CreditCard, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

const MODES = ["UPI", "IMPS", "NEFT"] as const

export default function NewPayoutPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [vendorId, setVendorId] = useState("")
  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState<string>("")
  const [note, setNote] = useState("")

  useEffect(() => {
    if (user && user.role !== "OPS") {
      toast.error("OPS Access Required")
      router.replace("/payouts")
    }
  }, [user, router])

  useEffect(() => {
    api.vendors
      .list()
      .then(({ vendors }) => setVendors(vendors.filter((v) => v.is_active)))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Sync Failed"))
      .finally(() => setLoadingVendors(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!vendorId) { toast.error("Select Beneficiary"); return }
    if (!amount || isNaN(amt) || amt <= 0) { toast.error("Invalid Amount"); return }
    if (!mode) { toast.error("Select Mode"); return }

    setSubmitting(true)
    try {
      await api.payouts.create({ vendor_id: vendorId, amount: amt, mode, note: note.trim() || undefined })
      toast.success("Transaction Logged as Draft")
      router.push("/payouts")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Creation Failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-sm mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-1">
        <Link href="/payouts" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all mb-4">
          <ArrowLeft className="h-3 w-3" /> Back to Ledger
        </Link>
        <h1 className="text-xl font-black tracking-tighter text-primary flex items-center gap-2">
          <Sparkles className="h-5 w-5 opacity-40" /> New Transaction
        </h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Initiate a secure payout request</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-2xl border bg-card shadow-xl shadow-primary/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Landmark className="h-3 w-3 opacity-40" /> Beneficiary *
          </Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="h-10 text-[11px] font-bold bg-muted/20 border-border/50">
              <SelectValue placeholder="Select Vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => <SelectItem key={v._id} value={v._id} className="text-[11px] font-bold">{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <CreditCard className="h-3 w-3 opacity-40" /> Amount (INR) *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">₹</span>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 pl-7 text-[11px] font-bold bg-muted/20 border-border/50 tabular-nums" placeholder="0.00" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
             Transfer Channel *
          </Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-10 text-[11px] font-bold bg-muted/20 border-border/50">
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => <SelectItem key={m} value={m} className="text-[11px] font-bold">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
             Internal Memo
          </Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="text-[11px] font-medium bg-muted/20 border-border/50 resize-none h-20" placeholder="Optional context for finance team..." />
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full h-10 text-[10px] font-black uppercase tracking-[0.2em]" disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
            Confirm & Log
          </Button>
        </div>
      </form>

      <div className="p-3 bg-muted/30 rounded-lg border border-dashed flex items-start gap-2">
         <Database className="h-4 w-4 text-primary shrink-0 opacity-40" />
         <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
           This transaction will be recorded in the immutable audit trail. Status will be set to <span className="text-primary font-bold">DRAFT</span>.
         </p>
      </div>
    </div>
  )
}
