const fs = require('fs');
const path = 'src/pages/Tasks.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add renderFileBadges helper inside Tasks component
const searchHelperInject = `export function Tasks() {`;

const helperFunc = `export function Tasks() {
  const renderFileBadges = (fileStr?: string, defaultLabel = 'File VB', colorScheme = 'blue') => {
    if (!fileStr || typeof fileStr !== 'string') return null;
    const urls = fileStr.split(/[\\n,]/).map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 items-center justify-center">
        {urls.map((url, i) => {
          const label = urls.length === 1 ? defaultLabel : \`\${defaultLabel} \${i + 1}\`;
          const isBlue = colorScheme === 'blue';
          const bgClass = isBlue 
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200' 
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200';

          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className={\`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors border \${bgClass}\`}
              title={\`Mở \${label}\`}
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    );
  };
`;

content = content.replace(searchHelperInject, helperFunc);

// 2. Replace Parent Row file rendering
const oldParentFileBlock = `{doc.fileUrl ? (
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
                             )}`;

const newParentFileBlock = `{renderFileBadges(doc.fileUrl, 'File VB', 'blue') || (
                               <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-[10px] w-full text-center border border-gray-100">Không File</span>
                             )}`;

content = content.replace(oldParentFileBlock, newParentFileBlock);

// 3. Replace Child Row Thao tác column to include file buttons
const oldChildActionCell = `<td className="px-4 py-2.5">
                             <div className="flex items-center justify-center gap-1.5">
                               <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Xem"><Eye className="w-3.5 h-3.5" /></button>
                               {permissions.canEditDoc && <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-amber-600 transition-colors" title="Sửa"><Edit className="w-3.5 h-3.5" /></button>}
                               {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>}
                             </div>
                          </td>`;

const newChildActionCell = `<td className="px-4 py-2.5">
                             <div className="flex flex-col gap-1 items-center justify-center">
                               {renderFileBadges(task.Result_File_URL || task.Result_File, 'Báo cáo', 'emerald')}
                               <div className="flex items-center justify-center gap-1.5">
                                 <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Xem"><Eye className="w-3.5 h-3.5" /></button>
                                 {permissions.canEditDoc && <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-amber-600 transition-colors" title="Sửa"><Edit className="w-3.5 h-3.5" /></button>}
                                 {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>}
                               </div>
                             </div>
                          </td>`;

content = content.replace(oldChildActionCell, newChildActionCell);

// 4. Replace Flat Table Thao tác cell to include file buttons
const oldFlatActionCell = `<td className="px-4 py-3">
                       <div className="flex items-center justify-center gap-2">
                         <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                         {(user?.FullName === task.Lead_Assignee) && task.Status !== 'Hoàn thành' && (
                           <button onClick={() => handleRequestApproval(task)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                         )}
                         {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                       </div>
                    </td>`;

const newFlatActionCell = `<td className="px-4 py-3">
                       <div className="flex flex-col gap-1 items-center justify-center">
                         {renderFileBadges(incomingDoc?.File_URL || task.File_URL, 'File VB', 'blue')}
                         {renderFileBadges(task.Result_File_URL || task.Result_File, 'Báo cáo', 'emerald')}
                         <div className="flex items-center justify-center gap-2 mt-1">
                           <button onClick={() => handleEdit(task)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Xem/Sửa"><Eye className="w-4 h-4" /></button>
                           {(user?.FullName === task.Lead_Assignee) && task.Status !== 'Hoàn thành' && (
                             <button onClick={() => handleRequestApproval(task)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors" title="Xin duyệt"><CheckCircle className="w-4 h-4" /></button>
                           )}
                           {permissions.canDelete && <button onClick={() => handleDelete(task.Task_ID)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors" title="Xóa"><Trash2 className="w-4 h-4" /></button>}
                         </div>
                       </div>
                    </td>`;

content = content.replace(oldFlatActionCell, newFlatActionCell);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully added multi-file support to Tasks.tsx');
