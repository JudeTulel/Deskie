import { create } from 'zustand'
import type { UserDetails, UserDetailsInput } from '../../../shared/models'

type UserState = {
  userDetails: UserDetails | null
  hydrated: boolean
  hydrate: () => Promise<void>
  saveUserDetails: (details: UserDetailsInput) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  userDetails: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const details = await window.qvacAPI.getUserDetails()
      set({ userDetails: details, hydrated: true })
    } catch (error) {
      console.error('[USER STORE] Hydration failed:', error)
      set({ hydrated: true })
    }
  },
  saveUserDetails: async (detailsInput) => {
    try {
      const details = await window.qvacAPI.saveUserDetails(detailsInput)
      set({ userDetails: details, hydrated: true })
    } catch (error) {
      console.error('[USER STORE] Saving user details failed:', error)
      throw error
    }
  }
}))
