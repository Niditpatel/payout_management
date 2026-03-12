import { api } from "@/lib/api"

export const apiClient = {
  post: async <T>(url: string, data: any, options: any) => {
    const path = url.replace(/^\/api\//, "")
    if (path.includes("login")) {
      // The snippet sends { username, password }
      // My api.auth.login expects (email, password)
      return api.auth.login(data.username, data.password) as Promise<T>
    }
    throw new Error(`Endpoint ${url} not mapped in shim`)
  }
}

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "auth/login"
  }
}
