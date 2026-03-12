"use client"

// Browser-side AES-256-GCM using Web Crypto API.
// Must match the format used server-side in lib/crypto.ts → iv:tag:ct (all hex)

function hex2buf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  return arr
}

function buf2hex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", hex2buf(keyHex) as any, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ])
}

export async function clientEncrypt(plaintext: string): Promise<string> {
  const keyHex = process.env.NEXT_PUBLIC_AES_KEY!
  const key = await importKey(keyHex)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const raw = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as any, tagLength: 128 }, key, encoded as any),
  )
  const ct = raw.slice(0, raw.length - 16)
  const tag = raw.slice(raw.length - 16)
  return `${buf2hex(iv)}:${buf2hex(tag)}:${buf2hex(ct)}`
}

export async function clientDecrypt(payload: string): Promise<string> {
  const keyHex = process.env.NEXT_PUBLIC_AES_KEY!
  const key = await importKey(keyHex)
  const [ivHex, tagHex, ctHex] = payload.split(":")
  const iv = hex2buf(ivHex)
  const ct = hex2buf(ctHex)
  const tag = hex2buf(tagHex)

  // Reconstruct ciphertext+tag for WebCrypto
  const combined = new Uint8Array(ct.length + tag.length)
  combined.set(ct, 0)
  combined.set(tag, ct.length)

  const dec = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any, tagLength: 128 },
    key,
    combined as any
  )
  return new TextDecoder().decode(dec)
}
