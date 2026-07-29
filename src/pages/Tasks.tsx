import React, { useState, useMemo } from 'react';
import { Eye, Edit, Trash2, CheckCircle, Search, PlusCircle, ClipboardList, CalendarClock, CalendarX, User, FileText, ArrowUpDown, Filter, ChevronRight, ChevronDown, Layers, UserCheck, Users } from 'lucide-react';
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
  const { tasks, incomingDocs, catalogs, staff, initialize, setIsLoading, user } = useAppStore();
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
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'LEAD' | 'COOP'>('ALL');
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});

  const toggleDocExpand = (docId: string) => {
    setExpandedDocIds(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  const toggleExpandAll = (expand: boolean, docs: any[]) => {
    const next: Record<string, boolean> = {};
    docs.forEach(d => { next[d.docId] = expand; });
    setExpandedDocIds(next);
  };

  
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
      const uName = user?.FullName || user?.['Họ tên cán bộ'] || user?.fullName || user?.Full_Name || user?.username || '';
      matchView = task.Lead_Assignee?.includes(uName) || task.Co_Assignee?.includes(uName);
    } else if (viewMode === 'ASSIGNED_BY_ME') {
      const createdByStr = task.Created_By || '';
      const assignerStr = task.Assigner || '';
      const myName = user?.FullName || user?.['Họ tên cán bộ'] || user?.fullName || user?.Full_Name || user?.username || '';
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

    
    const matchRole = roleFilter === 'ALL' ? true : (
      roleFilter === 'LEAD' ? task.Role === 'Chủ trì' : task.Role === 'Phối hợp'
    );
    return matchSearch && matchStatus && matchPriority && matchAssignee && matchDeadline && matchRole;

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

  
  const groupedDocs = useMemo(() => {
    if (viewMode !== 'ALL') return [];
    
    
    const docGroups: { [key: string]: any } = {};
    
    sortedTasks.forEach((t: any) => {
      const docId = t.Linked_Doc_ID || 'Khác';
      if (!docGroups[docId]) {
         const incomingDoc = incomingDocs.find((d: any) => d.Doc_ID === docId || d.id === docId);
         docGroups[docId] = {
           docId,
           tasks: [],
           signNumber: incomingDoc?.Sign_Number || '',
           summary: incomingDoc?.Summary || t.Content || '',
           fileUrl: incomingDoc?.File_URL || t.File_URL || '',
           leadAssignee: '',
           coopCount: 0,
           priority: 'Bình thường',
           category: t.Category || '',
           assigner: t.Assigner || '',
           deadline: '',
           totalProgress: 0,
           taskCount: 0,
           status: 'Đang xử lý'
         };
      }
      
      const group = docGroups[docId];
      group.tasks.push(t);
      group.taskCount += 1;
      group.totalProgress += Number(t.Progress_Percentage) || 0;
      
      if (t.Role === 'Chủ trì') {
          group.leadAssignee = t.Lead_Assignee;
          group.deadline = t.Deadline || group.deadline;
          if (!['Quá hạn', 'Sắp hạn'].includes(group.status)) {
              group.status = t.Status;
          }
      } else if (t.Role === 'Phối hợp') {
          group.coopCount += 1;
      }
      
      if (!group.deadline) group.deadline = t.Deadline; // fallback
      
      if (t.Status === 'Quá hạn') group.status = 'Quá hạn';
      else if (t.Status === 'Sắp hạn' && group.status !== 'Quá hạn') group.status = 'Sắp hạn';
      else if (t.Status === 'Xin gia hạn' && !['Quá hạn', 'Sắp hạn'].includes(group.status)) group.status = 'Xin gia hạn';
      
      const p = t.Priority || '';
      if (p.includes('Hỏa') || p.includes('Thượng')) group.priority = 'Hỏa tốc';
      else if (p.includes('khẩn') && group.priority !== 'Hỏa tốc') group.priority = 'Khẩn';
    });
    
    Object.values(docGroups).forEach((g: any) => {
        g.avgProgress = g.taskCount > 0 ? Math.round(g.totalProgress / g.taskCount) : 0;
        const allCompleted = g.taskCount > 0 && g.tasks.every((t: any) => t.Status === 'Hoàn thành' || t.Status === 'Đã đóng');
        if (allCompleted) g.status = 'Hoàn thành';
    });

    return Object.values(docGroups);
  }, [sortedTasks, incomingDocs, viewMode]);

  const paginatedDocs = viewMode === 'ALL'
    ? groupedDocs.slice(0, displayLimit)
    : [];

  const paginatedTasks = viewMode !== 'ALL'
    ? sortedTasks.slice(0, displayLimit)
    : [];


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
        
        {/* Bộ lọc Vai trò & Thao tác Gom nhóm */}
        <div className="p-3 bg-gray-50 border-b flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lọc vai trò:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  roleFilter === 'ALL' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả vai trò
              </button>
              <button
                onClick={() => setRoleFilter('LEAD')}
                className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                  roleFilter === 'LEAD' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Chỉ xem CHỦ TRÌ
              </button>
              <button
                onClick={() => setRoleFilter('COOP')}
                className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                  roleFilter === 'COOP' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Chỉ xem PHỐI HỢP
              </button>
            </div>
          </div>

          {viewMode === 'ALL' && paginatedDocs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleExpandAll(true, paginatedDocs)}
                className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" /> Mở rộng tất cả
              </button>
              <button
                onClick={() => toggleExpandAll(false, paginatedDocs)}
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5" /> Thu gọn tất cả
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'ALL' ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 border-b bg-gray-100/80">
                <tr>
                  <th className="px-4 py-3 font-medium w-12 text-center">STT</th>
                  <th className="px-4 py-3 font-medium">Văn bản / Cán bộ xử lý</th>
                  <th className="px-4 py-3 font-medium text-center">Ưu tiên</th>
                  <th className="px-4 py-3 font-medium">Lĩnh vực</th>
                  <th className="px-4 py-3 font-medium">Người giao</th>
                  <th className="px-4 py-3 font-medium text-center">Ngày HT/Xin duyệt</th>
                  <th className="px-4 py-3 font-medium text-center">% HT</th>
                  <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b border-gray-200">
                {paginatedDocs.map((doc: any, dIdx: number) => {
                  const isExpanded = !!expandedDocIds[doc.docId];
                  const leadName = doc.leadAssignee || doc.tasks.find((t: any) => t.Role === 'Chủ trì')?.Lead_Assignee || 'Chưa phân';
                  const coopCount = doc.coopCount || doc.tasks.filter((t: any) => t.Role === 'Phối hợp').length;

                  return (
                    <React.Fragment key={dIdx}>
                      {/* Parent Group Header Row */}
                      <tr 
                        onClick={() => toggleDocExpand(doc.docId)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'bg-white hover:bg-blue-50/30'
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-center text-blue-800">
                          <div className="flex items-center justify-center gap-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <span>{dIdx + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[300px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-blue-900 text-sm">
                                {doc.signNumber ? `Văn bản số: ${doc.signNumber}` : 'Nhóm công việc độc lập'}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-full whitespace-nowrap">
                                {doc.taskCount} việc
                              </span>
                            </div>
                            <span className="text-gray-600 text-xs italic line-clamp-2" title={doc.summary}>{doc.summary || 'Không có trích yếu'}</span>
                            <div className="flex items-center gap-2 text-[11px] mt-1">
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-700 font-semibold rounded border border-red-100 whitespace-nowrap line-clamp-1">
                                Chủ trì: {leadName}
                              </span>
                              {coopCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 font-semibold rounded border border-gray-200 whitespace-nowrap">
                                  Phối hợp: {coopCount} người
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {doc.priority && doc.priority !== 'Bình thường' ? (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                              doc.priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                              doc.priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {doc.priority}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Bình thường</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{doc.category}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{doc.assigner || 'Hệ thống'}</td>
                        <td className="px-4 py-3 text-center text-xs font-medium text-gray-900">{doc.deadline || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="w-16 mx-auto bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${doc.avgProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                              style={{ width: `${doc.avgProgress || 0}%` }}
                            ></div>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium mt-1">{doc.avgProgress || 0}%</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                            {doc.status === 'Sắp hạn' ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">SẮP HẠN</span>
                            ) : doc.status === 'Quá hạn' ? (
                              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                            ) : doc.status === 'Hoàn thành' ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">ĐÃ XONG</span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase">{doc.status || 'Đang xử lý'}</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2 items-center justify-center">
                             {doc.fileUrl ? (
                               <a 
                                 href={doc.fileUrl} 
                                 target="_blank" 
                                 rel="noreferrer" 
                                 className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition-colors w-full justify-center border border-blue-200"
                                 title="Xem File Văn bản gốc"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <FileText className="w-3.5 h-3.5" /> File VB
                               </a>
                             ) : (
                               <span className="px-2.5 py-1 bg-gray-50 text-gray-400 rounded text-[10px] w-full text-center border border-gray-100">Không File</span>
                             )}
                             <button className="text-[11px] font-bold text-gray-500 hover:text-blue-600 w-full text-center">
                               {isExpanded ? 'Thu gọn ▲' : 'Chi tiết ▼'}
                             </button>
                          </div>
                        </td>
                      </tr>

                      {/* Child Task Rows (Visible only when Expanded) */}
                      {isExpanded && doc.tasks.map((task: any, idx: number) => (
                        <tr key={`child-${idx}`} className="bg-gray-50/60 hover:bg-gray-100/80 border-t border-gray-100">
                          <td className="px-4 py-2.5 text-center text-xs text-gray-400 font-mono">└─</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 pl-4">
                              {task.Role === 'Chủ trì' ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold whitespace-nowrap shadow-xs">CHỦ TRÌ</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold whitespace-nowrap shadow-xs">PHỐI HỢP</span>
                              )}
                              <span className="font-semibold text-gray-900 text-xs">{task.Lead_Assignee}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {task.Priority && task.Priority !== 'Bình thường' ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                                task.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                                task.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {task.Priority}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">Bình thường</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{task.Category}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{task.Assigner || 'Hệ thống'}</td>
                          <td className="px-4 py-2.5 text-center text-xs">
                            {task.Actual_Complete_Date || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="w-16 mx-auto bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full ${Number(task.Progress_Percentage) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${task.Progress_Percentage || 0}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium mt-0.5">{task.Progress_Percentage || 0}%</div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {task.Status === 'Sắp hạn' ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">SẮP HẠN</span>
                            ) : task.Status === 'Quá hạn' ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                            ) : task.Status === 'Hoàn thành' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">ĐÃ XONG</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase">{task.Status || 'Đang xử lý'}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                             <div className="flex items-center justify-center gap-1.5">
                               <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Xem"><Eye className="w-3.5 h-3.5" /></button>
                               {permissions.canEditDoc && <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-amber-600 transition-colors" title="Sửa"><Edit className="w-3.5 h-3.5" /></button>}
                               {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {paginatedDocs.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Không có công việc nào phù hợp với bộ lọc.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium w-10 text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-primary w-4 h-4" onChange={(e) => handleSelectAll(e, paginatedTasks)} checked={paginatedTasks.length > 0 && selectedIds.length === paginatedTasks.length} />
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => requestSort('Priority')}>Ưu tiên</th>
                  <th className="px-4 py-3 font-medium min-w-[250px]" onClick={() => requestSort('Linked_Doc_ID')}>Văn bản liên quan / Nội dung chỉ đạo</th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => requestSort('Lead_Assignee')}>Vai trò</th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => requestSort('Assigner')}>Người giao</th>
                  <th className="px-4 py-3 font-medium cursor-pointer text-center" onClick={() => requestSort('Deadline')}>Hạn xử lý</th>
                  <th className="px-4 py-3 font-medium cursor-pointer text-center" onClick={() => requestSort('Progress_Percentage')}>% HT</th>
                  <th className="px-4 py-3 font-medium cursor-pointer text-center" onClick={() => requestSort('Status')}>Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b border-gray-200">
                {paginatedTasks.map((task: any, idx: number) => {
                   const incomingDoc = incomingDocs.find((d: any) => d.Doc_ID === task.Linked_Doc_ID || d.id === task.Linked_Doc_ID);
                   const signNumber = incomingDoc?.Sign_Number || '';
                   const summary = incomingDoc?.Summary || task.Content || '';
                   
                   return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" className="rounded border-gray-300 text-primary w-4 h-4" checked={selectedIds.includes(task.id || task.Task_ID)} onChange={() => handleSelectRow(task.id || task.Task_ID)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {task.Priority && task.Priority !== 'Bình thường' ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                          task.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                          task.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {task.Priority}
                        </span>
                      ) : <span className="text-gray-400 text-[10px]">Bình thường</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-xs mb-1">{signNumber ? `Số ${signNumber}` : 'Việc chung'}</span>
                        <span className="text-gray-600 text-xs line-clamp-2" title={summary}>{summary}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {task.Role === 'Chủ trì' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold whitespace-nowrap">CHỦ TRÌ</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold whitespace-nowrap">PHỐI HỢP</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{task.Assigner || 'Hệ thống'}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-gray-900">
                      {task.Deadline || 'Không hạn'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="w-16 mx-auto bg-gray-200 rounded-full h-2 mt-1">
                        <div className={`h-2 rounded-full ${Number(task.Progress_Percentage) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${task.Progress_Percentage || 0}%` }}></div>
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium mt-1">{task.Progress_Percentage || 0}%</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {task.Status === 'Sắp hạn' ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">SẮP HẠN</span>
                      ) : task.Status === 'Quá hạn' ? (
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                      ) : task.Status === 'Hoàn thành' ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">ĐÃ XONG</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase">{task.Status || 'Đang xử lý'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                       <div className="flex items-center justify-center gap-2">
                         <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                         {(user?.FullName === task.Lead_Assignee) && task.Status !== 'Hoàn thành' && (
                           <button onClick={() => handleRequestApproval(task)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                         )}
                         {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                       </div>
                    </td>
                  </tr>
                )})}
                {paginatedTasks.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Không có bản ghi nào.</td></tr>}
              </tbody>
            </table>
          )}

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
