'use client'

import { createContext, useContext } from 'react'

interface ContextProps {
  // Empty context for now, can be extended later if needed
}

const AppContext = createContext<ContextProps>({})

export default function AppProvider({
  children,
}: {
  children: React.ReactNode
}) {  
  return (
    <AppContext.Provider value={{}}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppProvider = () => useContext(AppContext)