const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const repoPath = 'd:\\Antigravity Code\\WebApp_QLVB';

function readObject(sha1) {
    const dir = sha1.substring(0, 2);
    const file = sha1.substring(2);
    const objPath = path.join(repoPath, '.git', 'objects', dir, file);
    if (!fs.existsSync(objPath)) return null;
    const compressed = fs.readFileSync(objPath);
    return zlib.inflateSync(compressed);
}

// Read index to find content.js
const indexPath = path.join(repoPath, '.git', 'index');
const indexData = fs.readFileSync(indexPath);

// Very simple search for chrome-extension/content.js in index
const searchStr = 'chrome-extension/content.js';
const idx = indexData.indexOf(Buffer.from(searchStr));

if (idx !== -1) {
    // The sha1 is usually 20 bytes located right before the path, minus some flags
    // In git index v2, entry is:
    // ctime (8), mtime (8), dev (4), ino (4), mode (4), uid (4), gid (4), size (4), sha1 (20), flags (2), path
    // So sha1 is at idx - 22 bytes!
    const sha1Start = idx - 22;
    const sha1Buf = indexData.slice(sha1Start, sha1Start + 20);
    const sha1Hex = sha1Buf.toString('hex');
    console.log("Found sha1 in index:", sha1Hex);
    
    const objData = readObject(sha1Hex);
    if (objData) {
        // Blob format: "blob <size>\0<content>"
        const nullIdx = objData.indexOf(0);
        const content = objData.slice(nullIdx + 1);
        fs.writeFileSync('C:\\Users\\NguyenDai\\Downloads\\recovered_content.js', content);
        console.log("Successfully recovered content.js!");
    } else {
        console.log("Could not read object.");
    }
} else {
    console.log("Not found in index.");
}
