const fs = require('fs');

const path = 'src/pages/Tasks.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. We need to update the groupedDocs useMemo logic to include the aggregate fields.
const searchGroupLogic = "const docGroups: { [key: string]: any } = {};";
const newGroupLogic = `
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
           fileUrl: incomingDoc?.File_URL || t.File_URL || '',
           leadAssignee: '',
           coopCount: 0,
           priority: 'Bình thường',
           category: t.Category || '',
           assigner: t.Assigner || '',
           deadline: '',
           totalProgress: 0,
           taskCount: 0,
           status: 'Đang xử lý'
         };
      }
      
      const group = docGroups[docId];
      group.tasks.push(t);
      group.taskCount += 1;
      group.totalProgress += Number(t.Progress_Percentage) || 0;
      
      if (t.Role === 'Chủ trì') {
          group.leadAssignee = t.Lead_Assignee;
          group.deadline = t.Deadline || group.deadline;
          if (!['Quá hạn', 'Sắp hạn'].includes(group.status)) {
              group.status = t.Status;
          }
      } else if (t.Role === 'Phối hợp') {
          group.coopCount += 1;
      }
      
      if (!group.deadline) group.deadline = t.Deadline; // fallback
      
      if (t.Status === 'Quá hạn') group.status = 'Quá hạn';
      else if (t.Status === 'Sắp hạn' && group.status !== 'Quá hạn') group.status = 'Sắp hạn';
      else if (t.Status === 'Xin gia hạn' && !['Quá hạn', 'Sắp hạn'].includes(group.status)) group.status = 'Xin gia hạn';
      
      const p = t.Priority || '';
      if (p.includes('Hỏa') || p.includes('Thượng')) group.priority = 'Hỏa tốc';
      else if (p.includes('khẩn') && group.priority !== 'Hỏa tốc') group.priority = 'Khẩn';
    });
    
    Object.values(docGroups).forEach((g: any) => {
        g.avgProgress = g.taskCount > 0 ? Math.round(g.totalProgress / g.taskCount) : 0;
        const allCompleted = g.taskCount > 0 && g.tasks.every((t: any) => t.Status === 'Hoàn thành' || t.Status === 'Đã đóng');
        if (allCompleted) g.status = 'Hoàn thành';
    });
`;

// Find the old docGroups logic and replace it
const oldGroupLogicStart = "const docGroups: { [key: string]: any } = {};";
const oldGroupLogicEnd = "return Object.values(docGroups);";
const startIndex = content.indexOf(oldGroupLogicStart);
const endIndex = content.indexOf(oldGroupLogicEnd);

if (startIndex !== -1 && endIndex !== -1) {
    const originalGroupLogic = content.substring(startIndex, endIndex);
    content = content.replace(originalGroupLogic, newGroupLogic + '\n    ');
} else {
    console.log("Could not find the group logic to replace!");
}


// 2. Update the rendering of the Parent Group Header Row to fill all columns!
const oldParentRowStart = "{/* Parent Group Header Row */}";
const oldParentRowEnd = "{/* Child Task Rows (Visible only when Expanded) */}";

const pIdxStart = content.indexOf(oldParentRowStart);
const pIdxEnd = content.indexOf(oldParentRowEnd);

if (pIdxStart !== -1 && pIdxEnd !== -1) {
    const newParentRow = `{/* Parent Group Header Row */}
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
                        <td className="px-4 py-3 max-w-[300px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-blue-900 text-sm">
                                {doc.signNumber ? \`Văn bản số: \${doc.signNumber}\` : 'Nhóm công việc độc lập'}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-full whitespace-nowrap">
                                {doc.taskCount} việc
                              </span>
                            </div>
                            <span className="text-gray-600 text-xs italic line-clamp-2" title={doc.summary}>{doc.summary || 'Không có trích yếu'}</span>
                            <div className="flex items-center gap-2 text-[11px] mt-1">
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-700 font-semibold rounded border border-red-100 whitespace-nowrap line-clamp-1">
                                Chủ trì: {leadName}
                              </span>
                              {coopCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 font-semibold rounded border border-gray-200 whitespace-nowrap">
                                  Phối hợp: {coopCount} người
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {doc.priority && doc.priority !== 'Bình thường' ? (
                            <span className={\`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap \${
                              doc.priority.includes('Hỏa') ? 'bg-red-100 text-red-700' :
                              doc.priority.includes('khẩn') ? 'bg-orange-100 text-orange-700' :
                              'bg-amber-100 text-amber-700'
                            }\`}>
                              {doc.priority}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Bình thường</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{doc.category}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{doc.assigner || 'Hệ thống'}</td>
                        <td className="px-4 py-3 text-center text-xs font-medium text-gray-900">{doc.deadline || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="w-16 mx-auto bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={\`h-2 rounded-full \${doc.avgProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}\`} 
                              style={{ width: \`\${doc.avgProgress || 0}%\` }}
                            ></div>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium mt-1">{doc.avgProgress || 0}%</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                            {doc.status === 'Sắp hạn' ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">SẮP HẠN</span>
                            ) : doc.status === 'Quá hạn' ? (
                              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold uppercase">QUÁ HẠN</span>
                            ) : doc.status === 'Hoàn thành' ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">ĐÃ XONG</span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase">{doc.status || 'Đang xử lý'}</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2 items-center justify-center">
                             {doc.fileUrl ? (
                               <a 
                                 href={doc.fileUrl} 
                                 target="_blank" 
                                 rel="noreferrer" 
                                 className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition-colors w-full justify-center border border-blue-200"
                                 title="Xem File Văn bản gốc"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <FileText className="w-3.5 h-3.5" /> File VB
                               </a>
                             ) : (
                               <span className="px-2.5 py-1 bg-gray-50 text-gray-400 rounded text-[10px] w-full text-center border border-gray-100">Không File</span>
                             )}
                             <button className="text-[11px] font-bold text-gray-500 hover:text-blue-600 w-full text-center">
                               {isExpanded ? 'Thu gọn ▲' : 'Chi tiết ▼'}
                             </button>
                          </div>
                        </td>
                      </tr>

                      `;
    const oldStr = content.substring(pIdxStart, pIdxEnd);
    content = content.replace(oldStr, newParentRow);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully updated parent row rendering to show aggregate info and File button!");
} else {
    console.log("Could not find the Parent Group Header Row to replace!");
}
