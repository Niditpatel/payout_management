import mongoose, { Document, Schema } from "mongoose"

export type AuditAction = "CREATED" | "SUBMITTED" | "APPROVED" | "REJECTED"

export interface IPayoutAudit extends Document {
  payout_id: mongoose.Types.ObjectId
  action: AuditAction
  performed_by: mongoose.Types.ObjectId
  performer_name: string
  performer_role: string
  note?: string
  createdAt: Date
}

const PayoutAuditSchema = new Schema<IPayoutAudit>(
  {
    payout_id: { type: Schema.Types.ObjectId, ref: "Payout", required: true, index: true },
    action: {
      type: String,
      enum: ["CREATED", "SUBMITTED", "APPROVED", "REJECTED"],
      required: true,
    },
    performed_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performer_name: { type: String, required: true },
    performer_role: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: true, strict: true }
)

// Mongoose 8+ uses promise-based middleware — no `next` callback
PayoutAuditSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Audit records are immutable")
})

export const PayoutAudit =
  (mongoose.models["PayoutAudit"] as mongoose.Model<IPayoutAudit>) ||
  mongoose.model<IPayoutAudit>("PayoutAudit", PayoutAuditSchema)
