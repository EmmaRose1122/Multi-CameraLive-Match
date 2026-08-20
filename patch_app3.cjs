const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetMain = `<div className={activeTab === 'camera' ? 'flex-1 flex flex-col h-screen absolute inset-0 z-[100] bg-black' : 'hidden'}>`;
const replaceMain = `<div className={activeTab === 'camera' ? 'flex-1 flex flex-col h-screen absolute inset-0 z-[100] bg-black' : 'fixed -top-[9999px] -left-[9999px] w-[10px] h-[10px] opacity-0 pointer-events-none overflow-hidden'}>`;

content = content.replace(targetMain, replaceMain);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx hidden class");
