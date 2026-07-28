import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Trophy, CheckCircle, AlertCircle, Clock, Medal, TrendingUp, Inbox } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export function KPI() {
  const { tasks, user, staff } = useAppStore();
  const permissions = usePermissions();

  const kpiData = useMemo(() => {
    const stats: Record<string, any> = {};

    tasks.forEach(task => {
      const assignee = task.Lead_Assignee;
      if (!assignee) return;

      if (!stats[assignee]) {
        stats[assignee] = {
          name: assignee,
          total: 0,
          completedOnTime: 0,
          completedLate: 0,
          processing: 0,
          overdue: 0,
          score: 100 // Điểm gốc
        };
      }

      stats[assignee].total += 1;
      
      const status = task.Status;
      
      if (status === 'Hoàn thành') {
        // Kiểm tra xem hoàn thành đúng hạn hay chậm
        const actualStr = task.Actual_Complete_Date;
        const deadlineStr = task.Deadline;
        let isLate = false;

        if (actualStr && deadlineStr) {
          const parseDate = (d: string) => {
            const p = d.split('/');
            return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
          };
          const actualTime = parseDate(actualStr);
          const deadlineTime = parseDate(deadlineStr);
          if (actualTime > deadlineTime) isLate = true;
        }

        if (isLate) {
          stats[assignee].completedLate += 1;
          stats[assignee].score -= 2; // Phạt hoàn thành chậm
        } else {
          stats[assignee].completedOnTime += 1;
          stats[assignee].score += 2; // Thưởng hoàn thành sớm/đúng hạn
        }
      } else if (status === 'Quá hạn') {
        stats[assignee].overdue += 1;
        stats[assignee].score -= 5; // Phạt nặng khi để quá hạn
      } else {
        stats[assignee].processing += 1;
      }
    });

    // Cập nhật thông tin Phòng ban từ bảng Cán bộ
    const staffMap = new Map(staff.map(s => [s.Full_Name, s.Department]));

    return Object.values(stats).map(s => ({
      ...s,
      department: staffMap.get(s.name) || 'Chưa rõ',
      completionRate: s.total > 0 ? Math.round(((s.completedOnTime + s.completedLate) / s.total) * 100) : 0
    })).sort((a, b) => b.score - a.score); // Xếp hạng theo Điểm KPI
  }, [tasks, staff]);

  if (!permissions.isLanhDao && !permissions.isAdmin && !permissions.isVanThu) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Trophy className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold">Không có quyền truy cập</h2>
        <p className="mt-2 text-sm">Chỉ Lãnh đạo hoặc Quản trị viên mới được xem Bảng đánh giá KPI.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-[#10b981] p-8 rounded-2xl shadow-sm text-white flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-300" />
            Bảng Xếp Hạng & KPI Cán Bộ
          </h2>
          <p className="text-white/80 font-medium">Hệ thống tự động tính điểm thi đua dựa trên tiến độ giải quyết công việc.</p>
        </div>
        <TrendingUp className="w-32 h-32 absolute -right-4 -bottom-4 text-white opacity-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 3 */}
        {kpiData.slice(0, 3).map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col items-center relative overflow-hidden transform transition-transform hover:-translate-y-1">
            <div className={`absolute top-0 w-full h-1.5 ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : 'bg-amber-600'}`}></div>
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border-4 border-white shadow-sm mb-4">
              <Medal className={`w-8 h-8 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : 'text-amber-600'}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
            <p className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full mt-1">{item.department}</p>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Điểm thi đua:</span>
                <span className="font-black text-primary text-xl">{item.score} đ</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: Math.min(100, Math.max(0, item.score)) + '%' }}></div>
              </div>
              <div className="flex justify-between items-center text-xs font-medium pt-2 border-t border-gray-50">
                <span className="text-emerald-600">{item.completedOnTime} đúng hạn</span>
                <span className="text-rose-500">{item.overdue} quá hạn</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-gray-900">Chi tiết kết quả chấm điểm</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b">
              <tr>
                <th className="px-6 py-4 font-bold">Hạng</th>
                <th className="px-6 py-4 font-bold">Cán bộ</th>
                <th className="px-6 py-4 font-bold text-center">Tổng việc</th>
                <th className="px-6 py-4 font-bold text-center text-emerald-600">Đúng hạn (+2đ)</th>
                <th className="px-6 py-4 font-bold text-center text-amber-600">Chậm hạn (-2đ)</th>
                <th className="px-6 py-4 font-bold text-center text-rose-600">Quá hạn (-5đ)</th>
                <th className="px-6 py-4 font-bold text-center">% Hoàn thành</th>
                <th className="px-6 py-4 font-bold text-right text-primary text-lg">ĐIỂM KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-600">
              {kpiData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-400">#{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.department}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-medium">{item.total}</td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-600">{item.completedOnTime}</td>
                  <td className="px-6 py-4 text-center font-bold text-amber-600">{item.completedLate}</td>
                  <td className="px-6 py-4 text-center font-bold text-rose-600">{item.overdue}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: item.completionRate + '%' }}></div>
                      </div>
                      <span className="text-xs font-bold">{item.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-black text-lg text-primary bg-primary/5 px-3 py-1 rounded-xl">
                      {item.score}
                    </span>
                  </td>
                </tr>
              ))}
              {kpiData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    Chưa có đủ dữ liệu công việc để đánh giá KPI.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
