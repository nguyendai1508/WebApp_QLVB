import React, { useState, useEffect } from 'react';
import { Eye, Edit, PlusCircle, Trash2, CheckCircle, Inbox, CalendarClock, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/Modal';
import { TaskForm } from '@/components/TaskForm';
import { IncomingDocForm } from '@/components/IncomingDocForm';
import { usePermissions } from '@/hooks/usePermissions';

const MetricCard = ({ title, value, icon: Icon, isDanger, active, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`rounded-xl p-5 border flex items-center gap-4 cursor-pointer transition-all ${
      active ? 'ring-2 ring-primary border-primary bg-blue-50 shadow-sm' : 'bg-white shadow-sm hover:shadow-md'
    }`}
  >
    <div className={`p-3 rounded-xl flex-shrink-0 ${isDanger ? 'bg-white text-rose-600 shadow-sm' : 'bg-gray-50 text-gray-500'}`}>
      <Icon className="w-5 h-5" strokeWidth={1.5} />
    </div>
    <div>
      <h3 className={`text-2xl font-bold leading-none mb-1 ${isDanger ? 'text-rose-600' : 'text-gray-900'}`}>{value}</h3>
      <p className={`text-xs font-medium ${isDanger ? 'text-rose-600' : 'text-gray-500'}`}>{title}</p>
    </div>
  </div>
);

export function IncomingDocs() {
  const { incomingDocs, catalogs } = useAppStore();
  const getCatalogOptions = (type: string) => catalogs.filter(c => c.Type === type).map(c => c.Value);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { initialize, setIsLoading } = useAppStore();
  const permissions = usePermissions();

  // Tự động tải lại dữ liệu ngầm khi người dùng quay lại (Focus) trang web
  React.useEffect(() => {
    const handleFocus = () => {
      // Gọi initialize() với silent = true để không hiện màn hình Loading to
      initialize(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [initialize]);

  useEffect(() => {
    const handleNavRefresh = (e: any) => {
      if (e.detail === '/incoming-docs') {
        setFilterStatus('Tất cả');
        handleRefresh();
      }
    };
    window.addEventListener('navRefresh', handleNavRefresh);
    return () => window.removeEventListener('navRefresh', handleNavRefresh);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await initialize(true);
    setIsRefreshing(false);
  };

  const filteredDocs = [...incomingDocs].reverse().filter(doc => 
    (filterStatus === 'Tất cả' || doc.Status === filterStatus) &&
    (doc.Summary.toLowerCase().includes(searchTerm.toLowerCase()) || doc.Sign_Number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateTask = (doc: any) => {
    setSelectedDoc(doc);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      const res = await api.createTask(data);
      if (res.success) {
        if (selectedDoc) {
          const updatePayload = {
            signNumber: selectedDoc.Sign_Number,
            docDate: selectedDoc.Draft_Date,
            receiveDate: selectedDoc.Receive_Date,
            summary: selectedDoc.Summary,
            issuer: selectedDoc.Issuer,
            docType: selectedDoc.Doc_Type,
            category: data.category || selectedDoc.Category,
            urgency: data.priority || selectedDoc.Urgency,
            security: selectedDoc.Security,
            assigner: data.assigner || selectedDoc.Assigner,
            leadDepartment: data.leadDepartment || selectedDoc.Lead_Department,
            leadAssignee: data.leadAssignee || selectedDoc.Lead_Assignee,
            coAssignee: data.coAssignee || selectedDoc.Co_Assignee,
            deadline: data.deadline || selectedDoc.Deadline,
            status: 'Đang xử lý',
            result: selectedDoc.Result,
            relatedTask: res.id,
            relatedOutgoingDoc: selectedDoc.Related_Outgoing_Doc,
            notes: selectedDoc.Notes,
            auditLog: `[${new Date().toLocaleString('en-GB')}] Đã giao việc (Mã: ${res.id}) cho cán bộ ${data.leadAssignee}.\n${selectedDoc.History || ''}`,
            createdBy: selectedDoc.Created_By || ''
          };
          await api.updateIncomingDoc(selectedDoc.Doc_ID, updatePayload);
        }
        setIsTaskModalOpen(false);
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

  const handleDelete = async (docId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa văn bản đến này? Hành động này không thể hoàn tác.')) {
      try {
        setIsLoading(true);
        const { api } = await import('@/services/api');
        const res = await api.deleteIncomingDoc(docId);
        if (res.success) {
          await initialize();
          setSelectedIds(prev => prev.filter(id => id !== docId));
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} văn bản đến đã chọn?`)) {
      try {
        setIsLoading(true);
        const { api } = await import('@/services/api');
        const res = await api.deleteMultipleIncomingDocs(selectedIds);
        if (res.success) {
          await initialize();
          setSelectedIds([]);
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredDocs.map(d => d.id || d.Doc_ID));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (docId: string) => {
    setSelectedIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
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
        res = await api.updateIncomingDoc(editingDoc.Doc_ID, payload);
      } else {
        res = await api.createIncomingDoc(payload);
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


  // Stats
  const newDocs = incomingDocs.filter(d => d.Status === 'Mới tiếp nhận').length;
  const unassignedDocs = incomingDocs.filter(d => d.Status === 'Chưa phân công').length;
  const dueSoonDocs = incomingDocs.filter(d => d.Status === 'Sắp hạn').length;
  const lateDocs = incomingDocs.filter(d => d.Status === 'Quá hạn').length;

  return (
    <div className="space-y-6">
      {/* Filters & Metrics */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng hạn</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-white min-w-[200px]"
          >
            <option value="Tất cả">Tất cả</option>
            {getCatalogOptions('Trạng thái VB đến').map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Mới tiếp nhận" value={newDocs} icon={CheckCircle} 
            active={filterStatus === 'Mới tiếp nhận'} onClick={() => setFilterStatus(filterStatus === 'Mới tiếp nhận' ? 'Tất cả' : 'Mới tiếp nhận')} 
          />
          <MetricCard 
            title="Chưa phân công" value={unassignedDocs} icon={Inbox} 
            active={filterStatus === 'Chưa phân công'} onClick={() => setFilterStatus(filterStatus === 'Chưa phân công' ? 'Tất cả' : 'Chưa phân công')} 
          />
          <MetricCard 
            title="Sắp hạn" value={dueSoonDocs} icon={CalendarClock} 
            active={filterStatus === 'Sắp hạn'} onClick={() => setFilterStatus(filterStatus === 'Sắp hạn' ? 'Tất cả' : 'Sắp hạn')} 
          />
          <MetricCard 
            title="Quá hạn" value={lateDocs} icon={AlertTriangle} isDanger={true} 
            active={filterStatus === 'Quá hạn'} onClick={() => setFilterStatus(filterStatus === 'Quá hạn' ? 'Tất cả' : 'Quá hạn')} 
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Danh sách văn bản đến</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{filteredDocs.length} bản ghi</span>
            {permissions.canDelete && selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" /> Xóa {selectedIds.length} mục
              </button>
            )}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 border-b bg-white">
              <tr>
                <th className="px-4 py-3 font-medium w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    checked={filteredDocs.length > 0 && selectedIds.length === filteredDocs.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Mã VB đến</th>
                <th className="px-4 py-3 font-medium">Số/Ký hiệu</th>
                <th className="px-4 py-3 font-medium">Ngày đến</th>
                <th className="px-4 py-3 font-medium">Trích yếu</th>
                <th className="px-4 py-3 font-medium">Cơ quan ban hành</th>
                <th className="px-4 py-3 font-medium">Cán bộ chủ trì</th>
                <th className="px-4 py-3 font-medium">Cán bộ đồng xử lý</th>
                <th className="px-4 py-3 font-medium">Hạn xử lý</th>
                <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-center">Cảnh báo</th>
                <th className="px-4 py-3 font-medium text-center">File</th>
                <th className="px-4 py-3 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      checked={selectedIds.includes(doc.id || doc.Doc_ID)}
                      onChange={() => handleSelectRow(doc.id || doc.Doc_ID)}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{doc.Doc_ID}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{doc.Sign_Number}</td>
                  <td className="px-4 py-3 text-gray-500">{doc.Draft_Date}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-600 max-w-[200px] line-clamp-2" title={doc.Summary}>{doc.Summary}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.Issuer}</td>
                  <td className="px-4 py-3">
                    <div className="bg-gray-100 text-gray-700 rounded-lg text-xs font-medium px-2.5 py-1 max-w-[150px] line-clamp-2" title={doc.Lead_Assignee}>
                      {doc.Lead_Assignee || 'Chưa có'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="bg-gray-100 text-gray-700 rounded-lg text-xs font-medium px-2.5 py-1 max-w-[150px] line-clamp-2" title={doc.Co_Assignee}>
                      {doc.Co_Assignee || 'Chưa có'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.Deadline}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      doc.Status === 'Hoàn thành' ? 'bg-[#e6f4ea] text-primary' : 
                      doc.Status === 'Quá hạn' ? 'bg-rose-50 text-rose-600' : 
                      doc.Status === 'Đã phân công' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {doc.Status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {doc.Status === 'Quá hạn' ? (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                    ) : doc.Status === 'Hoàn thành' ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">Đã xong</span>
                    ) : null}
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
                        {permissions.canAddTask && (
                          <button 
                            onClick={() => handleCreateTask(doc)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors" 
                            title="Tạo công việc"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canDelete && (
                          <button 
                            onClick={() => handleDelete(doc.Doc_ID)}
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
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                    Không có bản ghi nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title="Thêm công việc mới"
      >
        <TaskForm 
          key={selectedDoc?.Doc_ID || 'new'}
          autoFillFromDoc={selectedDoc} 
          onSubmit={handleTaskSubmit}
          onCancel={() => setIsTaskModalOpen(false)}
        />
      </Modal>

      {showModal && (
        <IncomingDocForm 
          key={editingDoc ? editingDoc.Doc_ID : 'new'}
          initialData={editingDoc}
          onClose={() => {
            setShowModal(false);
            setEditingDoc(null);
          }}
          onSubmit={handleFormSubmit}
          onDeleteDoc={editingDoc ? async () => {
            const { api } = await import('@/services/api');
            const res = await api.deleteIncomingDoc(editingDoc.Doc_ID);
            if (res.success) { await initialize(); } else { throw new Error(res.message); }
          } : undefined}
        />
      )}

    </div>
  );
}
