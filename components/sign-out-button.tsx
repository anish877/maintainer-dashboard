'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function SignOutButton({ className = '', children }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/signin',
      redirect: true 
    })
  }

  return (
    <button
      onClick={handleSignOut}
      className={className}
    >
      {children || 'Sign Out'}
    </button>
  )
}
