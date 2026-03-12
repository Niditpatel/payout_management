/**
 * Universal POST-only API handler.
 * All endpoints live here, each request/response is AES-256-GCM encrypted.
 * Route: /api/<anything>  →  POST only
 */
import { NextRequest } from "next/server"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { dbConnect } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/crypto"
import { signToken, verifyToken, AuthPayload } from "@/lib/auth"
import { User } from "@/models/User"
import { Vendor } from "@/models/Vendor"
import { Payout } from "@/models/Payout"
import { PayoutAudit } from "@/models/PayoutAudit"

// ─── internal error class ────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(
    readonly message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ─── encrypted response helpers ──────────────────────────────────────────────
function ok(data: object, status = 200) {
  return Response.json({ payload: encrypt(JSON.stringify(data)) }, { status })
}
function fail(message: string, status: number) {
  return Response.json({ payload: encrypt(JSON.stringify({ error: message })) }, { status })
}

// ─── auth helpers ─────────────────────────────────────────────────────────────
function parseAuth(req: NextRequest): AuthPayload | null {
  const h = req.headers.get("authorization") ?? ""
  const t = h.startsWith("Bearer ") ? h.slice(7) : ""
  if (!t) return null
  try { return verifyToken(t) } catch { return null }
}
function must(auth: AuthPayload | null): AuthPayload {
  if (!auth) throw new ApiError("Unauthorized", 401)
  return auth
}
function needRole(auth: AuthPayload, r: string) {
  if (auth.role !== r) throw new ApiError(`Forbidden — requires ${r} role`, 403)
}

// ─── decrypt request body ────────────────────────────────────────────────────
async function body(req: NextRequest): Promise<Record<string, unknown>> {
  const raw = await req.json().catch(() => ({}))
  if (!raw.payload) return raw // allow plain body for seed call
  try { return JSON.parse(decrypt(raw.payload as string)) }
  catch { throw new ApiError("Malformed encrypted payload", 400) }
}

// ─── handler type ────────────────────────────────────────────────────────────
type H = (d: Record<string, unknown>, auth: AuthPayload | null) => Promise<object>

// ════════════════════════════════════════════════════════════════════════════
//  HANDLERS
// ════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
const login: H = async (d) => {
  const { email, password } = z
    .object({ email: z.string().email("Invalid email"), password: z.string().min(1, "Password required") })
    .parse(d)
  await dbConnect()

  // Auto-seed if database is empty
  if ((await User.countDocuments()) === 0) {
    await seed({}, null)
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user || !(await user.comparePassword(password)))
    throw new ApiError("Invalid email or password", 401)
  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role, name: user.name })
  return { token, user: { id: user._id, email: user.email, name: user.name, role: user.role } }
}

// POST /api/seed  — idempotent
const seed: H = async () => {
  await dbConnect()
  const seeded = [
    { email: "ops@demo.com", password: "ops123", name: "Arjun Mehta", role: "OPS" },
    { email: "finance@demo.com", password: "fin123", name: "Priya Sharma", role: "FINANCE" },
  ]
  for (const u of seeded) {
    if (!(await User.findOne({ email: u.email })))
      await User.create({ email: u.email, passwordHash: await bcrypt.hash(u.password, 10), name: u.name, role: u.role })
  }
  if ((await Vendor.countDocuments()) === 0) {
    await Vendor.insertMany([
      { name: "Razorpay Technologies", upi_id: "razorpay@upi", bank_account: "1234567890", ifsc: "RAZR0001234" },
      { name: "Cashfree Payments", upi_id: "cashfree@upi", bank_account: "9876543210", ifsc: "CASH0009876" },
      { name: "PayU India", bank_account: "1122334455", ifsc: "PAYU0001122" },
      { name: "Instamojo Ltd", upi_id: "instamojo@upi", is_active: false },
    ])
  }
  return { message: "Database seeded successfully" }
}

// POST /api/vendors/list
const vendorsList: H = async (_, auth) => {
  must(auth)
  await dbConnect()
  const vendors = await Vendor.find().sort({ createdAt: -1 }).lean()
  return { vendors }
}

