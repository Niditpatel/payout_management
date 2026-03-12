"use client"

/**
 * Encrypted API client — every request body is AES-GCM encrypted,
 * every response body is AES-GCM decrypted before returning.
 */
import { clientEncrypt, clientDecrypt } from "./client-crypto"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: "OPS" | "FINANCE"
}

export interface Vendor {
  _id: string
  name: string
  upi_id?: string
  bank_account?: string
  ifsc?: string
  is_active: boolean
  createdAt: string
}

export interface Payout {
  _id: string
  vendor_id: Vendor | string
  amount: number
  mode: "UPI" | "IMPS" | "NEFT"
  note?: string
  status: "Draft" | "Submitted" | "Approved" | "Rejected"
  decision_reason?: string
  created_by: AuthUser | string
  createdAt: string
  updatedAt: string
}

export interface AuditEntry {
  _id: string
  payout_id: string
  action: "CREATED" | "SUBMITTED" | "APPROVED" | "REJECTED"
  performed_by: string
  performer_name: string
  performer_role: string
  note?: string
  createdAt: string
}

// ─── internal fetch helper ────────────────────────────────────────────────────
async function post<T>(endpoint: string, data: Record<string, unknown> = {}): Promise<T> {
  const payload = await clientEncrypt(JSON.stringify(data))

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

  const res = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ payload }),
  })

  const json = await res.json()

  if (!json.payload) throw new Error("Invalid server response")

  const decrypted = await clientDecrypt(json.payload as string)
  const parsed = JSON.parse(decrypted) as T & { error?: string }

  if (parsed.error) throw new Error(parsed.error)
  return parsed as T
}

// ─── public API surface ───────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      post<{ token: string; user: AuthUser }>("auth/login", { email, password }),
  },

  seed: () => post<{ message: string }>("seed"),

  vendors: {
    list: () => post<{ vendors: Vendor[] }>("vendors/list"),
    create: (data: Omit<Vendor, "_id" | "createdAt">) =>
      post<{ vendor: Vendor }>("vendors/create", data as Record<string, unknown>),
    toggle: (id: string) =>
      post<{ message: string; is_active: boolean }>("vendors/toggle", { id }),
  },

  payouts: {
    list: (filters: { status?: string; vendor_id?: string } = {}) =>
      post<{ payouts: Payout[] }>("payouts/list", filters),
    create: (data: { vendor_id: string; amount: number; mode: string; note?: string }) =>
      post<{ payout: Payout }>("payouts/create", data),
    detail: (id: string) =>
      post<{ payout: Payout; audits: AuditEntry[] }>("payouts/detail", { id }),
    submit: (id: string) =>
      post<{ message: string; status: string }>("payouts/submit", { id }),
    approve: (id: string) =>
      post<{ message: string; status: string }>("payouts/approve", { id }),
    reject: (id: string, decision_reason: string) =>
      post<{ message: string; status: string }>("payouts/reject", { id, decision_reason }),
  },
}
