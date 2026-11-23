import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public');
const failures=[],verify=(condition,label)=>{if(!condition)failures.push(label);};
const sourceFaq=JSON.parse(await fs.readFile(path.join(root,'src/shared/faq-content.json'),'utf8'));
const plain=text=>text.replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>');
const files=await fs.readdir(out,{recursive:true});
verify(files.filter(f=>path.basename(f)==='index.html').length===1,'One index.html');
verify(new Set(sourceFaq.map(f=>f.question)).size===sourceFaq.length,'No duplicate FAQ questions');
const counts=Object.fromEntries(['important','selection','design','operation'].map(group=>[group,sourceFaq.filter(f=>f.group===group).length]));
verify(Object.values(counts).every(n=>n>0),'Every category has content');
for(const file of files.filter(f=>f.endsWith('.html')&&f!=='process.html')){
 const html=await fs.readFile(path.join(out,file),'utf8');
 verify((html.match(/<h1\b/g)||[]).length===1,file+': primary heading');
 verify(html.includes('class="intellect-lockup"'),file+': shared footer');
 verify([...html.matchAll(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gs)].every(m=>!plain(m[1]).trim().endsWith('.')),file+': heading punctuation');
 verify(!/<!-- (?:FAQ_|MAIL_|STRUCTURED_)/.test(html),file+': no unresolved template');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);verify(new Set(ids).size===ids.length,file+': unique IDs');
 for(const match of html.matchAll(/(?:src|href|srcset)="([^"#]+)"/g)){
  const href=match[1].split(/[?#]/)[0];if(/^(https?:|mailto:|tel:|data:)/.test(href)||!href)continue;
  const target=href==='demo-intellect/'?'demo-intellect.html':href==='./'||href==='/'?'index.html':href.replace(/^\.\//,'').replace(/^\//,'');
  try{await fs.access(path.join(out,target));}catch{failures.push(file+': missing '+target);}
 }
 if(file==='index.html'){
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const faq=schema['@graph'].find(x=>x['@type']==='FAQPage').mainEntity;
  const items=[...html.matchAll(/<details data-group="([^"]+)" id="question-\d+"[^>]*><summary>(.*?)<\/summary><div class="faq-answer"><p>(.*?)<\/p>/gs)];
  verify(items.length===sourceFaq.length&&faq.length===sourceFaq.length,'FAQ completeness');
  items.forEach((m,index)=>{verify(plain(m[2])===faq[index].name,'FAQ question schema '+index);verify(plain(m[3])===faq[index].acceptedAnswer.text,'FAQ answer schema '+index);});
  for(const [group,count]of Object.entries(counts))verify(html.includes(`data-filter="${group}"`)&&html.match(new RegExp(`data-filter="${group}"[^>]*><span>[^<]+<\\/span><span class="faq-count">${count}<`)),group+': actual counter');
  verify(!html.includes('data-filter="all"'),'No all category');
  verify(!html.includes('scroll-cue'),'No redundant scroll caption');
  verify(/type="checkbox" name="consent" required/.test(html)&&!/<input[^>]*type="checkbox"[^>]*\bchecked/.test(html),'Consent required and unchecked');
  verify(html.includes('role="listbox"')&&!html.includes('<select'),'Styled equipment choice');
 }
}
for(const name of ['home.js','site.js','process-shell.js','demo.js'])new Script(await fs.readFile(path.join(out,'assets/js',name),'utf8'));
const css=await fs.readFile(path.join(out,'assets/css/site.css'),'utf8');
for(const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){if(match[1].startsWith('data:'))continue;try{await fs.access(path.resolve(out,'assets/css',match[1]));}catch{failures.push('CSS missing '+match[1]);}}
const sitemap=await fs.readFile(path.join(out,'sitemap.xml'),'utf8');verify(sitemap.includes('/faq.html'),'FAQ in XML sitemap');
for(const code of [403,404,410,500,502,503,504]){verify(!sitemap.includes('/'+code+'.html'),'Error excluded from XML '+code);const html=await fs.readFile(path.join(out,code+'.html'),'utf8');verify(html.includes('noindex')&&html.includes('<base href="/">')&&html.indexOf('<base href="/">')<html.indexOf('<link'),'Error robots and base '+code);}
const htaccess=await fs.readFile(path.join(out,'.htaccess'),'utf8');verify(htaccess.includes('ErrorDocument 404 /404.html'),'Apache error routes');verify(htaccess.includes('Content-Security-Policy'),'Production CSP configured');
const result={pass:!failures.length,faqCounts:counts,htmlPages:files.filter(f=>f.endsWith('.html')).length,failures};
await fs.writeFile(path.join(root,'qa/static-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
