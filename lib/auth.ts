import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"

const SECRET = process.env.JWT_SECRET!

export interface AuthPayload {
  userId: string
  email: string
  role: "OPS" | "FINANCE"
  name: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "8h" })
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, SECRET) as AuthPayload
}

export function getAuthFromRequest(req: NextRequest): AuthPayload | null {
  const header = req.headers.get("authorization") || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!token) return null
  try {
    return verifyToken(token)
  } catch {
    return null
  }
}

// helper to build consistent error responses
export function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 })
}

export function forbidden(message = "Forbidden") {
  return Response.json({ error: message }, { status: 403 })
}

export function badRequest(message: string, details?: unknown) {
  return Response.json({ error: message, details }, { status: 400 })
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 })
}

export function serverError(message = "Internal server error") {
  return Response.json({ error: message }, { status: 500 })
}