// POST /api/vendors/create (OPS only)
const vendorsCreate: H = async (d, auth) => {
  const a = must(auth)
  needRole(a, "OPS")
  const data = z
    .object({
      name: z.string().min(1, "Name is required").max(200),
      upi_id: z.string().optional(),
      bank_account: z.string().optional(),
      ifsc: z.string().optional(),
      is_active: z.boolean().default(true),
    })
    .parse(d)
  await dbConnect()
  const vendor = await Vendor.create(data)
  return { vendor }
}

// POST /api/vendors/toggle (OPS only)
const vendorsToggle: H = async (d, auth) => {
  const a = must(auth)
  needRole(a, "OPS")
  const { id } = d as { id: string }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ApiError("Invalid vendor ID", 400)
  await dbConnect()
  const vendor = await Vendor.findById(id)
  if (!vendor) throw new ApiError("Vendor not found", 404)
  vendor.is_active = !vendor.is_active
  await vendor.save()
  return { message: "Status updated", is_active: vendor.is_active }
}

// POST /api/payouts/list
const payoutsList: H = async (d, auth) => {
  must(auth)
  await dbConnect()
  const { status, vendor_id } = d as { status?: string; vendor_id?: string }
  const q: Record<string, unknown> = {}
  if (status) q.status = status
  if (vendor_id && mongoose.Types.ObjectId.isValid(vendor_id))
    q.vendor_id = new mongoose.Types.ObjectId(vendor_id)
  const payouts = await Payout.find(q)
    .populate("vendor_id", "name upi_id bank_account ifsc is_active")
    .populate("created_by", "name email role")
    .sort({ createdAt: -1 })
    .lean()
  return { payouts }
}

// POST /api/payouts/create  (OPS only)
const payoutsCreate: H = async (d, auth) => {
  const a = must(auth)
  needRole(a, "OPS")
  await dbConnect()
  const data = z
    .object({
      vendor_id: z.string().min(1, "Vendor is required"),
      amount: z.coerce.number().positive("Amount must be > 0"),
      mode: z.enum(["UPI", "IMPS", "NEFT"]),
      note: z.string().optional(),
    })
    .parse(d)
  if (!mongoose.Types.ObjectId.isValid(data.vendor_id)) throw new ApiError("Invalid vendor ID", 400)
  if (!(await Vendor.findById(data.vendor_id))) throw new ApiError("Vendor not found", 404)
  const payout = await Payout.create({
    ...data,
    vendor_id: new mongoose.Types.ObjectId(data.vendor_id),
    created_by: new mongoose.Types.ObjectId(a.userId),
    status: "Draft",
  })
  await PayoutAudit.create({
    payout_id: payout._id,
    action: "CREATED",
    performed_by: new mongoose.Types.ObjectId(a.userId),
    performer_name: a.name,
    performer_role: a.role,
    note: `₹${data.amount} via ${data.mode}`,
  })
  const result = await Payout.findById(payout._id)
    .populate("vendor_id", "name upi_id bank_account ifsc")
    .populate("created_by", "name email role")
    .lean()
  return { payout: result }
}

// POST /api/payouts/detail
const payoutsDetail: H = async (d, auth) => {
  must(auth)
  const { id } = d as { id: string }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ApiError("Invalid payout ID", 400)
  await dbConnect()
  const payout = await Payout.findById(id)
    .populate("vendor_id", "name upi_id bank_account ifsc is_active")
    .populate("created_by", "name email role")
    .lean()
  if (!payout) throw new ApiError("Payout not found", 404)
  const audits = await PayoutAudit.find({ payout_id: new mongoose.Types.ObjectId(id) })
    .sort({ createdAt: 1 })
    .lean()
  return { payout, audits }
}

