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

function parseTree(objData) {
    const nullIdx = objData.indexOf(0);
    let offset = nullIdx + 1;
    const entries = [];
    while (offset < objData.length) {
        const spaceIdx = objData.indexOf(32, offset);
        const mode = objData.slice(offset, spaceIdx).toString('ascii');
        const nullIdx2 = objData.indexOf(0, spaceIdx);
        const name = objData.slice(spaceIdx + 1, nullIdx2).toString('utf8');
        const sha1 = objData.slice(nullIdx2 + 1, nullIdx2 + 21).toString('hex');
        entries.push({ mode, name, sha1 });
        offset = nullIdx2 + 21;
    }
    return entries;
}

const commitSha = '92c1305571ad3b90b8602965fac3692eb6d828e7';
const commitData = readObject(commitSha);
const nullIdx = commitData.indexOf(0);
const commitContent = commitData.slice(nullIdx + 1).toString('utf8');
const treeSha = commitContent.match(/^tree ([a-f0-9]{40})/m)[1];

const rootTreeData = readObject(treeSha);
const rootTree = parseTree(rootTreeData);
const ceEntry = rootTree.find(e => e.name === 'chrome-extension');

const ceTreeData = readObject(ceEntry.sha1);
const ceTree = parseTree(ceTreeData);
const contentEntry = ceTree.find(e => e.name === 'content.js');

const blobData = readObject(contentEntry.sha1);
const blobNullIdx = blobData.indexOf(0);
const contentJs = blobData.slice(blobNullIdx + 1);

fs.writeFileSync('C:\\Users\\NguyenDai\\Downloads\\recovered_clean_content.js', contentJs);
console.log("Successfully extracted clean content.js from previous commit!");
