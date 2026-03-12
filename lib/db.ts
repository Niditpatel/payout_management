import mongoose from "mongoose"

const MONGO_URI = process.env.MONGODB_URI!

if (!MONGO_URI) {
  throw new Error("MONGODB_URI is not defined in .env.local")
}

// Global cache to avoid reconnecting on every hot reload in Next.js dev
let cached = (global as any).__mongo_conn as {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

if (!cached) {
  cached = (global as any).__mongo_conn = { conn: null, promise: null }
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    // NOTE: directConnection must NOT be used with multi-host replica set URIs.
    // Using ssl + replicaSet in the URI is the correct approach.
    cached.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    }).then((m) => {
      console.log("▲ PayFlow | DB Connected ✓")
      return m
    }).catch((err) => {
      console.error("▲ PayFlow | DB Connection Failed:", err.message)
      cached.promise = null
      throw err
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}
