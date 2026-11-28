
(function(){
 const key="caJunctionTheme";
 function saved(){try{return localStorage.getItem(key)==="light"?"light":"dark"}catch{return "dark"}}
 function apply(theme){document.documentElement.dataset.theme=theme;
   const toggle=document.getElementById("themeToggle");
   if(toggle){
     const label=theme==="light"?"Switch to Dark Mode":"Switch to Light Mode";
     toggle.setAttribute("aria-label",label);toggle.title=label;
     const shape=theme==="light"?'<path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z"/>':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
     toggle.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+shape+'</svg>';
   }}
 apply(saved());
 function addSkipLink(){
   const main=document.querySelector("main");
   if(!main)return;
   if(!main.id)main.id="main-content";
   main.tabIndex=-1;
   const link=document.createElement("a");
   link.className="skip-to-content";
   link.href="#"+main.id;
   link.textContent="Skip to main content";
   document.body.prepend(link);
 }
 function mount(){
   addSkipLink();
   let nav=document.querySelector("header .nav,header .inner-navigation") || document.querySelector("header");
   if(document.getElementById("themeToggle"))return;
   if(!nav){nav=document.createElement("div");nav.className="theme-controls";document.body.prepend(nav)}
   nav.classList.add("theme-nav");
   const button=document.createElement("button");
   button.type="button"; button.id="themeToggle"; button.className="theme-toggle";
   button.addEventListener("click",()=>{
     const next=document.documentElement.dataset.theme==="light"?"dark":"light";
     try{localStorage.setItem(key,next)}catch{}
     apply(next);
   });
   nav.insertBefore(button,nav.querySelector(":scope > .menu"));
   apply(saved());
 }

 function bindBackLinks(){
   for(const link of document.querySelectorAll('header a[href]')){
     if(link.classList.contains('brand') || !/^←|^back\b/i.test(link.textContent.trim()))continue;
     link.classList.add('site-back-link');
     link.addEventListener('click',event=>{
       if(event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
       if(!document.referrer || history.length<2)return;
       try{
         const previous=new URL(document.referrer);
         if(previous.origin!==location.origin || previous.pathname===location.pathname)return;
         event.preventDefault();history.back();
       }catch{}
     });
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindBackLinks);else bindBackLinks();
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
 window.addEventListener("storage",event=>{if(event.key===key)apply(saved())});
})();
