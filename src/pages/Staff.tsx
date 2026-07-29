import React, { useState } from 'react';
import { Search, PlusCircle, LayoutGrid, Eye, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/Modal';
import { StaffForm } from '@/components/StaffForm';
import { usePermissions } from '@/hooks/usePermissions';

export function Staff() {
  const { staff, catalogs } = useAppStore();
  const getCatalogOptions = (type: string) => catalogs.filter(c => c.Type === type).map(c => c.Value);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('Tất cả đơn vị');
  const [roleFilter, setRoleFilter] = useState('Tất cả chức vụ');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const { initialize, setIsLoading } = useAppStore();
  const permissions = usePermissions();

  // Lọc dữ liệu
  const filteredStaff = staff.filter(s => {
    const matchSearch = s.Full_Name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.Staff_ID?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = departmentFilter === 'Tất cả đơn vị' || s.Department === departmentFilter;
    const matchRole = roleFilter === 'Tất cả chức vụ' || s.Role === roleFilter;
    const matchStatus = statusFilter === 'Tất cả trạng thái' || (s.Status || 'Đang công tác') === statusFilter;
    return matchSearch && matchDept && matchRole && matchStatus;
  });

  const handleDelete = async (staffId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cán bộ này? Hành động này không thể hoàn tác.')) {
      try {
        setIsLoading(true);
        const { api } = await import('@/services/api');
        const res = await api.deleteStaff(staffId);
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

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    setShowModal(true);
  };

  const handleFormSubmit = async (payload: any) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      let res;
      if (editingStaff) {
        res = await api.updateStaff(editingStaff.Staff_ID, payload);
      } else {
        res = await api.createStaff(payload);
      }
      if (res.success) {
        setShowModal(false);
        setEditingStaff(null);
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
          <h2 className="text-xl font-bold text-gray-900">Cán bộ</h2>
          <p className="text-sm text-gray-500">Hồ sơ cán bộ, chức vụ, đơn vị công tác và thông tin liên hệ.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
            <LayoutGrid className="w-4 h-4" />
            Đổi chế độ xem
          </button>
          {permissions.canManageStaff && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Thêm cán bộ
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Tìm kiếm</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo mã CB, họ tên, chức vụ..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Đơn vị/Tổ công tác</label>
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
          >
            <option value="Tất cả đơn vị">Tất cả đơn vị</option>
            {getCatalogOptions('Đơn vị/Tổ công tác').map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Chức vụ</label>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
          >
            <option value="Tất cả chức vụ">Tất cả chức vụ</option>
            {getCatalogOptions('Chức vụ').map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Trạng thái công tác</label>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
          >
            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
            {getCatalogOptions('Trạng thái công tác').map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStaff.map((person, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-5 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 border">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(person.Full_Name)}&background=random`} alt={person.Full_Name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-sm line-clamp-1" title={person.Full_Name}>{person.Full_Name}</h3>
                {person.Username && (
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5 line-clamp-1">@{person.Username}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{person.Role || 'Công chức'}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{person.Department || 'UBND Xã'}</p>
                <div className="mt-2">
                  <span className="px-2 py-0.5 bg-[#e6f4ea] text-primary rounded-md text-[10px] font-bold">
                    {person.Status || 'Đang công tác'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t flex gap-2">
              <button onClick={() => handleEdit(person)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f8fafc] text-primary rounded-lg text-[13px] font-bold hover:bg-[#e6f4ea] transition-colors">
                <Eye className="w-3.5 h-3.5" />
                Hồ sơ
              </button>
              {permissions.canManageStaff && (
                <>
                  <button 
                    onClick={() => handleEdit(person)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-[13px] font-bold hover:bg-amber-100 transition-colors"
                    title="Sửa"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(person.Staff_ID)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-[13px] font-bold hover:bg-rose-100 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          Không tìm thấy cán bộ nào.
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingStaff(null); }} title={editingStaff ? "Cập nhật cán bộ" : "Thêm cán bộ"}>
        <StaffForm 
          key={editingStaff ? editingStaff.Staff_ID : 'new'}
          initialData={editingStaff}
          onCancel={() => { setShowModal(false); setEditingStaff(null); }} 
          onSubmit={handleFormSubmit} 
        />
      </Modal>
    </div>
  );
}
