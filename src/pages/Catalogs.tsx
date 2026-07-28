import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Search, Plus, Edit2, X, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { api } from '@/services/api';

const CatalogGroup = ({ title, items, onAdd, onEdit, onDelete }: any) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Quản lý các giá trị của {title.toLowerCase()}</p>
      </div>
      <button 
        onClick={() => onAdd(title)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e6f4ea] text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm
      </button>
    </div>
    <div className="p-4 flex flex-wrap gap-2.5">
      {items.length === 0 ? (
        <span className="text-xs text-gray-400 italic">Chưa có dữ liệu</span>
      ) : (
        items.map((item: string, idx: number) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-full text-xs font-medium text-gray-700 hover:border-primary/50 transition-colors group">
            <span className="text-primary font-bold">{item}</span>
            <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
              <button onClick={() => onEdit(title, item)} className="text-gray-400 hover:text-primary transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(title, item)} className="text-gray-400 hover:text-rose-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export function Catalogs() {
  const { catalogs, initialize, isLoading, setIsLoading } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentType, setCurrentType] = useState('');
  const [currentOldValue, setCurrentOldValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  const groupedCatalogs = catalogs.reduce((acc: any, cat: any) => {
    if (!acc[cat.Type]) acc[cat.Type] = [];
    acc[cat.Type].push(cat.Value);
    return acc;
  }, {});

  const handleAdd = (type: string) => {
    setModalMode('add');
    setCurrentType(type);
    setInputValue('');
    setIsModalOpen(true);
  };

  const handleEdit = (type: string, oldValue: string) => {
    setModalMode('edit');
    setCurrentType(type);
    setCurrentOldValue(oldValue);
    setInputValue(oldValue);
    setIsModalOpen(true);
  };

  const handleDelete = async (type: string, value: string) => {
    if (confirm(`Bạn có chắc muốn xóa "${value}" khỏi danh mục "${type}" không?`)) {
      try {
        setIsLoading(true);
        const res: any = await api.deleteSetupData({ type, value });
        if (res.success) {
          await initialize();
        } else {
          alert('Lỗi: ' + (res.message || ''));
        }
      } catch (error) {
        alert('Có lỗi xảy ra!');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return alert('Vui lòng nhập giá trị');
    
    try {
      setIsLoading(true);
      let res: any;
      if (modalMode === 'add') {
        res = await api.addSetupData({ type: currentType, value: inputValue.trim() });
      } else {
        res = await api.updateSetupData({ type: currentType, oldValue: currentOldValue, newValue: inputValue.trim() });
      }

      if (res.success) {
        setIsModalOpen(false);
        await initialize();
      } else {
        alert('Lỗi: ' + (res.message || ''));
      }
    } catch (error) {
      alert('Có lỗi xảy ra!');
    } finally {
      setIsLoading(false);
    }
  };

  const catalogTypes = Object.keys(groupedCatalogs).sort();
  const filteredTypes = catalogTypes.filter(type => 
    type.toLowerCase().includes(searchTerm.toLowerCase()) || 
    groupedCatalogs[type].some((v: string) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Danh mục</h2>
          <p className="text-sm text-gray-500">Quản lý các danh mục cấu hình dùng chung toàn hệ thống.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Danh sách cấu hình</h3>
            </div>
            <button 
              onClick={() => initialize()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <label className="block text-xs font-bold text-primary mb-1">Tìm nhanh danh mục</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm tên loại danh mục hoặc giá trị..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredTypes.map((type, idx) => (
              <CatalogGroup 
                key={idx} 
                title={type} 
                items={groupedCatalogs[type]} 
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {filteredTypes.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              Không tìm thấy danh mục nào phù hợp.
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'add' ? `Thêm giá trị cho: ${currentType}` : `Sửa giá trị: ${currentType}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Giá trị</label>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="Nhập giá trị..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hủy
            </button>
            <button 
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
