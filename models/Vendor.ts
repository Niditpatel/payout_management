import mongoose, { Document, Schema } from "mongoose"

export interface IVendor extends Document {
  name: string
  upi_id?: string
  bank_account?: string
  ifsc?: string
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true },
    upi_id: { type: String, trim: true },
    bank_account: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Vendor =
  (mongoose.models.Vendor as mongoose.Model<IVendor>) ||
  mongoose.model<IVendor>("Vendor", VendorSchema)
