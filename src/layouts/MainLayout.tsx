import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { useAppStore } from '@/store/useAppStore';

export function MainLayout() {
  const { initialize, isInitialized, isLoading } = useAppStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <Sidebar />
      <div className="flex-1 ml-[72px] flex flex-col">
        <Topbar />
        <main className="flex-1 p-8 overflow-x-hidden relative">

          <Outlet />
        </main>
      </div>
    </div>
  );
}
