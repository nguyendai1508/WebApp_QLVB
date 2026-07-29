const fs = require('fs');
const path = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add staff Workload and Heatmap computation inside Dashboard component
const searchInject = `// Chart 1: Incoming Docs by Month`;

const newInject = `// Executive Feature 1: Workload & Heatmap Data by Staff
  const staffWorkload = useMemo(() => {
    if (!staff || staff.length === 0) return [];
    
    return staff.map((s: any) => {
      const name = s.Full_Name || s.fullName || s['Họ tên cán bộ'] || 'Cán bộ';
      const staffTasks = tasks.filter((t: any) => t.Lead_Assignee === name);
      
      const inProgress = staffTasks.filter((t: any) => ['Đang xử lý', 'Sắp hạn', 'Mới tiếp nhận', 'Chờ tiếp nhận'].includes(t.Status)).length;
      const overdue = staffTasks.filter((t: any) => t.Status === 'Quá hạn').length;
      const pendingApproval = staffTasks.filter((t: any) => t.Status === 'Chờ duyệt').length;
      const completed = staffTasks.filter((t: any) => t.Status === 'Hoàn thành').length;
      const total = staffTasks.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        name,
        dept: s.Department || s['Phòng ban'] || 'Phòng chuyên môn',
        inProgress,
        overdue,
        pendingApproval,
        completed,
        total,
        rate
      };
    }).sort((a: any, b: any) => (b.overdue * 10 + b.inProgress) - (a.overdue * 10 + a.inProgress));
  }, [staff, tasks]);

  // Chart 1: Incoming Docs by Month`;

content = content.replace(searchInject, newInject);

// Add Heatmap and Workload UI before the Modals section
const searchModalInject = `{/* Modals for actions */}`;

const newSectionUI = `{/* Executive Management Section: Workload Balancing & Heatmap */}
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
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{row.total}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{row.inProgress}</td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-600">{row.pendingApproval}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">
                      {row.overdue > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md shadow-xs">{row.overdue}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-600">{row.completed}</td>
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

      {/* Modals for actions */}`;

content = content.replace(searchModalInject, newSectionUI);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully upgraded Dashboard.tsx with Heatmap & Workload section');
