export function appendAvailablePaper(host,failure,paper,{el,button,sb}){
 const addLink=(url,label)=>{const u=new URL(url);if(u.protocol!=='https:')return;const a=el('a',label,'trend-button secondary');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';host.append(a)};
 if(paper?.sourceUrl){try{addLink(paper.sourceUrl,'Open original question paper')}catch{}}
 else if(paper?.sourcePath)host.append(button('Open original question paper',async()=>{
  const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
  try{const{data,error}=await sb.storage.from('ca-materials').createSignedUrl(paper.sourcePath,300);if(error||!data?.signedUrl)throw Error('Could not open the paper. Please sign in again or open it from Study Materials.');const u=new URL(data.signedUrl);if(u.protocol!=='https:')throw Error('Invalid paper link.');if(tab)tab.location.href=u.href;else addLink(u.href,'Your paper is ready — open PDF')}
  catch(e){tab?.close();host.append(el('p',e.message,'trend-small'))}
 },'secondary'));
 const available=failure.available;
 if(available?.status!=='unverified'||!Array.isArray(available.questions)||!available.questions.length){host.append(el('p','No readable extraction is available yet. Use the original question paper to continue studying.','trend-small'));return}
 const details=el('details');details.append(el('summary','Available question references — unverified extraction'),el('p','These AI-extracted references, page numbers and topics may contain errors. Check the original paper. Disputed marks are not shown and this paper is excluded from trend totals.','trend-note'));
 const scroll=el('div',undefined,'trend-scroll'),table=el('table',undefined,'trend-matrix'),head=el('tr');
 for(const text of ['Question','PDF page','Tentative topic','Extracted summary'])head.append(el('th',text));table.append(head);
 for(const q of available.questions){const row=el('tr');for(const text of [q.section+' '+q.ref,String(q.page),q.topic,q.summary])row.append(el('td',text));table.append(row)}
 scroll.append(table);details.append(scroll);host.append(details);
}
