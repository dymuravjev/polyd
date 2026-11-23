(()=>{
 'use strict';
 document.querySelector('#contact-form button[type="submit"]').disabled=false;
 const replyField=document.getElementById('request-reply');
 function validReply(value){const digits=value.replace(/\D/g,'');return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||(/^\+?[\d\s().-]{7,30}$/.test(value)&&digits.length>=7&&digits.length<=20);}
 replyField.addEventListener('input',()=>replyField.setCustomValidity(replyField.value.trim()&&!validReply(replyField.value.trim())?'Проверьте e-mail или телефон':''));
 const modelInput=document.getElementById('request-model'),modelChoice=document.getElementById('model-choice'),modelMenu=document.getElementById('model-options'),modelOptions=[...modelMenu.querySelectorAll('[role="option"]')];
 function setModel(value){if(modelInput.value!==value)delete document.getElementById('contact-form').dataset.requestId;modelInput.value=value;document.getElementById('model-value').textContent=value;modelOptions.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.value===value)));}
 function closeModel(focus=false){modelMenu.hidden=true;modelChoice.setAttribute('aria-expanded','false');if(focus)modelChoice.focus();}
 function openModel(){modelMenu.hidden=false;modelChoice.setAttribute('aria-expanded','true');(modelOptions.find(option=>option.dataset.value===modelInput.value)||modelOptions[0]).focus();}
 modelChoice.addEventListener('click',()=>modelMenu.hidden?openModel():closeModel());
 modelOptions.forEach(option=>option.addEventListener('click',()=>{setModel(option.dataset.value);closeModel(true);}));
 document.querySelector('.model-picker').addEventListener('keydown',event=>{const index=modelOptions.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeModel(true);}else if(event.key==='Tab'){closeModel();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(modelMenu.hidden){openModel();return;}const next=event.key==='Home'?0:event.key==='End'?modelOptions.length-1:(index+(event.key==='ArrowDown'?1:-1)+modelOptions.length)%modelOptions.length;modelOptions[next].focus();}});
 document.addEventListener('click',event=>{if(!event.target.closest('.model-picker'))closeModel();});
 if(location.protocol==='file:')document.querySelector('.intellect-lockup').href='demo-intellect.html';
 let activeTrigger=null;
 const menu=document.getElementById('mobile-menu'),menuButton=document.querySelector('.menu-toggle');
 function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
 menuButton.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));});
 menu.querySelectorAll('a,button').forEach(el=>el.addEventListener('click',closeMenu));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
 document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!menuButton.contains(e.target))closeMenu();});
 function showDialog(dialog,trigger){const current=document.querySelector('dialog[open]');const previousTrigger=activeTrigger;if(current)current.close();activeTrigger=trigger?.closest('dialog')?previousTrigger:trigger;dialog.showModal();document.body.style.overflow='hidden';}
 document.querySelectorAll('dialog:not(.callback-dialog)').forEach(dialog=>{
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{if(document.querySelector('dialog[open]'))return;document.body.style.overflow='';if(activeTrigger?.isConnected&&!activeTrigger.closest('dialog:not([open])'))activeTrigger.focus({preventScroll:true});if(dialog.id==='process-dialog'){document.getElementById('process-frame').removeAttribute('src');}});
 });
 function openContact(trigger){const model=trigger?.dataset.model||'Помогите выбрать';setModel(model);const topic=trigger?.dataset.topic;const message=document.getElementById('request-message');if(topic&&!message.value)message.value=topic+'\n';document.getElementById('form-status').textContent='';const current=document.querySelector('dialog[open]');if(current){activeTrigger=null;current.close();document.body.style.overflow='';}document.getElementById('discuss').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});message.focus({preventScroll:true});}
 document.querySelectorAll('[data-contact]').forEach(button=>button.addEventListener('click',()=>openContact(button)));
 const products={
  'POLYD PLA':{description:'Установка приготовления и дозирования раствора флокулянта или коагулянта. Насосы, объёмы ёмкостей и автоматика подбираются по техническому заданию.',image:'assets/polyd-pla-original.webp',facts:[['Компоновка','Одиночная установка'],['Материалы ёмкостей','Полипропилен или нержавеющая сталь'],['Производительность и управление','По требованиям процесса']]},
  'POLYD TWIN':{description:'Сдвоенная компоновка для приготовления растворов флокулянта и коагулянта. Состав узлов и режим работы согласуются для каждого реагента.',image:'assets/polyd-twin-original.webp',facts:[['Компоновка','Сдвоенная установка'],['Материалы ёмкостей','Полипропилен или нержавеющая сталь'],['Производительность и управление','По требованиям процесса']]}
 };
 document.querySelectorAll('[data-product]').forEach(button=>button.addEventListener('click',()=>{
  const name=button.dataset.product,data=products[name];document.getElementById('product-title').textContent=name;document.getElementById('product-detail-description').textContent=data.description;const image=document.getElementById('product-original');image.src=data.image;image.alt='Исходная фотография '+name;document.getElementById('product-facts').replaceChildren(...data.facts.flatMap(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;return [dt,dd];}));document.getElementById('product-request').dataset.model=name;showDialog(document.getElementById('product-detail'),button);
 }));
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;let count=0;document.querySelectorAll('.faq-items details').forEach(item=>{item.hidden=item.dataset.group!==filter;if(!item.hidden)count++;});document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.getElementById('faq-status').textContent=`Показано вопросов: ${count}`;
 }));
 document.querySelector('[data-process]').addEventListener('click',e=>{showDialog(document.getElementById('process-dialog'),e.currentTarget);document.getElementById('process-frame').src='process.html';});
 const fileInput=document.getElementById('request-files'),fileList=document.getElementById('file-list'),fileStatus=document.getElementById('file-status');
 let attachments=[];
 function fileError(files){if(files.length>3)return 'Можно прикрепить не более 3 файлов';if(files.some(file=>!file.size))return 'Пустой файл нельзя прикрепить';if(files.some(file=>file.size>5*1024*1024))return 'Каждый файл должен быть не больше 5 МБ';if(files.reduce((sum,file)=>sum+file.size,0)>10*1024*1024)return 'Общий размер файлов должен быть не больше 10 МБ';if(files.some(file=>! /\.(pdf|docx|xlsx|jpe?g|png)$/i.test(file.name)))return 'Выберите PDF, DOCX, XLSX, JPG или PNG';return '';}
 function renderFiles(){fileList.replaceChildren(...attachments.map((file,index)=>{const item=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');name.textContent=file.name+' · '+(file.size<1024*1024?Math.max(1,Math.ceil(file.size/1024))+' КБ':(file.size/1024/1024).toLocaleString('ru-RU',{maximumFractionDigits:2})+' МБ');remove.type='button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить '+file.name);remove.addEventListener('click',()=>{attachments.splice(index,1);delete document.getElementById('contact-form').dataset.requestId;renderFiles();fileStatus.textContent='Файл удалён';fileInput.focus();});item.append(name,remove);return item;}));}
 fileInput.addEventListener('change',()=>{const selected=[...attachments,...fileInput.files],error=fileError(selected);fileInput.value='';fileStatus.textContent=error;if(error)return;attachments=selected;delete document.getElementById('contact-form').dataset.requestId;renderFiles();fileStatus.textContent='Прикреплено файлов: '+attachments.length;});
 document.getElementById('contact-form').addEventListener('input',event=>{if(event.target!==fileInput&&event.currentTarget.getAttribute('aria-busy')!=='true')delete event.currentTarget.dataset.requestId;});
 document.getElementById('contact-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;const message=form.elements.message.value.trim(),reply=form.elements.reply.value.trim();
  if(!message||!reply){document.getElementById('form-status').textContent='Укажите задачу и контакт для ответа';(!message?form.elements.message:form.elements.reply).focus();return;}
  if(!validReply(reply)){replyField.setCustomValidity('Проверьте e-mail или телефон');replyField.reportValidity();return;}
  if(!form.elements.consent.checked){document.getElementById('form-status').textContent='Подтвердите согласие на обработку данных';form.elements.consent.focus();return;}
  const submit=form.querySelector('[type=submit]'),status=document.getElementById('form-status');
  if(form.dataset.demo==='true'){status.textContent='В демонстрационной версии запросы не отправляются. Напишите на polyd-system@mail.ru или позвоните нам';return;}
  if(form.getAttribute('aria-busy')==='true')return;
  if(location.protocol==='file:'){status.textContent='Для отправки откройте сайт через сервер. Вы также можете написать на polyd-system@mail.ru';return;}
  const error=fileError(attachments);if(error){fileStatus.textContent=error;fileInput.focus();return;}
  const payload=new FormData();for(const [name,value]of Object.entries({model:form.elements.model.value,message,reply,consent:'true',consentRevision:'2026-11-23',page:location.pathname,requestId:form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID())}))payload.append(name,value);attachments.forEach(file=>payload.append('attachments[]',file,file.name));
  const controls=[...form.querySelectorAll('input,textarea,button')];controls.forEach(control=>control.disabled=true);form.setAttribute('aria-busy','true');submit.textContent='Отправляем';status.textContent='Отправляем запрос и вложения';
  try{const response=await fetch('forms/request.php',{method:'POST',body:payload});const result=await response.json();status.textContent=result.message||'Не удалось подтвердить отправку. Уточните получение по телефону';if(response.ok&&result.ok){delete form.dataset.requestId;form.reset();attachments=[];renderFiles();fileStatus.textContent='';setModel('Помогите выбрать');}else{for(const [name,text]of Object.entries(result.fields||{})){if(name==='attachments'){fileStatus.textContent=text;continue;}const field=form.elements[name];if(field){field.setCustomValidity(text);field.addEventListener('input',()=>field.setCustomValidity(''),{once:true});}}}}
  catch{status.textContent='Не удалось подтвердить отправку. Данные и вложения остались в форме. Уточните получение по телефону или напишите на polyd-system@mail.ru';}
  finally{controls.forEach(control=>control.disabled=false);form.removeAttribute('aria-busy');submit.textContent='Отправить запрос';}
 });
})();
