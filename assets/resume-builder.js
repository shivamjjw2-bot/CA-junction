(() => {
 'use strict';
 const $=id=>document.getElementById(id),paper=$('resumePaper');if(!paper)return;
 const templates=[['bands','Modern bands','Shaded section headings','Arial'],['serif','Classic serif','Fine rules, centred header','Georgia'],['sidebar','Colour sidebar','Contact & skills sidebar','Arial'],['institute','Institute grid','Structured academic tables','Arial'],['boxed','Boxed finance','Clearly framed sections','Georgia'],['traditional','Traditional CA','Separate qualification tables','Georgia'],['finance','Finance professional','Clean lines, navy accents','Arial']];
 const sections=[['Objective','Professional summary'],['Education','Academic qualifications'],['Professional','Professional qualifications'],['Experience','Professional experience'],['Projects','Projects'],['Skills','Skills & certifications'],['Achievements','Leadership & achievements'],['Languages','Languages'],['Hobbies','Interests']];
 let selected='bands',busy=false,fitOkay=false;
 const value=id=>$('resume'+id)?.value.trim()||'';
 const status=(text,error=false)=>{$('resumeStatus').textContent=text;$('resumeStatus').className='status'+(error?' fit-error':'')};
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el};
 function inline(el,text){String(text).split(/(\*\*[^*]+\*\*)/g).forEach(part=>el.append(part.startsWith('**')&&part.endsWith('**')?node('strong',part.slice(2,-2)):document.createTextNode(part)))}
 function section(id,title){const text=value(id);if(!text)return null;const el=node('section');el.append(node('h2',title));const lines=text.split(/\r?\n/).filter(x=>x.trim());
  if(['Education','Professional'].includes(id)&&lines.every(x=>x.split('|').length===4)){
   const table=node('table'),head=node('thead'),tr=node('tr');['Year','Course / examination','Institution','Grade / rank'].forEach(x=>tr.append(node('th',x)));head.append(tr);table.append(head);const body=node('tbody');lines.forEach(line=>{const row=node('tr');line.split('|').forEach(x=>{const td=node('td');inline(td,x.trim());row.append(td)});body.append(row)});table.append(body);el.append(table);
  }else lines.forEach(line=>{const bullet=/^[•*\-]\s+/.test(line);const p=node('p','',bullet?'cv-bullet':'');const span=node('span');inline(span,line.replace(/^[•*\-]\s+/,''));p.append(span);el.append(p)});
  return el;
 }
 function render(){
  paper.dataset.template=selected;paper.style.setProperty('--accent',$('resumeColour').value);paper.style.setProperty('--resume-font',$('resumeFont').value);paper.style.setProperty('--resume-size',$('resumeSize').value+'pt');paper.style.setProperty('--resume-gap',$('resumeSpacing').value+'px');paper.replaceChildren();
  const header=node('header');header.append(node('h1',value('Name')||'YOUR NAME'));if(value('Role'))header.append(node('p',value('Role'),'cv-role'));
  const contact=node('p',[value('Email'),value('Phone'),value('Location'),value('LinkedIn'),value('Portfolio')].filter(Boolean).join(' · '),'cv-contact');
  if(selected!=='sidebar')header.append(contact);paper.append(header);const content=node('div','','cv-content');let ordered=[...sections];if($('resumeOrder').value==='experience')ordered.sort((a,b)=>['Objective','Experience','Projects','Education','Professional','Skills','Achievements','Languages','Hobbies'].indexOf(a[0])-['Objective','Experience','Projects','Education','Professional','Skills','Achievements','Languages','Hobbies'].indexOf(b[0]));
  const side=node('aside','','cv-sidebar');if(selected==='sidebar'){side.append(node('h2','Contact'),contact);paper.append(side)}
  ordered.forEach(([id,title])=>{const el=section(id,title);if(el)(selected==='sidebar'&&['Skills','Languages','Hobbies'].includes(id)?side:content).append(el)});paper.append(content);
  requestAnimationFrame(checkFit);
 }
 function checkFit(){
  const viewport=$('resumePreviewViewport');paper.style.transform='none';const width=paper.offsetWidth;const pageHeight=297*96/25.4;const tooTall=paper.scrollHeight>pageHeight+2;
  let longBullets=0;paper.querySelectorAll('.cv-bullet>span').forEach(span=>{const range=document.createRange();range.selectNodeContents(span);const tops=[...range.getClientRects()].map(r=>Math.round(r.top));if(new Set(tops).size>1)longBullets++});
  const horizontal=paper.scrollWidth>paper.clientWidth+1;fitOkay=!tooTall&&!longBullets&&!horizontal;
  const feedback=$('resumeFit');feedback.className=fitOkay?'fit-good':'fit-error';feedback.textContent=tooTall?'More than one page — shorten content or use compact spacing.':horizontal?'Some content is too wide — shorten the long text.':longBullets?`${longBullets} bullet(s) wrap onto another line — condense or split them before export.`:'Fits one A4 page · bullets fit one line';
  const scale=Math.min(1,viewport.clientWidth/width);paper.style.transform=`scale(${scale})`;viewport.style.height=Math.ceil(paper.offsetHeight*scale)+'px';
 }

 const dialog=$('templateDialog');let previewId='bands';
 const choose=(id,font)=>{selected=id;$('resumeFont').value=font;document.querySelectorAll('.template-choice').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.template===id)));render();};
 templates.forEach(([id,title,desc,font])=>{
  const card=node('article','','template-card'),b=node('button','','template-choice');b.type='button';b.dataset.template=id;b.setAttribute('aria-pressed',String(id===selected));
  const img=node('img');img.src='assets/resume-previews/'+id+'.webp';img.alt=title+' — full-page sample resume';img.width=794;img.height=1123;img.loading='lazy';
  b.append(img,node('strong',title),node('small',desc));b.addEventListener('click',()=>choose(id,font));
  const zoom=node('button','View full resume ↗','template-zoom');zoom.type='button';zoom.setAttribute('aria-label','Preview '+title);
  zoom.addEventListener('click',()=>{previewId=id;$('templateDialogTitle').textContent=title;$('templateDialogImage').src=img.src;$('templateDialogImage').alt=img.alt;dialog.showModal()});
  card.append(b,zoom);$('resumeTemplates').append(card);
 });
 $('closeTemplateDialog').addEventListener('click',()=>dialog.close());
 $('usePreviewTemplate').addEventListener('click',()=>{const t=templates.find(t=>t[0]===previewId);choose(t[0],t[3]);dialog.close()});
 const palettes=[['Midnight navy','#233e68'],['Forest green','#255440'],['Ocean teal','#11666b'],['Burgundy','#792f46'],['Soft plum','#604578'],['Charcoal','#303640']];
 palettes.forEach(([name,colour])=>{const b=node('button','','colour-swatch');b.type='button';b.setAttribute('aria-label',name);b.setAttribute('aria-pressed',String(colour===$('resumeColour').value));const dot=node('span','','colour-dot');dot.style.background=colour;b.append(dot,node('span',name));b.addEventListener('click',()=>{$('resumeColour').value=colour;document.querySelectorAll('.colour-swatch').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('selectedColourName').textContent=name;render()});$('resumeColourPalette').append(b)});

 $('resumeForm').addEventListener('input',render);document.querySelectorAll('.resume-controls input,.resume-controls select').forEach(x=>x.addEventListener('input',render));new ResizeObserver(checkFit).observe($('resumePreviewViewport'));
 $('resumeForm').addEventListener('reset',()=>setTimeout(()=>{render();status('Details cleared. No resume is saved on this site.')},0));
 $('downloadMaster').addEventListener('click',()=>{const text=[value('Master'),...sections.map(([id,label])=>value(id)?label+'\n'+value(id):'')].filter(Boolean).join('\n\n');if(!text){status('Add your master CV notes or career details first.',true);return}const url=URL.createObjectURL(new Blob([text+"\n\n— CA Junction —\n"],{type:'text/plain;charset=utf-8'})),a=node('a');a.href=url;a.download='my-master-cv.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 $('printResume').addEventListener('click',()=>{checkFit();if(!value('Name')||!sections.some(([id])=>value(id))){status('Add your name and resume content before exporting.',true);return}if(!fitOkay){status('Please resolve the page or bullet-length warning above the preview before exporting.',true);$('resumeFit').scrollIntoView({behavior:'smooth',block:'center'});return}window.print()});
 $('generateResumeDraft').addEventListener('click',async()=>{
  if(busy)return;if(!value('Role')){status('Enter your target role first.',true);$('resumeRole').focus();return}if(!value('Master')&&!sections.some(([id])=>id!=='Objective'&&value(id))){status('Add your career facts or master CV first.',true);return}
  busy=true;const button=$('generateResumeDraft');button.disabled=true;button.textContent='Drafting your resume…';status('Selecting relevant facts and refining your one-page draft…');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),105000);
  const form=$('resumeForm'),inputs=[...form.querySelectorAll('input,textarea,select,button')];inputs.forEach(x=>x.disabled=true);
  try{const sb=window.CA_APP?.supabase;if(!sb)throw Error('Please sign in to draft your resume.');const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error('Please sign in to draft your resume. You can still build and edit it manually.');
   const payload={role:value('Role'),industry:value('Industry'),master:value('Master'),institute:value('Institute'),bullet_order:$('resumeBulletOrder').value,template:selected,education:value('Education'),qualification:value('Professional'),experience:value('Experience'),projects:value('Projects'),skills:value('Skills'),achievements:value('Achievements'),languages:value('Languages'),interests:value('Hobbies'),objective:value('Objective')};
   const response=await fetch('/api/ai-resume-draft',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+session.access_token},body:JSON.stringify(payload),signal:controller.signal});const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'CA Junction could not draft your resume. Please retry.');
   const mapping={Objective:'objective',Education:'education',Professional:'qualifications',Experience:'experience',Projects:'projects',Skills:'skills',Achievements:'achievements',Languages:'languages',Hobbies:'interests'};if(Object.values(mapping).some(key=>typeof result[key]!=='string'))throw Error('The draft was incomplete. Your original details have been kept. Please retry.');
   if(!value('Master'))$('resumeMaster').value=sections.map(([id,label])=>value(id)?label+'\n'+value(id):'').filter(Boolean).join('\n\n');
   Object.entries(mapping).forEach(([id,key])=>$('resume'+id).value=result[key]);render();status('Draft ready. Your master copy is preserved. Check every fact, edit the wording, and resolve any length warnings before exporting.');
  }catch(e){status(e.name==='AbortError'?'Drafting took too long. Your details are safe on this page; please retry.':e.message,true)}finally{clearTimeout(timer);busy=false;inputs.forEach(x=>x.disabled=false);button.textContent='Draft my one-page resume'}
 });
 render();
})();
