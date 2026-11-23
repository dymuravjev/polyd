export function faqPageBody(faq,categories,escape){
 const topics=Object.entries(categories).map(([group,label])=>`<a href="#faq-${group}">${label} <span>${faq.filter(item=>item.group===group).length}</span></a>`).join('');
 const groups=Object.entries(categories).map(([group,label])=>`<section id="faq-${group}" class="faq-topic"><h2>${label}</h2><div class="faq-items">${faq.filter(item=>item.group===group).map(item=>`<details><summary><span role="heading" aria-level="3">${escape(item.question)}</span></summary><div class="faq-answer"><p>${escape(item.answer)}</p></div></details>`).join('')}</div></section>`).join('');
 return `<p class="document-lead">Ответы на вопросы о реагентах, размещении оборудования, подключениях и работе станции</p><nav class="faq-topics" aria-label="Разделы вопросов">${topics}</nav>${groups}`;
}
