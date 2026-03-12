import mongoose, { Document, Schema } from "mongoose"
import bcrypt from "bcryptjs"

export type UserRole = "OPS" | "FINANCE"

export interface IUser extends Document {
  email: string
  passwordHash: string
  name: string
  role: UserRole
  comparePassword(pw: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["OPS", "FINANCE"], required: true },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = async function (pw: string) {
  return bcrypt.compare(pw, this.passwordHash)
}

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema)
