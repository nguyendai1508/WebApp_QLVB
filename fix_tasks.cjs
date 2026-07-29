const fs = require('fs');

const path = 'src/pages/Tasks.tsx';
const backupPath = 'src/pages/Tasks_backup.tsx';

let content = fs.readFileSync(backupPath, 'utf8');

// 1. Update lucide-react imports to include ChevronRight, ChevronDown, Layers
content = content.replace(
    "import { Eye, Edit, Trash2, CheckCircle, Search, PlusCircle, ClipboardList, CalendarClock, CalendarX, User, FileText, ArrowUpDown, Filter } from 'lucide-react';",
    "import { Eye, Edit, Trash2, CheckCircle, Search, PlusCircle, ClipboardList, CalendarClock, CalendarX, User, FileText, ArrowUpDown, Filter, ChevronRight, ChevronDown, Layers, UserCheck, Users } from 'lucide-react';"
);

// 2. Add incomingDocs to store import
content = content.replace(
    "const { tasks, catalogs, staff, initialize, setIsLoading, user } = useAppStore();",
    "const { tasks, incomingDocs, catalogs, staff, initialize, setIsLoading, user } = useAppStore();"
);

// 3. Add state for Role filter & Collapsible groups
const stateSearch = "const [selectedIds, setSelectedIds] = useState<string[]>([]);";
const newState = `const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
`;
content = content.replace(stateSearch, newState);

// 4. Update filteredTasks to account for roleFilter
const filterRoleLogic = `
      // Lọc theo vai trò Chủ trì / Phối hợp
      if (roleFilter === 'LEAD' && task.Role !== 'Chủ trì') return false;
      if (roleFilter === 'COOP' && task.Role !== 'Phối hợp') return false;
`;

// Insert filterRoleLogic inside filteredTasks
content = content.replace(
    "// Lọc theo deadline",
    filterRoleLogic + "\n      // Lọc theo deadline"
);

// 5. Add groupedDocs logic before paginatedTasks
const paginatedRegex = "const paginatedTasks = sortedTasks.slice(0, displayLimit);";
const groupedLogic = `
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
           leadAssignee: '',
           coopCount: 0
         };
      }
      docGroups[docId].tasks.push(t);
      if (t.Role === 'Chủ trì') {
        docGroups[docId].leadAssignee = t.Lead_Assignee;
      } else if (t.Role === 'Phối hợp') {
        docGroups[docId].coopCount += 1;
      }
    });
    
    return Object.values(docGroups);
  }, [sortedTasks, incomingDocs, viewMode]);

  const paginatedDocs = viewMode === 'ALL'
    ? groupedDocs.slice(0, displayLimit)
    : [];

  const paginatedTasks = viewMode !== 'ALL'
    ? sortedTasks.slice(0, displayLimit)
    : [];
`;

content = content.replace(paginatedRegex, groupedLogic);

// 6. Update Table UI to support Collapsible Accordion & Role Tabs
const startMarker = '<div className="overflow-x-auto">';
const endMarker = '</div>\n      </div>\n\n      <Modal ';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const beforeStr = content.substring(0, startIndex);
    const afterStr = "\n      " + content.substring(endIndex);

    const customControlsAndTable = `
        {/* Bộ lọc Vai trò & Thao tác Gom nhóm */}
        <div className="p-3 bg-gray-50 border-b flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lọc vai trò:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${
                  roleFilter === 'ALL' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }\`}
              >
                Tất cả vai trò
              </button>
              <button
                onClick={() => setRoleFilter('LEAD')}
                className={\`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors \${
                  roleFilter === 'LEAD' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:bg-red-50'
                }\`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Chỉ xem CHỦ TRÌ
              </button>
              <button
                onClick={() => setRoleFilter('COOP')}
                className={\`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors \${
                  roleFilter === 'COOP' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'
                }\`}
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
                        className={\`cursor-pointer transition-colors \${
                          isExpanded ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'bg-white hover:bg-blue-50/30'
                        }\`}
                      >
                        <td className="px-4 py-3 font-bold text-center text-blue-800">
                          <div className="flex items-center justify-center gap-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <span>{dIdx + 1}</span>
                          </div>
                        </td>
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-blue-900 text-sm">
                                {doc.signNumber ? \`Văn bản số: \${doc.signNumber}\` : 'Nhóm công việc độc lập'}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-full">
                                {doc.tasks.length} phân công
                              </span>
                              <div className="ml-auto flex items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" /> 主 Chủ trì: {leadName}
                                </span>
                                {coopCount > 0 && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-medium rounded flex items-center gap-1">
                                    <Users className="w-3 h-3 text-blue-600" /> Phối hợp: {coopCount} cán bộ
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-gray-600 text-xs italic line-clamp-1">{doc.summary || 'Không có trích yếu'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-semibold text-blue-600 hover:underline">
                            {isExpanded ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
                          </span>
                        </td>
                      </tr>

                      {/* Child Task Rows (Visible only when Expanded) */}
                      {isExpanded && doc.tasks.map((task: any, idx: number) => (
                        <tr key={\`child-\${idx}\`} className="bg-gray-50/60 hover:bg-gray-100/80 border-t border-gray-100">
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
                              <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap \${
                                task.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                                task.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                                'bg-amber-100 text-amber-700'
                              }\`}>
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
                                className={\`h-1.5 rounded-full \${Number(task.Progress_Percentage) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}\`} 
                                style={{ width: \`\${task.Progress_Percentage || 0}%\` }}
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
                        <span className={\`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap \${
                          task.Priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                          task.Priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }\`}>
                          {task.Priority}
                        </span>
                      ) : <span className="text-gray-400 text-[10px]">Bình thường</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-xs mb-1">{signNumber ? \`Số \${signNumber}\` : 'Việc chung'}</span>
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
                        <div className={\`h-2 rounded-full \${Number(task.Progress_Percentage) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}\`} style={{ width: \`\${task.Progress_Percentage || 0}%\` }}></div>
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
`;

    content = beforeStr + customControlsAndTable + afterStr;
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully updated Tasks.tsx with Accordion & Role Filter!");
} else {
    console.log("Could not find start or end markers for table rendering in Tasks.tsx");
}
