"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { PushSetup } from "./PushSetup"

function PushSetupWrapper() {
  const { data: session } = useSession()
  if (!session) return null
  return <PushSetup />
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PushSetupWrapper />
    </SessionProvider>
  )
}
