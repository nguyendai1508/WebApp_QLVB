const fs = require('fs');
let code = fs.readFileSync('gas/Code.gs', 'utf8');

const funcStr = `
function _autoAddSetupIfMissing(type, value) {
  if (!type || !value) return;
  try {
    const sheet = getDb().getSheetByName(SHEET_NAMES.SETUP);
    if (!sheet) return;
    const colIdx = _getSetupColumnIndex(sheet, type);
    if (colIdx === -1) return;
    
    const numRows = Math.max(1, sheet.getLastRow() - 1);
    const colValues = sheet.getRange(2, colIdx, numRows, 1).getValues();
    let insertRow = 2;
    let found = false;
    for (let i = 0; i < colValues.length; i++) {
      const cellVal = String(colValues[i][0]).trim();
      if (cellVal.toLowerCase() === String(value).trim().toLowerCase()) {
        found = true;
        break;
      }
      if (!cellVal) {
        insertRow = i + 2;
        break;
      }
      insertRow = i + 3;
    }
    if (!found) {
      sheet.getRange(insertRow, colIdx).setValue(String(value).trim());
    }
  } catch (e) {
    console.log('Error auto add setup', e);
  }
}
`;

if (!code.includes('_autoAddSetupIfMissing')) {
    code = code.replace('function addSetupData(data) {', funcStr + '\nfunction addSetupData(data) {');
}

code = code.replace(/appendDataByHeader\(SHEET_NAMES\.INCOMING, 1, rowData\);\s*return \{ success: true/g, 
`appendDataByHeader(SHEET_NAMES.INCOMING, 1, rowData);
    _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.issuer);
    return { success: true`);

code = code.replace(/updateDataByHeader\(SHEET_NAMES\.INCOMING, 'Mã VB đến', id, 1, rowData\);\s*return \{ success: true/g, 
`updateDataByHeader(SHEET_NAMES.INCOMING, 'Mã VB đến', id, 1, rowData);
    if (data.issuer) _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.issuer);
    return { success: true`);

code = code.replace(/appendDataByHeader\(SHEET_NAMES\.OUTGOING, 1, rowData\);\s*return \{ success: true/g, 
`appendDataByHeader(SHEET_NAMES.OUTGOING, 1, rowData);
    _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.recipient);
    return { success: true`);

code = code.replace(/updateDataByHeader\(SHEET_NAMES\.OUTGOING, 'Mã VB đi', id, 1, rowData\);\s*return \{ success: true/g, 
`updateDataByHeader(SHEET_NAMES.OUTGOING, 'Mã VB đi', id, 1, rowData);
    if (data.recipient) _autoAddSetupIfMissing('Cơ quan ban hành/nhận', data.recipient);
    return { success: true`);

fs.writeFileSync('gas/Code.gs', code);
console.log('Patched Code.gs successfully.');
