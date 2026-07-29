import React, { useState } from 'react';
import { Eye, Edit, Trash2, Search, PlusCircle, FileEdit, PenTool, Send, Mail, ExternalLink, CheckSquare, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/Modal';
import { OutgoingDocForm } from '@/components/OutgoingDocForm';
import { usePermissions } from '@/hooks/usePermissions';

const MetricCard = ({ title, value, icon: Icon, type }: any) => {
  const getStyles = () => {
    switch(type) {
      case 'draft': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'signing': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'releasing': return 'bg-teal-50 text-teal-600 border-teal-100';
      case 'sent': return 'bg-[#e6f4ea] text-primary border-emerald-100';
      default: return 'bg-white text-gray-500 border-gray-100';
    }
  };
  
  const getIconBg = () => {
    switch(type) {
      case 'draft': return 'bg-white text-gray-600';
      case 'signing': return 'bg-white text-orange-600';
      case 'releasing': return 'bg-white text-teal-600';
      case 'sent': return 'bg-white text-primary';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className={`rounded-xl p-5 border flex items-center gap-4 ${getStyles()}`}>
      <div className={`p-3 rounded-xl flex-shrink-0 shadow-sm ${getIconBg()}`}>
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-2xl font-bold leading-none mb-1 currentColor">{value}</h3>
        <p className="text-xs font-medium currentColor opacity-80">{title}</p>
      </div>
    </div>
  );
};

export function OutgoingDocs() {
  const { outgoingDocs, catalogs } = useAppStore();
  const getCatalogOptions = (type: string) => catalogs.filter(c => c.Type === type).map(c => c.Value);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');
  const [fieldFilter, setFieldFilter] = useState('Tất cả lĩnh vực');
  const [signerFilter, setSignerFilter] = useState('Tất cả người ký');
  const [relatedFilter, setRelatedFilter] = useState('Tất cả');
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const { initialize, setIsLoading } = useAppStore();
  const permissions = usePermissions();

  const filteredDocs = outgoingDocs.filter(doc => {
    const matchSearch = doc.Sign_Number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        doc.Summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'Tất cả trạng thái' || doc.Status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (docId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa văn bản đi này? Hành động này không thể hoàn tác.')) {
      try {
        setIsLoading(true);
        const { api } = await import('@/services/api');
        const res = await api.deleteOutgoingDoc(docId);
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

  const handleEdit = (doc: any) => {
    setEditingDoc(doc);
    setShowModal(true);
  };

  const handleFormSubmit = async (payload: any) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      let res;
      if (editingDoc) {
        res = await api.updateOutgoingDoc(editingDoc.id || editingDoc.Doc_ID, payload);
      } else {
        res = await api.createOutgoingDoc(payload);
      }
      if (res.success) {
        setShowModal(false);
        setEditingDoc(null);
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

  // Metrics
  const draftCount = outgoingDocs.filter(d => d.Status === 'Dự thảo').length;
  const signingCount = outgoingDocs.filter(d => d.Status === 'Chờ ký').length;
  const releasingCount = outgoingDocs.filter(d => d.Status === 'Chờ phát hành').length;
  const sentCount = outgoingDocs.filter(d => d.Status === 'Đã phát hành' || d.Status === 'Đã gửi').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Văn bản đi</h2>
          <p className="text-sm text-gray-500">Theo dõi soạn thảo, ký và phát hành văn bản đi.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#e6f4ea] text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors">
            <CheckSquare className="w-4 h-4" />
            Chờ ký / gửi
          </button>
          {permissions.canAddOutgoing && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Thêm văn bản đi
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm theo mã, số/ký hiệu, trích yếu..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Trạng thái phát hành</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
            >
              <option value="Tất cả">Tất cả</option>
              {getCatalogOptions('Trạng thái VB đi').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Lĩnh vực</label>
            <select 
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
            >
              <option value="Tất cả lĩnh vực">Tất cả lĩnh vực</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Người ký</label>
            <select 
              value={signerFilter}
              onChange={(e) => setSignerFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
            >
              <option value="Tất cả người ký">Tất cả người ký</option>
            </select>
          </div>
        </div>
        <div className="w-1/4 pr-3">
          <label className="block text-xs font-bold text-primary mb-1">VB đến liên quan</label>
          <select 
            value={relatedFilter}
            onChange={(e) => setRelatedFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
          >
            <option value="Tất cả">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Dự thảo" value={draftCount} icon={FileEdit} type="draft" />
        <MetricCard title="Chờ ký" value={signingCount} icon={PenTool} type="signing" />
        <MetricCard title="Chờ phát hành" value={releasingCount} icon={Send} type="releasing" />
        <MetricCard title="Đã gửi" value={sentCount} icon={Mail} type="sent" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Danh sách văn bản đi</h3>
          <span className="text-sm text-gray-500">{filteredDocs.length} bản ghi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 border-b bg-white">
              <tr>
                <th className="px-4 py-3 font-medium">Mã VB đi</th>
                <th className="px-4 py-3 font-medium">Số/Ký hiệu</th>
                <th className="px-4 py-3 font-medium">Ngày soạn</th>
                <th className="px-4 py-3 font-medium">Trích yếu</th>
                <th className="px-4 py-3 font-medium">Người ký</th>
                <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Hạn phát hành</th>
                <th className="px-4 py-3 font-medium text-center">Cảnh báo</th>
                <th className="px-4 py-3 font-medium text-center">File</th>
                <th className="px-4 py-3 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{doc.Doc_ID || `DI-000${idx+1}`}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{doc.Sign_Number}</td>
                  <td className="px-4 py-3 text-gray-500">{doc.Draft_Date || doc.Release_Date}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-600 max-w-[200px] line-clamp-2" title={doc.Summary}>{doc.Summary}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary">{doc.Signer}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      doc.Status === 'Dự thảo' ? 'bg-gray-100 text-gray-600' : 
                      doc.Status === 'Chờ ký' ? 'bg-amber-50 text-amber-600' : 
                      doc.Status === 'Đã gửi' ? 'bg-[#e6f4ea] text-primary' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {doc.Status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.Release_Deadline || 'Chưa có'}</td>
                  <td className="px-4 py-3 text-center">
                    {doc.Status === 'Chờ ký' || doc.Status === 'Dự thảo' ? (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">Đã xong</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {doc.File_URL && doc.File_URL.split('\n').filter(Boolean).length > 0 ? (
                        doc.File_URL.split('\n').filter(Boolean).map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title={`Tải file ${i+1}`}>
                            <FileText className="w-4 h-4" />
                          </a>
                        ))
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[11px] font-medium">Chưa có</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(doc)} className="p-1.5 text-gray-400 hover:text-primary transition-colors" title="Xem chi tiết">
                          <Eye className="w-4 h-4" />
                        </button>
                        {permissions.canEditDoc && (
                          <button 
                            onClick={() => handleEdit(doc)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" 
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canEditDoc && (
                          <button onClick={() => alert('Chức năng Trình ký / Gửi liên thông đang được phát triển.')} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Gửi / Ký">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canDelete && (
                          <button 
                            onClick={() => handleDelete(doc.id || doc.Doc_ID)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors" 
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    Không có bản ghi nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <OutgoingDocForm 
          key={editingDoc ? editingDoc.Doc_ID : 'new'}
          initialData={editingDoc}
          onClose={() => {
            setShowModal(false);
            setEditingDoc(null);
          }}
          onSubmit={handleFormSubmit}
          onDeleteDoc={editingDoc ? async () => {
            const { api } = await import('@/services/api');
            const res = await api.deleteOutgoingDoc(editingDoc.id || editingDoc.Doc_ID);
            if (res.success) { await initialize(); } else { throw new Error(res.message); }
          } : undefined}
        />
      )}
    </div>
  );
}
