import React, { useState, useRef } from 'react';
import { X, Save, Upload, Loader2, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fileToBase64, formatDateForInput } from '@/utils/fileHelpers';
import { generateAuditTrail } from '@/utils/auditHelper';
import { usePermissions } from '@/hooks/usePermissions';
import { ComboBox } from '@/components/ui/ComboBox';
interface OutgoingDocFormProps {
  initialData?: any;
  isReadOnly?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  onDeleteDoc?: () => Promise<void>;
}

export function OutgoingDocForm({ initialData, isReadOnly, onClose, onSubmit, onDeleteDoc }: OutgoingDocFormProps) {
  const { catalogs, staff, user, deleteCatalog } = useAppStore();
  const permissions = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    Sign_Number: initialData?.Sign_Number || '',
    Draft_Date: formatDateForInput(initialData?.Draft_Date) || '',
    Release_Deadline: formatDateForInput(initialData?.Release_Deadline) || '',
    Release_Date: formatDateForInput(initialData?.Release_Date) || '',
    Signer: initialData?.Signer || '',
    Status: initialData?.Status || '',
    Summary: initialData?.Summary || '',
    Category: initialData?.Doc_Type || '',
    Field: initialData?.Category || '',
    Recipient: initialData?.Recipient || '',
    Issuer_Department: initialData?.Issuer_Department || '',
    Urgency: initialData?.Urgency || '',
    Security: initialData?.Security || '',
    Related_Incoming_Doc: initialData?.Related_Incoming_Doc || '',
    Drafter: initialData?.Drafter || '',
    Co_Drafter: initialData?.Co_Drafter || '',
    Send_Method: initialData?.Send_Method || '',
    Send_Date: formatDateForInput(initialData?.Send_Date) || '',
    Notes: initialData?.Notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  
  const handleDelete = async () => {
    if (!onDeleteDoc) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa hồ sơ này? Hành động này không thể hoàn tác!')) {
      setIsDeleting(true);
      try {
        await onDeleteDoc();
        onClose();
      } catch (error) {
        console.error(error);
        alert('Có lỗi khi xóa!');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      
      const OUTGOING_LABELS = {
        Sign_Number: 'Số/Ký hiệu', Draft_Date: 'Ngày soạn', Release_Deadline: 'Hạn phát hành',
        Release_Date: 'Ngày ban hành', Signer: 'Người ký', Status: 'Trạng thái',
        Summary: 'Trích yếu', Category: 'Loại văn bản', Field: 'Lĩnh vực',
        Recipient: 'Nơi nhận', Issuer_Department: 'Đơn vị ban hành',
        Urgency: 'Độ khẩn', Security: 'Độ mật', Related_Incoming_Doc: 'Mã VB đến',
        Drafter: 'Cán bộ soạn thảo', Co_Drafter: 'Cán bộ phối hợp',
        Send_Method: 'Hình thức gửi', Send_Date: 'Ngày gửi', Notes: 'Ghi chú'
      };
      
      const auditLog = initialData ? generateAuditTrail(initialData, formData, OUTGOING_LABELS, user?.FullName || 'Unknown') : '';

      const payload = {
        signNumber: formData.Sign_Number,
        draftDate: formData.Draft_Date,
        releaseDeadline: formData.Release_Deadline,
        releaseDate: formData.Release_Date,
        signer: formData.Signer,
        status: formData.Status,
        summary: formData.Summary,
        docType: formData.Category,
        category: formData.Field,
        receiver: formData.Recipient,
        issuerDepartment: formData.Issuer_Department,
        urgency: formData.Urgency,
        security: formData.Security,
        relatedIncomingDoc: formData.Related_Incoming_Doc,
        drafter: formData.Drafter,
        coAssignee: formData.Co_Drafter,
        sendMethod: formData.Send_Method,
        sendDate: formData.Send_Date,
        notes: formData.Notes,
        files: filesData,
        auditLog: auditLog,
        createdBy: user?.FullName || ''
      };
      
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Đã có lỗi xảy ra khi lưu form!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCatalogOptions = (type: string) => {
    return catalogs.filter(c => String(c.Type).toLowerCase() === String(type).toLowerCase()).map(c => c.Value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 flex items-center justify-between bg-white border-b sticky top-0 z-10">
          <h2 className="text-xl font-bold text-primary">{initialData ? 'Xem / Sửa văn bản đi' : 'Thêm văn bản đi'}</h2>
          <button onClick={onClose} disabled={isSubmitting || isDeleting} className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="outgoing-doc-form" onSubmit={handleSubmit} className="space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Số/Ký hiệu văn bản đi</label>
                <input type="text" name="Sign_Number" required value={formData.Sign_Number} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Ngày soạn</label>
                <input type="date" name="Draft_Date" value={formData.Draft_Date} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Hạn phát hành</label>
                <input type="date" name="Release_Deadline" value={formData.Release_Deadline} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Ngày ký/ban hành</label>
                <input type="date" name="Release_Date" value={formData.Release_Date} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Người ký</label>
                <select name="Signer" value={formData.Signer} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-white">
                  <option value="">Chọn người ký</option>
                  {staff.map(s => <option key={s.Staff_ID} value={s.Full_Name}>{s.Full_Name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Trạng thái phát hành</label>
                <ComboBox name="Status" allowInput={false} value={formData.Status} onChange={handleChange} options={getCatalogOptions('Trạng thái VB đi')} placeholder="Chọn hoặc nhập..." />
              </div>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-bold text-primary mb-1">Trích yếu / nội dung chính</label>
              <textarea name="Summary" required value={formData.Summary} onChange={handleChange} rows={3} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"></textarea>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Loại văn bản</label>
                <ComboBox name="Category" value={formData.Category} options={getCatalogOptions('Loại văn bản')} onChange={handleChange} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Loại văn bản', val) }} placeholder="Chọn hoặc nhập loại văn bản..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Lĩnh vực</label>
                <ComboBox name="Field" value={formData.Field} options={getCatalogOptions('Lĩnh vực')} onChange={handleChange} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Lĩnh vực', val) }} placeholder="Chọn hoặc nhập lĩnh vực..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Nơi nhận / đơn vị nhận</label>
                <ComboBox name="Recipient" value={formData.Recipient} options={getCatalogOptions('Cơ quan ban hành/nhận')} onChange={handleChange} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Cơ quan ban hành/nhận', val) }} placeholder="Chọn hoặc nhập nơi nhận..." />
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Đơn vị ban hành / chủ trì</label>
                <ComboBox name="Issuer_Department" value={formData.Issuer_Department} onChange={handleChange} options={getCatalogOptions('Đơn vị/Tổ công tác')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Đơn vị/Tổ công tác', val) }} placeholder="Chọn hoặc nhập đơn vị" />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Độ khẩn</label>
                <ComboBox name="Urgency" allowInput={false} value={formData.Urgency} onChange={handleChange} options={getCatalogOptions('Độ khẩn/Ưu tiên')} placeholder="Chọn hoặc nhập..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Độ mật</label>
                <ComboBox name="Security" allowInput={false} value={formData.Security} onChange={handleChange} options={getCatalogOptions('Độ mật')} placeholder="Chọn hoặc nhập..." />
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Mã VB đến liên quan</label>
                <input type="text" name="Related_Incoming_Doc" value={formData.Related_Incoming_Doc} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Cán bộ soạn thảo</label>
                <select name="Drafter" value={formData.Drafter} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-white">
                  <option value="">Chọn cán bộ soạn thảo</option>
                  {staff.map(s => <option key={s.Staff_ID} value={s.Full_Name}>{s.Full_Name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Cán bộ phối hợp</label>
                <select name="Co_Drafter" value={formData.Co_Drafter} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none bg-white">
                  <option value="">Chọn cán bộ phối hợp</option>
                  {staff.map(s => <option key={s.Staff_ID} value={s.Full_Name}>{s.Full_Name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 7 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Hình thức gửi</label>
                <ComboBox name="Send_Method" value={formData.Send_Method} onChange={handleChange} options={getCatalogOptions('Hình thức gửi')} onDelete={(val) => { if(window.confirm('Bạn có chắc muốn xóa "' + val + '" khỏi danh mục?')) deleteCatalog('Hình thức gửi', val) }} placeholder="Chọn hoặc nhập..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary mb-1">Ngày gửi / hoàn thành</label>
                <input type="date" name="Send_Date" value={formData.Send_Date} onChange={handleChange} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-600" />
              </div>
            </div>

            {/* Row 8 */}
            <div>
              <label className="block text-sm font-bold text-primary mb-1">Ghi chú</label>
              <textarea name="Notes" value={formData.Notes} onChange={handleChange} rows={2} className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"></textarea>
            </div>
            
            {initialData?.History && (
              <div className="border-t mt-4 pt-4">
                <label className="block text-sm font-bold text-primary mb-2">Nhật ký cập nhật</label>
                <textarea 
                  value={initialData.History} 
                  readOnly 
                  rows={4} 
                  className="w-full px-3 py-1.5 border rounded-xl bg-gray-50 text-gray-600 text-sm focus:outline-none resize-none font-mono"
                />
              </div>
            )}
            
            <div className="border-t pt-4">
              <label className="block text-sm font-bold text-primary mb-2">Tệp đính kèm</label>
              <div className="flex items-center gap-4">
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#e6f4ea] text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Chọn tệp
                </button>
                <div className="flex flex-col text-sm text-gray-500 gap-1">
                  {selectedFiles.length > 0 ? (
                    selectedFiles.map((f, i) => <span key={i}>{f.name} ({(f.size/1024/1024).toFixed(2)} MB)</span>)
                  ) : initialData?.File_Name ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-amber-600 font-medium mb-1">Đang có: (Chọn tệp mới sẽ ghi đè)</span>
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
                  ) : (
                    <span>Chưa chọn tệp</span>
                  )}
                </div>
                {selectedFiles.length > 0 && (
                  <button type="button" onClick={() => setSelectedFiles([])} className="text-rose-500 hover:text-rose-700 text-sm font-medium">
                    Xóa tất cả
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
          
        {permissions.isAdmin && initialData && onDeleteDoc && (
          <button type="button" disabled={isSubmitting || isDeleting} onClick={handleDelete} className="px-6 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors mr-auto flex items-center gap-2">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            {isDeleting ? 'Đang xóa...' : 'Xóa hồ sơ'}
          </button>
        )}
    <button type="button" disabled={isSubmitting || isDeleting} onClick={onClose} className="px-6 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
            {isReadOnly ? 'Đóng' : 'Hủy'}
          </button>
          {!isReadOnly && (initialData ? permissions.canEditDoc : permissions.canAddOutgoing) && (
            <button form="outgoing-doc-form" disabled={isSubmitting || isDeleting} type="submit" className="flex items-center gap-2 px-6 py-1.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Đang lưu...' : 'Lưu văn bản đi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
