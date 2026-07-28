const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir);

for (const file of files) {
    if (file.endsWith('.tsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        const originalContent = content;
        content = content.replace(/c\.Type === type/g, "String(c.Type).toLowerCase() === String(type).toLowerCase()");
        content = content.replace(/c\.Type\.toLowerCase\(\) === type\.toLowerCase\(\)/g, "String(c.Type).toLowerCase() === String(type).toLowerCase()");
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file}`);
        }
    }
}
