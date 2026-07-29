import React, { useState, useMemo } from 'react';
import { Eye, Edit, Trash2, CheckCircle, Search, PlusCircle, ClipboardList, CalendarClock, CalendarX, User, FileText, ArrowUpDown, Filter } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/Modal';
import { TaskForm } from '@/components/TaskForm';
import { usePermissions } from '@/hooks/usePermissions';
import { ConfirmModal } from '@/components/ConfirmModal';
import { XCircle, FileCheck2, CheckCircle2, AlertCircle } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, type, onClick }: any) => {
  const getStyles = () => {
    switch(type) {
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'danger': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'success': return 'bg-[#e6f4ea] text-primary border-emerald-100';
      case 'purple': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };
  
  const getIconBg = () => {
    switch(type) {
      case 'warning': return 'bg-white text-amber-600';
      case 'danger': return 'bg-white text-rose-600';
      case 'success': return 'bg-white text-primary';
      case 'purple': return 'bg-white text-purple-600';
      default: return 'bg-white text-gray-500';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`rounded-xl p-5 border flex items-center gap-4 cursor-pointer transition-transform hover:scale-[1.02] ${getStyles()}`}
    >
      <div className={`p-3 rounded-xl flex-shrink-0 shadow-sm ${getIconBg()}`}>
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-2xl font-bold leading-none mb-1 text-gray-900">{value}</h3>
        <p className="text-xs font-medium currentColor opacity-80">{title}</p>
      </div>
    </div>
  );
};

const parseDateToCompare = (dateStr: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split(' ')[0].split('/'); 
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return null;
}

const getCompletionStatus = (actual: string, deadline: string) => {
  if (!actual || !deadline) return null;
  const actualDate = parseDateToCompare(actual);
  const deadlineDate = parseDateToCompare(deadline);
  
  if (actualDate && deadlineDate) {
    actualDate.setHours(0,0,0,0);
    deadlineDate.setHours(0,0,0,0);
    const timeDiff = actualDate.getTime() - deadlineDate.getTime();
    if (timeDiff <= 0) {
      return <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mt-1 whitespace-nowrap border border-emerald-100">Sớm hạn</span>;
    } else {
      return <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded mt-1 whitespace-nowrap border border-rose-100">Chậm hạn</span>;
    }
  }
  return null;
}

export function Tasks() {
  const { tasks, catalogs, staff, initialize, setIsLoading, user } = useAppStore();
  const permissions = usePermissions();
  const getCatalogOptions = (type: string) => catalogs.filter(c => c.Type === type).map(c => c.Value);
  
  const [viewMode, setViewMode] = useState<'ALL' | 'MY_TASKS' | 'ASSIGNED_BY_ME'>(
    (permissions.isAdmin || permissions.isLanhDao || permissions.isVanThu) ? 'ALL' : 'MY_TASKS'
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');
  const [priorityFilter, setPriorityFilter] = useState('Tất cả mức độ');
  const [assigneeFilter, setAssigneeFilter] = useState('Tất cả cán bộ');
  const [deadlineFilter, setDeadlineFilter] = useState('Tất cả');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  });

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleDelete = (taskId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa công việc',
      message: 'Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác.',
      type: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const { api } = await import('@/services/api');
          const res = await api.deleteTask(taskId);
          if (res.success) {
            await initialize();
            setSelectedIds(prev => prev.filter(id => id !== taskId));
          } else {
            alert('Lỗi: ' + res.message);
          }
        } catch (error) {
          console.error(error);
          alert('Có lỗi xảy ra khi xóa công việc.');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa hàng loạt',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} công việc đã chọn?`,
      type: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const { api } = await import('@/services/api');
          const res = await api.deleteMultipleTasks(selectedIds);
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
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, currentTasks: any[]) => {
    if (e.target.checked) {
      setSelectedIds(currentTasks.map(d => d.id || d.Task_ID));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (taskId: string) => {
    setSelectedIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Helper map từ Task object sang payload API (camelCase)
  const mapTaskToPayload = (taskObj: any, newStatus: string, actualDate?: string, auditLog?: string) => {
    return {
      source: taskObj.Source,
      relatedDoc: taskObj.Linked_Doc_ID,
      content: taskObj.Content,
      category: taskObj.Category,
      priority: taskObj.Priority,
      assigner: taskObj.Assigner,
      leadDepartment: taskObj.Lead_Department,
      leadAssignee: taskObj.Lead_Assignee,
      coAssignee: taskObj.Co_Assignee,
      assignDate: taskObj.Assign_Date,
      deadline: taskObj.Deadline,
      actualCompleteDate: actualDate !== undefined ? actualDate : taskObj.Actual_Complete_Date,
      progressPercentage: newStatus === 'Hoàn thành' ? 100 : taskObj.Progress_Percentage,
      status: newStatus,
      resultOutput: taskObj.Result_Output,
      relatedOutgoingDoc: taskObj.Related_Outgoing_Doc,
      notes: taskObj.Notes,
      existingFiles: {
        urls: taskObj.File_URL || '',
        names: taskObj.File_URL ? 'Bản lưu' : ''
      },
      existingResultFiles: {
        urls: taskObj.Result_File_URL || '',
        names: taskObj.Result_File_URL ? 'Bản lưu' : ''
      },
      files: [],
      resultFiles: [],
      auditLog: auditLog || '',
      createdBy: taskObj.Created_By
    };
  };

  const handleRequestApproval = (task: any) => {
    const hasResultFile = task.Result_File_Name && task.Result_File_Name.trim() !== '';
    if (!hasResultFile) {
      alert('Không thể xin duyệt!\nVui lòng mở Form và đính kèm Tệp báo cáo kết quả trước khi xin duyệt.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Xin duyệt kết quả',
      message: `Bạn muốn xin duyệt kết quả cho công việc: ${task.Task_ID}?`,
      type: 'info',
      confirmText: 'Xin duyệt',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const { api } = await import('@/services/api');
          const nowObj = new Date();
          const todayISO = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')} ${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}:${String(nowObj.getSeconds()).padStart(2, '0')}`;
          const newLog = `[${new Date().toLocaleString('en-GB')}] ${user?.FullName || 'Cán bộ'} đã [XIN DUYỆT KẾT QUẢ].`;
          const payload = mapTaskToPayload(task, 'Chờ duyệt', todayISO, newLog);
          const res = await api.updateTask(task.Task_ID, payload);
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
    });
  };

  const handleApprove = (task: any, isApproved: boolean) => {
    const newStatus = isApproved ? 'Hoàn thành' : 'Đang xử lý';
    const msg = isApproved ? 'Duyệt & Đóng' : 'Yêu cầu làm lại';
    
    setConfirmDialog({
      isOpen: true,
      title: isApproved ? 'Phê duyệt công việc' : 'Yêu cầu làm lại',
      message: `Bạn muốn ${msg} công việc: ${task.Task_ID}?`,
      type: isApproved ? 'success' : 'warning',
      confirmText: isApproved ? 'Duyệt' : 'Yêu cầu làm lại',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const { api } = await import('@/services/api');
          const payload = mapTaskToPayload(task, newStatus, isApproved ? undefined : '');
          const res = await api.updateTask(task.Task_ID, payload);
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
    });
  };

  const handleFormSubmit = async (payload: any) => {
    try {
      setIsLoading(true);
      const { api } = await import('@/services/api');
      let res;
      if (editingTask) {
        res = await api.updateTask(editingTask.Task_ID, payload);
      } else {
        res = await api.createTask(payload);
      }
      if (res.success) {
        setShowModal(false);
        setEditingTask(null);
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

  const viewTasks = tasks.filter(task => {
    let matchView = true;
    const isSpecialUser = permissions.isAdmin || permissions.isLanhDao || permissions.isVanThu;
    if (viewMode === 'MY_TASKS' || (!isSpecialUser)) {
      matchView = task.Lead_Assignee?.includes(user?.FullName || '') || 
                  task.Co_Assignee?.includes(user?.FullName || '');
    } else if (viewMode === 'ASSIGNED_BY_ME') {
      const createdByStr = task.Created_By || '';
      const assignerStr = task.Assigner || '';
      const myName = user?.FullName || '';
      matchView = createdByStr.toLowerCase().includes(myName.toLowerCase()) || 
                  assignerStr.toLowerCase().includes(myName.toLowerCase());
    }
    return matchView;
  });

  const filteredTasks = viewTasks.filter(task => {
    const matchSearch = task.Task_ID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        task.Content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'Tất cả trạng thái' 
                        || task.Status === statusFilter
                        || (statusFilter === 'Đang xử lý' && ['Mới tiếp nhận', 'Chờ tiếp nhận', 'Sắp hạn', 'Quá hạn', 'Xin gia hạn'].includes(task.Status));
    const matchPriority = priorityFilter === 'Tất cả mức độ' || task.Priority === priorityFilter;
    const matchAssignee = assigneeFilter === 'Tất cả cán bộ' || task.Lead_Assignee?.includes(assigneeFilter) || task.Co_Assignee?.includes(assigneeFilter);
    const matchDeadline = deadlineFilter === 'Tất cả' 
                          || (deadlineFilter === 'Sắp hạn' && task.Status === 'Sắp hạn')
                          || (deadlineFilter === 'Quá hạn' && task.Status === 'Quá hạn')
                          || (deadlineFilter === 'Trong hạn' && ['Mới tiếp nhận', 'Chờ tiếp nhận', 'Đang xử lý'].includes(task.Status));

    return matchSearch && matchStatus && matchPriority && matchAssignee && matchDeadline;
  });

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [showFilters, setShowFilters] = useState(false);

  // Helper tính ngày chờ duyệt
  const calculatePendingDays = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 0;
    const submitDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.max(0, Math.floor((today - submitDate) / 86400000));
  };

  const sortedTasks = useMemo(() => {
    let sortableTasks = [...filteredTasks];

    const priorityWeight: Record<string, number> = {
      'Hỏa tốc': 1,
      'Khẩn': 2,
      'Cao': 3,
      'Trung bình': 4,
      'Bình thường': 5,
      'Thấp': 6
    };

    if (sortConfig !== null) {
      sortableTasks.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'Priority') {
          const pA = priorityWeight[aValue || 'Bình thường'] || 99;
          const pB = priorityWeight[bValue || 'Bình thường'] || 99;
          if (pA < pB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (pA > pB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        if (sortConfig.key === 'Progress_Percentage') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {

      const parseDate = (dateStr?: string) => {
        if (!dateStr) return 8640000000000000;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
        }
        return 8640000000000000;
      };

      sortableTasks.sort((a, b) => {
        const isUrgentA = a.Status === 'Xin gia hạn' ? -1 : 0;
        const isUrgentB = b.Status === 'Xin gia hạn' ? -1 : 0;
        if (isUrgentA !== isUrgentB) return isUrgentA - isUrgentB;

        const isCompletedA = a.Status === 'Hoàn thành' || a.Status === 'Đã đóng' ? 1 : 0;
        const isCompletedB = b.Status === 'Hoàn thành' || b.Status === 'Đã đóng' ? 1 : 0;
        if (isCompletedA !== isCompletedB) return isCompletedA - isCompletedB;

        const pA = priorityWeight[a.Priority || 'Bình thường'] || 5;
        const pB = priorityWeight[b.Priority || 'Bình thường'] || 5;
        if (pA !== pB) return pA - pB;

        const dA = parseDate(a.Deadline);
        const dB = parseDate(b.Deadline);
        return dA - dB;
      });
    }
    return sortableTasks;
  }, [filteredTasks, sortConfig]);

  const paginatedTasks = sortedTasks.slice(0, displayLimit);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Metrics
  const processingCount = viewTasks.filter(t => ['Mới tiếp nhận', 'Chờ tiếp nhận', 'Đang xử lý', 'Sắp hạn', 'Quá hạn', 'Xin gia hạn'].includes(t.Status)).length;
  const extensionRequestCount = viewTasks.filter(t => t.Status === 'Xin gia hạn').length;
  const pendingApprovalCount = viewTasks.filter(t => t.Status === 'Chờ duyệt').length;
  const dueSoonCount = viewTasks.filter(t => t.Status === 'Sắp hạn').length;
  const overdueCount = viewTasks.filter(t => t.Status === 'Quá hạn').length;
  const completedCount = viewTasks.filter(t => t.Status === 'Hoàn thành').length;

  return (
    <div className="space-y-6">
      {/* Action Bar (Top Right) */}
      <div className="flex items-center justify-end mb-2">
        <div className="flex items-center gap-3">
          {permissions.isAdmin || permissions.isLanhDao || permissions.isVanThu ? (
            <div className="relative group">
              <select 
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="appearance-none pl-9 pr-8 py-2 bg-[#e6f4ea] text-primary border-none rounded-lg text-sm font-bold focus:ring-0 outline-none cursor-pointer hover:bg-primary/20 transition-colors"
              >
                <option value="ALL">Tất cả công việc</option>
                <option value="MY_TASKS">Việc tôi nhận</option>
                {(permissions.isLanhDao || permissions.isAdmin) && (
                  <option value="ASSIGNED_BY_ME">Việc tôi giao</option>
                )}
              </select>
              <User className="w-4 h-4 text-primary absolute left-3 top-2.5 pointer-events-none" />
              <svg className="w-4 h-4 text-primary absolute right-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          ) : null}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm border ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}`}
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
          {permissions.canAddTask && (
            <button 
              onClick={() => {
                setEditingTask(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Thêm công việc
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm theo mã việc, nội dung, VB liên quan..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Trạng thái công việc</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
            >
              <option value="Tất cả trạng thái">Tất cả trạng thái</option>
              {getCatalogOptions('Trạng thái công việc').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Mức độ ưu tiên</label>
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
            >
              <option value="Tất cả mức độ">Tất cả mức độ</option>
              {getCatalogOptions('Độ khẩn/Ưu tiên').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-primary mb-1">Cán bộ chủ trì</label>
            <select 
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
            >
              <option value="Tất cả cán bộ">Tất cả cán bộ</option>
              {staff.map(s => <option key={s.Staff_ID} value={s.Full_Name}>{s.Full_Name}</option>)}
            </select>
          </div>
        </div>
        <div className="w-1/4 pr-3">
          <label className="block text-xs font-bold text-primary mb-1">Tình trạng hạn</label>
          <select 
            value={deadlineFilter}
            onChange={(e) => setDeadlineFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none bg-white"
          >
            <option value="Tất cả">Tất cả</option>
            <option value="Sắp hạn">Sắp hạn</option>
            <option value="Quá hạn">Quá hạn</option>
            <option value="Trong hạn">Trong hạn</option>
          </select>
        </div>
      </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Đang xử lý" value={processingCount} icon={ClipboardList} type="default" onClick={() => setStatusFilter('Đang xử lý')} />
        <MetricCard title="Xin gia hạn" value={extensionRequestCount} icon={AlertCircle} type="purple" onClick={() => setStatusFilter('Xin gia hạn')} />
        <MetricCard title="Chờ duyệt" value={pendingApprovalCount} icon={CheckCircle2} type="warning" onClick={() => setStatusFilter('Chờ duyệt')} />
        <MetricCard title="Sắp hạn" value={dueSoonCount} icon={CalendarClock} type="warning" onClick={() => setStatusFilter('Sắp hạn')} />
        <MetricCard title="Quá hạn" value={overdueCount} icon={CalendarX} type="danger" onClick={() => setStatusFilter('Quá hạn')} />
        <MetricCard title="Hoàn thành" value={completedCount} icon={CheckCircle} type="success" onClick={() => setStatusFilter('Hoàn thành')} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Danh sách công việc</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Hiển thị:</span>
              <select 
                value={displayLimit} 
                onChange={(e) => setDisplayLimit(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-primary text-gray-700 bg-gray-50 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={999999}>Tất cả</option>
              </select>
            </div>
            <span className="text-sm font-medium text-gray-500 border-l pl-4 border-r pr-4">{filteredTasks.length} bản ghi</span>
            {permissions.canDelete && selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" /> Xóa {selectedIds.length} mục
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 border-b bg-white">
              <tr>
                <th className="px-2 py-3 font-medium w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    checked={paginatedTasks.length > 0 && selectedIds.length === paginatedTasks.length}
                    onChange={(e) => handleSelectAll(e, paginatedTasks)}
                  />
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Task_ID')}>
                  <div className="flex items-center gap-1">Mã việc <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Task_ID' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Priority')}>
                  <div className="flex items-center gap-1 text-center justify-center">Ưu Tiên <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Priority' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Content')}>
                  <div className="flex items-center gap-1">Nội dung chỉ đạo <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Content' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Category')}>
                  <div className="flex items-center gap-1">Lĩnh vực <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Category' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Source')}>
                  <div className="flex items-center gap-1">Nguồn việc <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Source' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Assigner')}>
                  <div className="flex items-center gap-1 whitespace-nowrap">Người giao việc <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Assigner' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Assign_Date')}>
                  <div className="flex items-center gap-1 whitespace-nowrap">Ngày giao <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Assign_Date' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Lead_Assignee')}>
                  <div className="flex items-center gap-1 whitespace-nowrap">Cán bộ chủ trì <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Lead_Assignee' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Deadline')}>
                  <div className="flex items-center gap-1 whitespace-nowrap">Hạn hoàn thành <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Deadline' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Actual_Complete_Date')}>
                  <div className="flex items-center justify-center gap-1 leading-tight">Ngày HT/<br/>Xin duyệt <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Actual_Complete_Date' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Progress_Percentage')}>
                  <div className="flex items-center gap-1 whitespace-nowrap">% HT <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Progress_Percentage' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium text-center cursor-pointer hover:bg-gray-50" onClick={() => requestSort('Status')}>
                  <div className="flex items-center justify-center gap-1 whitespace-nowrap">Trạng thái <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === 'Status' ? 'text-primary' : 'text-gray-400'}`} /></div>
                </th>
                <th className="px-2 py-3 font-medium text-center whitespace-nowrap">Cảnh báo</th>
                <th className="px-2 py-3 font-medium text-center whitespace-nowrap">File</th>
                <th className="px-2 py-3 font-medium text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedTasks.map((task, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-2 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      checked={selectedIds.includes(task.id || task.Task_ID)}
                      onChange={() => handleSelectRow(task.id || task.Task_ID)}
                    />
                  </td>
                  <td className="px-2 py-3 text-gray-500 whitespace-nowrap">{task.Task_ID}</td>
                  <td className="px-2 py-3 text-center">
                    {task.Priority && task.Priority !== 'Bình thường' ? (
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                        task.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                        task.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {task.Priority}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Bình thường</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-gray-900 max-w-[200px] line-clamp-2" title={task.Content}>{task.Content}</div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-gray-600 max-w-[150px] line-clamp-2" title={task.Category}>{task.Category}</div>
                  </td>
                  <td className="px-2 py-3 text-gray-600">
                    <div className="line-clamp-2">{task.Source}</div>
                  </td>
                  <td className="px-2 py-3">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium whitespace-nowrap">
                      {task.Assigner || 'Hệ thống'}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {task.Assign_Date}
                  </td>
                  <td className="px-2 py-3">
                    <div className="bg-[#e6f4ea] text-primary rounded-lg text-xs font-bold px-2 py-1 max-w-[150px] line-clamp-2" title={task.Lead_Assignee}>
                      {task.Lead_Assignee || 'Chưa phân công'}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-gray-600 whitespace-nowrap">{task.Deadline}</td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className={`text-[11px] font-bold whitespace-nowrap ${
                        task.Status === 'Chờ duyệt' ? 'text-amber-600' :
                        task.Status === 'Hoàn thành' ? 'text-emerald-600' : 'text-gray-400'
                      }`}>{task.Actual_Complete_Date || '-'}</span>
                      {getCompletionStatus(task.Actual_Complete_Date, task.Deadline)}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-teal-600" style={{ width: `${task.Progress_Percentage || 0}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{task.Progress_Percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        task.Status === 'Hoàn thành' ? 'bg-[#e6f4ea] text-primary' : 
                        task.Status === 'Quá hạn' ? 'bg-rose-50 text-rose-600' : 
                        task.Status === 'Xin gia hạn' ? 'bg-purple-100 text-purple-700 font-bold uppercase' :
                        task.Status === 'Chờ duyệt' ? 'bg-amber-100 text-amber-700 font-bold' :
                        task.Status === 'Đã phân công' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {task.Status}
                      </span>
                      {task.Status === 'Chờ duyệt' && task.Actual_Complete_Date && (
                        <span className="text-[10px] text-amber-600 mt-1 font-bold whitespace-nowrap">
                          {calculatePendingDays(task.Actual_Complete_Date) === 0 ? 'Mới trình' : `Đã trình ${calculatePendingDays(task.Actual_Complete_Date)} ngày`}
                        </span>
                      )}
                      {(() => {
                        const count = (task.History || '').split('[ĐỒNG Ý GIA HẠN]').length - 1;
                        if (count > 0) {
                          return (
                             <span className="text-[10px] text-amber-600 font-bold whitespace-nowrap bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200" title={`Hồ sơ này đã được gia hạn ${count} lần`}>
                               Gia hạn lần {task.Status === 'Xin gia hạn' ? count + 1 : count}
                             </span>
                          );
                        } else if (task.Status === 'Xin gia hạn') {
                          return (
                             <span className="text-[10px] text-amber-600 font-bold whitespace-nowrap bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200" title="Hồ sơ đang xin gia hạn lần đầu">
                               Gia hạn lần 1
                             </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {task.Status === 'Quá hạn' ? (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                    ) : task.Status === 'Xin gia hạn' ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold uppercase cursor-help" title={`Xin gia hạn đến: ${task['Ngày xin gia hạn'] || 'N/A'}\nLý do: ${task['Lý do gia hạn'] || 'Không có'}`}>CHỜ DUYỆT GIA HẠN</span>
                    ) : task.Status === 'Hoàn thành' ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">Đã xong</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      {task.File_URL && task.File_URL.split('\n').filter(Boolean).length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {task.File_URL.split('\n').filter(Boolean).map((url: string, i: number) => (
                            <a key={`assign-${i}`} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title={`Tải file giao việc ${i+1}`}>
                              <FileText className="w-4 h-4" />
                            </a>
                          ))}
                        </div>
                      )}
                      {task.Result_File_URL && task.Result_File_URL.split('\n').filter(Boolean).length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center mt-1 pt-1 border-t border-gray-100">
                          {task.Result_File_URL.split('\n').filter(Boolean).map((url: string, i: number) => (
                            <a key={`result-${i}`} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors" title={`Tải file kết quả báo cáo ${i+1}`}>
                              <FileCheck2 className="w-4 h-4" />
                            </a>
                          ))}
                        </div>
                      )}
                      {!task.File_URL && !task.Result_File_URL && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[11px] font-medium">Chưa có</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Xem chi tiết">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {permissions.canEditDoc && (
                          <button 
                            onClick={() => handleEdit(task)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" 
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {(user?.FullName === task.Lead_Assignee) && task.Status !== 'Hoàn thành' && task.Status !== 'Chờ duyệt' && (
                          <button onClick={() => handleRequestApproval(task)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors" title="Xin duyệt kết quả">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(permissions.isLanhDao || permissions.isAdmin) && task.Status === 'Chờ duyệt' && (
                          <>
                            <button onClick={() => handleApprove(task, true)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Duyệt & Đóng việc">
                              <FileCheck2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleApprove(task, false)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Yêu cầu làm lại">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {permissions.canDelete && (
                          <button 
                            onClick={() => handleDelete(task.Task_ID)}
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
              {filteredTasks.length === 0 && (
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

      <Modal 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }} 
        title={editingTask ? "Cập nhật công việc" : "Thêm công việc"}
      >
        <TaskForm 
          key={editingTask ? editingTask.Task_ID : 'new'}
          initialData={editingTask}
          onSubmit={handleFormSubmit}
          onDeleteDoc={editingTask ? async () => {
            const { api } = await import('@/services/api');
            const res = await api.deleteTask(editingTask.Task_ID);
            if (res.success) { await initialize(); } else { throw new Error(res.message); }
          } : undefined}
          onCancel={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
        />
      </Modal>

      <ConfirmModal 
        {...confirmDialog} 
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
