import mongoose, { Document, Schema } from "mongoose"

export type PayoutStatus = "Draft" | "Submitted" | "Approved" | "Rejected"
export type PayoutMode = "UPI" | "IMPS" | "NEFT"

export interface IPayout extends Document {
  vendor_id: mongoose.Types.ObjectId
  amount: number
  mode: PayoutMode
  note?: string
  status: PayoutStatus
  decision_reason?: string
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const PayoutSchema = new Schema<IPayout>(
  {
    vendor_id: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => v > 0,
        message: "Amount must be greater than 0",
      },
    },
    mode: { type: String, enum: ["UPI", "IMPS", "NEFT"], required: true },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected"],
      default: "Draft",
    },
    decision_reason: { type: String, trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

export const Payout =
  (mongoose.models.Payout as mongoose.Model<IPayout>) ||
  mongoose.model<IPayout>("Payout", PayoutSchema)
