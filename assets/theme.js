
(function(){
 const key="caJunctionTheme";
 function saved(){try{return localStorage.getItem(key)==="light"?"light":"dark"}catch{return "dark"}}
 function apply(theme){document.documentElement.dataset.theme=theme;const button=document.getElementById("themeToggle");if(button){button.textContent=theme==="dark"?"☀ Switch to light":"☾ Switch to dark";button.setAttribute("aria-label",theme==="dark"?"Switch to light mode":"Switch to dark mode");button.setAttribute("aria-pressed",String(theme==="light"));button.title=button.getAttribute("aria-label");}}
 apply(saved());
 function mount(){const button=document.createElement("button");button.id="themeToggle";button.className="theme-toggle";button.type="button";button.addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="light"?"dark":"light";try{localStorage.setItem(key,next)}catch{}apply(next)});const nav=document.querySelector("header .nav");if(nav){nav.classList.add("theme-nav");const menu=nav.querySelector(".menu");nav.insertBefore(button,menu||null);}else{document.body.append(button);}apply(saved());}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
 window.addEventListener("storage",event=>{if(event.key===key)apply(saved())});
})();
