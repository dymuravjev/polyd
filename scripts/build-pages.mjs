import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.pages-dist'),source=path.join(root,'public');
const basePath='/polyd/',origin='https://dymuravjev.github.io';
execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{cwd:root,stdio:'inherit'});
await fs.mkdir(output,{recursive:true});
for(const entry of await fs.readdir(output)){const resolved=path.resolve(output,entry);if(path.dirname(resolved)!==output)throw Error('Invalid Pages output path');await fs.rm(resolved,{recursive:true,force:true});}
await fs.cp(source,output,{recursive:true,filter:entry=>{const relative=path.relative(source,entry);return !relative.split(path.sep).some(part=>part==='forms'||part==='.htaccess'||part==='.user.ini')&&!entry.endsWith('.php');}});
for(const name of await fs.readdir(output)){
 if(!name.endsWith('.html'))continue;
 let html=await fs.readFile(path.join(output,name),'utf8');
 html=html.replace(/<base\b[^>]*>/gi,'').replace('<head>','<head><base href="'+basePath+'">');
 html=html.replace(/<meta name="robots"[^>]*>/gi,'').replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
 html=html.replaceAll('href="demo-intellect/"','href="demo-intellect.html"');
 html=html.replace('id="contact-form"','data-demo="true" id="contact-form"').replace('id="callback-form"','data-demo="true" id="callback-form"');
 html=html.replace('Запрос и вложения будут отправлены на polyd-system@mail.ru. Ответим по указанному контакту','Демонстрационная версия. Для отправки запроса напишите на polyd-system@mail.ru').replace('Заявка будет отправлена на polyd-system@mail.ru. Перезвоним по указанному номеру','Демонстрационная версия. Связаться с нами: +7 (4852) 71-73-43');
 html=html.replaceAll('https://polyd-system.ru/assets/images/',origin+basePath+'assets/images/');
 await fs.writeFile(path.join(output,name),html);
}
await fs.writeFile(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
await fs.writeFile(path.join(output,'.nojekyll'),'');
// The demo is deliberately separate from the production sitemap and PHP bundle.
await fs.rm(path.join(output,'sitemap.xml'),{force:true});
const files=await fs.readdir(output,{recursive:true});
if(files.some(file=>file.endsWith('.php')||file.startsWith('forms'+path.sep)||file.endsWith('.htaccess')))throw Error('Server files must not be published on Pages');
console.log(JSON.stringify({pagesDemo:output,basePath,files:files.length,forms:'demo only; no request transmission'}));
