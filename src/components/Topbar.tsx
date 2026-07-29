import React, { useState, useEffect } from 'react';
import { Search, LogOut, PlusCircle, MessageCircle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from './Modal';
import { IncomingDocForm } from './IncomingDocForm';
import { OutgoingDocForm } from './OutgoingDocForm';
import { TaskForm } from './TaskForm';
import { usePermissions } from '@/hooks/usePermissions';

export function Topbar() {
  const location = useLocation();
  const { user, setUser, initialize } = useAppStore();
  const permissions = usePermissions();
  
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [showZaloGuide, setShowZaloGuide] = useState(false);
  const [showOutgoingModal, setShowOutgoingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return { title: 'Tổng quan hệ thống', desc: 'Theo dõi điều hành văn bản đến, văn bản đi và công việc.' };
      case '/incoming-docs': return { title: 'Văn bản đến', desc: 'Tiếp nhận, phân công xử lý, theo dõi hạn và liên kết công việc.' };
      case '/outgoing-docs': return { title: 'Văn bản đi', desc: 'Soạn thảo, ký, phát hành và liên kết hồ sơ trả lời.' };
      case '/tasks': return { title: 'Quản lý công việc', desc: 'Theo dõi tiến độ, kết quả xử lý công việc được giao.' };
      case '/staff': return { title: 'Hồ sơ Cán bộ', desc: 'Quản lý thông tin và theo dõi phân công công việc cá nhân.' };
      case '/users': return { title: 'Người dùng & Phân quyền', desc: 'Quản lý tài khoản truy cập và phạm vi dữ liệu.' };
      case '/catalogs': return { title: 'Quản lý Danh mục', desc: 'Thiết lập các loại danh mục, thông số hệ thống.' };
      case '/reports': return { title: 'Báo cáo & Thống kê', desc: 'Tổng hợp số liệu điều hành văn bản, công việc.' };
      default: return { title: 'Hệ thống Quản lý', desc: 'Tính năng đang phát triển' };
    }
  };

  const { title, desc } = getPageTitle();



  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      <div className="h-20 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {permissions.canAddIncoming && (
              <button 
                onClick={() => setShowIncomingModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-primary rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm VB đến
              </button>
            )}
            {permissions.canAddOutgoing && (
              <button 
                onClick={() => setShowOutgoingModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-primary rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm VB đi
              </button>
            )}
            {permissions.canAddTask && (
              <button 
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/30"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm công việc
              </button>
            )}
          </div>

        {/* User Info & Logout */}
        
          {permissions.isAdmin && (
            <button 
              onClick={() => setShowZaloGuide(true)}
              className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-bold"
              title="Cấu hình Zalo"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Zalo Bot</span>
            </button>
          )}
          <div className="flex items-center gap-4 pl-4 border-l ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900">{user?.FullName || user?.['Họ tên cán bộ'] || user?.Username || 'Người dùng'}</p>
            <p className="text-xs text-gray-500 font-medium">{user?.Role || user?.['Phân quyền'] || 'Chuyên viên'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
        </div>
      </div>
      
      {showIncomingModal && (
        <IncomingDocForm 
          onClose={() => setShowIncomingModal(false)} 
          onSubmit={async (data) => {
            try {
              const { api } = await import('@/services/api');
              const res = await api.createIncomingDoc(data);
              if (res.success) {
                setShowIncomingModal(false);
                await initialize();
              } else {
                alert('Lỗi: ' + res.message);
              }
            } catch (error) {
              console.error(error);
              alert('Có lỗi xảy ra!');
            }
          }} 
        />
      )}
      
      {showOutgoingModal && (
        <OutgoingDocForm 
          onClose={() => setShowOutgoingModal(false)} 
          onSubmit={async (data) => {
            try {
              const { api } = await import('@/services/api');
              const res = await api.createOutgoingDoc(data);
              if (res.success) {
                setShowOutgoingModal(false);
                await initialize();
              } else {
                alert('Lỗi: ' + res.message);
              }
            } catch (error) {
              console.error(error);
              alert('Có lỗi xảy ra!');
            }
          }} 
        />
      )}
      
      <Modal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        title="Thêm công việc mới"
      >
        <TaskForm 
          onCancel={() => setShowTaskModal(false)} 
          onSubmit={async (data) => {
            try {
              const { api } = await import('@/services/api');
              const res = await api.createTask(data);
              if (res.success) {
                setShowTaskModal(false);
                await initialize();
              } else {
                alert('Lỗi: ' + res.message);
              }
            } catch (error) {
              console.error(error);
              alert('Có lỗi xảy ra!');
            }
          }} 
        />
      </Modal>
    
      {showZaloGuide && (
        <Modal isOpen={showZaloGuide} title="Cấu hình Zalo Notification (Miễn phí)" onClose={() => setShowZaloGuide(false)}>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <h3 className="text-lg font-bold text-primary">1. Hướng dẫn thiết lập Webhook (Dành cho Admin)</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Mở trình duyệt truy cập <b>Zalo for Developer</b>, chọn Zalo App của cơ quan.</li>
              <li>Vào menu <b>Webhook</b>, dán đường dẫn (URL) của ứng dụng Google Apps Script hiện tại vào ô Endpoint.</li>
              <li>Tick chọn sự kiện: <code className="bg-gray-100 text-rose-600 px-1 py-0.5 rounded">User send text message</code> và nhấn Lưu.</li>
              <li>Mở mã nguồn <code className="bg-gray-100 text-rose-600 px-1 py-0.5 rounded">Code.gs</code> trên Google Apps Script, tìm cấu hình <b>ZALO_CONFIG</b>, chuyển <b>ENABLE_ZALO</b> thành <b>true</b> và nhập Access Token của Zalo OA vào.</li>
            </ul>

            <h3 className="text-lg font-bold text-primary mt-6">2. Hướng dẫn Đăng ký nhận tin (Dành cho Cán bộ)</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Mở ứng dụng Zalo trên điện thoại, tìm tên Zalo OA của cơ quan và bấm <b>Quan tâm</b>.</li>
              <li>Nhắn tin vào Zalo OA với cú pháp: <br/><br/>
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-center font-mono text-lg text-indigo-700 font-bold">
                    DK [Số điện thoại]
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">Ví dụ: DK 0912345678</div>
              </li>
              <li>Hệ thống sẽ tự động bắt được Zalo ID của Cán bộ và tự động lưu vào hệ thống QLVB. Từ nay mọi thông báo công việc sẽ được gửi thẳng vào Zalo của Cán bộ đó hoàn toàn miễn phí.</li>
            </ul>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowZaloGuide(false)} 
                className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
}