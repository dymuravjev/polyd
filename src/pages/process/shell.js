(()=>{
 'use strict';
 const footer=document.getElementById('process-public-footer');
 if(window.parent!==window){footer.hidden=true;return;}
 document.getElementById('process-site-styles').media='all';
 if(location.protocol==='file:')footer.querySelectorAll('.intellect-lockup').forEach(link=>link.href='demo-intellect.html');
})();
