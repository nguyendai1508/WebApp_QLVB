const fs = require('fs');

const path = 'src/pages/Tasks.tsx';
const backupPath = 'src/pages/Tasks_backup.tsx';

let content = fs.readFileSync(backupPath, 'utf8');

// 1. Add incomingDocs to store import
content = content.replace(
    "const { tasks, catalogs, staff, initialize, setIsLoading, user } = useAppStore();",
    "const { tasks, incomingDocs, catalogs, staff, initialize, setIsLoading, user } = useAppStore();"
);

// 2. Add groupedDocs logic before paginatedTasks
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
         };
      }
      docGroups[docId].tasks.push(t);
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

// 3. Extract the original Table header and row to reuse them or rebuild them.
const startMarker = '<div className="overflow-x-auto">';
const endMarker = '</div>\n      </div>\n\n      <Modal ';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const beforeStr = content.substring(0, startIndex + startMarker.length);
    const afterStr = "\n      " + content.substring(endIndex);

    const flatTableHtml = `
          {viewMode === 'ALL' ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium w-10 text-center">STT</th>
                  <th className="px-4 py-3 font-medium min-w-[300px]">Cán bộ xử lý</th>
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
                {paginatedDocs.map((doc: any, dIdx: number) => (
                  <React.Fragment key={dIdx}>
                    <tr className="bg-blue-50/50 border-t-2 border-blue-100">
                      <td className="px-4 py-3 font-bold text-center text-blue-800">{dIdx + 1}</td>
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-900 text-sm">{doc.signNumber ? \`Văn bản số: \${doc.signNumber}\` : 'Nhóm công việc khác'}</span>
                          <span className="text-blue-700 text-xs italic line-clamp-1">{doc.summary || 'Không có trích yếu'}</span>
                        </div>
                      </td>
                    </tr>
                    {doc.tasks.map((task: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 bg-white">
                        <td className="px-4 py-3 text-center"></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {task.Role === 'Chủ trì' ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold whitespace-nowrap">CHỦ TRÌ</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold whitespace-nowrap">PHỐI HỢP</span>
                            )}
                            <span className="font-medium text-gray-900">{task.Lead_Assignee}</span>
                          </div>
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
                          ) : (
                            <span className="text-gray-400 text-[10px]">Bình thường</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{task.Category}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{task.Assigner || 'Hệ thống'}</td>
                        <td className="px-4 py-3 text-center text-xs">
                          {task.Actual_Complete_Date || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="w-16 mx-auto bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={\`h-2 rounded-full \${Number(task.Progress_Percentage) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}\`} 
                              style={{ width: \`\${task.Progress_Percentage || 0}%\` }}
                            ></div>
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
                             {permissions.canEditDoc && <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-amber-600 transition-colors"><Edit className="w-4 h-4" /></button>}
                             {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {paginatedDocs.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Không có công việc nào.</td></tr>}
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

    content = beforeStr + "\n" + flatTableHtml + afterStr;
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully rewrote table layout in Tasks.tsx");
} else {
    console.log("Could not find start or end markers for table rendering in Tasks.tsx");
}
