import React, { useState, useRef } from 'react';
import { X, Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ComboBox } from './ui/ComboBox';
import { fileToBase64 } from '@/utils/fileHelpers';
import { usePermissions } from '@/hooks/usePermissions';

interface StaffFormProps {
  initialData?: any;
  onCancel: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export function StaffForm({ initialData, onCancel, onSubmit }: StaffFormProps) {
  const { catalogs, staff, deleteCatalog } = useAppStore();
  const permissions = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    Full_Name: initialData?.Full_Name || '',
    Role: initialData?.Role || '',
    Department: initialData?.Department || '',
    Phone: initialData?.Phone || '',
    Email: initialData?.Email || '',
    Direct_Manager: initialData?.Direct_Manager || '',
    Status: initialData?.Status || 'Đang công tác',
    Notes: initialData?.Notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let fileData = null;
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        fileData = {
          fileBase64: base64,
          fileName: selectedFile.name,
          fileMimeType: selectedFile.type,
          fileSize: selectedFile.size
        };
      }
      
      const payload = {
        fullName: formData.Full_Name,
        role: formData.Role,
        department: formData.Department,
        phone: formData.Phone,
        email: formData.Email,
        manager: formData.Direct_Manager,
        status: formData.Status,
        notes: formData.Notes,
        ...fileData
      };
      
      await onSubmit(payload);
    } catch (error) {
      console.error(error);
      alert('Đã có lỗi xảy ra khi tạo cán bộ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCatalogOptions = (type: string) => {
    return catalogs.filter(c => String(c.Type).toLowerCase() === String(type).toLowerCase()).map(c => c.Value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Họ và tên</label>
          <input required type="text" name="Full_Name" value={formData.Full_Name} onChange={handleChange} className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Chức vụ</label>
          <ComboBox name="Role" value={formData.Role} onChange={handleChange} options={getCatalogOptions('Chức vụ')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Chức vụ', val) }} placeholder="Chọn hoặc nhập chức vụ" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Đơn vị/Tổ công tác</label>
          <ComboBox name="Department" value={formData.Department} onChange={handleChange} options={getCatalogOptions('Đơn vị/Tổ công tác')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Đơn vị/Tổ công tác', val) }} placeholder="Chọn hoặc nhập đơn vị" />
        </div>

        <div>
          <label className="block text-sm font-bold text-primary mb-1">Số điện thoại</label>
          <input type="text" name="Phone" value={formData.Phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Email</label>
          <input type="email" name="Email" value={formData.Email} onChange={handleChange} className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Lãnh đạo trực tiếp</label>
          <select name="Direct_Manager" value={formData.Direct_Manager} onChange={handleChange} className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-white">
            <option value="">Chọn lãnh đạo trực tiếp</option>
            {staff.map(s => <option key={s.Staff_ID} value={s.Full_Name}>{s.Full_Name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-primary mb-1">Trạng thái công tác</label>
          <ComboBox name="Status" allowInput={false} value={formData.Status} onChange={handleChange} options={getCatalogOptions('Trạng thái công tác')} placeholder="Chọn trạng thái" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-primary mb-1">Ghi chú</label>
        <textarea name="Notes" value={formData.Notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"></textarea>
      </div>

      <div>
        <label className="block text-sm font-bold text-primary mb-1">Ảnh 3x4</label>
        <div className="border border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 bg-gray-50/50">
          <input 
            type="file" 
            accept="image/*"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#e6f4ea] text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            Chọn ảnh
          </button>
          <div>
            <p className={`text-sm font-bold ${selectedFile ? 'text-primary' : 'text-gray-900'}`}>
              {selectedFile ? selectedFile.name : 'Chưa chọn ảnh'}
            </p>
            <p className="text-xs text-gray-500">Khuyến nghị ảnh chân dung 3x4</p>
          </div>
          {selectedFile && (
            <button type="button" onClick={() => setSelectedFile(null)} className="text-rose-500 hover:text-rose-700 text-sm font-medium ml-4">
              Xóa
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" disabled={isSubmitting} onClick={onCancel} className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
          Hủy
        </button>
        {permissions.canManageStaff && (
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Đang lưu...' : 'Lưu cán bộ'}
          </button>
        )}
      </div>
    </form>
  );
}
