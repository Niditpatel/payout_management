import crypto from "crypto"

// AES-256-GCM encryption/decryption
const KEY_HEX = process.env.AES_KEY!
const IV_LEN = parseInt(process.env.AES_IV_LENGTH || "12")

function getKey(): Buffer {
  return Buffer.from(KEY_HEX, "hex")
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, ctHex] = payload.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const ct = Buffer.from(ctHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")
}
