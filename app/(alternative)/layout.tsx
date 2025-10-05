import Header from '@/components/ui/header'

export default function AlternativeLayout({
  children,
}: {
  children: React.ReactNode
}) {  
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">

      {/* Site header with navbar */}
      <Header variant="v3" />

      {/* Content area */}
      <main className="grow overflow-y-auto overflow-x-hidden [&>*:first-child]:scroll-mt-16">
        {children}
      </main>

    </div>
  )
}
