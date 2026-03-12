import { create } from "zustand"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
}

const useAuthStoreBase = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))

export const useAuthStore = Object.assign(useAuthStoreBase, {
  use: {
    setUser: () => useAuthStoreBase((state) => state.setUser),
    user: () => useAuthStoreBase((state) => state.user),
  }
})
