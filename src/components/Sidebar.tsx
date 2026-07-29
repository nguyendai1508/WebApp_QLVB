import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { 
  LayoutDashboard, 
  Inbox, 
  Send, 
  CheckSquare, 
  Users, 
  UserCircle,
  FolderTree,
  BarChart3,
  ShieldCheck,
  Search,
  FileText,
  Trophy
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePermissions } from '@/hooks/usePermissions';

export function Sidebar() {
  const { user } = useAppStore();
  const permissions = usePermissions();

  const isSpecialUser = permissions.isAdmin || permissions.isLanhDao || permissions.isVanThu;

  const navItems = [
    { name: 'Tổng quan', path: '/', icon: LayoutDashboard, show: true },
    { name: 'Văn bản đến', path: '/incoming-docs', icon: Inbox, show: isSpecialUser },
    { name: 'Văn bản đi', path: '/outgoing-docs', icon: Send, show: permissions.canAddOutgoing },
    { name: 'Quản lý công việc', path: '/tasks', icon: CheckSquare, show: true },
    { name: 'Cán bộ', path: '/staff', icon: Users, show: permissions.canManageStaff },
    { name: 'Người dùng', path: '/users', icon: UserCircle, show: permissions.canManageUsers },
    { name: 'Danh mục', path: '/catalogs', icon: FolderTree, show: permissions.canManageCatalogs },
    { name: 'Báo cáo & biểu đồ', path: '/reports', icon: BarChart3, show: true },
    { name: 'Đánh giá KPI', path: '/kpi', icon: Trophy, show: permissions.isLanhDao || permissions.isAdmin || permissions.isVanThu },
  ].filter(item => item.show);

  return (
    <div className="group w-[72px] hover:w-64 bg-white border-r h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 overflow-x-hidden">
      <div className="p-4 flex items-center gap-3 w-64">
        <div className="bg-primary text-white p-2.5 rounded-xl flex-shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <h1 className="font-bold text-gray-900 leading-tight">QL Văn bản</h1>
          <p className="text-xs text-gray-500">Đến · Đi · Công việc</p>
        </div>
      </div>
      
      <div className="px-3 mb-4 w-64 overflow-hidden">
        <div className="relative group/search flex items-center">
          <div className="w-[48px] flex items-center justify-center flex-shrink-0">
            <Search className="w-5 h-5 text-gray-400 group-hover:text-gray-400 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Tra cứu nhanh..." 
            className="w-[calc(100%-48px)] pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all opacity-0 group-hover:opacity-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={(e) => {
                if (window.location.pathname === item.path) {
                    window.dispatchEvent(new CustomEvent('navRefresh', { detail: item.path }));
                }
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors w-64 overflow-hidden",
                  isActive 
                    ? "bg-[#e6f4ea] text-primary font-bold" 
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0 mr-3">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t w-64">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
          <div className="bg-primary/10 text-primary p-2 rounded-full flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
            <p className="text-sm font-medium text-gray-900">{user?.Role || 'Admin'}</p>
            <p className="text-xs text-gray-500">{user?.FullName || user?.Username || 'Người dùng'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
