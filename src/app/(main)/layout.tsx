import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RightSidebar } from '@/components/layout/RightSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileNav />
      <main className="lg:ml-[72px] xl:ml-[240px] pb-20 lg:pb-0">
        <div className="max-w-[1200px] mx-auto flex gap-6 px-4 py-4 lg:px-6">
          <div className="flex-1 min-w-0">
            {children}
          </div>
          <RightSidebar />
        </div>
      </main>
    </div>
  );
}
