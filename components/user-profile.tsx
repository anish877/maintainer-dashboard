'use client'

import { useSession } from 'next-auth/react'
import { SignOutButton } from './sign-out-button'

export function UserProfile() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="flex items-center space-x-3">
      {session.user.image && (
        <img
          src={session.user.image}
          alt={session.user.name || 'User'}
          className="w-8 h-8 rounded-full"
        />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {session.user.name || session.user.email}
        </span>
        {session.user.email && session.user.name && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {session.user.email}
          </span>
        )}
      </div>
      <SignOutButton className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        Sign Out
      </SignOutButton>
    </div>
  )
}
