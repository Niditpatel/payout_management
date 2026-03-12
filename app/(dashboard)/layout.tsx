"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useAuthStore } from "@/stores/auth-store"
import { cn } from "@/lib/utils"
import {
  Store,
  ArrowRightLeft,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCircle,
  Plus,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/payouts", label: "Payouts", icon: ArrowRightLeft },
  { href: "/vendors", label: "Vendors", icon: Store },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user: authUser, isLoading: authLoading, logout } = useAuth()
  const { user: storeUser } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  // Sync users between hooks/stores — context may lag on first render
  const user = authUser || storeUser

  // Read role with localStorage fallback for SSR-hydration safety
  const role = user?.role ?? (typeof window !== "undefined"
    ? (() => { try { return JSON.parse(localStorage.getItem("auth_user") ?? "{}")?.role } catch { return null } })()
    : null)
  const isOPS = role === "OPS"

  const navItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/payouts", label: "Payouts", icon: ArrowRightLeft },
    { href: "/vendors", label: "Vendors", icon: Store },
    ...(isOPS ? [{ href: "/payouts/new", label: "New Payout", icon: Plus }] : []),
  ]

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login")
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* ultra-compact sidebar */}
      <aside className="w-16 hover:w-48 group transition-all duration-300 ease-in-out shrink-0 flex flex-col border-r bg-sidebar border-dashed z-50">
        <div className="h-14 flex items-center px-4 overflow-hidden">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <span className="ml-3 text-sm font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">PayFlow</span>
        </div>

        <Separator className="opacity-50" />

        <nav className="flex-1 py-4 space-y-2 px-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center h-10 rounded-lg transition-all relative",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute left-12 whitespace-nowrap">
                  {label}
                </span>
                {active && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-foreground rounded-r-full group-hover:hidden" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 mt-auto space-y-4">
          <div className="flex items-center gap-3 overflow-hidden px-1">
             <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
               <span className="text-[10px] font-black text-primary">{user.name[0]}</span>
             </div>
             <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                <span className="text-[10px] font-black leading-none mb-1 uppercase tracking-tighter">{user.name}</span>
                <Badge className="w-fit text-[8px] h-3.5 px-1 font-bold uppercase tracking-widest leading-none bg-primary/20 text-primary hover:bg-primary/20 border-none">{user.role}</Badge>
             </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-10 px-0 group-hover:px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
            onClick={logout}
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
               <LogOut className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ml-2">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* main area */}
      <main className="flex-1 overflow-y-auto bg-muted/5 relative">
        <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10 dark:opacity-5" />
        {children}
      </main>
    </div>
  )
}
