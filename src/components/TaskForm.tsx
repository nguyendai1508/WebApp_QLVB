import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Loader2, FileText, CheckCircle2, PlayCircle, Save, XCircle, FileCheck2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ComboBox } from './ui/ComboBox';
import { fileToBase64, formatDateForInput } from '@/utils/fileHelpers';
import { generateAuditTrail } from '@/utils/auditHelper';
import { usePermissions } from '@/hooks/usePermissions';

interface TaskFormProps {
  initialData?: any;
  autoFillFromDoc?: any;
  isReadOnly?: boolean;
  onSubmit: (data: any) => Promise<void>;
  onDeleteDoc?: () => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ initialData, autoFillFromDoc, isReadOnly, onSubmit, onCancel, onDeleteDoc }: TaskFormProps) {
  const { catalogs, staff, user, tasks, deleteCatalog } = useAppStore();
  const permissions = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [commentText, setCommentText] = useState('');
  const [pendingComments, setPendingComments] = useState<string[]>([]);
  
  const resultFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    Source: '',
    Linked_Doc_ID: '',
    Content: '',
    Priority: '',
    Assigner: user?.FullName || '',
    Lead_Department: '',
    Lead_Assignee: '',
    Co_Assignee: '',
    Result_Output: '',
    Related_Outgoing_Doc: '',
    Notes: '',
    ...initialData,
    Field: initialData?.Category || initialData?.Field || '',
    Status: initialData?.Status || 'Mới tiếp nhận',
    Assign_Date: formatDateForInput(initialData?.Assign_Date) || (new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]),
    Deadline: formatDateForInput(initialData?.Deadline) || '',
    Actual_Complete_Date: formatDateForInput(initialData?.Actual_Complete_Date) || '',
    Extension_Date: formatDateForInput(initialData?.Extension_Date) || '',
    Extension_Reason: initialData?.Extension_Reason || ''
  });

  const [showExtensionForm, setShowExtensionForm] = useState(false);

  // AI Gợi ý cán bộ dựa trên Lịch sử
  const suggestedAssignee = useMemo(() => {
    if (!formData.Field || !tasks) return '';
    const fieldTasks = tasks.filter(t => t.Category === formData.Field && t.Lead_Assignee);
    if (fieldTasks.length === 0) return '';
    const counts: Record<string, number> = {};
    fieldTasks.forEach(t => { counts[t.Lead_Assignee] = (counts[t.Lead_Assignee] || 0) + 1; });
    let max = 0; let suggested = '';
    Object.keys(counts).forEach(key => {
      if (counts[key] > max) { max = counts[key]; suggested = key; }
    });
    return suggested;
  }, [formData.Field, tasks]);

  useEffect(() => {
    if (suggestedAssignee && !formData.Lead_Assignee && !initialData?.Lead_Assignee) {
      setFormData((prev: any) => ({ ...prev, Lead_Assignee: suggestedAssignee }));
    }
  }, [suggestedAssignee]);

  const canEditAssignment = !initialData || permissions.isAdmin || permissions.isLanhDao || user?.FullName === formData.Assigner || user?.FullName === initialData?.Created_By;
  const canEditAssignmentFile = canEditAssignment;
  const canEditResultFile = permissions.isAdmin || permissions.isLanhDao || user?.FullName === formData.Lead_Assignee || user?.FullName === formData.Co_Assignee || user?.FullName === formData.Assigner;
  
  const getDisabledClass = (disabled: boolean) => disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200" : "bg-white";

  useEffect(() => {
    if (autoFillFromDoc) {
      setFormData((prev: any) => ({
        ...prev,
        Source: 'Theo văn bản đến',
        Linked_Doc_ID: autoFillFromDoc.Doc_ID || autoFillFromDoc.Sign_Number,
        Field: autoFillFromDoc.Category || '',
        Content: autoFillFromDoc.Summary || '',
        Priority: autoFillFromDoc.Urgency || '',
        Lead_Department: autoFillFromDoc.Lead_Department || '',
        Lead_Assignee: autoFillFromDoc.Lead_Assignee || '',
        Co_Assignee: autoFillFromDoc.Co_Assignee || '',
        Deadline: formatDateForInput(autoFillFromDoc.Deadline) || '',
      }));
    }
  }, [autoFillFromDoc]);

  // Tự động chuyển đổi trạng thái thông minh
  useEffect(() => {
    let newStatus = formData.Status;
    
    if ((formData.Assigner || formData.Lead_Assignee) && (!formData.Status || formData.Status === 'Mới tiếp nhận' || formData.Status === 'Chờ tiếp nhận' || formData.Status === 'Chọn trạng thái')) {
      newStatus = 'Đang xử lý';
    }

    if (newStatus && newStatus !== formData.Status && newStatus !== 'Chọn trạng thái') {
      setFormData((prev: any) => ({ ...prev, Status: newStatus }));
    }
  }, [formData.Assigner, formData.Lead_Assignee, formData.Status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
      let newData = { ...prev, [name]: value };
      if (name === 'Status' && value === 'Hoàn thành') {
        newData.Progress_Percentage = 100;
        newData.Actual_Complete_Date = new Date().toISOString().split('T')[0];
      }
      return newData;
    });
  };

  const getAvailableStatuses = () => {
    let options = getCatalogOptions('Trạng thái công việc');
    if (!permissions.isAdmin && !permissions.isLanhDao && initialData?.Status) {
      const pastStatuses = ['Mới tiếp nhận', 'Chờ tiếp nhận'];
      if (!pastStatuses.includes(initialData.Status)) {
        options = options.filter(opt => !pastStatuses.includes(opt));
      }
    }
    return options;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const hasLargeFile = files.some(f => f.size > 25 * 1024 * 1024);
      
      if (hasLargeFile) {
        alert('Có file vượt quá dung lượng 25MB (Giới hạn tối đa của Google). Vui lòng chọn file nhỏ hơn!');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (totalSize > 45 * 1024 * 1024) {
        alert('Tổng dung lượng các file vượt quá 45MB. Vui lòng giảm bớt file tải lên cùng lúc!');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFiles(files);
    }
  };

  const handleResultFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const hasLargeFile = files.some(f => f.size > 25 * 1024 * 1024);
      
      if (hasLargeFile) {
        alert('Có file báo cáo vượt quá dung lượng 25MB (Giới hạn tối đa của Google). Vui lòng chọn file nhỏ hơn!');
        if (resultFileInputRef.current) resultFileInputRef.current.value = '';
        return;
      }
      if (totalSize > 45 * 1024 * 1024) {
        alert('Tổng dung lượng các file báo cáo vượt quá 45MB. Vui lòng giảm bớt file tải lên cùng lúc!');
        if (resultFileInputRef.current) resultFileInputRef.current.value = '';
        return;
      }
      setResultFiles(files);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overrideStatus?: string, overrideData?: any) => {
    if (e) e.preventDefault();
    const baseData = overrideData ? { ...formData, ...overrideData } : formData;
    const currentData = { ...baseData, Category: baseData.Field || baseData.Category };

    // Validation
    if (!currentData.Content?.trim()) {
      currentData.Content = currentData.Summary || currentData.Linked_Doc_ID || 'Xử lý công việc';
    }
    if (!currentData.Lead_Assignee) {
      alert('Vui lòng chọn Cán bộ chủ trì!');
      return;
    }
    if (!currentData.Assign_Date) {
      alert('Vui lòng chọn Ngày giao!');
      return;
    }
    if (!currentData.Deadline) {
      if (!window.confirm('Bạn chưa nhập hạn hoàn thành. Bạn có chắc chắn muốn tạo công việc không?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let filesData: any[] = [];
      if (selectedFiles.length > 0) {
        filesData = await Promise.all(selectedFiles.map(async (f) => ({
          fileBase64: await fileToBase64(f),
          fileName: f.name,
          fileMimeType: f.type,
          fileSize: f.size
        })));
      }

      let resultFilesData: any[] = [];
      if (resultFiles.length > 0) {
        resultFilesData = await Promise.all(resultFiles.map(async (f) => ({
          fileBase64: await fileToBase64(f),
          fileName: f.name,
          fileMimeType: f.type,
          fileSize: f.size
        })));
      }
      const TASK_LABELS = {
        Source: 'Nguồn việc', Linked_Doc_ID: 'Mã VB liên quan', Category: 'Lĩnh vực',
        Content: 'Nội dung công việc', Priority: 'Mức độ ưu tiên', Assigner: 'Lãnh đạo giao việc',
        Lead_Department: 'Đơn vị chủ trì', Lead_Assignee: 'Cán bộ chủ trì', Co_Assignee: 'Cán bộ phối hợp',
        Assign_Date: 'Ngày giao', Deadline: 'Hạn hoàn thành', Actual_Complete_Date: 'Ngày HT thực tế',
        Progress_Percentage: '% hoàn thành', Status: 'Trạng thái', Result_Output: 'Kết quả đầu ra',
        Related_Outgoing_Doc: 'Số/Ký hiệu VB trả lời', Notes: 'Ghi chú'
      };
      
      const auditInitialData = initialData ? { ...initialData, Category: initialData.Category || initialData.Field } : null;
      
      const auditLog = auditInitialData ? generateAuditTrail(auditInitialData, currentData, TASK_LABELS, user?.FullName || 'Unknown') : '';
      
      let customLog = auditLog;
      if (overrideStatus === 'Xin gia hạn') {
         customLog = `[${new Date().toLocaleString('en-GB')}] ${user?.FullName || 'Cán bộ'} đã [XIN GIA HẠN] đến ngày ${currentData.Extension_Date.split('-').reverse().join('/')}.\nLý do: ${currentData.Extension_Reason}\n${customLog}`;
      } else if (overrideStatus === 'Chờ duyệt') {
         customLog = `[${new Date().toLocaleString('en-GB')}] ${user?.FullName || 'Cán bộ'} đã [XIN DUYỆT KẾT QUẢ].\n${customLog}`;
      } else if (overrideData && overrideData.Extension_Date === '' && formData.Extension_Date) {
         if (overrideData.Deadline) {
             customLog = `[${new Date().toLocaleString('en-GB')}] ${user?.FullName || 'Lãnh đạo'} đã [ĐỒNG Ý GIA HẠN] đến ngày ${overrideData.Deadline.split('-').reverse().join('/')}.\n${customLog}`;
         } else {
             customLog = `[${new Date().toLocaleString('en-GB')}] ${user?.FullName || 'Lãnh đạo'} đã [TỪ CHỐI GIA HẠN].\n${customLog}`;
         }
      }

      if (pendingComments.length > 0) {
        customLog = pendingComments.join('\n\n') + (customLog ? '\n\n' + customLog : '');
      }
      const nowObj = new Date();
      const todayISO = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')} ${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}:${String(nowObj.getSeconds()).padStart(2, '0')}`;

      const payload = {
        source: currentData.Source,
        relatedDoc: currentData.Linked_Doc_ID,
        category: currentData.Field,
        content: currentData.Content,
        priority: currentData.Priority,
        assigner: currentData.Assigner,
        leadDepartment: currentData.Lead_Department,
        leadAssignee: currentData.Lead_Assignee,
        coAssignee: currentData.Co_Assignee,
        assignDate: currentData.Assign_Date,
        deadline: currentData.Deadline,
        actualCompleteDate: overrideStatus === 'Đang xử lý' ? '' : overrideStatus === 'Chờ duyệt' ? todayISO : (overrideStatus === 'Hoàn thành' && !currentData.Actual_Complete_Date) ? todayISO : currentData.Actual_Complete_Date,
        progressPercentage: (overrideStatus === 'Hoàn thành' || overrideStatus === 'Chờ duyệt') ? 100 : currentData.Progress_Percentage,
        status: overrideStatus || currentData.Status,
        resultOutput: currentData.Result_Output,
        relatedOutgoingDoc: currentData.Related_Outgoing_Doc,
        notes: currentData.Notes,
        extensionDate: currentData.Extension_Date,
        extensionReason: currentData.Extension_Reason,
        existingFiles: (autoFillFromDoc && !initialData) ? {
           names: autoFillFromDoc.File_Name || '',
           types: autoFillFromDoc.File_Type || '',
           sizes: autoFillFromDoc.File_Size || '',
           ids: autoFillFromDoc.File_ID || '',
           urls: autoFillFromDoc.File_URL || ''
        } : undefined,
        files: filesData,
        resultFiles: resultFilesData,
        auditLog: customLog,
        createdBy: user?.FullName || ''
      };
      
      await onSubmit(payload);
    } catch (error) {
      console.error(error);
      alert('Đã có lỗi xảy ra khi tạo công việc!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Phiếu Báo Cáo & Giao Việc</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; padding: 40px; color: #000; }
            .header-flex { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .header-left { text-align: center; width: 40%; }
            .header-right { text-align: center; width: 50%; }
            .title { font-size: 20px; font-weight: bold; margin: 30px 0; text-align: center; text-transform: uppercase; }
            .content p { font-size: 15px; margin: 8px 0; }
            .signature { width: 100%; display: flex; justify-content: space-between; margin-top: 50px; }
            .sign-box { text-align: center; width: 45%; }
            .e-sign { border: 2px solid #e63946; color: #e63946; padding: 10px; display: inline-block; transform: rotate(-3deg); font-family: monospace; border-radius: 8px; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            table, th, td { border: 1px solid black; }
            th, td { padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header-flex">
            <div class="header-left">
              <h3 style="margin: 0; font-size: 15px; font-weight: normal;">TÊN CƠ QUAN / TỔ CHỨC</h3>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 15px;">HỆ THỐNG QLVB</p>
            </div>
            <div class="header-right">
              <h3 style="margin: 0; font-size: 15px; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 15px;">Độc lập - Tự do - Hạnh phúc</p>
            </div>
          </div>
          
          <div class="title">PHIẾU YÊU CẦU XỬ LÝ CÔNG VIỆC<br/><span style="font-size: 14px; font-weight: normal; text-transform: none;">(Mã CV: ${initialData?.Task_ID || 'CV-MỚI'})</span></div>
          
          <div class="content">
            <p><strong>1. Trích yếu / Nội dung công việc:</strong> ${formData.Content}</p>
            <p><strong>2. Nguồn việc / Căn cứ:</strong> ${formData.Source || 'Không có'} ${formData.Linked_Doc_ID ? '(Mã VB: ' + formData.Linked_Doc_ID + ')' : ''}</p>
            <p><strong>3. Lĩnh vực:</strong> ${formData.Field}</p>
            <p><strong>4. Mức độ ưu tiên:</strong> ${formData.Priority || 'Bình thường'}</p>
            
            <table>
              <tr>
                <th style="width: 30%">Cán bộ phân công:</th>
                <td>${formData.Assigner || ''}</td>
              </tr>
              <tr>
                <th>Cán bộ chủ trì (xử lý chính):</th>
                <td><strong>${formData.Lead_Assignee || ''}</strong></td>
              </tr>
              <tr>
                <th>Cán bộ phối hợp:</th>
                <td>${formData.Co_Assignee || 'Không có'}</td>
              </tr>
              <tr>
                <th>Thời gian yêu cầu:</th>
                <td>Ngày giao: ${formData.Assign_Date} - Hạn hoàn thành: <strong>${formData.Deadline}</strong></td>
              </tr>
            </table>

            <p style="margin-top: 20px;"><strong>5. Tình trạng thực hiện:</strong> ${formData.Status} (${formData.Progress_Percentage || 0}%)</p>
            ${formData.Result_Output ? `<p><strong>6. Kết quả báo cáo:</strong> ${formData.Result_Output}</p>` : ''}
          </div>
          
          <div class="signature">
            <div class="sign-box">
              <p><strong>CÁN BỘ CHỦ TRÌ</strong></p>
              <br/><br/><br/><br/>
              <p><strong>${formData.Lead_Assignee || ''}</strong></p>
            </div>
            <div class="sign-box">
              <p><strong>LÃNH ĐẠO DUYỆT</strong></p>
              <br/><br/><br/><br/>
              <p><strong>${formData.Assigner || ''}</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // setTimeout để trình duyệt kịp load CSS
      setTimeout(() => { printWindow.print(); }, 200);
    }
  };

  const getCatalogOptions = (type: string) => {
    return catalogs.filter(c => String(c.Type).toLowerCase() === String(type).toLowerCase()).map(c => c.Value);
  };

  const renderStepper = () => {
    if (!initialData) return null;
    const currentStatus = formData.Status;
    
    let activeStep = 0;
    if (['Đang xử lý', 'Sắp hạn', 'Quá hạn'].includes(currentStatus)) activeStep = 1;
    if (currentStatus === 'Chờ duyệt') activeStep = 2;
    if (currentStatus === 'Hoàn thành') activeStep = 3;

    const steps = ['Mới giao', 'Đang xử lý', 'Chờ duyệt', 'Hoàn thành'];

    return (
      <div className="mb-4 pt-0 px-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full z-0"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500" style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}></div>
          
          {steps.map((step, index) => {
            const isActive = index <= activeStep;
            const isCurrent = index === activeStep;
            return (
              <div key={step} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 ${isActive ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-400'} ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                  {isActive ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`text-xs font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActionBar = () => {
    if (isReadOnly) {
      return (
        <div className="flex justify-between w-full pt-4 mt-4 border-t border-gray-100">
          <div>
            <button type="button" onClick={onCancel} className="px-6 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Đóng
            </button>
          </div>
          <div>
            {initialData && (
              <button type="button" onClick={handlePrint} className="px-6 py-1.5 bg-[#e6f4ea] text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                In & Xuất PDF
              </button>
            )}
          </div>
        </div>
      );
    }

    const currentStatus = formData.Status;
    const isChuyenVien = !permissions.isAdmin && !permissions.isLanhDao;

    return (
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-gray-100 w-full">
        <div className="flex gap-2">
          <button type="button" disabled={isSubmitting || isDeleting} onClick={onCancel} className="px-6 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
            Đóng
          </button>
          {initialData && (
            <button type="button" disabled={isSubmitting || isDeleting} onClick={handlePrint} className="px-6 py-1.5 bg-[#e6f4ea] text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2">
              <FileCheck2 className="w-4 h-4" />
              In & Xuất PDF
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(!initialData) && (
             <button type="button" onClick={(e) => handleSubmit(e)} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Tạo công việc
            </button>
          )}

          {initialData && ['Mới tiếp nhận', 'Chờ tiếp nhận'].includes(currentStatus) && (canEditAssignment || canEditResultFile) && (
            <button type="button" onClick={() => handleSubmit(undefined, 'Đang xử lý')} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Bắt đầu thực hiện
            </button>
          )}

          {initialData && ['Đang xử lý', 'Sắp hạn', 'Quá hạn'].includes(currentStatus) && (
            <>
              {(canEditAssignment || canEditResultFile) && !showExtensionForm && (
                <button type="button" onClick={(e) => handleSubmit(e)} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 border">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {user?.FullName === initialData.Lead_Assignee || user?.FullName === initialData.Co_Assignee ? 'Lưu tiến độ' : 'Lưu cập nhật'}
                </button>
              )}
              {canEditResultFile && !showExtensionForm && (user?.FullName === initialData.Lead_Assignee || user?.FullName === initialData.Co_Assignee) && (
                <button type="button" onClick={() => setShowExtensionForm(true)} className="flex items-center gap-2 px-6 py-1.5 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-50">
                  <PlayCircle className="w-4 h-4" />
                  Xin gia hạn
                </button>
              )}
              {canEditResultFile && !showExtensionForm && (user?.FullName === initialData.Lead_Assignee || user?.FullName === initialData.Co_Assignee) && (
                <button type="button" onClick={(e) => {
                  e.preventDefault();
                  if (!resultFiles.length && !initialData?.Result_File_Name) {
                    alert('Vui lòng đính kèm Tệp báo cáo kết quả trước khi xin duyệt!');
                    return;
                  }
                  handleSubmit(undefined, 'Chờ duyệt');
                }} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Xin duyệt kết quả
                </button>
              )}
              {showExtensionForm && (
                <div className="w-full flex items-center justify-end gap-3 animate-fade-in bg-amber-50 p-4 rounded-xl border border-amber-200 mt-2">
                  <div className="flex flex-col flex-1 max-w-[200px]">
                    <span className="text-xs font-bold text-gray-500 mb-1">Gia hạn đến ngày:</span>
                    <input type="date" value={formData.Extension_Date} onChange={(e) => setFormData({...formData, Extension_Date: e.target.value})} className="px-3 py-2 border rounded-lg" required />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-xs font-bold text-gray-500 mb-1">Lý do gia hạn:</span>
                    <input type="text" value={formData.Extension_Reason} onChange={(e) => setFormData({...formData, Extension_Reason: e.target.value})} placeholder="Lý do xin gia hạn..." className="px-3 py-2 border rounded-lg" required />
                  </div>
                  <div className="flex flex-col self-end gap-2 ml-2">
                    <button type="button" onClick={() => {
                      if (!formData.Extension_Date || !formData.Extension_Reason) {
                        alert('Vui lòng nhập đầy đủ ngày và lý do xin gia hạn!');
                        return;
                      }
                      if (formData.Deadline && new Date(formData.Extension_Date) <= new Date(formData.Deadline)) {
                        alert('Ngày xin gia hạn phải lớn hơn Hạn hoàn thành hiện tại!');
                        return;
                      }
                      handleSubmit(undefined, 'Xin gia hạn');
                    }} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50">Gửi xin gia hạn</button>
                    <button type="button" onClick={() => setShowExtensionForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">Hủy</button>
                  </div>
                </div>
              )}
            </>
          )}

          {initialData && currentStatus === 'Xin gia hạn' && (() => {
            const isApprover = permissions.isAdmin || permissions.isLanhDao || (user?.FullName === initialData?.Assigner && user?.FullName !== initialData?.Lead_Assignee);
            return (
              <>
                {isApprover ? (
                  <>
                    <button type="button" onClick={() => {
                       // Từ chối
                       const oldDeadline = initialData.Deadline || new Date().toLocaleDateString('en-GB');
                       const deadlineParts = oldDeadline.split('/');
                       const deadlineTimestamp = new Date(parseInt(deadlineParts[2]), parseInt(deadlineParts[1]) - 1, parseInt(deadlineParts[0])).getTime();
                       const todayTimestamp = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
                       const fallbackStatus = deadlineTimestamp < todayTimestamp ? 'Quá hạn' : 'Đang xử lý';
                       handleSubmit(undefined, fallbackStatus, { Extension_Date: '', Extension_Reason: '' });
                    }} className="flex items-center gap-2 px-6 py-1.5 bg-rose-100 text-rose-700 font-bold rounded-xl hover:bg-rose-200">
                      <XCircle className="w-4 h-4" />
                      Từ chối gia hạn
                    </button>
                    <button type="button" onClick={() => {
                       // Đồng ý gia hạn
                       const newDeadline = formData.Extension_Date || formData.Deadline;
                       if (!newDeadline) {
                           alert('Không có thông tin ngày gia hạn! Vui lòng tự chọn lại "Hạn hoàn thành" ở phía trên trước khi Duyệt.');
                           return;
                       }
                       handleSubmit(undefined, 'Đang xử lý', { Deadline: newDeadline, Extension_Date: '', Extension_Reason: '' });
                    }} className="flex items-center gap-2 px-6 py-1.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Đồng ý gia hạn
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-amber-50 text-amber-600 font-medium rounded-lg text-sm">
                      Đang chờ duyệt gia hạn đến {formData.Extension_Date.split('-').reverse().join('/')}...
                    </span>
                  </div>
                )}
              </>
            );
          })()}

          {initialData && currentStatus === 'Chờ duyệt' && (() => {
            const isApprover = permissions.isAdmin || permissions.isLanhDao || (user?.FullName === initialData?.Assigner && user?.FullName !== initialData?.Lead_Assignee);
            const isAssigneeOnly = user?.FullName === initialData?.Lead_Assignee && !isApprover;
            
            return (
              <>
                {isApprover && (
                  <>
                    <button type="button" onClick={() => handleSubmit(undefined, 'Đang xử lý')} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-rose-100 text-rose-700 font-bold rounded-xl hover:bg-rose-200 transition-colors disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Yêu cầu làm lại
                    </button>
                    <button type="button" onClick={() => handleSubmit(undefined, 'Hoàn thành')} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                      Phê duyệt & Đóng
                    </button>
                  </>
                )}
                {isAssigneeOnly && (
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-amber-50 text-amber-600 font-medium rounded-lg text-sm">Đang chờ lãnh đạo duyệt...</span>
                    <button type="button" onClick={() => handleSubmit(undefined, 'Đang xử lý')} disabled={isSubmitting || isDeleting} title="Thu hồi báo cáo để cập nhật lại" className="flex items-center gap-2 px-6 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Hủy xin duyệt
                    </button>
                  </div>
                )}
                {!isApprover && !isAssigneeOnly && (
                   <span className="px-4 py-2 bg-amber-50 text-amber-600 font-medium rounded-lg text-sm">Đang chờ lãnh đạo duyệt...</span>
                )}
              </>
            );
          })()}

          {initialData && currentStatus === 'Hoàn thành' && (
            <>
              {(permissions.isAdmin || permissions.isLanhDao) && (
                <button type="button" onClick={() => handleSubmit(undefined, 'Đang xử lý')} disabled={isSubmitting || isDeleting} className="flex items-center gap-2 px-6 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  Mở lại công việc
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderStepper()}
      <form id="task-form" onSubmit={(e) => e.preventDefault()} className="space-y-3">
        {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Nguồn việc</label>
          <ComboBox name="Source" disabled={!canEditAssignment} value={formData.Source} onChange={handleChange} options={getCatalogOptions('Nguồn việc')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Nguồn việc', val) }} placeholder="Chọn hoặc nhập nguồn việc" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Mã VB liên quan</label>
          <input type="text" disabled={!canEditAssignment} name="Linked_Doc_ID" value={formData.Linked_Doc_ID} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary ${getDisabledClass(!canEditAssignment)}`} />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Lĩnh vực</label>
          <ComboBox name="Field" disabled={!canEditAssignment} value={formData.Field} onChange={handleChange} options={getCatalogOptions('Lĩnh vực')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Lĩnh vực', val) }} placeholder="Chọn hoặc nhập lĩnh vực" />
        </div>
      </div>

      {/* Row 2 */}
      <div>
        <label className="block text-sm font-bold text-primary mb-1">Nội dung công việc phải làm</label>
        <textarea name="Content" disabled={!canEditAssignment} required value={formData.Content} onChange={handleChange} rows={3} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none ${getDisabledClass(!canEditAssignment)}`}></textarea>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Mức độ ưu tiên</label>
          <ComboBox name="Priority" allowInput={false} disabled={!canEditAssignment} value={formData.Priority} onChange={handleChange} options={getCatalogOptions('Độ khẩn/Ưu tiên')} placeholder="Chọn độ khẩn" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Lãnh đạo giao việc</label>
          <select name="Assigner" disabled={!canEditAssignment} value={formData.Assigner} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none ${getDisabledClass(!canEditAssignment)}`}>
            <option value="">Chọn lãnh đạo</option>
            {(permissions.isAdmin || permissions.isLanhDao) && user?.FullName && !getCatalogOptions('Lãnh đạo giao việc').includes(user.FullName) && (
              <option value={user.FullName} className="font-bold text-primary">{user.FullName} (Tôi)</option>
            )}
            {initialData?.Assigner && !getCatalogOptions('Lãnh đạo giao việc').includes(initialData.Assigner) && initialData.Assigner !== user?.FullName && (
              <option value={initialData.Assigner}>{initialData.Assigner}</option>
            )}
            {getCatalogOptions('Lãnh đạo giao việc').map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Đơn vị chủ trì</label>
          <ComboBox name="Lead_Department" disabled={!canEditAssignment} value={formData.Lead_Department} onChange={handleChange} options={getCatalogOptions('Đơn vị/Tổ công tác')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Đơn vị/Tổ công tác', val) }} placeholder="Chọn hoặc nhập đơn vị" />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-[13px] font-bold text-primary mb-1">
            Cán bộ chủ trì 
            {suggestedAssignee && <span className="text-amber-600 font-medium ml-1 italic font-normal text-[11px]">(⭐ Đề xuất: {suggestedAssignee})</span>}
          </label>
          <select name="Lead_Assignee" disabled={!canEditAssignment} value={formData.Lead_Assignee} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none ${getDisabledClass(!canEditAssignment)}`}>
            <option value="">Chọn cán bộ chủ trì</option>
            {suggestedAssignee && !staff.find(s => s.Full_Name === suggestedAssignee) && (
              <option value={suggestedAssignee}>{suggestedAssignee}</option>
            )}
            {staff.map(s => (
              <option key={s.Staff_ID} value={s.Full_Name}>
                {s.Full_Name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Cán bộ phối hợp</label>
          <select name="Co_Assignee" disabled={!canEditAssignment} value={formData.Co_Assignee} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none ${getDisabledClass(!canEditAssignment)}`}>
            <option value="">Chọn cán bộ phối hợp</option>
            {staff.map(s => <option key={s.Staff_ID} value={s.Full_Name}>{s.Full_Name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Ngày giao</label>
          <input type="date" disabled={!canEditAssignment} name="Assign_Date" value={formData.Assign_Date} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600 ${getDisabledClass(!canEditAssignment)}`} />
        </div>
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Hạn hoàn thành</label>
          <input type="date" disabled={!canEditAssignment} name="Deadline" min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={formData.Deadline} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600 ${getDisabledClass(!canEditAssignment)}`} />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Ngày hoàn thành thực tế</label>
          <input type="date" disabled={!(permissions.isAdmin || permissions.isLanhDao)} name="Actual_Complete_Date" value={formData.Actual_Complete_Date} onChange={handleChange} className={`w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600 ${getDisabledClass(!(permissions.isAdmin || permissions.isLanhDao))}`} />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Phần trăm hoàn thành</label>
          <input type="number" name="Progress_Percentage" value={formData.Progress_Percentage} onChange={handleChange} placeholder="VD: 60" className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
        </div>
      </div>

      {/* Row 6 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Kết quả đầu ra</label>
          <ComboBox name="Result_Output" value={formData.Result_Output} onChange={handleChange} options={getCatalogOptions('Kết quả xử lý/đầu ra')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Kết quả xử lý/đầu ra', val) }} placeholder="Chọn hoặc nhập kết quả" />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary mb-1">Số/Ký hiệu VB trả lời</label>
          <input type="text" name="Related_Outgoing_Doc" value={formData.Related_Outgoing_Doc} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
        </div>
      </div>

      {/* Row 7 */}
      <div>
        <label className="block text-sm font-bold text-primary mb-1">Ghi chú</label>
        <textarea name="Notes" value={formData.Notes} onChange={handleChange} rows={2} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"></textarea>
      </div>



      <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Khu vực 1: File Giao Việc */}
        <div>
          <label className="block text-sm font-bold text-primary mb-2">Tệp đính kèm (Lúc giao việc)</label>
          <div className="flex flex-col gap-3">
            {canEditAssignmentFile && (
              <>
                <input 
                  type="file" 
                  multiple
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition-colors w-max"
                >
                  <Upload className="w-4 h-4" />
                  Chọn tệp giao việc
                </button>
              </>
            )}
            <div className="flex flex-col text-sm text-gray-500 gap-1">
              {selectedFiles.length > 0 ? (
                selectedFiles.map((f, i) => <span key={i} className="font-medium text-gray-700">{f.name} ({(f.size/1024/1024).toFixed(2)} MB)</span>)
              ) : initialData?.File_Name ? (
                <div className="flex flex-col gap-1">
                  <span className="text-emerald-600 font-medium mb-1">Đang có: {canEditAssignmentFile ? '(Chọn tệp mới sẽ ghi đè)' : ''}</span>
                  {initialData.File_Name.split(/\n|,/).filter(Boolean).map((name: string, i: number) => {
                    const url = initialData.File_URL?.split(/\n|,/)[i] || '#';
                    return (
                      <a key={i} href={url.trim()} target="_blank" rel="noreferrer" title={name.trim()} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 max-w-full overflow-hidden">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{name.trim()}</span>
                      </a>
                    );
                  })}
                </div>
              ) : autoFillFromDoc?.File_Name ? (
                <div className="flex flex-col gap-1">
                  <span className="text-emerald-600 font-medium mb-1">Sẽ sao chép: {canEditAssignmentFile ? '(Chọn tệp mới sẽ được đính kèm chung)' : ''}</span>
                  {autoFillFromDoc.File_Name.split(/\n|,/).filter(Boolean).map((name: string, i: number) => {
                    const url = autoFillFromDoc.File_URL?.split(/\n|,/)[i] || '#';
                    return (
                      <a key={i} href={url.trim()} target="_blank" rel="noreferrer" title={name.trim()} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 max-w-full overflow-hidden">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{name.trim()}</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <span>Chưa có tệp đính kèm</span>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <button type="button" onClick={() => setSelectedFiles([])} className="text-rose-500 hover:text-rose-700 text-sm font-medium self-start">
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {/* Khu vực 2: File Báo Cáo */}
        {initialData && (
          <div>
            <label className="block text-sm font-bold text-emerald-600 mb-2">Tệp báo cáo kết quả</label>
            <div className="flex flex-col gap-3">
              {canEditResultFile && (
                <>
                  <input 
                    type="file" 
                    multiple
                    ref={resultFileInputRef} 
                    onChange={handleResultFileChange} 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => resultFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#e6f4ea] text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 transition-colors w-max"
                  >
                    <Upload className="w-4 h-4" />
                    Chọn tệp báo cáo
                  </button>
                </>
              )}
              <div className="flex flex-col text-sm text-gray-500 gap-1">
                {resultFiles.length > 0 ? (
                  resultFiles.map((f, i) => <span key={i} className="font-medium text-gray-700">{f.name} ({(f.size/1024/1024).toFixed(2)} MB)</span>)
                ) : initialData?.Result_File_Name ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-emerald-600 font-medium mb-1">Đang có: {canEditResultFile ? '(Chọn tệp mới sẽ ghi đè)' : ''}</span>
                    {initialData.Result_File_Name.split(/\n|,/).filter(Boolean).map((name: string, i: number) => {
                      const url = initialData.Result_File_URL?.split(/\n|,/)[i] || '#';
                      return (
                        <a key={i} href={url.trim()} target="_blank" rel="noreferrer" title={name.trim()} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 max-w-full overflow-hidden">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{name.trim()}</span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <span>Chưa có báo cáo</span>
                )}
              </div>
              {resultFiles.length > 0 && (
                <button type="button" onClick={() => setResultFiles([])} className="text-rose-500 hover:text-rose-700 text-sm font-medium self-start">
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {initialData && (
        <div className="border-t mt-4 pt-4">
          <label className="block text-sm font-bold text-primary mb-3">Trao đổi & Nhật ký công việc</label>
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={commentText} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!commentText.trim()) return;
                  const timeStr = new Date().toLocaleString('en-GB');
                  setPendingComments(prev => [`[${timeStr}] 💬 ${user?.FullName || 'Người dùng'} đã thảo luận:\n${commentText.trim()}`, ...prev]);
                  setCommentText('');
                }
              }}
              onChange={e => setCommentText(e.target.value)} 
              placeholder="Nhập nội dung trao đổi/báo cáo (Nhấn Enter để thêm)..." 
              className="flex-1 px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm" 
            />
            <button 
              type="button" 
              onClick={() => {
                if (!commentText.trim()) return;
                const timeStr = new Date().toLocaleString('en-GB');
                setPendingComments(prev => [`[${timeStr}] 💬 ${user?.FullName || 'Người dùng'} đã thảo luận:\n${commentText.trim()}`, ...prev]);
                setCommentText('');
              }} 
              className="px-4 py-1.5 bg-primary text-white font-bold rounded-xl text-sm whitespace-nowrap"
            >
              Thêm
            </button>
          </div>
          {pendingComments.length > 0 && (
            <p className="text-[11px] text-rose-500 font-medium mb-3 italic">* Bình luận mới đã được ghi nhận. Vui lòng nhấn "Lưu cập nhật" ở dưới cùng để lưu vĩnh viễn vào hệ thống.</p>
          )}
          
          <div className="bg-gray-50 border rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 relative">
              <div className="absolute left-1 top-2 bottom-2 w-px bg-gray-200 z-0"></div>
              {[...pendingComments, ...(initialData.History ? initialData.History.split('\n\n').filter(Boolean) : [])].map((log: string, index: number, arr: any[]) => {
                const firstBracketIndex = log.indexOf('] ');
                let timeStr = '';
                let content = log;
                if (firstBracketIndex !== -1 && log.startsWith('[')) {
                  timeStr = log.substring(0, firstBracketIndex + 1);
                  content = log.substring(firstBracketIndex + 2);
                }
                const isComment = content.includes('💬');
                return (
                  <div key={index} className="flex gap-3 text-sm relative z-10">
                    <div className="flex flex-col items-center mt-1 bg-gray-50 pb-2">
                      <div className={`w-2 h-2 rounded-full ${isComment ? 'bg-amber-500' : 'bg-primary'} flex-shrink-0 shadow-sm border border-white`}></div>
                    </div>
                    <div className={`flex-1 pb-2 whitespace-pre-wrap ${isComment ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                      {timeStr && <span className={`font-semibold mr-2 ${isComment ? 'text-amber-800' : 'text-gray-800'}`}>{timeStr}</span>}
                      {content}
                    </div>
                  </div>
                );
              })}
              {!initialData.History && pendingComments.length === 0 && (
                <div className="text-gray-400 italic text-sm ml-4">Chưa có nhật ký hay thảo luận nào.</div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {renderActionBar()}
    </form>
    </div>
  );
}
