import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { initFirebaseRealtime } from '@/services/firebaseClient';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { IncomingDocs } from '@/pages/IncomingDocs';
import { OutgoingDocs } from '@/pages/OutgoingDocs';
import { Tasks } from '@/pages/Tasks';
import { Staff } from '@/pages/Staff';
import { Login } from '@/pages/Login';
import { Users } from '@/pages/Users';
import { Catalogs } from '@/pages/Catalogs';
import { Reports } from '@/pages/Reports';
import { KPI } from '@/pages/KPI';

function App() {
  const { user, isInitialized, initialize, isLoading } = useAppStore();

  React.useEffect(() => {
    if (user && !isInitialized && !isLoading) {
      initialize();
    }
  }, [user, isInitialized, isLoading, initialize]);

  React.useEffect(() => {
    if (user) {
      initFirebaseRealtime(() => {
        // Reload data silently when Firebase detects a change
        initialize(true);
      });
    }
  }, [user, initialize]);

  if (!user) {
    return <Login />;
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  return (
    <>
      <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="incoming-docs" element={<IncomingDocs />} />
          <Route path="outgoing-docs" element={<OutgoingDocs />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="staff" element={<Staff />} />
          <Route path="users" element={<Users />} />
          <Route path="catalogs" element={<Catalogs />} />
          <Route path="reports" element={<Reports />} />
          <Route path="kpi" element={<KPI />} />
          <Route path="*" element={<div className="p-4 bg-white rounded-xl shadow-sm border h-64 flex items-center justify-center">Đang phát triển</div>} />
        </Route>
      </Routes>
    </HashRouter>
    {isLoading && isInitialized && (
      <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3 shadow-lg"></div>
        <p className="text-primary font-bold bg-white px-4 py-1.5 rounded-full shadow-sm border border-primary/20">Đang xử lý...</p>
      </div>
    )}
    </>
  );
}

export default App;
