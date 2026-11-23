import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=path.join(root,'.pages-dist');
const failures=[],files=await fs.readdir(output,{recursive:true});
const base=new URL('https://dymuravjev.github.io/polyd/');
for(const file of files.filter(file=>file.endsWith('.html'))){
 const html=await fs.readFile(path.join(output,file),'utf8');
 if(!html.includes('<base href="/polyd/">'))failures.push(file+': missing project base');
 if(!html.includes('name="robots" content="noindex,nofollow"'))failures.push(file+': demo must not be indexed');
 if(/<form\b/.test(html)&&!html.includes('data-demo="true"'))failures.push(file+': forms need explicit demo mode');
 const resourceMarkup=html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>').replace(/<!--[\s\S]*?-->/g,'');
 for(const match of resourceMarkup.matchAll(/(?:href|src)="([^"#]+)"/g)){
  if(/^(?:data:|mailto:|tel:|https?:|javascript:)/.test(match[1]))continue;
  const resolved=new URL(match[1],base);
  if(!resolved.pathname.startsWith('/polyd/')){failures.push(file+': escaped project base '+match[1]);continue;}
  const local=decodeURIComponent(resolved.pathname.slice('/polyd/'.length))||'index.html';
  try{await fs.access(path.join(output,local));}catch{failures.push(file+': missing '+local);}
 }
}
if(files.some(file=>file.endsWith('.php')||file.startsWith('forms/')))failures.push('PHP or settings in static demo');
const report={pass:failures.length===0,htmlPages:files.filter(file=>file.endsWith('.html')).length,failures};
await fs.writeFile(path.join(root,'qa/pages-static-check.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
