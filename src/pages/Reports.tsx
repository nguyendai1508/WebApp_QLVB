import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Download, Eye, FileText, CheckCircle, Search, Filter, AlertCircle, Inbox, Loader2, Users, FileCheck2 } from 'lucide-react';
import { IncomingDocForm } from '@/components/IncomingDocForm';
import { TaskForm } from '@/components/TaskForm';
import { OutgoingDocForm } from '@/components/OutgoingDocForm';
import { Modal } from '@/components/Modal';

export function Reports() {
  const { incomingDocs, outgoingDocs, tasks, user } = useAppStore();
  const permissions = usePermissions();

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [docType, setDocType] = useState('incoming'); // incoming, outgoing, tasks
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, processing, completed, overdue

  const [viewItem, setViewItem] = useState<{type: string, data: any} | null>(null);

  // Parse Date helper (DD/MM/YYYY to Timestamp)
  const parseDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    }
    return 0;
  };

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

  // 1. Phân quyền dữ liệu (Role-based Filtering)
  const filteredIncomingByRole = useMemo(() => {
    if (permissions.isChuyenVien && !permissions.isAdmin && !permissions.isLanhDao && !permissions.isVanThu) {
      return incomingDocs.filter(d => d.Lead_Assignee === user?.FullName || d.Co_Assignee === user?.FullName);
    }
    return incomingDocs;
  }, [incomingDocs, permissions, user]);

  const filteredTasksByRole = useMemo(() => {
    if (permissions.isChuyenVien && !permissions.isAdmin && !permissions.isLanhDao && !permissions.isVanThu) {
      return tasks.filter(t => t.Lead_Assignee === user?.FullName || t.Co_Assignee === user?.FullName || t.Assigner === user?.FullName);
    }
    return tasks;
  }, [tasks, permissions, user]);

  const filteredOutgoingByRole = useMemo(() => {
    if (permissions.isChuyenVien && !permissions.isAdmin && !permissions.isLanhDao && !permissions.isVanThu) {
      return outgoingDocs.filter(d => d.Drafter === user?.FullName || d.Co_Drafter === user?.FullName);
    }
    return outgoingDocs;
  }, [outgoingDocs, permissions, user]);

  // 2. Lọc theo thời gian (Time Filtering)
  const filterByTime = (data: any[], dateKey: string) => {
    if (!dateRange.start && !dateRange.end) return data;
    
    const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
    const end = dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Infinity; // Include the end day
    
    return data.filter(item => {
      const itemTime = parseDate(item[dateKey]);
      if (itemTime === 0) return true; // Giữ lại hồ sơ chưa có ngày
      return itemTime >= start && itemTime < end;
    });
  };

  const incomingTimeFiltered = useMemo(() => filterByTime(filteredIncomingByRole, 'Receive_Date'), [filteredIncomingByRole, dateRange]);
  const tasksTimeFiltered = useMemo(() => filterByTime(filteredTasksByRole, 'Assign_Date'), [filteredTasksByRole, dateRange]);
  const outgoingTimeFiltered = useMemo(() => filterByTime(filteredOutgoingByRole, 'Draft_Date'), [filteredOutgoingByRole, dateRange]);

  // 3. Chọn tập dữ liệu hiện tại (Current Dataset)
  let currentDataset: any[] = [];
  if (docType === 'incoming') currentDataset = incomingTimeFiltered;
  if (docType === 'tasks') currentDataset = tasksTimeFiltered;
  if (docType === 'outgoing') currentDataset = outgoingTimeFiltered;

  // 4. Tính toán Chỉ số Thẻ KPI
  const kpiData = useMemo(() => {
    const total = currentDataset.length;
    let completed = 0;
    let overdue = 0;
    let processing = 0;

    if (docType === 'incoming') {
      completed = currentDataset.filter(d => d.Status === 'Hoàn thành').length;
      overdue = currentDataset.filter(d => d.Status === 'Quá hạn').length;
      processing = total - completed - overdue;
    } else if (docType === 'tasks') {
      completed = currentDataset.filter(d => d.Status === 'Hoàn thành').length;
      overdue = currentDataset.filter(d => d.Status === 'Quá hạn').length;
      processing = currentDataset.filter(d => d.Status === 'Đang xử lý' || d.Status === 'Mới tiếp nhận').length;
    } else if (docType === 'outgoing') {
      completed = currentDataset.filter(d => d.Status === 'Đã phát hành' || d.Status === 'Đã gửi').length;
      processing = currentDataset.filter(d => d.Status === 'Dự thảo' || d.Status === 'Trình ký').length;
      overdue = 0; // Văn bản đi ít có khái niệm quá hạn (trừ Hạn phát hành)
    }

    return { total, processing, completed, overdue };
  }, [currentDataset, docType]);

  // 5. Lọc cuối cùng (Click KPI Card)
  const finalDataset = useMemo(() => {
    if (selectedStatus === 'all') return currentDataset;
    if (docType === 'incoming') {
       if (selectedStatus === 'completed') return currentDataset.filter(d => d.Status === 'Hoàn thành');
       if (selectedStatus === 'overdue') return currentDataset.filter(d => d.Status === 'Quá hạn');
       if (selectedStatus === 'processing') return currentDataset.filter(d => d.Status !== 'Hoàn thành' && d.Status !== 'Quá hạn');
    }
    if (docType === 'tasks') {
       if (selectedStatus === 'completed') return currentDataset.filter(d => d.Status === 'Hoàn thành');
       if (selectedStatus === 'overdue') return currentDataset.filter(d => d.Status === 'Quá hạn');
       if (selectedStatus === 'processing') return currentDataset.filter(d => d.Status === 'Đang xử lý' || d.Status === 'Mới tiếp nhận');
    }
    if (docType === 'outgoing') {
       if (selectedStatus === 'completed') return currentDataset.filter(d => d.Status === 'Đã phát hành' || d.Status === 'Đã gửi');
       if (selectedStatus === 'processing') return currentDataset.filter(d => d.Status === 'Dự thảo' || d.Status === 'Trình ký');
       if (selectedStatus === 'overdue') return [];
    }
    return currentDataset;
  }, [currentDataset, selectedStatus, docType]);

  // 6. Thống kê theo nhân sự (Dành cho Lãnh đạo)
  const staffStats = useMemo(() => {
    if (!permissions.isLanhDao && !permissions.isAdmin && !permissions.isVanThu) return [];
    
    const stats: Record<string, any> = {};
    
    currentDataset.forEach(item => {
      let assignee = '';
      if (docType === 'incoming' || docType === 'tasks') {
        assignee = item.Lead_Assignee || 'Chưa phân công';
      } else {
        assignee = item.Drafter || 'Chưa phân công';
      }
      
      if (!stats[assignee]) {
        stats[assignee] = { name: assignee, total: 0, completed: 0, overdue: 0, processing: 0 };
      }
      
      stats[assignee].total += 1;
      
      const status = item.Status;
      if (status === 'Hoàn thành' || status === 'Đã phát hành' || status === 'Đã gửi') {
        stats[assignee].completed += 1;
      } else if (status === 'Quá hạn') {
        stats[assignee].overdue += 1;
      } else {
        stats[assignee].processing += 1;
      }
    });
    
    return Object.values(stats).sort((a: any, b: any) => b.total - a.total);
  }, [currentDataset, docType, permissions]);

  // Hàm xuất Excel (CSV)
  const exportToCSV = () => {
    if (finalDataset.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }
    const headers = Object.keys(finalDataset[0]).filter(k => k !== 'files' && k !== 'resultFiles' && k !== 'History');
    const csvContent = [
      headers.join(','),
      ...finalDataset.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_${docType}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Trung tâm Thống kê & Báo cáo
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {permissions.isChuyenVien && !permissions.isAdmin && !permissions.isLanhDao 
              ? "Báo cáo cá nhân (Dữ liệu đã được lọc theo hồ sơ bạn tham gia xử lý)" 
              : "Báo cáo Toàn cơ quan"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Doc Type Filter */}
          <select 
            value={docType} 
            onChange={(e) => { setDocType(e.target.value); setSelectedStatus('all'); }}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-gray-700"
          >
            <option value="incoming">Văn bản đến</option>
            <option value="outgoing">Văn bản đi</option>
            <option value="tasks">Công việc</option>
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <span className="text-sm text-gray-500">Từ</span>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="bg-transparent border-none outline-none text-sm font-medium text-gray-700"
            />
            <span className="text-sm text-gray-500 border-l pl-2">Đến</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="bg-transparent border-none outline-none text-sm font-medium text-gray-700"
            />
          </div>

          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#e6f4ea] text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Tổng nhận" 
          value={kpiData.total} 
          icon={Inbox} 
          color="bg-blue-50 text-blue-600" 
          active={selectedStatus === 'all'}
          onClick={() => setSelectedStatus('all')}
        />
        <MetricCard 
          title="Đang xử lý" 
          value={kpiData.processing} 
          icon={Loader2} 
          color="bg-amber-50 text-amber-600" 
          active={selectedStatus === 'processing'}
          onClick={() => setSelectedStatus('processing')}
        />
        <MetricCard 
          title="Hoàn thành" 
          value={kpiData.completed} 
          icon={CheckCircle} 
          color="bg-emerald-50 text-emerald-600" 
          active={selectedStatus === 'completed'}
          onClick={() => setSelectedStatus('completed')}
        />
        <MetricCard 
          title="Quá hạn" 
          value={kpiData.overdue} 
          icon={AlertCircle} 
          color="bg-rose-50 text-rose-600" 
          active={selectedStatus === 'overdue'}
          onClick={() => setSelectedStatus('overdue')}
        />
      </div>


      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Danh sách chi tiết ({finalDataset.length} hồ sơ)
          </h3>
          <span className="text-sm font-medium px-3 py-1 bg-white rounded-full border shadow-sm text-gray-600">
            {selectedStatus === 'all' ? 'Tất cả' : 
             selectedStatus === 'processing' ? 'Đang xử lý' : 
             selectedStatus === 'completed' ? 'Đã hoàn thành' : 'Quá hạn'}
          </span>
        </div>
        
        <div className="overflow-auto flex-1 p-0">
          <table className="w-full text-sm text-left">
            {docType === 'tasks' ? (
              <>
                <thead className="text-xs text-gray-500 bg-white border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-3 font-bold">Mã việc</th>
                    <th className="px-2 py-3 font-bold text-center">Ưu Tiên</th>
                    <th className="px-2 py-3 font-bold">Nội dung chỉ đạo</th>
                    <th className="px-2 py-3 font-bold">Lĩnh vực</th>
                    <th className="px-2 py-3 font-bold">Nguồn việc</th>
                    <th className="px-2 py-3 font-bold whitespace-nowrap">Người giao việc</th>
                    <th className="px-2 py-3 font-bold whitespace-nowrap">Ngày giao</th>
                    <th className="px-2 py-3 font-bold whitespace-nowrap">Cán bộ chủ trì</th>
                    <th className="px-2 py-3 font-bold whitespace-nowrap">Hạn hoàn thành</th>
                    <th className="px-2 py-3 font-bold whitespace-nowrap">% HT</th>
                    <th className="px-2 py-3 font-bold text-center whitespace-nowrap">Trạng thái</th>
                    <th className="px-2 py-3 font-bold text-center whitespace-nowrap">Cảnh báo</th>
                    <th className="px-2 py-3 font-bold text-center whitespace-nowrap">File</th>
                    <th className="px-2 py-3 font-bold text-center whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  {finalDataset.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-3 text-gray-500 whitespace-nowrap">{item.Task_ID}</td>
                      <td className="px-2 py-3 text-center">
                        {item.Priority && item.Priority !== 'Bình thường' ? (
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                            item.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                            item.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {item.Priority}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Bình thường</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-gray-900 max-w-[200px] line-clamp-2" title={item.Content}>{item.Content}</div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-gray-600 max-w-[150px] line-clamp-2" title={item.Category}>{item.Category}</div>
                      </td>
                      <td className="px-2 py-3 text-gray-600">
                        <div className="line-clamp-2">{item.Source}</div>
                      </td>
                      <td className="px-2 py-3">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium whitespace-nowrap">
                          {item.Assigner || 'Hệ thống'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {item.Assign_Date}
                      </td>
                      <td className="px-2 py-3">
                        <span className="px-2.5 py-1 bg-[#e6f4ea] text-primary rounded-lg text-xs font-bold whitespace-nowrap">
                          {item.Lead_Assignee || 'Chưa phân công'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-600 whitespace-nowrap">{item.Deadline}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                            <div className="h-full bg-teal-600" style={{ width: `${item.Progress_Percentage || 0}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600">{item.Progress_Percentage || 0}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            item.Status === 'Hoàn thành' ? 'bg-[#e6f4ea] text-primary' : 
                            item.Status === 'Quá hạn' ? 'bg-rose-50 text-rose-600' : 
                            item.Status === 'Chờ duyệt' ? 'bg-amber-100 text-amber-700 font-bold' :
                            item.Status === 'Đã phân công' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {item.Status}
                          </span>
                          {item.Status === 'Chờ duyệt' && item.Actual_Complete_Date && (
                            <span className="text-[10px] text-amber-600 mt-1 font-bold whitespace-nowrap">
                              {calculatePendingDays(item.Actual_Complete_Date) === 0 ? 'Mới trình' : `Đã trình ${calculatePendingDays(item.Actual_Complete_Date)} ngày`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {item.Status === 'Quá hạn' ? (
                          <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                        ) : item.Status === 'Hoàn thành' ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">Đã xong</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          {item.File_URL && item.File_URL.split('\n').filter(Boolean).length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {item.File_URL.split('\n').filter(Boolean).map((url: string, i: number) => (
                                <a key={`assign-${i}`} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title={`Tải file giao việc ${i+1}`}>
                                  <FileText className="w-4 h-4" />
                                </a>
                              ))}
                            </div>
                          )}
                          {item.Result_File_URL && item.Result_File_URL.split('\n').filter(Boolean).length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center mt-1 pt-1 border-t border-gray-100">
                              {item.Result_File_URL.split('\n').filter(Boolean).map((url: string, i: number) => (
                                <a key={`result-${i}`} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors" title={`Tải file kết quả báo cáo ${i+1}`}>
                                  <FileCheck2 className="w-4 h-4" />
                                </a>
                              ))}
                            </div>
                          )}
                          {!item.File_URL && !item.Result_File_URL && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[11px] font-medium">Chưa có</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button 
                          onClick={() => setViewItem({ type: docType, data: item })}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {finalDataset.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>Không có công việc nào khớp với bộ lọc.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead className="text-xs text-gray-500 uppercase bg-white border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-bold">Mã / Số KH</th>
                    <th className="px-6 py-4 font-bold">Trích yếu / Nội dung</th>
                    <th className="px-6 py-4 font-bold">{docType === 'incoming' ? 'Ngày đến' : 'Ngày soạn'}</th>
                    <th className="px-6 py-4 font-bold">Người giao việc</th>
                    <th className="px-6 py-4 font-bold">Thời gian giao</th>
                    <th className="px-6 py-4 font-bold">Cán bộ chủ trì</th>
                    <th className="px-6 py-4 font-bold">Hạn xử lý</th>
                    <th className="px-6 py-4 font-bold">Trạng thái</th>
                    <th className="px-6 py-4 font-bold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  {finalDataset.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {item.Doc_ID || item.Task_ID}
                        <div className="text-xs font-normal text-gray-500 mt-1">{item.Sign_Number || item.Linked_Doc_ID}</div>
                      </td>
                      <td className="px-6 py-4 min-w-[300px]">
                        <div className="line-clamp-2">{item.Summary || item.Content}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.Receive_Date || item.Draft_Date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.Assigner || <span className="text-gray-400 italic">Chưa giao</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.Assign_Date || <span className="text-gray-400 italic">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.Lead_Assignee ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs">{item.Lead_Assignee}</span>
                        ) : <span className="text-gray-400 italic">Chưa phân công</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-500 font-medium">
                        {item.Deadline || <span className="text-gray-400 italic font-normal">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          item.Status === 'Hoàn thành' || item.Status === 'Đã phát hành' || item.Status === 'Đã gửi'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                            : item.Status === 'Quá hạn'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {item.Status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setViewItem({ type: docType, data: item })}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {finalDataset.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>Không có hồ sơ nào khớp với bộ lọc.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>


      {/* Biểu đồ nhân sự (Dành cho Lãnh đạo) */}
      {(permissions.isLanhDao || permissions.isAdmin || permissions.isVanThu) && staffStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-gray-900">Tổng quan hồ sơ giao cho từng nhân viên</h3>
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Hoàn tất</div>
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> Đang xử lý</div>
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-[#f43f5e]"></span> Quá hạn</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {staffStats.map((staff: any, idx: number) => (
              <div key={idx} className="flex flex-col items-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-20 h-20 mb-3 relative">
                  <DoughnutChart 
                    total={staff.total} 
                    completed={staff.completed} 
                    processing={staff.processing} 
                    overdue={staff.overdue} 
                  />
                </div>
                <p className="text-sm font-bold text-gray-900 text-center line-clamp-1" title={staff.name}>{staff.name}</p>
                <div className="w-full mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-medium"><span className="text-emerald-600">Hoàn tất:</span> <span>{staff.completed}</span></div>
                  <div className="flex justify-between text-[10px] font-medium"><span className="text-amber-600">Đang xử lý:</span> <span>{staff.processing}</span></div>
                  <div className="flex justify-between text-[10px] font-medium"><span className="text-rose-600">Quá hạn:</span> <span>{staff.overdue}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render Modals */}
      {viewItem && viewItem.type === 'incoming' && (
        <IncomingDocForm 
          initialData={viewItem.data}
          isReadOnly={true}
          onClose={() => setViewItem(null)}
          onSubmit={async () => { setViewItem(null); alert('Để lưu báo cáo, vui lòng thực hiện bên màn hình Quản lý tương ứng.'); }}
        />
      )}
      {viewItem && viewItem.type === 'outgoing' && (
        <OutgoingDocForm 
          initialData={viewItem.data}
          isReadOnly={true}
          onClose={() => setViewItem(null)}
          onSubmit={async () => { setViewItem(null); alert('Để lưu báo cáo, vui lòng thực hiện bên màn hình Quản lý tương ứng.'); }}
        />
      )}
      {viewItem && viewItem.type === 'tasks' && (
        <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Chi tiết công việc">
          <TaskForm 
            initialData={viewItem.data}
            isReadOnly={true}
            onCancel={() => setViewItem(null)}
            onSubmit={async () => { setViewItem(null); alert('Để lưu báo cáo, vui lòng thực hiện bên màn hình Quản lý tương ứng.'); }}
          />
        </Modal>
      )}
    </div>
  );
}

// Sub-component for KPI Cards
function MetricCard({ title, value, icon: Icon, color, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl shadow-sm border cursor-pointer transition-all duration-300 ${
        active ? 'ring-2 ring-primary border-primary shadow-md transform -translate-y-1' : 'hover:border-primary/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-500">{title}</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Sub-component for Doughnut Chart (SVG)
function DoughnutChart({ processing, completed, overdue, total }: any) {
  if (total === 0) return null;
  
  const radius = 15.9155; // 100 / (2 * PI) -> circumference = 100
  const circumference = 100;
  
  const pctCompleted = (completed / total) * 100;
  const pctOverdue = (overdue / total) * 100;
  const pctProcessing = (processing / total) * 100;

  // Offset logic
  let currentOffset = 25; 
  
  const completedOffset = currentOffset;
  currentOffset -= pctCompleted;
  
  const overdueOffset = currentOffset;
  currentOffset -= pctOverdue;
  
  const processingOffset = currentOffset;

  return (
    <svg width="100%" height="100%" viewBox="0 0 42 42" className="transform -rotate-90 overflow-visible">
      <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
      
      {pctCompleted > 0 && (
        <circle cx="21" cy="21" r={radius} fill="transparent" 
          stroke="#10b981" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${pctCompleted} ${circumference - pctCompleted}`} 
          strokeDashoffset={completedOffset} />
      )}
      
      {pctOverdue > 0 && (
        <circle cx="21" cy="21" r={radius} fill="transparent" 
          stroke="#f43f5e" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${pctOverdue} ${circumference - pctOverdue}`} 
          strokeDashoffset={overdueOffset} />
      )}
      
      {pctProcessing > 0 && (
        <circle cx="21" cy="21" r={radius} fill="transparent" 
          stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${pctProcessing} ${circumference - pctProcessing}`} 
          strokeDashoffset={processingOffset} />
      )}
      <g className="chart-text transform rotate-90" transform-origin="21 21">
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="8" fontWeight="900" fill="#0f172a">{total}</text>
      </g>
    </svg>
  );
}
