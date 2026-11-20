import { readdir, readFile, writeFile } from "node:fs/promises";
const rootHtml=(await readdir(".")).filter(name=>name.endsWith(".html")&&!name.startsWith("google"));
for(const file of rootHtml){
 let html=await readFile(file,"utf8");
 if(!html.includes("anixia-unified-theme.css")){
  const tags='\n<link rel="stylesheet" href="/anixia/anixia-unified-theme.css?v=20261120-1">\n<script src="/anixia/anixia-global-header.js?v=20261120-1" defer></script>\n';
  const closeHead=html.toLowerCase().lastIndexOf("</head>");
  if(closeHead<0) throw new Error("Missing </head> in "+file);
  html=html.slice(0,closeHead)+tags+"</head>"+html.slice(closeHead+7);
  await writeFile(file,html,"utf8");
 }
}
const homePath="anixia-home.js";
let home=await readFile(homePath,"utf8");
home=home.replace('      loadSection("new-works", { sort: "newest", limit: 5 })\n','');
await writeFile(homePath,home,"utf8");
const indexPath="index.html";
let index=await readFile(indexPath,"utf8");
index=index.replace('recent_label:"RECENTLY ADDED",recent_title:"最近追加された作品",recent_sub:"データベースに追加・更新された作品",view_database:"作品一覧 →",','');
index=index.replace('recent_label:"RECENTLY ADDED",recent_title:"Recently added",recent_sub:"New and updated database entries",view_database:"Browse all titles →",','');
await writeFile(indexPath,index,"utf8");
console.log(`Patched shared shell into ${rootHtml.length} top-level HTML pages.`);
