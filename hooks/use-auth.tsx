"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser } from "@/lib/api"

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const t = localStorage.getItem("auth_token")
      const u = localStorage.getItem("auth_user")
      if (t && u) {
        setToken(t)
        setUser(JSON.parse(u) as AuthUser)
      }
    } catch {
      /* corrupted storage — clear it */
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_user")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem("auth_token", token)
    localStorage.setItem("auth_user", JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthCtx.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
