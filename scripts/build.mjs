import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {legalPages} from '../src/pages/legal/content.mjs';
import {faqPageBody} from '../src/pages/faq/content.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public'),shared=path.join(root,'src/shared'),vendor=path.join(shared,'vendor/provided-resources');
const site=JSON.parse(await fs.readFile(path.join(root,'config/site.json'),'utf8'));
const read=relative=>fs.readFile(path.join(root,relative),'utf8');
async function write(relative,value){const file=path.join(out,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,value);}
async function copy(from,to){const target=path.join(out,to);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(from,target);}
const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const digest=value=>createHash('sha256').update(value).digest('hex').slice(0,12);

for(const file of await fs.readdir(path.join(shared,'assets/optimized')))await copy(path.join(shared,'assets/optimized',file),'assets/images/'+file);
for(const file of ['dosings-clean.svg','polyd-pla-original.webp','polyd-twin-original.webp'])await copy(path.join(vendor,file),'assets/images/'+file);
for(const file of ['golos-text-cyrillic-400-normal.woff2','golos-text-latin-400-normal.woff2'])await copy(path.join(vendor,file),'assets/fonts/'+file);
for(const file of ['LICENSE-golos-text.txt','LICENSE-three.txt','LICENSE.txt'])await copy(path.join(vendor,file),'assets/files/licenses/'+file.toLowerCase());
for(const file of ['icon-plus.svg','icon-dash.svg'])await copy(path.join(shared,'assets',file),'assets/images/'+file);
await fs.cp(path.join(root,'src/pages/process/assets'),path.join(out,'assets/images/process'),{recursive:true});
await copy(path.join(shared,'assets/LICENSE-bootstrap-icons.txt'),'assets/files/licenses/license-bootstrap-icons.txt');
await write('assets/css/bootstrap-grid.min.css',(await fs.readFile(path.join(vendor,'bootstrap-grid.min.css'),'utf8')).replace(/\/\*[#@] sourceMappingURL=[\s\S]*?\*\//g,''));
await copy(path.join(vendor,'three.r128.min.js'),'assets/js/vendor/three.r128.min.js');
await fs.cp(path.join(vendor,'intellect'),path.join(out,'assets/vendor/intellect'),{recursive:true,filter:source=>path.basename(source)!=='intellect-portal.min.js'});
const wordmark=(await fs.readFile(path.join(vendor,'intellect-wordmark.svg'),'utf8')).replace(/<rect\b[^>]*\/>/,'').replace('viewBox="0 0 918 342.003" width="918" height="342.003"','viewBox="100 100 718 142.003" width="718" height="142.003"');
await write('assets/images/intellect-wordmark-footer.svg',wordmark);
const asset=original=>{
 const name=original.replace(/^assets\//,'');
 if(name==='bootstrap-grid.min.css')return 'assets/css/'+name;
 if(/\.woff2$/.test(name))return 'assets/fonts/'+name;
 if(/\.(svg|webp|png)$/.test(name))return 'assets/images/'+name;
 return original;
};
function mapAssets(text){return text.replace(/assets\/[\w.-]+\.(?:woff2|css|svg|webp|png)/g,asset);}
const css=mapAssets(await read('src/shared/styles.css')).replace(/url\(['"]?assets\//g,'url(\'../');
await write('assets/css/site.css',css);
await write('assets/js/home.js',mapAssets(await read('src/pages/home/app.js')));
await write('assets/js/site.js',await read('src/shared/site.js'));
await write('assets/js/process-shell.js',await read('src/pages/process/shell.js'));
const versions={};for(const file of ['assets/css/site.css','assets/css/bootstrap-grid.min.css','assets/js/home.js','assets/js/site.js','assets/js/process-shell.js'])versions[file]=digest(await fs.readFile(path.join(out,file)));
const versioned=text=>text.replace(/(?:src|href)="(assets\/(?:css|js)\/[^"?]+)"/g,(full,file)=>full.replace(file,file+'?v='+(versions[file]||'1')));

const faq=JSON.parse(await read('src/shared/faq-content.json'));
const categories={important:'Важное',selection:'Подбор',design:'Проектирование',operation:'Эксплуатация'};
const filters=Object.entries(categories).map(([group,label])=>`<button type="button" data-filter="${group}" aria-pressed="${group==='important'}"><span>${label}</span><span class="faq-count">${faq.filter(item=>item.group===group).length}</span></button>`).join('');
function faqItems(full=false){return faq.map((item,index)=>`<details data-group="${item.group}" id="question-${index+1}"${index===0?' open':''}${!full&&item.group!=='important'?' hidden':''}><summary><span role="heading" aria-level="${full?2:3}">${escape(item.question)}</span></summary><div class="faq-answer"><p>${escape(item.answer)}</p></div></details>`).join('\n');}
const faqSchema={'@context':'https://schema.org','@type':'FAQPage',inLanguage:'ru',mainEntity:faq.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))};
const companySchema={'@type':'Organization',name:site.company,url:site.origin+'/',email:site.email,telephone:'+7-4852-71-73-43',address:{'@type':'PostalAddress',addressLocality:'Ярославль',streetAddress:'пр-т Машиностроителей, 83',addressCountry:'RU'}};
const schema={'@context':'https://schema.org','@graph':[{'@type':'WebSite',name:'POLYD',url:site.origin+'/',inLanguage:'ru'},companySchema,{...faqSchema,'@context':undefined}]};
let home=mapAssets((await read('src/pages/home/page.html')).replace('<!-- SITE_HEADER -->',await read('src/partials/header.html')).replace('<!-- SITE_FOOTER -->',await read('src/partials/footer.html')));
const panels=await read('src/partials/contact-panels.html');
home=home.replace('</body>',panels+'<script defer src="assets/js/site.js"></script></body>');
home=home.replace('href="styles.css"','href="assets/css/site.css"').replace('src="app.js"','src="assets/js/home.js"').replace('<!-- FAQ_FILTERS -->',filters).replace('<!-- FAQ_ITEMS -->',faqItems()).replace('<!-- FAQ_STATUS -->',`Важное: ${faq.filter(item=>item.group==='important').length} вопроса`).replace('<!-- STRUCTURED_DATA -->',`<meta name="author" content="Evander Valens"><link rel="canonical" href="${site.origin}/"><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`);
home=home.replace('</head>','<noscript><style>.faq-items details[hidden]{display:block!important}.faq-filters{display:none}</style></noscript></head>');
const footer=home.match(/<footer class="site-footer[\s\S]*?<\/footer>/)[0].replaceAll('href="#','href="./#');
const header=mapAssets(await read('src/partials/header.html')).replaceAll('href="#','href="./#');
const pages=[];
async function document(file,title,description,body,{noindex=false,extraHead='',kind='document'}={}){
 const markup=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(description)}"><meta name="author" content="Evander Valens">${noindex?'<meta name="robots" content="noindex,follow">':`<link rel="canonical" href="${site.origin}/${file}">`}<title>${escape(title)} — POLYD</title><link rel="icon" href="assets/images/dosings-clean.svg"><link rel="stylesheet" href="assets/css/site.css"><script defer src="assets/js/site.js"></script>${extraHead}</head><body class="inner-page"><a class="skip-link" href="#main">Перейти к содержанию</a>${header}<main id="main" class="document-inner page-width ${kind}"><h1>${title}</h1>${body}</main>${footer}</body></html>`;
 const og=`<meta property="og:title" content="${escape(title)} — POLYD"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:url" content="${site.origin}/${file}"><meta property="og:image" content="${site.origin}/assets/images/hero-process.webp">`;
 const resolved=kind==='error-page'?markup.replace('<meta charset="utf-8">','<meta charset="utf-8"><base href="/">'):markup;
 await write(file,versioned(resolved.replace('</head>',og+'</head>').replace('</body>',panels+'</body>')));pages.push({file,title,noindex});
}
home=home.replace('content="assets/images/hero-process.webp"',`content="${site.origin}/assets/images/hero-process.webp"`).replace('</head>',`<meta property="og:url" content="${site.origin}/"><meta property="og:locale" content="ru_RU"></head>`);
await write('index.html',versioned(home));pages.push({file:'index.html',title:'Главная',noindex:false});
for(const page of legalPages(site))await document(page.file,page.title,page.description,page.body,{noindex:true});
await document('faq.html','Вопросы о POLYD','Подбор, проектирование и эксплуатация станций приготовления и дозирования реагентов POLYD.',faqPageBody(faq,categories,escape),{extraHead:'<script type="application/ld+json">'+JSON.stringify(faqSchema).replaceAll('<','\\u003c')+'</script>'});
await fs.rm(path.join(out,'equipment-images.html'),{force:true});
const errors={403:['Доступ ограничен','Эту страницу нельзя открыть по публичной ссылке. Перейдите на главную или свяжитесь с нами, если вам нужен документ'],404:['Страница не найдена','Возможно, адрес изменился или в ссылке есть опечатка. Найдите нужный раздел в карте сайта'],410:['Страница удалена','Материал больше не доступен по этому адресу. Актуальные разделы есть в карте сайта'],500:['Не удалось открыть страницу','На сайте возникла ошибка. Повторите попытку позже или свяжитесь с нами по телефону'],502:['Временный сбой соединения','Сервер не получил ожидаемый ответ. Повторите попытку позже'],503:['Сайт временно недоступен','Проводятся работы или сервис временно не может обработать запрос. Вы можете связаться с нами по телефону'],504:['Ответ не получен вовремя','Соединение заняло больше времени, чем ожидалось. Повторите попытку позже']};
for(const [code,[title,explanation]]of Object.entries(errors))await document(code+'.html',title,explanation,`<p class="error-code" aria-label="Код ошибки ${code}">${code}</p><p class="document-lead">${explanation}</p><div class="error-actions"><a class="button button-green" href="./">На главную</a><a class="button button-outline" href="sitemap.html">Карта сайта</a></div><p>Связаться с нами: <a href="tel:+74852717343">${site.phone}</a> · <a href="mailto:${site.email}">${site.email}</a></p>`,{noindex:true,kind:'error-page'});

await document('sitemap.html','Карта сайта','Разделы POLYD, ответы на вопросы и документы сайта.',`<section><h2>Оборудование и обращение</h2><ul><li><a href="./">Главная</a></li><li><a href="./#range">POLYD PLA и POLYD TWIN</a></li><li><a href="./#approach">Условия подбора</a></li><li><a href="./#discuss">Обсудить задачу</a></li><li><a href="./#contacts">Контакты</a></li><li><a href="faq.html">Вопросы о POLYD</a></li></ul></section><section><h2>Документы</h2><ul><li><a href="privacy.html">Политика обработки персональных данных</a></li><li><a href="consent.html">Согласие на обработку персональных данных</a></li><li><a href="cookies.html">Cookies и средства отслеживания</a></li></ul></section>`);

await write('assets/js/demo.js',`window.addEventListener('load',()=>{document.querySelector('[data-promo]')?.addEventListener('click',()=>window.IntellectPortal?.open());if(window.IntellectPortal&&!matchMedia('(prefers-reduced-motion: reduce)').matches)window.IntellectPortal.open();});`);
const demo=versioned(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta name="author" content="Evander Valens"><base href="/"><script>if(location.protocol==='file:')document.querySelector('base').href='./';window.IntellectPortalConfig={fonts:'local',theme:'dark',divider:false,campaign:'polyd',demo:false,redirect:'https://intellect24.pro/'};</script><title>Intellect — демонстрация</title><link rel="stylesheet" href="assets/css/site.css"><script defer src="assets/js/vendor/three.r128.min.js"></script><script defer src="assets/vendor/intellect/vendor/html2canvas.1.4.1.min.js"></script><script defer src="assets/vendor/intellect/intellect-portal.original-v1.js"></script><script defer src="assets/js/demo.js"></script></head><body><main class="demo-shell"><div><h1>Intellect</h1><p>Дизайн и разработка цифровых продуктов</p><button class="button button-green" data-promo>Посмотреть промо</button><a class="button button-light" href="https://intellect24.pro/?utm_source=polyd-system.ru&amp;utm_medium=footer-demo&amp;utm_campaign=polyd">Перейти на сайт Intellect</a><p><a href="./">Вернуться к POLYD</a></p><div data-intellect-zone data-theme="dark" data-fonts="local" data-divider="false" data-campaign="polyd"></div></div></main>${footer}</body></html>`);await write('demo-intellect.html',demo);

// Preserve the existing explanatory model while isolating its optional runtime.
const previous=await fs.readFile(path.join(root,'src/pages/process/process-source.html'),'utf8');
const processDocument=previous.replace('</head>','<link id="process-site-styles" rel="stylesheet" href="assets/css/site.css" media="not all"><style>#process-public-footer footer{display:block!important}#process-public-footer[hidden]{display:none!important}</style></head>').replace('</body>','<div id="process-public-footer">'+footer+panels+'</div><script src="assets/js/process-shell.js"></script><script defer src="assets/js/site.js"></script></body>');
await write('process.html',versioned(processDocument));
await copy(path.join(root,'src/pages/forms/request.php'),'forms/request.php');
await copy(path.join(root,'src/pages/forms/mail-template.php'),'forms/private/mail-template.php');
await copy(path.join(root,'src/pages/forms/attachments.php'),'forms/private/attachments.php');
await fs.cp(path.join(shared,'vendor/phpmailer'),path.join(out,'forms/private/phpmailer'),{recursive:true});
try{await fs.access(path.join(out,'forms/private/config.php'));}catch{await copy(path.join(root,'config/mail/config.example.php'),'forms/private/config.php');}
await write('forms/private/.htaccess','Require all denied\n');
await write('forms/.user.ini','display_errors=Off\ndisplay_startup_errors=Off\nlog_errors=On\nfile_uploads=On\nupload_max_filesize=12M\npost_max_size=12M\nmax_file_uploads=4\nmax_input_time=60\n');
await write('assets/.htaccess','Options -Indexes\n<FilesMatch "\\.(php|phtml|phar)$">\nRequire all denied\n</FilesMatch>\n');

const inlineHashes=new Set();for(const file of ['index.html',...pages.map(p=>p.file),'demo-intellect.html','process.html']){const h=await fs.readFile(path.join(out,file),'utf8');for(const match of h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))if(match[1])inlineHashes.add("'sha256-"+createHash('sha256').update(match[1]).digest('base64')+"'");}
const csp=`default-src 'self'; script-src 'self' data: ${[...inlineHashes].join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`;
const htaccess=`Options -Indexes\nDirectoryIndex index.html\n<FilesMatch "^\\.">\nRequire all denied\n</FilesMatch>\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://polyd-system.ru%{REQUEST_URI} [R=301,L,NE]\nRewriteCond %{THE_REQUEST} \\s/+index\\.html[?\\s] [NC]\nRewriteRule ^index\\.html$ / [R=301,L,NE]\nRewriteRule ^demo-intellect/?$ demo-intellect.html [L]\n</IfModule>\n${Object.keys(errors).map(code=>`ErrorDocument ${code} /${code}.html`).join('\n')}\n<IfModule mod_headers.c>\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set Referrer-Policy "strict-origin-when-cross-origin"\nHeader always set X-Frame-Options "SAMEORIGIN"\nHeader always set Content-Security-Policy "${csp}"\n<FilesMatch "\\.html$">\nHeader always set Cache-Control "no-cache"\n</FilesMatch>\n</IfModule>\n<IfModule mod_deflate.c>\nAddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml\n</IfModule>\nAddDefaultCharset UTF-8\n`;
await write('.htaccess',htaccess);
await write('robots.txt',`User-agent: *\nDisallow: /forms/\nSitemap: ${site.origin}/sitemap.xml\n`);
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(p=>!p.noindex).map(p=>`<url><loc>${site.origin}/${p.file==='index.html'?'':p.file}</loc></url>`).join('')}</urlset>`);
await fs.mkdir(path.join(root,'qa'),{recursive:true});
await fs.writeFile(path.join(root,'qa/build-manifest.json'),JSON.stringify({version:'2026-11-23-requirements',pages,csp,faqCounts:Object.fromEntries(Object.keys(categories).map(group=>[group,faq.filter(f=>f.group===group).length])),legalApproved:site.legalApproved,mailTransport:'phpmailer'},null,2));
console.log(JSON.stringify({pages:pages.length+2,faq:faq.length,output:out,mailTransport:'phpmailer',legalApproved:site.legalApproved}));
