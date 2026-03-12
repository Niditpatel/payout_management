"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { api, type Vendor } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  Store,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Building2,
  Power,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function VendorsPage() {
  const { user } = useAuth()
  
  // ── Robust role detection
  const role = user?.role ?? (typeof window !== "undefined" 
    ? (() => { try { return JSON.parse(localStorage.getItem("auth_user") ?? "{}")?.role } catch { return null } })()
    : null)
  const isOPS = role === "OPS"

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [toggling, setToggling] = useState<string | null>(null)

  // ── Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ── Form State
  const [name, setName] = useState("")
  const [upi, setUpi] = useState("")
  const [bank, setBank] = useState("")
  const [ifsc, setIfsc] = useState("")

  const loadVendors = useCallback(async () => {
    setLoading(true)
    try {
      const { vendors } = await api.vendors.list()
      setVendors(vendors)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sync Failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVendors() }, [loadVendors])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Entity Name Required"); return }
    setSubmitting(true)
    try {
      await api.vendors.create({ 
        name: name.trim(), 
        upi_id: upi.trim() || undefined, 
        bank_account: bank.trim() || undefined, 
        ifsc: ifsc.trim() || undefined, 
        is_active: true 
      } as any)
      toast.success("Entity Registered")
      setOpen(false)
      setName(""); setUpi(""); setBank(""); setIfsc("")
      loadVendors()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration Failed")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string) {
    setToggling(id)
    try {
      const res = await api.vendors.toggle(id)
      toast.success(res.is_active ? "Entity Deployed" : "Entity Deactivated")
      loadVendors()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update Failed")
    } finally {
      setToggling(null)
    }
  }

  // ── Filter & Paginate
  const filtered = useMemo(() => {
    return vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()))
  }, [vendors, search])

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const totalPages = Math.ceil(filtered.length / pageSize)

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-lg font-black tracking-tight text-primary flex items-center gap-2">
            <Store className="h-4 w-4" /> Beneficiary Directory
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] leading-none">
            {vendors.length} Total Entities · Operational Directory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              placeholder="Search Entities..." 
              className="h-8 text-[11px] font-bold w-48 pl-8 bg-muted/40 border-dashed border-muted-foreground/30 focus-visible:ring-primary/20"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest px-3 border-muted-foreground/20" onClick={loadVendors} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {isOPS && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest px-4 shadow-xl shadow-primary/10">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Register
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs border-dashed">
                <DialogHeader>
                  <DialogTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 className="h-4 w-4 opacity-40" /> New Entity Onboarding
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                  <GField label="Registered Name *" id="vn">
                    <Input id="vn" value={name} onChange={e => setName(e.target.value)} placeholder="Legal entity name" className="h-9 text-[11px] font-bold bg-muted/20" />
                  </GField>
                  <GField label="UPI ID (VPA)" id="vu">
                    <Input id="vu" value={upi} onChange={e => setUpi(e.target.value)} placeholder="vpa@bank" className="h-9 text-[11px] font-bold bg-muted/20" />
                  </GField>
                  <GField label="Bank Account Number" id="vb">
                    <Input id="vb" value={bank} onChange={e => setBank(e.target.value)} placeholder="0000000000" className="h-9 text-[11px] font-bold bg-muted/20" />
                  </GField>
                  <GField label="IFSC Routine Code" id="vi">
                    <Input id="vi" value={ifsc} onChange={e => setIfsc(e.target.value)} placeholder="BANK0001234" className="h-9 text-[11px] font-bold uppercase bg-muted/20" />
                  </GField>
                  <Separator className="border-dashed" />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest flex-1" onClick={() => setOpen(false)}>Refuse</Button>
                    <Button type="submit" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest flex-1 shadow-lg shadow-primary/10" disabled={submitting}>
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                      Authorize
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-card overflow-hidden shadow-2xl shadow-primary/5 relative">
        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-dashed border-muted-foreground/20">
                <th className="p-4 font-black uppercase tracking-widest text-muted-foreground/60 w-12">No.</th>
                <th className="p-4 font-black uppercase tracking-widest text-muted-foreground/60">Entity Name</th>
                <th className="p-4 font-black uppercase tracking-widest text-muted-foreground/60">Gateway</th>
                <th className="p-4 font-black uppercase tracking-widest text-muted-foreground/60">IFSC/Identity</th>
                <th className="p-4 font-black uppercase tracking-widest text-muted-foreground/60 text-center">Status</th>
                <th className="p-4 font-black uppercase tracking-widest text-muted-foreground/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-muted-foreground/10">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Hydrating secure directory...</td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-muted-foreground font-black uppercase tracking-widest opacity-40 italic">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    No Entities Found
                  </td>
                </tr>
              ) : (
                paginated.map((v, i) => (
                  <tr key={v._id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="p-4 font-bold tabular-nums text-muted-foreground/60 text-[10px]">{(page - 1) * pageSize + i + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary opacity-50" />
                        </div>
                        <span className="font-black uppercase tracking-tight text-foreground truncate max-w-[180px]">{v.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold tabular-nums text-primary/80">{v.upi_id || v.bank_account || "NOT SET"}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{v.upi_id ? "UPI/VPA" : "BANK"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold tracking-tighter opacity-70 border-b border-muted-foreground/20">{v.ifsc || "—"}</span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={v.is_active ? "default" : "secondary"} className={`text-[8px] font-black tracking-widest px-2 h-5 rounded uppercase border-none ${v.is_active ? "bg-success hover:bg-success/90" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                        {v.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {isOPS && (
                        <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`h-7 px-3 text-[9px] font-black uppercase tracking-widest transition-all ${v.is_active ? "text-destructive border-destructive/20 hover:bg-destructive/10" : "text-success border-success/20 hover:bg-success/10"}`}
                            onClick={() => handleToggle(v._id)}
                            disabled={toggling === v._id}
                          >
                            {toggling === v._id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Power className="h-3 w-3 mr-1.5" />}
                            {v.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      )}
                      {!isOPS && (
                         <Badge variant="outline" className="text-[8px] uppercase opacity-20 border-dashed">Read Only</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER / PAGINATION ── */}
        <div className="p-3 border-t border-dashed border-muted-foreground/20 bg-muted/10 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page Size:</span>
                <Select value={pageSize.toString()} onValueChange={v => { setPageSize(parseInt(v)); setPage(1); }}>
                   <SelectTrigger className="h-7 w-16 text-[10px] font-bold bg-background shadow-none border-dashed">
                      <SelectValue placeholder="10" />
                   </SelectTrigger>
                   <SelectContent>
                      {[5, 10, 20, 50].map(s => <SelectItem key={s} value={s.toString()} className="text-[10px]">{s}</SelectItem>)}
                   </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-40">
                 Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-{Math.min(filtered.length, page * pageSize)} of {filtered.length}
              </p>
           </div>
           
           <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 shadow-none border-dashed" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-[10px] font-black uppercase tracking-widest px-4 border h-8 flex items-center rounded-md bg-background border-dashed">
                 {page} / {totalPages || 1}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 shadow-none border-dashed" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
           </div>
        </div>
      </div>
      
      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
         <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5 opacity-40" />
         <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider leading-relaxed">
            Entity directory is strictly monitored. Only OPS personnel can modify status. Total of <span className="text-primary font-black underline">{filtered.length}</span> entities cataloged.
         </p>
      </div>
    </div>
  )
}

function GField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{label}</Label>
      {children}
    </div>
  )
}
