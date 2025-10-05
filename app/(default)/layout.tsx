import Header from '@/components/ui/header'
import { ProtectedRoute } from '@/components/protected-route'

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode
}) {  
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-[100dvh] overflow-hidden">

        {/* Site header with navbar */}
        <Header />

        {/* Content area */}
        <main className="grow overflow-y-auto overflow-x-hidden [&>*:first-child]:scroll-mt-16">
          {children}
        </main>

      </div>
    </ProtectedRoute>
  )
}
