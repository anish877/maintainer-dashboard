'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSelectedLayoutSegments } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const segments = useSelectedLayoutSegments()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" />
          <path fill="currentColor" d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />
        </svg>
      ),
      isActive: segments.includes('dashboard') || pathname === '/dashboard'
    },
    {
      href: '/chat',
      label: 'AI Chat',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2V9a1 1 0 0 1 1-1h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2Zm1 2h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3v1a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z"/>
        </svg>
      ),
      isActive: segments.includes('chat') || pathname === '/chat'
    },
    {
      href: '/repos',
      label: 'Repositories',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v2H7V5zm0 3h2v4H7V8z"/>
        </svg>
      ),
      isActive: segments.includes('repos') || pathname === '/repos'
    }
  ]

  return (
    <nav className="flex items-center justify-center space-x-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            item.isActive
              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 dark:bg-violet-500/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className={`mr-2 ${item.isActive ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
