import DashboardTopNav from '@/components/layout/dashboard-top-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col transition-colors">
      {/* Persistent top bar with logo-left, primary nav icons-center, search & profile-right */}
      <DashboardTopNav />
      
      {/* Main dashboard body */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-6 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
