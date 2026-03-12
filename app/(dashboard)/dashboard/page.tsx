"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { api, type Payout } from "@/lib/api"
import { toast } from "sonner"
import {
  Plus,
  ArrowRightLeft,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Eye,
  ChevronRight,
  ShieldCheck,
  Fingerprint,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Stats {
  total: number
  draft: number
  submitted: number
  approved: number
  rejected: number
}

function encodeFilter(obj: object) {
  return encodeURIComponent(btoa(JSON.stringify(obj)))
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  // Read role with localStorage fallback
  const role: string = user?.role ?? (typeof window !== "undefined"
    ? (() => { try { return JSON.parse(localStorage.getItem("auth_user") ?? "{}")?.role } catch { return "" } })()
    : "")
  const name: string = user?.name ?? (typeof window !== "undefined"
    ? (() => { try { return JSON.parse(localStorage.getItem("auth_user") ?? "{}")?.name } catch { return "User" } })()
    : "User")

  useEffect(() => {
    api.payouts.list().then(({ payouts }) => {
      setStats({
        total: payouts.length,
        draft: payouts.filter((p: Payout) => p.status === "Draft").length,
        submitted: payouts.filter((p: Payout) => p.status === "Submitted").length,
        approved: payouts.filter((p: Payout) => p.status === "Approved").length,
        rejected: payouts.filter((p: Payout) => p.status === "Rejected").length,
      })
    }).catch(() => { /* silent */ })
  }, [])

  const isOPS = role === "OPS"
  const isFINANCE = role === "FINANCE"

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h1 className="text-base font-black uppercase tracking-tight text-primary">
              PayFlow Control
            </h1>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Logged in as <span className="text-foreground">{name}</span> ·{" "}
            <span className="text-primary">{role}</span>
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-sm font-black text-primary">{name?.[0]}</span>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: stats.total, color: "text-foreground", href: "/payouts" },
            { label: "Pending", value: stats.submitted, color: "text-amber-500", href: `/payouts?q=${encodeFilter({ status: "Submitted" })}` },
            { label: "Approved", value: stats.approved, color: "text-emerald-500", href: `/payouts?q=${encodeFilter({ status: "Approved" })}` },
            { label: "Rejected", value: stats.rejected, color: "text-destructive", href: `/payouts?q=${encodeFilter({ status: "Rejected" })}` },
          ].map((s) => (
            <Link key={s.label} href={s.href}>
              <div className="p-3 rounded-xl bg-muted/30 border hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer text-center group">
                <p className={`text-xl font-black tabular-nums ${s.color} group-hover:scale-110 transition-transform inline-block`}>{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Role-gated Quick Actions */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 px-0.5">
          Quick Actions — {role}
        </p>

        <div className="grid grid-cols-1 gap-2">
          {/* OPS Actions */}
          {isOPS && (
            <>
              <QuickCard
                href="/payouts/new"
                icon={Plus}
                title="New Payout Request"
                desc="Initiate a draft payout for finance review"
                accent
              />
              <QuickCard
                href={`/payouts?q=${encodeFilter({ status: "Draft" })}`}
                icon={FileText}
                title="My Draft Payouts"
                desc="View & submit your pending drafts"
              />
              <QuickCard
                href={`/payouts?q=${encodeFilter({ status: "Submitted" })}`}
                icon={Clock}
                title="Awaiting Approval"
                desc="Payouts submitted, pending finance sign-off"
              />
              <QuickCard
                href="/vendors"
                icon={Store}
                title="Manage Vendors"
                desc="Register or browse vendor accounts"
              />
              <QuickCard
                href="/payouts"
                icon={ArrowRightLeft}
                title="All Payouts"
                desc="Full ledger — all statuses and vendors"
              />
            </>
          )}

          {/* FINANCE Actions */}
          {isFINANCE && (
            <>
              <QuickCard
                href={`/payouts?q=${encodeFilter({ status: "Submitted" })}`}
                icon={Clock}
                title="Review Pending Approvals"
                desc="Payouts awaiting your authorization"
                accent
              />
              <QuickCard
                href={`/payouts?q=${encodeFilter({ status: "Approved" })}`}
                icon={CheckCircle2}
                title="Approved Payouts"
                desc="All successfully authorized transactions"
              />
              <QuickCard
                href={`/payouts?q=${encodeFilter({ status: "Rejected" })}`}
                icon={XCircle}
                title="Rejected Payouts"
                desc="Transactions you have declined"
              />
              <QuickCard
                href="/payouts"
                icon={Eye}
                title="Full Payout Ledger"
                desc="View all payouts across all statuses"
              />
              <QuickCard
                href="/vendors"
                icon={Store}
                title="Browse Vendors"
                desc="View registered beneficiary accounts"
              />
            </>
          )}
        </div>
      </div>

      <p className="text-center text-[9px] text-muted-foreground/30 uppercase tracking-widest font-bold pt-2">
        <Fingerprint className="h-3 w-3 inline mr-1 opacity-40" />
        AES-256-GCM Encrypted · Role: {role}
      </p>
    </div>
  )
}

function QuickCard({
  href,
  icon: Icon,
  title,
  desc,
  accent = false,
}: {
  href: string
  icon: React.ElementType
  title: string
  desc: string
  accent?: boolean
}) {
  return (
    <Link href={href}>
      <div className={`group flex items-center gap-4 p-3.5 rounded-xl border transition-all cursor-pointer
        ${accent
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          : "bg-muted/20 hover:bg-muted/40 hover:border-primary/30"
        }`}>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0
          ${accent ? "bg-white/10" : "bg-primary/5 border border-primary/10"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-primary-foreground" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-tight leading-tight
            ${accent ? "text-primary-foreground" : "text-foreground"}`}>
            {title}
          </p>
          <p className={`text-[9px] mt-0.5 font-medium leading-tight
            ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {desc}
          </p>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all
          ${accent ? "text-primary-foreground" : "text-muted-foreground"}`} />
      </div>
    </Link>
  )
}
