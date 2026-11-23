(()=>{
 'use strict';
 if(location.protocol==='file:'){
  document.querySelectorAll('.intellect-lockup').forEach(link=>link.href='demo-intellect.html');
  document.querySelectorAll('a[href="./"],a[href^="./#"]').forEach(link=>link.setAttribute('href',link.getAttribute('href').replace('./','index.html')));
 }
 const mobileMenu=document.getElementById('mobile-menu'),mobileToggle=document.querySelector('.menu-toggle');
 if(!document.querySelector('.hero')){
  if(mobileMenu&&mobileToggle){const close=()=>{mobileMenu.hidden=true;mobileToggle.setAttribute('aria-expanded','false');};mobileToggle.addEventListener('click',()=>{const open=mobileMenu.hidden;mobileMenu.hidden=!open;mobileToggle.setAttribute('aria-expanded',String(open));});mobileMenu.querySelectorAll('a,button').forEach(item=>item.addEventListener('click',close));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!mobileMenu.hidden){close();mobileToggle.focus();}});}
  document.querySelectorAll('[data-contact]').forEach(button=>button.addEventListener('click',()=>location.href='./#discuss'));
 }
 document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>{if(history.length>1)history.back();else location.href='./';}));
 const panelButtons=[...document.querySelectorAll('[data-panel]')];
 const quickContact=document.querySelector('.quick-contact'),siteFooter=document.querySelector('.site-footer'),floatingDiscuss=document.querySelector('.floating-discuss'),discussForm=document.getElementById('contact-form'),visibleContactAreas=new Set();
 const updateContactVisibility=()=>{for(const control of [quickContact,floatingDiscuss])if(control)control.hidden=visibleContactAreas.size>0&&!control.contains(document.activeElement);};
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visibleContactAreas.add(entry.target):visibleContactAreas.delete(entry.target));updateContactVisibility();});if(siteFooter)observer.observe(siteFooter);if(discussForm)observer.observe(discussForm);for(const control of [quickContact,floatingDiscuss])control?.addEventListener('focusout',()=>requestAnimationFrame(updateContactVisibility));}
 function closePanels(){panelButtons.forEach(button=>{button.setAttribute('aria-expanded','false');document.getElementById(button.dataset.panel).hidden=true;});}
 panelButtons.forEach(button=>button.addEventListener('click',()=>{const open=document.getElementById(button.dataset.panel).hidden;closePanels();if(open){document.getElementById(button.dataset.panel).hidden=false;button.setAttribute('aria-expanded','true');}}));
 document.addEventListener('click',event=>{if(!event.target.closest('.quick-contact'))closePanels();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const active=panelButtons.find(button=>button.getAttribute('aria-expanded')==='true');closePanels();active?.focus();}});
 document.querySelector('[data-unreachable]')?.addEventListener('click',event=>{const note=document.getElementById('unreachable-note');note.hidden=!note.hidden;event.currentTarget.setAttribute('aria-expanded',String(!note.hidden));});
 const callback=document.getElementById('callback-dialog'),callbackForm=document.getElementById('callback-form');
 if(callback&&callbackForm){
  callbackForm.querySelector('[type=submit]').disabled=false;
  document.querySelector('[data-callback]').addEventListener('click',event=>{closePanels();callback.showModal();document.body.style.overflow='hidden';});
  callback.querySelector('[data-callback-close]').addEventListener('click',()=>callback.close());
  callback.addEventListener('close',()=>{document.body.style.overflow='';const button=panelButtons.find(button=>button.dataset.panel==='phone-panel');button?.focus({preventScroll:true});});
  callbackForm.addEventListener('submit',async event=>{
   event.preventDefault();const phone=callbackForm.elements.phone.value.trim(),status=callbackForm.querySelector('[role=status]');
   const digits=phone.replace(/\D/g,'');
   if(!/^\+?[\d\s().-]{7,30}$/.test(phone)||digits.length<7||digits.length>20){callbackForm.elements.phone.setCustomValidity('Проверьте номер телефона');callbackForm.elements.phone.reportValidity();return;}
   if(!callbackForm.elements.consent.checked)return;
   if(callbackForm.dataset.demo==='true'){status.textContent='В демонстрационной версии заявки не отправляются. Позвоните по номеру +7 (4852) 71-73-43';return;}
   if(callbackForm.getAttribute('aria-busy')==='true')return;
   if(location.protocol==='file:'){status.textContent='Для отправки откройте сайт через сервер или позвоните нам';return;}
    const submit=callbackForm.querySelector('[type=submit]'),controls=[...callbackForm.querySelectorAll('input,button')];controls.forEach(control=>control.disabled=true);submit.textContent='Отправляем';status.textContent='';callbackForm.setAttribute('aria-busy','true');
    try{const response=await fetch('forms/request.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'Помогите выбрать',message:'Прошу перезвонить',reply:phone,consent:true,consentRevision:'2026-11-23',formKind:'callback',page:location.pathname,requestId:callbackForm.dataset.requestId||(callbackForm.dataset.requestId=crypto.randomUUID())})});const result=await response.json();status.textContent=result.message;if(response.ok&&result.ok){callbackForm.reset();delete callbackForm.dataset.requestId;}}
    catch{status.textContent='Не удалось подтвердить отправку. Уточните получение по телефону или напишите по электронной почте';}
    finally{controls.forEach(control=>control.disabled=false);submit.textContent='Заказать звонок';callbackForm.removeAttribute('aria-busy');}
  });
  callbackForm.elements.phone.addEventListener('input',()=>{callbackForm.elements.phone.setCustomValidity('');delete callbackForm.dataset.requestId;});
 }
})();
