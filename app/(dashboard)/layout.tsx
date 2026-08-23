import Sidebar from '@/components/layout/sidebar'
import Topbar from '@/components/layout/topbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-void flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
