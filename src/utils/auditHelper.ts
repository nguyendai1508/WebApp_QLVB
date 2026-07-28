// src/utils/auditHelper.ts

export function generateAuditTrail(
  initialData: any, 
  newData: any, 
  fieldLabels: Record<string, string>, 
  userName: string
): string {
  if (!initialData) return '';
  
  const changes: string[] = [];
  
  for (const key in newData) {
    if (fieldLabels[key]) {
      const oldVal = initialData[key] || '';
      const newVal = newData[key] || '';
      
      // Xử lý riêng cho ngày tháng do định dạng khác nhau giữa HTML Date input và Google Sheet (YYYY-MM-DD vs DD/MM/YYYY)
      let normalizedOld = oldVal;
      let normalizedNew = newVal;
      
      // Nếu oldVal là dạng DD/MM/YYYY, chuyển thành YYYY-MM-DD để so sánh công bằng
      if (typeof oldVal === 'string' && oldVal.includes('/')) {
        const parts = oldVal.split('/');
        if (parts.length === 3) {
          normalizedOld = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      let displayOld = oldVal;
      let displayNew = newVal;
      if (typeof newVal === 'string' && newVal.includes('-')) {
        const dParts = newVal.split('-');
        if (dParts.length === 3) {
          displayNew = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
        }
      }
      
      if (normalizedOld !== normalizedNew) {
        changes.push(`- [${fieldLabels[key]}]: từ "${displayOld}" thành "${displayNew}"`);
      }
    }
  }
  
  if (changes.length === 0) return '';
  
  const now = new Date();
  const timeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return `[${timeStr}] ${userName} đã cập nhật:\n${changes.join('\n')}`;
}
