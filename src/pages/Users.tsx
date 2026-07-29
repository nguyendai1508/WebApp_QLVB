import React, { useState } from 'react';
import { UserPlus, Edit, Trash2, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from '@/components/Modal';
import { UserForm } from '@/components/UserForm';
import { usePermissions } from '@/hooks/usePermissions';

export function Users() {
  const { users, catalogs } = useAppStore();
  const getCatalogOptions = (type: string) => catalogs.filter(c => c.Type === type).map(c => c.Value);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tất cả phân quyền');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const { initialize, setIsLoading } = useAppStore();
  const permissions = usePermissions();

  const filteredUsers = users.filter((u: any) => {
    const matchSearch = u['Tên đăng nhập']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u['Mã người dùng']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u['Tên người dùng']?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'Tất cả phân quyền' || u['Phân quyền'] === roleFilter;
    return matchSearch && matchRole;
  });

  const handleDelete = async (userId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
      try {
        setIsLoading(true);
        const { api } = await import('@/services/api');
        const res = await api.deleteUser(userId);
        if (res.success) {
          await initialize();
        } else {
          alert('Lỗi: ' + res.message);
        }
      } catch (error) {
        alert('Có lỗi xảy ra!');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleFormSubmit = async (payload: any) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      let res;
      if (editingUser) {
        res = await api.updateUser(editingUser.id || editingUser['Mã người dùng'], payload);
      } else {
        res = await api.createUser(payload);
      }
      if (res.success) {
        setShowModal(false);
        setEditingUser(null);
        await initialize();
      } else {
        alert('Lỗi: ' + res.message);
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Người dùng</h2>
          <p className="text-sm text-gray-500">Quản lý tài khoản, cán bộ liên kết, phạm vi dữ liệu và phân quyền 3 vai trò.</p>
        </div>
        {permissions.canManageUsers && (
          <button 
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Thêm người dùng
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Tìm kiếm</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo mã người dùng, tên đăng nhập, cán bộ..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Phân quyền</label>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
          >
            <option value="Tất cả phân quyền">Tất cả phân quyền</option>
            {getCatalogOptions('Phân quyền').map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Danh sách người dùng</h3>
          <span className="text-sm text-gray-500">{filteredUsers.length} bản ghi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-900 font-bold border-b bg-white">
              <tr>
                <th className="px-4 py-3 font-bold">Mã người dùng</th>
                <th className="px-4 py-3 font-bold">Tên đăng nhập</th>
                <th className="px-4 py-3 font-bold">Tên người dùng</th>
                <th className="px-4 py-3 font-bold">Họ tên cán bộ</th>
                <th className="px-4 py-3 font-bold text-center">Phạm vi dữ liệu</th>
                <th className="px-4 py-3 font-bold text-center">Phân quyền</th>
                <th className="px-4 py-3 font-bold">Mật khẩu</th>
                {permissions.canManageUsers && (
                  <th className="px-4 py-3 font-bold text-center">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((user: any, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-500">{user['Mã người dùng']}</td>
                  <td className="px-4 py-4 text-gray-500">{user['Tên đăng nhập']}</td>
                  <td className="px-4 py-4 text-gray-500">{user['Tên người dùng']}</td>
                  <td className="px-4 py-4 text-gray-500">{user['Họ tên cán bộ']}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      {user['Phạm vi dữ liệu']}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user['Phân quyền'] === 'Nghiệp vụ' ? 'bg-[#e6f4ea] text-primary' : 
                      user['Phân quyền'] === 'Admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user['Phân quyền']}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-900 tracking-widest font-bold">
                    {Array((user['Mật khẩu'] || '').length).fill('.').join('')}
                  </td>
                  {permissions.canManageUsers && (
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors border border-gray-200 rounded-md bg-white mr-1" 
                          title="Sửa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id || user['Mã người dùng'])}
                          className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors border border-rose-100 rounded-md bg-rose-50" 
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingUser(null); }} title={editingUser ? "Cập nhật người dùng" : "Thêm người dùng"}>
        <UserForm 
          key={editingUser ? editingUser.User_ID : 'new'}
          initialData={editingUser}
          onCancel={() => { setShowModal(false); setEditingUser(null); }} 
          onSubmit={handleFormSubmit} 
        />
      </Modal>
    </div>
  );
}
