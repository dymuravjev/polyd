import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base='http://127.0.0.1:4173';
const cases=[['/',200],['/faq.html',200],['/privacy.html',200],['/consent.html',200],['/cookies.html',200],['/sitemap.html',200],['/sitemap.xml',200],['/unknown/deep/page',404],['/assets/',403],['/.htaccess',403],['/forms/private/config.php',403],['/forms/private/phpmailer/PHPMailer.php',403],['/404.html',200],['/503.html',200],['/demo-intellect/',200],['/index.html?utm_source=test',301],['/demo-intellect?utm_source=test',301]];
const results=[];
for(const [url,expected]of cases){const r=await fetch(base+url,{redirect:'manual'});const html=await r.text();results.push({url,status:r.status,expected,pass:r.status===expected,location:r.headers.get('location'),cache:r.headers.get('cache-control'),csp:!!r.headers.get('content-security-policy'),privateHidden:!url.includes('/private/')||!html.includes('smtp_password')});}
const gzip=await fetch(base+'/assets/css/site.css',{headers:{'Accept-Encoding':'gzip'}});results.push({test:'text compression',pass:gzip.headers.get('content-encoding')==='gzip'});
const mail=await fetch(base+'/forms/request.php',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const mailResponse=await mail.json();results.push({test:'preview mail unavailable without false success',pass:mail.status===503&&mailResponse.ok===false&&mail.headers.get('cache-control')==='no-store'});
const result={pass:results.every(r=>r.pass&&r.privateHidden!==false),scope:'Node preview; Apache and PHP runtime require target hosting',results};await fs.writeFile(path.join(root,'qa/http-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
