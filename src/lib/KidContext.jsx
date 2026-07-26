import { createContext, useContext } from 'react'

export const KidContext = createContext(null)

export function useKid() {
  return useContext(KidContext)
}
