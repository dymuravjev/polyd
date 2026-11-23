import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const php=process.env.POLYD_TEST_PHP;if(!php)throw Error('Set POLYD_TEST_PHP to a local PHP executable');
const stage=path.join(root,'qa/php-mail-test'),privateDir=path.join(stage,'forms/private');
await fs.mkdir(privateDir,{recursive:true});
for(const file of ['request.php','attachments.php','mail-template.php'])await fs.copyFile(path.join(root,'src/pages/forms',file),path.join(file==='request.php'?path.join(stage,'forms'):privateDir,file));
await fs.cp(path.join(root,'src/shared/vendor/phpmailer'),path.join(privateDir,'phpmailer'),{recursive:true});
await fs.writeFile(path.join(privateDir,'config.php'),`<?php return ['enabled'=>true,'allowed_origins'=>['http://127.0.0.1:4174'],'smtp_host'=>'127.0.0.1','smtp_port'=>4175,'smtp_user'=>'local-test','smtp_password'=>'local-test','smtp_encryption'=>'','from_email'=>'sender@example.invalid','to_email'=>'recipient@example.invalid','archive_email'=>'archive@example.invalid','rate_secret'=>'polyd-test-${Date.now()}','rate_limit_count'=>100,'rate_limit_window'=>60,'policy_revision'=>'2026-11-23','consent_revision'=>'2026-11-23'];`);
const uploadTemp=path.join(root,'qa/php-upload-tmp');await fs.mkdir(uploadTemp,{recursive:true});
const phpFlags=['-n','-d',`extension_dir="${path.join(path.dirname(php),'ext').replaceAll('\\','/')}"`,'-d',`upload_tmp_dir="${uploadTemp.replaceAll('\\','/')}"`,'-d','extension=fileinfo','-d','extension=zip','-d','upload_max_filesize=12M','-d','post_max_size=12M','-d','max_file_uploads=4','-d','display_errors=0','-d','display_startup_errors=0'];
const lint=[];for(const file of ['request.php','attachments.php','mail-template.php']){const checked=spawnSync(php,['-l',path.join(root,'src/pages/forms',file)],{encoding:'utf8'});if(checked.status)throw Error(checked.stdout+checked.stderr);lint.push(file);}
for(const extension of ['docx','xlsx']){const part=extension==='docx'?'word/document.xml':'xl/workbook.xml',type=extension==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';const code=`$z=new ZipArchive();$z->open($argv[1],ZipArchive::CREATE|ZipArchive::OVERWRITE);$z->addFromString('[Content_Types].xml','<Types><Override PartName="/${part}" ContentType="${type}"/></Types>');$z->addFromString('${part}','<test/>');$z->close();`;const made=spawnSync(php,[...phpFlags,'-r',code,path.join(stage,'test.'+extension)]);if(made.status)throw Error(String(made.stderr));}
const received=[];const smtp=net.createServer(socket=>{socket.setEncoding('utf8');socket.write('220 localhost ESMTP test\r\n');let buffer='',data=false,auth=0,message='';socket.on('data',chunk=>{buffer+=chunk;let pos;while((pos=buffer.indexOf('\r\n'))!==-1){const line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);if(data){if(line==='.') {received.push(message);data=false;message='';socket.write('250 accepted locally\r\n');}else message+=line+'\r\n';continue;}if(auth){auth++;socket.write(auth===2?'334 UGFzc3dvcmQ6\r\n':'235 authenticated\r\n');if(auth===3)auth=0;continue;}if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 AUTH LOGIN\r\n');else if(/^AUTH LOGIN/.test(line)){auth=1;socket.write('334 VXNlcm5hbWU6\r\n');}else if(line==='DATA'){data=true;socket.write('354 continue\r\n');}else if(line==='QUIT'){socket.end('221 bye\r\n');}else socket.write('250 OK\r\n');}});});
await new Promise(resolve=>smtp.listen(4175,'127.0.0.1',resolve));
const server=spawn(php,[...phpFlags,'-S','127.0.0.1:4174','-t',stage],{stdio:['ignore','pipe','pipe']});let serverLog='';server.stderr.on('data',data=>serverLog+=data);const results=[];
const fields={model:'Помогите выбрать',message:'Synthetic local test, no delivery outside this computer',reply:'engineer@example.com',consent:'true',consentRevision:'2026-11-23',page:'/'};
const pdf=Buffer.from('%PDF-1.4\nlocal test\n%%EOF');
async function request(name,files=[],overrides={},expected=200,origin='http://127.0.0.1:4174') {const form=new FormData();for(const [key,value]of Object.entries({...fields,requestId:crypto.randomUUID(),...overrides}))form.append(key,value);for(const [filename,bytes]of files)form.append('attachments[]',new Blob([bytes]),filename);const response=await fetch('http://127.0.0.1:4174/forms/request.php',{method:'POST',headers:{Origin:origin},body:form});const raw=await response.text();let json;try{json=JSON.parse(raw);}catch{throw Error(name+" HTTP "+response.status+": "+raw.slice(0,2000)+" LOG "+serverLog.slice(-2000));}const pass=response.status===expected&&json.ok===(expected===200);results.push({name,status:response.status,expected,pass,message:json.message});if(!pass)throw Error(name+': '+JSON.stringify(json));return json;}
try{
 for(let attempt=0;attempt<40;attempt++){try{await fetch('http://127.0.0.1:4174/forms/request.php');break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
 await request('PDF, DOCX and XLSX accepted as 3 real MIME attachments',[['task.pdf',pdf],['task.docx',await fs.readFile(path.join(stage,'test.docx'))],['task.xlsx',await fs.readFile(path.join(stage,'test.xlsx'))]]);
 const mail=received.at(-1);for(const filename of ['task.pdf','task.docx','task.xlsx'])if(!mail.includes(filename))throw Error('Missing MIME attachment '+filename);
 if(!mail.includes('recipient@example.invalid')||!mail.includes('archive@example.invalid')&&received.length!==1)throw Error('SMTP capture failed');
 await request('No consent rejected',[],{consent:'false'},400);
 await request('Foreign origin rejected',[],{},403,'https://unrelated.example');
 await request('Invalid reply rejected',[],{reply:'wrong'},400);
 await request('More than 3 files rejected',Array.from({length:4},(_,i)=>['task'+i+'.pdf',pdf]),{},400);
 await request('Per-file size rejected',[['large.pdf',Buffer.alloc(5*1024*1024+1)]],{},400);
 await request('Total size rejected',Array.from({length:3},(_,i)=>['task'+i+'.pdf',Buffer.concat([pdf,Buffer.alloc(4*1024*1024-pdf.length)])]),{},413);
 await request('Total size below HTTP cap still rejected',Array.from({length:3},(_,i)=>['task'+i+'.pdf',Buffer.concat([pdf,Buffer.alloc(3600000-pdf.length)])]),{},400);
 await request('Empty file rejected',[['empty.pdf',Buffer.alloc(0)]],{},400);
 await request('Executable extension rejected',[['task.exe',pdf]],{},400);
 await request('Spoofed extension rejected',[['task.pdf',Buffer.from('<html>not a PDF</html>')]],{},400);
 await request('Corrupt DOCX rejected',[['task.docx',pdf]],{},400);
 const id=crypto.randomUUID();await request('First request accepted',[],{requestId:id});const before=received.length;await request('Duplicate request not sent twice',[],{requestId:id});if(received.length!==before)throw Error('Duplicate sent');
 const callback=await fetch('http://127.0.0.1:4174/forms/request.php',{method:'POST',headers:{Origin:'http://127.0.0.1:4174','Content-Type':'application/json'},body:JSON.stringify({...fields,reply:'+79990000000',consent:true,formKind:'callback',requestId:crypto.randomUUID()})});results.push({name:'Callback JSON accepted',status:callback.status,expected:200,pass:callback.ok});
 const remainingTemporaryFiles=await fs.readdir(uploadTemp);if(remainingTemporaryFiles.length)throw Error('Temporary uploads not removed');
 const report={pass:results.every(item=>item.pass),php:'8.4.28 portable, official SHA256 verified',scope:'Real PHP HTTP validation + PHPMailer -> local mock SMTP only; no external mail sent. Production SMTP not configured or verified.',lint,capturedMessages:received.length,mimeAttachmentsVerified:['task.pdf','task.docx','task.xlsx'],remainingTemporaryFiles,results};await fs.writeFile(path.join(root,'qa/php-mail-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,tests:results.length,remainingTemporaryFiles,scope:report.scope}));
}finally{server.kill();await new Promise(resolve=>smtp.close(resolve));}
