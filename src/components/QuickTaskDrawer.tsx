import React, { useState } from 'react';
import { X, FileText, CheckCircle2, PlayCircle, XCircle, Send, Calendar, User, Clock, ShieldAlert, Award, FileCheck2, ArrowRight } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface QuickTaskDrawerProps {
  task: any;
  incomingDoc?: any;
  user: any;
  onClose: () => void;
  onUpdateStatus?: (task: any, newStatus: string, extraPayload?: any) => Promise<void>;
  onAddComment?: (task: any, commentText: string) => Promise<void>;
}

export function QuickTaskDrawer({
  task,
  incomingDoc,
  user,
  onClose,
  onUpdateStatus,
  onAddComment
}: QuickTaskDrawerProps) {
  const permissions = usePermissions();
  const [commentText, setCommentText] = useState('');
  const [progressValue, setProgressValue] = useState<number>(Number(task?.Progress_Percentage) || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExtensionInput, setShowExtensionInput] = useState(false);
  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');

  if (!task) return null;

  const docFiles = (incomingDoc?.File_URL || task?.File_URL || '').split(/[\n,]/).map((u: string) => u.trim()).filter(Boolean);
  const resultFiles = (task?.Result_File_URL || task?.Result_File || '').split(/[\n,]/).map((u: string) => u.trim()).filter(Boolean);

  const isLeadOrCoop = user?.FullName === task.Lead_Assignee || user?.FullName === task.Co_Assignee;
  const isApprover = permissions.isAdmin || permissions.isLanhDao || (user?.FullName === task.Assigner && user?.FullName !== task.Lead_Assignee);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    setIsSubmitting(true);
    try {
      await onAddComment(task, commentText);
      setCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatus = async (status: string, extraPayload?: any) => {
    if (!onUpdateStatus) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(task, status, extraPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-xs uppercase tracking-wider">
              {task.Role === 'Chủ trì' ? 'CHỦ TRÌ' : 'PHỐI HỢP'}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                {task.Linked_Doc_ID ? `Văn bản số: ${task.Linked_Doc_ID}` : 'Công việc chỉ đạo'}
              </h3>
              <p className="text-xs text-gray-500">Mã CV: <span className="font-mono">{task.id || task.Task_ID}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick Status Badge & Deadline Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] text-gray-400 font-semibold block uppercase">Trạng thái</span>
              <span className="text-xs font-bold text-blue-600 mt-1 block">{task.Status || 'Đang xử lý'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] text-gray-400 font-semibold block uppercase">Hạn hoàn thành</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">{task.Deadline || 'Chưa đặt'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] text-gray-400 font-semibold block uppercase">Cán bộ chủ trì</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block truncate">{task.Lead_Assignee || 'Chưa giao'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] text-gray-400 font-semibold block uppercase">Lãnh đạo giao</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block truncate">{task.Assigner || 'Hệ thống'}</span>
            </div>
          </div>

          {/* Task Content */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/80">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Trích yếu / Nội dung chỉ đạo</h4>
            <p className="text-sm text-gray-800 leading-relaxed font-medium">
              {incomingDoc?.Summary || task.Content || 'Không có nội dung trích yếu.'}
            </p>
          </div>

          {/* Attachment Files */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tệp đính kèm liên quan</h4>
            <div className="flex flex-wrap gap-2">
              {docFiles.length > 0 && docFiles.map((url: string, i: number) => (
                <a
                  key={`doc-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>File VB Gốc {docFiles.length > 1 ? i + 1 : ''}</span>
                </a>
              ))}

              {resultFiles.length > 0 && resultFiles.map((url: string, i: number) => (
                <a
                  key={`res-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
                >
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>File Báo cáo {resultFiles.length > 1 ? i + 1 : ''}</span>
                </a>
              ))}

              {docFiles.length === 0 && resultFiles.length === 0 && (
                <span className="text-xs text-gray-400 italic">Không có tệp đính kèm.</span>
              )}
            </div>
          </div>

          {/* Progress Slider */}
          <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700">Tiến độ thực hiện:</span>
              <span className="font-bold text-blue-600 text-sm">{progressValue}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              disabled={!isLeadOrCoop || isSubmitting}
              value={progressValue} 
              onChange={(e) => setProgressValue(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
            />
            {isLeadOrCoop && progressValue !== Number(task.Progress_Percentage) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleQuickStatus(task.Status, { progressPercentage: progressValue })}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Lưu tiến độ {progressValue}%
                </button>
              </div>
            )}
          </div>

          {/* Executive Action Panel */}
          <div className="p-4 bg-gray-900 text-white rounded-2xl space-y-3 shadow-lg">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> Thao tác xử lý nhanh
            </h4>

            <div className="flex flex-wrap gap-2 pt-1">
              {/* Leader Approval Actions */}
              {isApprover && task.Status === 'Chờ duyệt' && (
                <>
                  <button
                    onClick={() => handleQuickStatus('Hoàn thành', { progressPercentage: 100 })}
                    disabled={isSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Duyệt & Đóng
                  </button>
                  <button
                    onClick={() => handleQuickStatus('Đang xử lý')}
                    disabled={isSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <XCircle className="w-4 h-4" /> Yêu cầu làm lại
                  </button>
                </>
              )}

              {/* Leader Extension Approval Actions */}
              {isApprover && task.Status === 'Xin gia hạn' && (
                <>
                  <button
                    onClick={() => handleQuickStatus('Đang xử lý', { Deadline: task.Extension_Date, Extension_Date: '', Extension_Reason: '' })}
                    disabled={isSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Đồng ý gia hạn
                  </button>
                  <button
                    onClick={() => handleQuickStatus('Đang xử lý', { Extension_Date: '', Extension_Reason: '' })}
                    disabled={isSubmitting}
                    className="flex-1 min-w-[140px] px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Từ chối gia hạn
                  </button>
                </>
              )}

              {/* Staff Submission Actions */}
              {isLeadOrCoop && task.Status !== 'Hoàn thành' && task.Status !== 'Chờ duyệt' && (
                <button
                  onClick={() => handleQuickStatus('Chờ duyệt', { progressPercentage: 100 })}
                  disabled={isSubmitting}
                  className="flex-1 min-w-[140px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-4 h-4" /> Nộp xin duyệt 100%
                </button>
              )}

              {task.Status === 'Hoàn thành' && (permissions.isAdmin || permissions.isLanhDao) && (
                <button
                  onClick={() => handleQuickStatus('Đang xử lý')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" /> Mở lại công việc
                </button>
              )}
            </div>
          </div>

          {/* Live Discussion & Audit Trail Log */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nhật ký & Thảo luận</h4>
            
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Nhập nội dung trao đổi / chỉ đạo nhanh..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Gửi
              </button>
            </form>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-60 overflow-y-auto font-mono text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">
              {task.Audit_Trail || task.auditLog || 'Chưa có nhật ký trao đổi nào.'}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
}
