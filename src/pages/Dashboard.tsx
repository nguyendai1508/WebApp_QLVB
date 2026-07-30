import React, { useState, useMemo } from 'react';
import { 
  Mail, Send, ClipboardList, Hourglass, AlertTriangle, 
  PenTool, Clock, CalendarDays, CalendarX, Users,
  RefreshCw, ListPlus, FilePlus, CheckCircle, UserPlus,
  Inbox, FileCheck2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { IncomingDocForm } from '@/components/IncomingDocForm';
import { OutgoingDocForm } from '@/components/OutgoingDocForm';
import { TaskForm } from '@/components/TaskForm';
import { StaffForm } from '@/components/StaffForm';
import { Modal } from '@/components/Modal';
import { usePermissions } from '@/hooks/usePermissions';

const MetricCard = ({ title, value, icon: Icon }: any) => (
  <div className="bg-white rounded-xl p-5 border shadow-sm flex items-center gap-4">
    <div className="p-3 bg-[#e6f4ea] text-primary rounded-xl flex-shrink-0">
      <Icon className="w-6 h-6" strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium mb-1 line-clamp-1" title={title}>{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 leading-none">{value}</h3>
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon: Icon, onClick }: any) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col items-start gap-4"
  >
    <div className="p-2.5 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-[#e6f4ea] group-hover:text-primary transition-colors">
      <Icon className="w-5 h-5" strokeWidth={1.5} />
    </div>
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export function Dashboard() {
  const navigate = useNavigate();
  const { incomingDocs, outgoingDocs, tasks, staff, initialize, setIsLoading, user } = useAppStore();
  const permissions = usePermissions();

  const [showIncoming, setShowIncoming] = useState(false);
  const [showOutgoing, setShowOutgoing] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showStaff, setShowStaff] = useState(false);

  const [taskLimit, setTaskLimit] = useState(10);
  const [docLimit, setDocLimit] = useState(10);
  const [viewTask, setViewTask] = useState<any>(null);
  const [viewDoc, setViewDoc] = useState<any>(null);

  const [matrixModal, setMatrixModal] = useState<{
    isOpen: boolean;
    title: string;
    tasks: any[];
  }>({ isOpen: false, title: '', tasks: [] });

  // Metrics
  const totalIncoming = incomingDocs.length;
  const totalOutgoing = outgoingDocs.length;
  const totalTasks = tasks.length;
  const pendingDocs = incomingDocs.filter(d => d.Status === 'Chờ xử lý').length;
  const lateDocs = incomingDocs.filter(d => d.Status === 'Quá hạn').length;
  
  const pendingOutgoing = outgoingDocs.filter(d => d.Status === 'Dự thảo' || d.Status === 'Chờ ký duyệt').length;
  const inProgressTasks = tasks.filter(t => t.Status === 'Đang xử lý' || t.Status === 'Xin gia hạn').length;
  const dueSoonTasks = tasks.filter(t => t.Status === 'Sắp đến hạn' || t.Status === 'Sắp hạn').length;
  const lateTasks = tasks.filter(t => t.Status === 'Quá hạn').length;
  const pendingApprovalCount = tasks.filter(t => t.Status === 'Chờ duyệt' && t.Assigner === user?.FullName).length;
  const totalStaff = staff.length;

  // Sort tasks by deadline (ascending, nearest first)
  const sortedTasksForDashboard = useMemo(() => {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return 8640000000000000;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      }
      return 8640000000000000;
    };
    return [...tasks].sort((a, b) => parseDate(a.Deadline) - parseDate(b.Deadline));
  }, [tasks]);

  // Sort incoming docs by receive date (descending, newest first)
  const sortedIncomingForDashboard = useMemo(() => {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return 0;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      }
      return 0;
    };
    return [...incomingDocs].sort((a, b) => parseDate(b.Receive_Date || b.Draft_Date) - parseDate(a.Receive_Date || a.Draft_Date));
  }, [incomingDocs]);

  // Executive Feature 1: Workload & Heatmap Data by Staff
  const staffWorkload = useMemo(() => {
    if (!staff || staff.length === 0) return [];
    
    return staff.map((s: any) => {
      const name = s.Full_Name || s.fullName || s['Họ tên cán bộ'] || 'Cán bộ';
      const leadTasks = tasks.filter((t: any) => t.Role ? (t.Lead_Assignee === name && t.Role === 'Chủ trì') : (t.Lead_Assignee === name));
      const coopTasks = tasks.filter((t: any) => {
        if (t.Role) {
          return t.Lead_Assignee === name && t.Role === 'Phối hợp';
        }
        const coAssignees = (t.Co_Assignee || '').split(',').map((str: string) => str.trim());
        return coAssignees.includes(name);
      });
      
      const allTasks = [...leadTasks, ...coopTasks];
      
      const inProgressTasks = allTasks.filter((t: any) => ['Đang xử lý', 'Sắp hạn', 'Mới tiếp nhận', 'Chờ tiếp nhận', 'Xin gia hạn'].includes(t.Status));
      const overdueTasks = allTasks.filter((t: any) => t.Status === 'Quá hạn');
      const pendingApprovalTasks = allTasks.filter((t: any) => t.Status === 'Chờ duyệt');
      const completedTasks = allTasks.filter((t: any) => t.Status === 'Hoàn thành');
      const rate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

      return {
        name,
        dept: s.Department || s['Phòng ban'] || 'Phòng chuyên môn',
        leadTasks,
        coopTasks,
        inProgressTasks,
        overdueTasks,
        pendingApprovalTasks,
        completedTasks,
        allTasks,
        leadCount: leadTasks.length,
        coopCount: coopTasks.length,
        inProgress: inProgressTasks.length,
        overdue: overdueTasks.length,
        pendingApproval: pendingApprovalTasks.length,
        completed: completedTasks.length,
        total: allTasks.length,
        rate
      };
    }).sort((a: any, b: any) => (b.overdue * 10 + b.inProgress) - (a.overdue * 10 + a.inProgress));
  }, [staff, tasks]);

  // Chart 1: Incoming Docs by Month
  const docsByMonth = incomingDocs.reduce((acc: any, doc) => {
    if (!doc.Receive_Date) return acc;
    const parts = doc.Receive_Date.split('/');
    if (parts.length === 3) {
      const monthYear = `${parts[2]}-${parts[1]}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
    }
    return acc;
  }, {});
  const sortedMonths = Object.keys(docsByMonth).sort().slice(-6);
  const maxDocsInMonth = Math.max(...sortedMonths.map(m => docsByMonth[m]), 4);

  // Chart 2: Tasks by Status
  const tasksByStatus = tasks.reduce((acc: any, task) => {
    const status = task.Status || 'Mới tiếp nhận';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const tAssigned = (tasksByStatus['Đã phân công'] || 0) + (tasksByStatus['Mới tiếp nhận'] || 0) + (tasksByStatus['Chờ tiếp nhận'] || 0);
  const tOverdue = tasksByStatus['Quá hạn'] || 0;
  const tCompleted = tasksByStatus['Hoàn thành'] || 0;
  const tInProgress = (tasksByStatus['Đang xử lý'] || 0) + (tasksByStatus['Sắp hạn'] || 0) + (tasksByStatus['Chờ duyệt'] || 0) + (tasksByStatus['Sắp đến hạn'] || 0) + (tasksByStatus['Xin gia hạn'] || 0);
  
  const sumStatuses = tAssigned + tOverdue + tCompleted + tInProgress || 1;
  const p1 = (tAssigned / sumStatuses) * 100;
  const p2 = p1 + (tOverdue / sumStatuses) * 100;
  const p3 = p2 + (tCompleted / sumStatuses) * 100;
  const donutGradient = sumStatuses > 1 || tAssigned > 0 
    ? `conic-gradient(#064e3b 0% ${p1}%, #2dd4bf ${p1}% ${p2}%, #3b82f6 ${p2}% ${p3}%, #f97316 ${p3}% 100%)`
    : 'conic-gradient(#f3f4f6 0% 100%)';

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tổng quan nhanh</h2>
          <p className="text-sm text-gray-500">Dành cho lãnh đạo và văn thư nhìn tổng thể trong vài giây.</p>
        </div>
        <button onClick={async () => { setIsLoading(true); await initialize(); setIsLoading(false); }} className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-lg text-sm font-medium text-primary hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* 10 Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard title="Tổng văn bản đến" value={totalIncoming} icon={Mail} />
        <MetricCard title="Tổng văn bản đi" value={totalOutgoing} icon={Send} />
        <MetricCard title="Tổng công việc" value={totalTasks} icon={ClipboardList} />
        <MetricCard title="VB đến chưa xử lý" value={pendingDocs} icon={Hourglass} />
        <MetricCard title="VB đến quá hạn" value={lateDocs} icon={AlertTriangle} />
        
        <MetricCard title="VB đi chờ ký / phát hành" value={pendingOutgoing} icon={PenTool} />
        <MetricCard title="Công việc đang xử lý" value={inProgressTasks} icon={Clock} />
        <MetricCard title="Công việc sắp hạn" value={dueSoonTasks} icon={CalendarDays} />
        <MetricCard title="Công việc quá hạn" value={lateTasks} icon={CalendarX} />
        <MetricCard title="Cán bộ đang công tác" value={totalStaff} icon={Users} />
        {(permissions.isLanhDao || permissions.isAdmin) && (
          <div className={pendingApprovalCount > 0 ? "ring-2 ring-amber-400 rounded-xl" : ""}>
            <MetricCard title="Việc chờ tôi duyệt" value={pendingApprovalCount} icon={FileCheck2} />
          </div>
        )}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {permissions.canAddIncoming && (
          <ActionCard 
            title="Thêm văn bản đến" 
            desc="Tạo mới hồ sơ tiếp nhận văn bản đến." 
            icon={ListPlus} 
            onClick={() => setShowIncoming(true)}
          />
        )}
        {permissions.canAddOutgoing && (
          <ActionCard 
            title="Thêm văn bản đi" 
            desc="Tạo hồ sơ văn bản đi chờ phát hành." 
            icon={FilePlus} 
            onClick={() => setShowOutgoing(true)}
          />
        )}
        {permissions.canAddTask && (
          <ActionCard 
            title="Thêm công việc" 
            desc="Tạo việc độc lập hoặc từ văn bản." 
            icon={CheckCircle} 
            onClick={() => setShowTask(true)}
          />
        )}
        {permissions.canManageStaff && (
          <ActionCard 
            title="Thêm cán bộ" 
            desc="Bổ sung hồ sơ cán bộ đang công tác." 
            icon={UserPlus} 
            onClick={() => setShowStaff(true)}
          />
        )}
      </div>

      {/* 2 Tables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Table 1: Văn bản đến */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-primary">Văn bản đến mới nhất</h3>
            <select 
              value={docLimit} 
              onChange={(e) => setDocLimit(Number(e.target.value))}
              className="px-2 py-1 border rounded-lg text-xs outline-none bg-gray-50"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={999999}>Tất cả</option>
            </select>
          </div>
          {incomingDocs.length > 0 ? (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 border-b sticky top-0 bg-white">
                  <tr>
                    <th className="pb-3 font-medium">Mã</th>
                    <th className="pb-3 font-medium">Số/Ký hiệu</th>
                    <th className="pb-3 font-medium">Trích yếu</th>
                    <th className="pb-3 font-medium">Ngày đến</th>
                    <th className="pb-3 font-medium text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedIncomingForDashboard.slice(0, docLimit).map((doc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewDoc(doc)}>
                      <td className="py-3 text-gray-500">{doc.Doc_ID}</td>
                      <td className="py-3 font-medium text-gray-900">{doc.Sign_Number}</td>
                      <td className="py-3 text-gray-600 max-w-[150px] truncate" title={doc.Summary}>{doc.Summary}</td>
                      <td className="py-3 text-gray-500">{doc.Receive_Date}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          doc.Status === 'Hoàn thành' ? 'bg-[#e6f4ea] text-primary' : 
                          doc.Status === 'Quá hạn' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {doc.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Inbox className="w-10 h-10 text-primary/30 mb-3" />
              <p className="text-primary font-bold">Chưa có dữ liệu</p>
              <p className="text-sm text-gray-500 mt-1">Không có bản ghi để hiển thị.</p>
            </div>
          )}
        </div>

        {/* Table 2: Công việc */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-primary">Công việc sắp đến hạn</h3>
            <select 
              value={taskLimit} 
              onChange={(e) => setTaskLimit(Number(e.target.value))}
              className="px-2 py-1 border rounded-lg text-xs outline-none bg-gray-50"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={999999}>Tất cả</option>
            </select>
          </div>
          {tasks.length > 0 ? (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 border-b sticky top-0 bg-white">
                  <tr>
                    <th className="pb-3 font-medium">Mã việc</th>
                    <th className="pb-3 font-medium">Nội dung</th>
                    <th className="pb-3 font-medium">Chủ trì</th>
                    <th className="pb-3 font-medium">Hạn hoàn thành</th>
                    <th className="pb-3 font-medium text-center">Cảnh báo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedTasksForDashboard.slice(0, taskLimit).map((task, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewTask(task)}>
                      <td className="py-3 text-gray-500">{task.Task_ID}</td>
                      <td className="py-3 text-gray-900 max-w-[150px] truncate" title={task.Content}>{task.Content}</td>
                      <td className="py-3 text-gray-600">{task.Lead_Assignee}</td>
                      <td className="py-3 text-gray-500">{task.Deadline}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          task.Status === 'Quá hạn' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {task.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Inbox className="w-10 h-10 text-primary/30 mb-3" />
              <p className="text-primary font-bold">Chưa có dữ liệu</p>
              <p className="text-sm text-gray-500 mt-1">Không có bản ghi để hiển thị.</p>
            </div>
          )}
        </div>

      </div>

      {/* 2 Charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Văn bản đến theo tháng */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-gray-900 mb-6">Văn bản đến theo tháng</h3>
          <div className="flex-1 flex flex-col justify-end relative pl-6 pb-6">
            {/* Y axis */}
            <div className="absolute left-0 top-0 bottom-6 w-6 flex flex-col justify-between text-xs text-gray-400">
              <span>{maxDocsInMonth}</span>
              <span>{Math.floor(maxDocsInMonth * 0.75)}</span>
              <span>{Math.floor(maxDocsInMonth * 0.5)}</span>
              <span>{Math.floor(maxDocsInMonth * 0.25)}</span>
              <span>0</span>
            </div>
            {/* Grid lines */}
            <div className="absolute left-6 right-0 top-2 bottom-6 flex flex-col justify-between">
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-300 w-full h-0"></div>
            </div>
            {/* Bars */}
            <div className="relative z-10 w-full h-full flex items-end justify-around">
              {sortedMonths.length > 0 ? sortedMonths.map(month => (
                <div key={month} className="flex flex-col items-center justify-end w-12 h-full">
                  <div 
                    className="w-full bg-[#064e3b] rounded-t-sm transition-all" 
                    style={{ height: `${(docsByMonth[month] / maxDocsInMonth) * 100}%` }}
                    title={`${month}: ${docsByMonth[month]} văn bản`}
                  ></div>
                  <div className="absolute bottom-[-24px] text-xs text-gray-500 font-medium">
                    {month}
                  </div>
                </div>
              )) : (
                <div className="text-gray-400 text-sm mb-10">Chưa có dữ liệu</div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Công việc theo trạng thái */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-gray-900 mb-6">Công việc theo trạng thái</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Dynamic CSS Donut Chart */}
            <div className="relative w-48 h-48 rounded-full shadow-sm" 
                 style={{ background: donutGradient }}>
              <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{tasks.length}</span>
                <span className="text-xs text-gray-500 font-medium">Công việc</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#064e3b] rounded-sm"></div>
              <span className="text-xs text-gray-600 font-medium">Mới/Chờ ({tAssigned})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#2dd4bf] rounded-sm"></div>
              <span className="text-xs text-gray-600 font-medium">Quá hạn ({tOverdue})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div>
              <span className="text-xs text-gray-600 font-medium">Hoàn thành ({tCompleted})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#f97316] rounded-sm"></div>
              <span className="text-xs text-gray-600 font-medium">Đang xử lý/Duyệt ({tInProgress})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Executive Management Section: Workload Balancing & Heatmap */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              Ma trận Cảnh báo Nóng & Cân bằng Tải Công việc
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Giúp Lãnh đạo điều phối công bằng và phát hiện điểm nghẽn tiến độ theo từng Cán bộ.</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
              🔴 Có quá hạn
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
              🟡 Chờ duyệt
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              🟢 Đã xong
            </span>
          </div>
        </div>

        {/* Heatmap Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-gray-500 border-b bg-gray-50 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Cán bộ chủ trì</th>
                <th className="px-4 py-3">Đơn vị / Phòng ban</th>
                <th className="px-4 py-3 text-center">Tổng việc</th>
                <th className="px-4 py-3 text-center text-blue-700">Chủ trì</th>
                <th className="px-4 py-3 text-center text-purple-700">Phối hợp</th>
                <th className="px-4 py-3 text-center">Đang làm</th>
                <th className="px-4 py-3 text-center">Chờ duyệt</th>
                <th className="px-4 py-3 text-center">Quá hạn</th>
                <th className="px-4 py-3 text-center">Đã xong</th>
                <th className="px-4 py-3 text-center">Tỷ lệ HT</th>
                <th className="px-4 py-3 min-w-[140px]">Tải công việc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffWorkload.slice(0, 10).map((row: any, idx: number) => {
                const isOverdue = row.overdue > 0;
                const isPending = row.pendingApproval > 0;
                const rowBg = isOverdue ? 'bg-rose-50/40 hover:bg-rose-50/80' : isPending ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50';

                return (
                  <tr key={idx} className={'transition-colors ' + rowBg}>
                    <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                        {row.name.charAt(0)}
                      </div>
                      <span>{row.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.dept}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      <button onClick={() => setMatrixModal({ isOpen: true, title: `Tổng việc - ${row.name}`, tasks: row.allTasks })} className="hover:underline cursor-pointer text-gray-900 hover:text-primary">{row.total}</button>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-700">
                      <button onClick={() => setMatrixModal({ isOpen: true, title: `Chủ trì - ${row.name}`, tasks: row.leadTasks })} className="hover:underline cursor-pointer hover:text-blue-900">{row.leadCount}</button>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-700">
                      <button onClick={() => setMatrixModal({ isOpen: true, title: `Phối hợp - ${row.name}`, tasks: row.coopTasks })} className="hover:underline cursor-pointer hover:text-purple-900">{row.coopCount}</button>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">
                      <button onClick={() => setMatrixModal({ isOpen: true, title: `Đang làm - ${row.name}`, tasks: row.inProgressTasks })} className="hover:underline cursor-pointer hover:text-blue-800">{row.inProgress}</button>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-600">
                      <button onClick={() => setMatrixModal({ isOpen: true, title: `Chờ duyệt - ${row.name}`, tasks: row.pendingApprovalTasks })} className="hover:underline cursor-pointer hover:text-amber-800">{row.pendingApproval}</button>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">
                      {row.overdue > 0 ? (
                        <button onClick={() => setMatrixModal({ isOpen: true, title: `Quá hạn - ${row.name}`, tasks: row.overdueTasks })} className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md shadow-xs hover:bg-rose-200 cursor-pointer">{row.overdue}</button>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                      <button onClick={() => setMatrixModal({ isOpen: true, title: `Đã xong - ${row.name}`, tasks: row.completedTasks })} className="hover:underline cursor-pointer hover:text-emerald-800">{row.completed}</button>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{row.rate}%</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                        <div className="bg-blue-500 h-2" style={{ width: (row.total > 0 ? (row.inProgress / row.total) * 100 : 0) + '%' }} title="Đang làm"></div>
                        <div className="bg-rose-500 h-2" style={{ width: (row.total > 0 ? (row.overdue / row.total) * 100 : 0) + '%' }} title="Quá hạn"></div>
                        <div className="bg-emerald-500 h-2" style={{ width: (row.total > 0 ? (row.completed / row.total) * 100 : 0) + '%' }} title="Đã xong"></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {staffWorkload.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">Chưa có dữ liệu phân công cán bộ.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals for actions */}
      {showIncoming && (
        <IncomingDocForm 
          key={Date.now() + "incoming"}
          onClose={() => setShowIncoming(false)} 
          onSubmit={async (data) => {
            try {
              setIsLoading(true);
              const { api } = await import('@/services/api');
              const res = await api.createIncomingDoc(data);
              if (res.success) {
                setShowIncoming(false);
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
          }} 
        />
      )}
      {showOutgoing && (
        <OutgoingDocForm 
          key={Date.now() + "outgoing"}
          onClose={() => setShowOutgoing(false)} 
          onSubmit={async (data) => {
            try {
              setIsLoading(true);
              const { api } = await import('@/services/api');
              const res = await api.createOutgoingDoc(data);
              if (res.success) {
                setShowOutgoing(false);
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
          }} 
        />
      )}
      
      <Modal isOpen={showTask} onClose={() => setShowTask(false)} title="Thêm công việc">
        <TaskForm 
          key={Date.now() + "task"}
          onCancel={() => setShowTask(false)} 
          onSubmit={async (data) => {
            try {
              setIsLoading(true);
              const { api } = await import('@/services/api');
              const res = await api.createTask(data);
              if (res.success) {
                setShowTask(false);
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
          }} 
        />
      </Modal>

      <Modal isOpen={showStaff} onClose={() => setShowStaff(false)} title="Thêm cán bộ">
        <StaffForm 
          key={Date.now() + "staff"}
          onCancel={() => setShowStaff(false)} 
          onSubmit={async (data) => {
            try {
              setIsLoading(true);
              const { api } = await import('@/services/api');
              const res = await api.createStaff(data);
              if (res.success) {
                setShowStaff(false);
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
          }} 
        />
      </Modal>

      {/* Read-only Modals */}
      {viewTask && (
        <Modal isOpen={!!viewTask} onClose={() => setViewTask(null)} title="Chi tiết công việc">
          <TaskForm 
            initialData={viewTask} 
            isReadOnly={true} 
            onCancel={() => setViewTask(null)} 
            onSubmit={async () => {}} 
          />
        </Modal>
      )}

      {viewDoc && (
        <IncomingDocForm 
          key={Date.now() + "viewDoc"}
          initialData={viewDoc}
          isReadOnly={true}
          onClose={() => setViewDoc(null)} 
          onSubmit={async () => {}} 
        />
      )}

      {/* Matrix Tasks Modal */}
      <Modal maxWidth="max-w-[90vw]" isOpen={matrixModal.isOpen} title={matrixModal.title} onClose={() => setMatrixModal({ ...matrixModal, isOpen: false })}>
        <div className="p-0 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {matrixModal.tasks.length > 0 ? (
            <div className="w-full">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-700 w-12 text-center">STT</th>
                    <th className="px-4 py-3 font-bold text-gray-700 min-w-[300px] w-full">Nội dung / Trích yếu</th>
                    <th className="px-4 py-3 font-bold text-gray-700">Lĩnh vực</th>
                    <th className="px-4 py-3 font-bold text-gray-700 text-center">Độ khẩn</th>
                    <th className="px-4 py-3 font-bold text-gray-700">Ngày giao</th>
                    <th className="px-4 py-3 font-bold text-gray-700">Người giao</th>
                    <th className="px-4 py-3 font-bold text-gray-700 text-center">Hạn xử lý</th>
                    <th className="px-4 py-3 font-bold text-gray-700 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matrixModal.tasks.map((t: any, idx: number) => {
                    let displayContent = t.Content || t.Summary;
                    let displayDate = t.Assign_Date || '';
                    if (!displayContent && t.Linked_Doc_ID) {
                      const linkedDoc = incomingDocs.find((d: any) => d.Doc_ID === t.Linked_Doc_ID || d.id === t.Linked_Doc_ID);
                      if (linkedDoc) {
                        displayContent = `[VB: ${linkedDoc.Sign_Number}] ${linkedDoc.Summary}`;
                        if (!displayDate) displayDate = linkedDoc.Receive_Date || linkedDoc.Draft_Date || '';
                      }
                    }

                    return (
                      <tr key={idx} onClick={() => { setMatrixModal({ ...matrixModal, isOpen: false }); setViewTask(t); }} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                        <td className="px-4 py-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 whitespace-normal min-w-[300px]" title={displayContent || 'Không có nội dung'}>
                            {displayContent || <span className="text-gray-400 italic">Không có nội dung</span>}
                          </div>
                          {t.Role && (
                             <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${t.Role === 'Chủ trì' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                               {t.Role === 'Chủ trì' ? 'CHỦ TRÌ' : 'PHỐI HỢP'}
                             </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{t.Category || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {t.Priority && t.Priority !== 'Bình thường' ? (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                              t.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                              t.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {t.Priority}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{displayDate || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                              {(t.Assigner || 'H').charAt(0)}
                            </div>
                            <span className="text-gray-700 font-medium whitespace-normal max-w-[150px] line-clamp-2" title={t.Assigner}>{t.Assigner || 'Hệ thống'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${t.Status === 'Quá hạn' ? 'text-rose-600' : 'text-gray-700'}`}>
                            {t.Deadline || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap inline-flex items-center justify-center min-w-[80px] ${
                            t.Status === 'Quá hạn' ? 'bg-rose-100 text-rose-700' :
                            t.Status === 'Chờ duyệt' ? 'bg-amber-100 text-amber-700' :
                            t.Status === 'Hoàn thành' ? 'bg-[#e6f4ea] text-emerald-700' :
                            t.Status === 'Xin gia hạn' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {t.Status || 'Không xác định'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              Không có công việc nào trong danh sách này.
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
