
(function(){
 const key="caJunctionTheme";
 function saved(){try{return localStorage.getItem(key)==="light"?"light":"dark"}catch{return "dark"}}
 function apply(theme){document.documentElement.dataset.theme=theme;
   const toggle=document.getElementById("themeToggle");
   if(toggle)toggle.textContent=theme==="light"?"Switch to Dark Mode":"Switch to Light Mode";}
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
   const nav=document.querySelector("header .nav,header .inner-navigation") || document.querySelector("header");
   if(!nav || document.getElementById("themeToggle"))return;
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
