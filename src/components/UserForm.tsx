import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ComboBox } from './ui/ComboBox';

interface UserFormProps {
  initialData?: any;
  onCancel: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export function UserForm({ initialData, onCancel, onSubmit }: UserFormProps) {
  const { catalogs, staff, deleteCatalog } = useAppStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: initialData?.['Tên đăng nhập'] || '',
    password: initialData?.['Mật khẩu'] || '',
    staffId: initialData?.['Mã cán bộ'] || '',
    fullName: initialData?.['Họ tên cán bộ'] || '',
    displayName: initialData?.['Tên người dùng'] || '',
    dataScope: initialData?.['Phạm vi dữ liệu'] || '',
    role: initialData?.['Phân quyền'] || ''
  });

  const getCatalogOptions = (type: string) => catalogs.filter(c => String(c.Type).toLowerCase() === String(type).toLowerCase()).map(c => c.Value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-fill fullName if staffId is selected
    if (name === 'staffId') {
      const selectedStaff = staff.find(s => s.Staff_ID === value);
      setFormData({
        ...formData,
        staffId: value,
        fullName: selectedStaff ? selectedStaff.Full_Name : ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalPayload = {
        username: formData.username,
        'Tên đăng nhập': formData.username,
        password: formData.password || (initialData ? initialData['Mật khẩu'] : '123456'),
        'Mật khẩu': formData.password || (initialData ? initialData['Mật khẩu'] : '123456'),
        staffId: formData.staffId,
        'Mã cán bộ': formData.staffId,
        'Mã người dùng': formData.staffId, // Thường dùng chung mã cán bộ cho mã người dùng
        fullName: formData.fullName,
        'Họ tên cán bộ': formData.fullName,
        displayName: formData.displayName,
        'Tên người dùng': formData.displayName,
        dataScope: formData.dataScope,
        'Phạm vi dữ liệu': formData.dataScope,
        role: formData.role,
        'Phân quyền': formData.role
      };
      await onSubmit(finalPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Tên đăng nhập (*)</label>
            <input 
              type="text" 
              name="username" 
              required 
              value={formData.username} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
              placeholder="VD: nguyenvanan"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Mật khẩu</label>
            <input 
              type="password" 
              name="password" 
              required={!initialData} 
              value={formData.password} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
              placeholder={initialData ? "(Bỏ trống nếu không đổi)" : "Nhập mật khẩu"}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Cán bộ liên kết</label>
            <select 
              name="staffId" 
              value={formData.staffId} 
              onChange={handleChange} 
              className="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-white"
            >
              <option value="">Chọn cán bộ</option>
              {staff.map(s => <option key={s.Staff_ID} value={s.Staff_ID}>{s.Full_Name} ({s.Staff_ID})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Tên hiển thị người dùng</label>
            <input 
              type="text" 
              name="displayName" 
              value={formData.displayName} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
              placeholder="VD: Admin Hệ Thống"
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Phân quyền</label>
            <ComboBox 
              name="role" 
              value={formData.role} 
              onChange={handleChange} 
              options={getCatalogOptions('Phân quyền')}
              onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Phân quyền', val) }}
              placeholder="Chọn phân quyền"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Phạm vi dữ liệu</label>
            <ComboBox 
              name="dataScope" 
              value={formData.dataScope} 
              onChange={handleChange} 
              options={getCatalogOptions('Phạm vi dữ liệu')}
              onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Phạm vi dữ liệu', val) }}
              placeholder="Chọn phạm vi"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Hủy bỏ
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSubmitting ? 'Đang lưu...' : 'Lưu người dùng'}
        </button>
      </div>
    </form>
  );
}
