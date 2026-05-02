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
      <div className="flex-1 flex flex-col ml-[240px]">
        <Topbar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
