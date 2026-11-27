import {SUBJECTS} from './paper-core.js';

function element(tag,text){
  const node=document.createElement(tag);
  if(text!==undefined) node.textContent=text;
  return node;
}
function field(parent,label,choices,type='text'){
  const wrapper=element('label',label);
  const input=element(choices?'select':'input');
  if(choices) for(const value of choices) input.add(new Option(value,value));
  else input.type=type;
  input.required=true;
  wrapper.append(input);
  parent.append(wrapper);
  return input;
}
function action(parent,label,run,status){
  const button=element('button',label);
  button.className='btn';button.type='button';
  button.onclick=async()=>{
    button.disabled=true;status.textContent='';
    try{await run()}catch(error){status.textContent=error.message||'Request failed.'}
    finally{button.disabled=false}
  };
  parent.append(button);
}
async function call(sb,name,params){
  const {data,error}=await sb.rpc(name,params);
  if(error) throw error;
  return data;
}
export function ownerTeam(host,sb){
  if(!host)return;
  const panel=element('section'),status=element('p'),list=element('ul');
  status.setAttribute('role','status');
  panel.append(element('h2','Team management'));
  const email=field(panel,'Manager Google email',null,'email');
  const boxes=['PYQ','MTP','RTP'].map(value=>{
    const label=element('label'),input=element('input');
    input.type='checkbox';input.value=value;label.append(input,' Add '+value+' drafts');panel.append(label);return input;
  });
  const manage=(action,extra={})=>call(sb,'ca_team_manage',{action,...extra});
  async function refresh(){
    const managers=await manage('list');list.replaceChildren();
    for(const manager of managers){
      const li=element('li');
      action(li,manager.email+' · '+(manager.active?'Active':'Suspended'),()=>{
        email.value=manager.email;
        boxes.forEach(box=>box.checked=manager.modules.includes(box.value));
      },status);
      list.append(li);
    }
  }
  for(const [caption,verb] of [['Save permissions','save'],['Suspend','suspend'],['Reactivate','reactivate'],['Remove manager','remove']]){
    action(panel,caption,async()=>{
      if(!email.reportValidity())return;
      if(verb==='remove'&&!confirm('Remove manager access for '+email.value+'?'))return;
      await manage(verb,{email:email.value.trim(),modules:boxes.filter(b=>b.checked).map(b=>b.value)});
      await refresh();status.textContent='Manager access updated.';
    },status);
  }
  const history=element('ol');
  action(panel,'Activity history',async()=>{
    const events=await manage('history');history.replaceChildren();
    for(const e of events)history.append(element('li',new Date(e.created_at).toLocaleString()+' · '+(e.manager||'Removed account')+' · '+e.action));
    if(!events.length)status.textContent='No manager activity yet.';
  },status);
  panel.append(status,list,history);host.append(panel);
  refresh().catch(e=>status.textContent=e.message);
}
export function managerDesk(anchor,sb,permissions){
  const panel=element('section'),form=element('form'),status=element('p');
  panel.className='panel';status.setAttribute('role','status');panel.append(element('h2','Add a paper draft'),form,status);
  const collection=field(form,'Collection',permissions),level=field(form,'Level',Object.keys(SUBJECTS)),subject=field(form,'Subject',SUBJECTS[level.value]);
  level.onchange=()=>subject.replaceChildren(...SUBJECTS[level.value].map(s=>new Option(s,s)));
  const year=field(form,'Exam year',null,'number');year.min='1990';year.max=String(new Date().getFullYear()+1);year.value=String(new Date().getFullYear());
  const month=field(form,'Attempt',['January','May','June','September','November','December']),kind=field(form,'Document',['Question paper','Solution']),url=field(form,'ICAI or approved archive PDF link',null,'url');
  const submit=element('button','Save draft');submit.className='btn';form.append(submit);
  form.onsubmit=async e=>{
    e.preventDefault();if(submit.disabled)return;submit.disabled=true;
    try{
      await call(sb,'ca_manager_add_paper',{collection:collection.value,level_name:level.value,subject_name:subject.value,exam_year:Number(year.value),exam_month:month.value,kind:kind.value==='Solution'?'solution':'question',pdf_url:url.value.trim()});
      url.value='';status.textContent='Draft saved for review.';
    }catch(error){status.textContent=error.message}finally{submit.disabled=false}
  };
  action(panel,'Sign out',async()=>{const {error}=await sb.auth.signOut();if(error)throw error;location.reload()},status);
  anchor.after(panel);
}