// POST /api/payouts/submit  (OPS only)
const payoutsSubmit: H = async (d, auth) => {
  const a = must(auth)
  needRole(a, "OPS")
  const { id } = d as { id: string }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ApiError("Invalid payout ID", 400)
  await dbConnect()
  const payout = await Payout.findById(id)
  if (!payout) throw new ApiError("Payout not found", 404)
  if (payout.status !== "Draft")
    throw new ApiError(`Cannot submit — payout is already '${payout.status}'`, 400)
  payout.status = "Submitted"
  await payout.save()
  await PayoutAudit.create({
    payout_id: payout._id,
    action: "SUBMITTED",
    performed_by: new mongoose.Types.ObjectId(a.userId),
    performer_name: a.name,
    performer_role: a.role,
    note: "Submitted for finance review",
  })
  return { message: "Payout submitted successfully", status: "Submitted" }
}

// POST /api/payouts/approve  (FINANCE only)
const payoutsApprove: H = async (d, auth) => {
  const a = must(auth)
  needRole(a, "FINANCE")
  const { id } = d as { id: string }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ApiError("Invalid payout ID", 400)
  await dbConnect()
  const payout = await Payout.findById(id)
  if (!payout) throw new ApiError("Payout not found", 404)
  if (payout.status !== "Submitted")
    throw new ApiError(`Cannot approve — payout is '${payout.status}'. Only Submitted payouts can be approved.`, 400)
  payout.status = "Approved"
  await payout.save()
  await PayoutAudit.create({
    payout_id: payout._id,
    action: "APPROVED",
    performed_by: new mongoose.Types.ObjectId(a.userId),
    performer_name: a.name,
    performer_role: a.role,
    note: "Approved by finance",
  })
  return { message: "Payout approved", status: "Approved" }
}

// POST /api/payouts/reject  (FINANCE only)
const payoutsReject: H = async (d, auth) => {
  const a = must(auth)
  needRole(a, "FINANCE")
  const { id, decision_reason } = z
    .object({ id: z.string().min(1), decision_reason: z.string().min(1, "Rejection reason is required") })
    .parse(d)
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError("Invalid payout ID", 400)
  await dbConnect()
  const payout = await Payout.findById(id)
  if (!payout) throw new ApiError("Payout not found", 404)
  if (payout.status !== "Submitted")
    throw new ApiError(`Cannot reject — payout is '${payout.status}'. Only Submitted payouts can be rejected.`, 400)
  payout.status = "Rejected"
  payout.decision_reason = decision_reason
  await payout.save()
  await PayoutAudit.create({
    payout_id: payout._id,
    action: "REJECTED",
    performed_by: new mongoose.Types.ObjectId(a.userId),
    performer_name: a.name,
    performer_role: a.role,
    note: `Rejected: ${decision_reason}`,
  })
  return { message: "Payout rejected", status: "Rejected" }
}

// ════════════════════════════════════════════════════════════════════════════
//  DISPATCH TABLE  — one entry per endpoint, that's it
// ════════════════════════════════════════════════════════════════════════════
const ROUTES: Record<string, H> = {
  "auth/login":       login,
  "seed":             seed,
  "vendors/list":     vendorsList,
  "vendors/create":   vendorsCreate,
  "vendors/toggle":   vendorsToggle,
  "payouts/list":     payoutsList,
  "payouts/create":   payoutsCreate,
  "payouts/detail":   payoutsDetail,
  "payouts/submit":   payoutsSubmit,
  "payouts/approve":  payoutsApprove,
  "payouts/reject":   payoutsReject,
}

// ─── universal entry-point ───────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const route = path.join("/")
  const handler = ROUTES[route]
  if (!handler) return fail(`Unknown endpoint: /${route}`, 404)

  try {
    const d = await body(req)
    const auth = parseAuth(req)
    const result = await handler(d, auth)
    return ok(result)
  } catch (e: any) {
    if (e instanceof ApiError) return fail(e.message, e.status)
    if (e instanceof z.ZodError) return fail(e.issues.map((x: any) => x.message).join("; "), 400)
    // Mongoose validation errors
    if (e?.name === "ValidationError") return fail(Object.values(e.errors ?? {}).map((x: any) => x.message).join("; "), 400)
    // Mongo duplicate key
    if (e?.code === 11000) return fail("Duplicate entry — record already exists", 409)
    console.error(`[POST /api/${route}]`, e?.message ?? e)
    return fail(e?.message ?? "Internal server error", 500)
  }
}
