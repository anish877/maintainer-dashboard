'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSelectedLayoutSegments } from 'next/navigation'
import { 
  BarChart3, 
  MessageSquare, 
  GitBranch, 
  Search, 
  CheckCircle, 
  Users 
} from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const segments = useSelectedLayoutSegments()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="w-4 h-4" />,
      isActive: segments.includes('dashboard') || pathname === '/dashboard'
    },
    {
      href: '/chat',
      label: 'AI Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      isActive: segments.includes('chat') || pathname === '/chat'
    },
    {
      href: '/repos',
      label: 'Repositories',
      icon: <GitBranch className="w-4 h-4" />,
      isActive: segments.includes('repos') || pathname === '/repos'
    },
    {
      href: '/simple-scraper',
      label: 'Scraper',
      icon: <Search className="w-4 h-4" />,
      isActive: segments.includes('simple-scraper') || pathname === '/simple-scraper'
    },
    {
      href: '/completeness/simple',
      label: 'Issues',
      icon: <CheckCircle className="w-4 h-4" />,
      isActive: segments.includes('completeness') || pathname === '/completeness/simple'
    },
    {
      href: '/contributor-analytics',
      label: 'Contributors',
      icon: <Users className="w-4 h-4" />,
      isActive: segments.includes('contributor-analytics') || pathname === '/contributor-analytics'
    }
  ]

  return (
    <nav className="flex items-center justify-center space-x-1 overflow-x-auto whitespace-nowrap">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
            item.isActive
              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 dark:bg-violet-500/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className={`mr-1.5 ${item.isActive ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
