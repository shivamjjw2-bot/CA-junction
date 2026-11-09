(() => {
  const app = window.CA_APP;
  const sb = app && app.supabase;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const msg = (id, text, state = "info") => window.caSetMessage($(id), text, state);
  const ready = () => {
    if (app && app.configured && sb) return true;
    return false;
  };
  const backendMessage = "Backend setup is not connected yet. Supabase project settings are required before accounts and saved content can work.";
  const safeText = value => String(value || "");
  const addRow = (list, title, detail = "") => {
    if (!list) return;
    const row = document.createElement("div");
    row.className = "data-row";
    const body = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = safeText(title);
    body.append(strong);
    if (detail) {
      const p = document.createElement("p");
      p.textContent = safeText(detail);
      body.append(p);
    }
    row.append(body);
    list.append(row);
  };
  const emptyRow = (list, text) => {
    if (!list) return;
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = text;
    list.replaceChildren(p);
  };
  const setHtml = (element, html) => { if (element) element.innerHTML = html; };
  const escapeAttr = value => safeText(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const timerStateKey="caJunctionStudyTimer";
  function readTimerState(){try{const saved=JSON.parse(localStorage.getItem(timerStateKey)||"{}");return{elapsed:Number(saved.elapsed)||0,runningSince:Number(saved.runningSince)||null,minimized:Boolean(saved.minimized),countdownMinimized:Boolean(saved.countdownMinimized),focusMode:Boolean(saved.focusMode)}}catch{return{elapsed:0,runningSince:null,minimized:false,focusMode:false}}}
  let studyTimer=readTimerState();
  function saveTimerState(){localStorage.setItem(timerStateKey,JSON.stringify(studyTimer));window.dispatchEvent(new Event("ca:timer-update"))}
  function currentTimerSeconds(){return studyTimer.elapsed+(studyTimer.runningSince?Math.max(0,Math.floor((Date.now()-studyTimer.runningSince)/1000)):0)}
  function timerClock(seconds){const h=String(Math.floor(seconds/3600)).padStart(2,"0"),m=String(Math.floor(seconds%3600/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");return h+":"+m+":"+s}
  async function saveTimerChunk(seconds){
    if(seconds<=0)return;let saved=false;
    if(ready()){try{const {data:{user}}=await sb.auth.getUser();if(user){const {error}=await sb.from("study_sessions").insert({user_id:user.id,duration_seconds:seconds});if(!error)saved=true}}catch{}}
    if(!saved){const key="caJunctionLocalStudySeconds";localStorage.setItem(key,String(Number(localStorage.getItem(key)||0)+seconds))}
    document.querySelectorAll("#todayHours").forEach(async label=>{if(ready()){try{const {data:{user}}=await sb.auth.getUser();if(user){const start=new Date();start.setHours(0,0,0,0);const {data}=await sb.from("study_sessions").select("duration_seconds").eq("user_id",user.id).gte("started_at",start.toISOString());label.textContent=Math.round((data||[]).reduce((sum,row)=>sum+Number(row.duration_seconds||0),0)/60)+" minutes";return}}catch{}}label.textContent=Math.round(Number(localStorage.getItem("caJunctionLocalStudySeconds")||0)/60)+" minutes"});
  }
  function pauseStudyTimer(){if(!studyTimer.runningSince)return;const segment=Math.max(0,Math.floor((Date.now()-studyTimer.runningSince)/1000));studyTimer.elapsed+=segment;studyTimer.runningSince=null;studyTimer.focusMode=false;saveTimerState();if(segment)saveTimerChunk(segment)}
  function startStudyTimer(){if(!studyTimer.runningSince){studyTimer.runningSince=Date.now();saveTimerState()}}
  function initTimerDock(){
    if(!document.getElementById("caTimerDockStyle")){const style=document.createElement("style");style.id="caTimerDockStyle";style.textContent=".ca-timer-dock{position:fixed;z-index:9999;right:16px;bottom:16px;display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid #d8b443;border-radius:13px;background:#111526;box-shadow:0 12px 36px #0009;color:#fff;font:600 13px/1.3 system-ui}.ca-timer-dock[hidden]{display:none}.ca-timer-dock strong{color:#f5c84c;font-variant-numeric:tabular-nums}.ca-timer-dock button,.ca-timer-dock a{border:0;border-radius:8px;padding:7px 9px;background:#282d42;color:#fff;text-decoration:none;font-weight:700;cursor:pointer}.ca-timer-dock a{background:#4f46e5}@media(max-width:600px){.ca-timer-dock{left:10px;right:10px;bottom:10px;justify-content:space-between}}";document.head.append(style)}
    let dock=$("#caTimerDock");if(!dock){dock=document.createElement("aside");dock.id="caTimerDock";dock.className="ca-timer-dock";dock.setAttribute("aria-label","Minimized study timer");dock.innerHTML='<span id="caDockCountdown" style="color:#f5c84c;font-weight:800"></span><strong id="caTimerDockTime">00:00:00</strong><button id="caTimerDockToggle" type="button">Start</button><a href="tracker.html?timer=restore">Show tracker</a>';document.body.append(dock)}
    const update=()=>{studyTimer=readTimerState();dock.hidden=!(studyTimer.minimized||studyTimer.countdownMinimized);const savedDate=localStorage.getItem("caJunctionExamDate")||"";const daysLabel=$("#caDockCountdown");if(savedDate){const [y,m,d]=savedDate.split("-").map(Number),target=new Date(y,m-1,d),today=new Date();target.setHours(0,0,0,0);today.setHours(0,0,0,0);const days=Math.round((target-today)/86400000);daysLabel.textContent=days>0?(days+" days left · "):(days===0?"Exam day · ":"")}else daysLabel.textContent="";$("#caTimerDockTime").textContent=timerClock(currentTimerSeconds());$("#caTimerDockToggle").textContent=studyTimer.runningSince?"Pause":(currentTimerSeconds()?"Resume":"Start");$("#caTimerDockToggle").onclick=()=>{if(studyTimer.runningSince)pauseStudyTimer();else startStudyTimer();update()}};
    window.addEventListener("ca:timer-update",update);setInterval(update,1000);update();
  }

  function initCommon() {
    const nav = $("#siteNav");
    const menu = $(".menu");
    if (nav && menu) {
      menu.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menu.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      });
      $$("a", nav).forEach(link => link.addEventListener("click", () => {
        nav.classList.remove("open");
        menu.setAttribute("aria-expanded","false");
      }));
    }
    $$("[data-whatsapp]").forEach(link => {
      const url = window.caWhatsAppUrl(link.dataset.whatsappMessage || undefined);
      if (url) {
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled","true");
        link.title = "WhatsApp contact details have not been configured yet.";
      }
    });
    initTimerDock();
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function initHome() {
    const accountLink=$("#accountNavLink");
    if(accountLink&&ready())sb.auth.getUser().then(({data:{user}})=>{if(user){accountLink.href="platform.html";accountLink.textContent="My Dashboard";}});
    $("a").forEach(link => link.addEventListener("click", () => {
      if (!link.hash) return;
      const target = $(link.hash);
      if (target?.tagName === "DETAILS") target.open = true;
    }));
    document.addEventListener("click", event => {
      const link = event.target.closest('a[href$=".html"],a[href*=".html#"]');
      if (!link) return;
      const level = localStorage.getItem("caJunctionLevel");
      if (!level) return;
      const href = new URL(link.href,location.href);
      if (href.origin !== location.origin || !href.pathname.endsWith(".html")) return;
      if (["/mtp.html","/rtp.html","/previous-papers.html","/mock-test.html"].some(path=>href.pathname.endsWith(path))) return;
      href.searchParams.set("level",level);
      link.href = href.pathname.split("/").pop() + href.search + href.hash;
    }, true);
    if (ready()) loadHomeHighlights();
  }

  async function loadHomeHighlights() {
    const notes = $("#homeFeaturedNotes");
    const tests = $("#homeFeaturedTests");
    const jobs = $("#homeFeaturedJobs");
    if (!notes && !tests && !jobs) return;
    const { data: materialRows } = await sb.from("materials").select("id,title,description,level,category,is_premium").eq("is_published",true).order("created_at",{ascending:false}).limit(3);
    const { data: testRows } = await sb.from("study_tests").select("id,title,description,level,test_type,access_tier").eq("is_published",true).order("created_at",{ascending:false}).limit(3);
    const { data: jobRows } = await sb.from("jobs").select("id,title,organization,location,job_type,description").eq("is_published",true).order("created_at",{ascending:false}).limit(3);
    const fill = (el, rows, empty, link, badgeField) => {
      if (!el) return;
      el.replaceChildren();
      if (!rows || !rows.length) {
        const p=document.createElement("div");p.className="empty";p.textContent=empty;el.append(p);return;
      }
      rows.forEach(row=>{
        const card=document.createElement("a");card.className="card";card.href=link;
        const tag=document.createElement("span");tag.className="badge free";
        tag.textContent="Free";
        const h=document.createElement("h3");h.textContent=row.title;
        const p=document.createElement("p");p.textContent=row.description || row.organization || row.level || "";
        card.append(tag,h,p);el.append(card);
      });
    };
    fill(notes,materialRows,"Your own notes will appear here after admin approval.","study.html");
    fill(tests,testRows,"Tests will appear here after the admin publishes them.","tests.html");
    fill(jobs,jobRows,"Verified opportunities will appear here after the admin publishes them.","career.html#jobs");
  }

  function initAccount() {
    const chosenLevel=new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"Foundation";
    const subjectsByLevel={
      Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
      Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
      Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
    };
    const fillNoteSubjects=level=>{
      const subjectSelect=$("#noteSubject");if(!subjectSelect)return;
      const current=subjectSelect.value;
      subjectSelect.replaceChildren(new Option("Choose a subject",""),...(subjectsByLevel[level]||[]).map(subject=>new Option(subject,subject)));
      if((subjectsByLevel[level]||[]).includes(current))subjectSelect.value=current;
    };
    localStorage.setItem("caJunctionLevel",chosenLevel);
    if($("#noteLevel"))$("#noteLevel").value=chosenLevel;
    fillNoteSubjects(chosenLevel);
    $("#noteLevel")?.addEventListener("change",()=>{const level=$("#noteLevel").value;localStorage.setItem("caJunctionLevel",level);fillNoteSubjects(level)});
    if($("#signupLevel"))$("#signupLevel").value=chosenLevel;
    if($("#signupLevelLabel"))$("#signupLevelLabel").textContent=chosenLevel;
    if (!ready()) {
      msg("#authStatus", backendMessage);
      msg("#uploadStatus", backendMessage);
      $("#noteUploadForm")?.querySelectorAll("input,select,button").forEach(control=>control.disabled=true);
      
      
      $("#signInForm")?.querySelectorAll("button").forEach(b=>b.disabled=true);
      $("#signUpForm")?.querySelectorAll("button").forEach(b=>b.disabled=true);
      return;
    }
    const signInTab=$("#signInTab"), signUpTab=$("#signUpTab"), signIn=$("#signInForm"), signUp=$("#signUpForm");
    const chooseTab = which => {
      const signingIn=which==="signin";
      signIn.hidden=!signingIn;signUp.hidden=signingIn;
      signInTab?.setAttribute("aria-selected",String(signingIn));
      signUpTab?.setAttribute("aria-selected",String(!signingIn));
    };
    signInTab?.addEventListener("click",()=>chooseTab("signin"));
    signUpTab?.addEventListener("click",()=>chooseTab("signup"));
    signIn?.addEventListener("submit",async e=>{
      e.preventDefault();msg("#authStatus","Signing in…");
      const {error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});
      if(error){msg("#authStatus",error.message,"error");return}
      const nextPage=new URLSearchParams(location.search).get("next")||"";location.href=nextPage==="upload.html"||/^study\.html(?:[?#]|$)/.test(nextPage)?nextPage:"index.html";
    });
    signUp?.addEventListener("submit",async e=>{
      e.preventDefault();msg("#authStatus","Creating your account…");
      const {data,error}=await sb.auth.signUp({email:$("#signupEmail").value.trim(),password:$("#signupPassword").value,options:{data:{full_name:$("#signupName").value.trim(),ca_level:$("#signupLevel").value}}});
      if(error){msg("#authStatus",error.message,"error");return}
      msg("#authStatus",data.session ? "Account created. Opening your dashboard…" : "Account created. Check your email to confirm, then sign in.");
      if(data.session){const nextPage=new URLSearchParams(location.search).get("next")||"";location.href=nextPage==="upload.html"||/^study\.html(?:[?#]|$)/.test(nextPage)?nextPage:"index.html";}
    });
    $("#noteUploadForm")?.addEventListener("submit",submitStudentNote);
  }

  async function uploadStudentNoteResumable(file,path,onProgress){
    if(!window.tus?.Upload){
      const {error}=await sb.storage.from("student-notes").upload(path,file,{contentType:"application/pdf",upsert:false});
      if(error)throw error;
      onProgress(file.size,file.size);
      return;
    }
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session)throw new Error("Your sign-in expired. Please sign in again and retry.");
    const projectHost=new URL(app.config.SUPABASE_URL).hostname;
    const storageHost=projectHost.replace(".supabase.co",".storage.supabase.co");
    const endpoint="https://"+storageHost+"/storage/v1/upload/resumable";
    await new Promise((resolve,reject)=>{
      const upload=new window.tus.Upload(file,{
        endpoint,
        retryDelays:[0,1000,3000,5000,10000],
        headers:{authorization:"Bearer "+session.access_token,apikey:app.config.SUPABASE_PUBLISHABLE_KEY,"x-upsert":"false"},
        metadata:{bucketName:"student-notes",objectName:path,contentType:"application/pdf",cacheControl:"3600"},
        chunkSize:6*1024*1024,
        uploadDataDuringCreation:true,
        removeFingerprintOnSuccess:true,
        onError:reject,
        onProgress:onProgress,
        onSuccess:resolve
      });
      upload.start();
    });
  }

  async function submitStudentNote(event) {
    event.preventDefault();
    const {data:{user}}=await sb.auth.getUser();
    if(!user){location.href="account.html?next=upload.html";return}
    const file=$("#notePdf").files[0];
    if(!file || !(file.type==="application/pdf"||/\.pdf$/i.test(file.name)) || file.size>50*1024*1024){msg("#uploadStatus","Choose a PDF no larger than 50 MB. The current storage plan does not accept larger files.","error");return}
    const subject=$("#noteSubject").value.trim(),chapter=$("#noteChapter").value.trim(),authorName=$("#noteContributorName").value.trim();
    const instagramHandle=$("#noteInstagram").value.trim().replace(/^@/,"");
    if(instagramHandle&&!/^[A-Za-z0-9._]{1,30}$/.test(instagramHandle)){msg("#uploadStatus","Enter a valid Instagram ID, such as @yourusername.","error");return}
    const rawLinkedIn=$("#noteLinkedIn").value.trim();
    let linkedinUrl="";
    if(rawLinkedIn){
      const profileLink=/^(?:https:\/\/)?(?:(?:www|[a-z]{2})\.)?linkedin\.com\//i.test(rawLinkedIn);
      if(profileLink){
        try{const parsed=new URL(/^https:\/\//i.test(rawLinkedIn)?rawLinkedIn:"https://"+rawLinkedIn);if(parsed.protocol!=="https:"||!(parsed.hostname==="linkedin.com"||parsed.hostname.endsWith(".linkedin.com"))){msg("#uploadStatus","Enter a LinkedIn profile link or ID.","error");return}linkedinUrl=parsed.href}
        catch{msg("#uploadStatus","Enter a valid LinkedIn profile link or ID.","error");return}
      }else if(/^[A-Za-z0-9-]{3,100}$/.test(rawLinkedIn)){linkedinUrl="https://www.linkedin.com/in/"+encodeURIComponent(rawLinkedIn)+"/"}
      else{msg("#uploadStatus","Enter a LinkedIn profile link or ID.","error");return}
    }
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=user.id+"/"+crypto.randomUUID()+"_"+safeName;
    msg("#uploadStatus","Uploading your PDF securely…");
    const submitButton=$("#noteUploadForm button[type=submit]"),progress=$("#uploadProgress"),progressText=$("#uploadProgressText");
    if(submitButton)submitButton.disabled=true;
    if(progress){progress.hidden=false;progress.value=0}
    if(progressText){progressText.hidden=false;progressText.textContent="0% uploaded"}
    try{
      await uploadStudentNoteResumable(file,path,(uploaded,total)=>{
        const percent=total?Math.min(100,Math.round(uploaded/total*100)):0;
        if(progress)progress.value=percent;
        if(progressText)progressText.textContent=percent+"% uploaded";
      });
    }catch(uploadError){
      msg("#uploadStatus",uploadError.message||"The PDF upload failed. Check your connection and try again.","error");
      if(submitButton)submitButton.disabled=false;
      return;
    }
    const {error}=await sb.from("student_note_submissions").insert({
      user_id:user.id,title:(subject+" — "+chapter).slice(0,140),level:$("#noteLevel").value,
      subject,chapter,description:"",contributor_name:authorName,instagram_handle:instagramHandle,linkedin_url:linkedinUrl,file_path:path
    });
    if(error){await sb.storage.from("student-notes").remove([path]);msg("#uploadStatus",error.message,"error");return}
    const selectedLevel=$("#noteLevel").value;event.target.reset();$("#noteLevel").value=selectedLevel;fillNoteSubjects(selectedLevel);if($("#viewContributionLink"))$("#viewContributionLink").hidden=false;msg("#uploadStatus","Your PDF is live in Contributions by Students, credited to "+authorName+".");
  }

  async function initDashboard() {
    const {data:{user}}=await sb.auth.getUser();
    if(!user){msg("#dashboardStatus","Please sign in to view and edit your profile.","error");location.href="account.html";return}
    const {data:profile,error:profileError}=await sb.from("profiles").select("full_name,ca_level").eq("user_id",user.id).maybeSingle();
    if(profileError){msg("#dashboardStatus","Your profile could not be loaded. Please refresh and try again.","error");return}
    const nameInput=$("#profileName"),levelInput=$("#profileLevel"),photoInput=$("#profilePhoto");
    const photoPreview=$("#profilePhotoPreview"),photoInitial=$("#profilePhotoInitial");
    if(nameInput)nameInput.value=profile?.full_name||user.user_metadata?.full_name||"";
    if(levelInput)levelInput.value=profile?.ca_level||"Foundation";
    const showPhoto=value=>{
      if(!photoPreview||!photoInitial)return;
      if(typeof value==="string"&&value.startsWith("data:image/")){photoPreview.src=value;photoPreview.hidden=false;photoInitial.hidden=true}
      else{photoPreview.removeAttribute("src");photoPreview.hidden=true;photoInitial.hidden=false;photoInitial.textContent=(nameInput?.value||"CA").trim().split(/\\s+/).slice(0,2).map(word=>word[0]).join("").toUpperCase()||"CA"}
    };
    showPhoto(user.user_metadata?.avatar_data||"");
    photoInput?.addEventListener("change",()=>{
      const file=photoInput.files?.[0];if(!file)return;
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)){photoInput.value="";msg("#profileStatus","Choose a JPG, PNG or WebP photo.","error");return}
      if(file.size>8*1024*1024){photoInput.value="";msg("#profileStatus","Choose a photo smaller than 8 MB.","error");return}
      const previewUrl=URL.createObjectURL(file);photoPreview.src=previewUrl;photoPreview.hidden=false;photoInitial.hidden=true;
      photoPreview.onload=()=>URL.revokeObjectURL(previewUrl);
    });
    const makeProfilePhoto=async file=>{
      const image=new Image(),url=URL.createObjectURL(file);
      try{
        await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});
        const scale=Math.min(1,512/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
        let result=canvas.toDataURL("image/jpeg",.78);
        if(result.length>220000)result=canvas.toDataURL("image/jpeg",.55);
        return result;
      }finally{URL.revokeObjectURL(url)}
    };
    $("#profileForm")?.addEventListener("submit",async event=>{
      event.preventDefault();
      const fullName=nameInput.value.trim(),caLevel=levelInput.value,file=photoInput?.files?.[0]||null;
      if(!fullName){msg("#profileStatus","Enter your name to save your profile.","error");return}
      const button=$('#profileForm button[type="submit"]');if(button)button.disabled=true;
      msg("#profileStatus","Saving your profile…");
      try{
        let avatarData=user.user_metadata?.avatar_data||"";
        if(file){
          avatarData=await makeProfilePhoto(file);
          const {error}=await sb.auth.updateUser({data:{avatar_data:avatarData}});
          if(error)throw error;
        }
        const {error}=await sb.from("profiles").update({full_name:fullName,ca_level:caLevel,updated_at:new Date().toISOString()}).eq("user_id",user.id);
        if(error)throw error;
        const {error:metadataError}=await sb.auth.updateUser({data:{full_name:fullName,ca_level:caLevel}});
        if(metadataError)throw metadataError;
        showPhoto(avatarData);
        msg("#profileStatus","Your profile has been saved.","success");
      }catch(error){msg("#profileStatus",error?.message||"Your profile could not be saved. Please try again.","error")}
      finally{if(button)button.disabled=false}
    });
    $("#signOutButton")?.addEventListener("click",async()=>{await sb.auth.signOut();location.href="account.html"});
  }

  function initStudy() {
    const levelFilter=$("#levelFilter");
    const subjectFilter=$("#subjectFilter");
    const chapterFilter=$("#chapterFilter");
    const authorFilter=$("#authorFilter");
    const subjectsByLevel={
      Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
      Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
      Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
    };
    const chapterSubjectAliases={"Taxation — Income-tax Law":"Taxation","Taxation — Goods and Services Tax":"Taxation","Financial Management":"Financial Management and Strategic Management","Strategic Management":"Financial Management and Strategic Management","Integrated Business Solutions":"Integrated Business Solutions (Multidisciplinary Case Study with Strategic Management)"};
    const materialUrls={Foundation:"https://boslive.icai.org/study_material_new_paper_details.php?c=foundation&language=English",Intermediate:"https://boslive.icai.org/study_material_new_paper_details.php?c=intermediate&language=English",Final:"https://boslive.icai.org/study_material_new_paper_details.php?c=final&language=English"};
    const studentGrid=$("#studentNotesGrid");
    const adminGrid=$("#adminResourcesGrid");
    const revisionLevelApps=$("#revisionLevelApps"),revisionResources=$("#revisionResources");
    const revisionLevelFilter=$("#revisionLevelFilter"),revisionSubjectFilter=$("#revisionSubjectFilter"),revisionChapterFilter=$("#revisionChapterFilter"),revisionCount=$("#revisionResourceCount"),revisionIcaiLink=$("#revisionIcaiLink");
    const requestedLevel=new URLSearchParams(location.search).get("level")||"";
    const savedLevel=revisionLevelApps?requestedLevel:(requestedLevel||localStorage.getItem("caJunctionLevel")||"");
    if(levelFilter&&["Foundation","Intermediate","Final"].includes(savedLevel))levelFilter.value=savedLevel;
    if(revisionLevelFilter&&["Foundation","Intermediate","Final"].includes(requestedLevel||localStorage.getItem("caJunctionLevel")||""))revisionLevelFilter.value=requestedLevel||localStorage.getItem("caJunctionLevel");
    const activeLevel=()=>revisionLevelFilter?revisionLevelFilter.value:(levelFilter?levelFilter.value:savedLevel);
    const levelLabel=$("#selectedLevelLabel");
    if(revisionLevelApps){revisionLevelApps.hidden=Boolean(activeLevel());if(revisionResources)revisionResources.hidden=!activeLevel();const heading=$("#revisionLevelHeading");if(heading&&activeLevel())heading.textContent=activeLevel()}
    if(levelLabel) levelLabel.textContent=studentGrid?(activeLevel()?"Showing "+activeLevel()+" student PDFs.":"Showing student PDFs across all levels."):(activeLevel()?"Showing "+activeLevel()+" resources.":"Choose your CA level on the homepage.");
    if(!activeLevel()&&!levelFilter&&!revisionLevelFilter){
      if(studentGrid){const empty=document.createElement("div");empty.className="empty";empty.textContent="Student contributions are on their way! No PDFs have been shared yet. Be the first to help another CA student.";studentGrid.replaceChildren(empty)}
      if(adminGrid&&!revisionLevelApps){const empty=document.createElement("div");empty.className="empty";empty.textContent="Choose your CA level on the homepage to view matching resources.";adminGrid.replaceChildren(empty)}
      return;
    }
    if(!ready()){msg("#materialStatus",backendMessage);msg("#adminResourcesStatus",backendMessage);if(revisionCount)revisionCount.textContent="Connect to load resources.";return}
    let all=[];
    let currentUserId="";
    const matchesLevel=row=>!activeLevel()||row.level==="All"||row.level===activeLevel();
    const draw=(grid,rows,emptyText,statusId)=>{
      if(!grid)return;
      grid.replaceChildren();
      if(!rows.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=emptyText;grid.append(empty);return}
      rows.forEach(row=>{
        const card=document.createElement("article");card.className="note";
        if(row.category==="student_note"){const icon=document.createElement("span");icon.className="note-app-icon";icon.setAttribute("aria-hidden","true");icon.textContent="📄";card.append(icon)}
        const title=document.createElement("h3");title.textContent=row.title;
        card.append(title);
        if((revisionLevelApps||revisionLevelFilter)&&grid===adminGrid){const kind=document.createElement("small");kind.className="resource-kind";kind.textContent=({revision:"Summary chart",mind_map:"Mind map",formula:"Formula sheet"})[row.category]||"Study resource";card.append(kind)}
        if(row.category!=="student_note"&&row.is_premium){const access=document.createElement("small");access.className="resource-access premium";access.textContent="Premium";card.append(access)}
        if(row.category==="student_note"){
          const detail=document.createElement("p");detail.textContent=row.description||"";if(detail.textContent)card.append(detail);
        }else{
          const detail=document.createElement("p");detail.textContent=revisionLevelApps&&grid===adminGrid?(row.description||row.subject||""):(row.description||[row.subject,row.level].filter(Boolean).join(" · "));if(detail.textContent)card.append(detail);
        }
        if(row.category==="student_note"){
          const author=document.createElement("small");author.className="note-author";author.textContent="Shared by "+(row.contributor_name||"CA Junction student");card.append(author);
          if(row.instagram_handle){const handle=row.instagram_handle.replace(/^@/,"");if(/^[A-Za-z0-9._]{1,30}$/.test(handle)){const profile=document.createElement("a");profile.className="link";profile.href="https://www.instagram.com/"+encodeURIComponent(handle)+"/";profile.target="_blank";profile.rel="noopener";profile.textContent="Instagram: @"+handle+" ↗";card.append(profile)}}
          if(row.linkedin_url){try{const profileUrl=new URL(row.linkedin_url);if(profileUrl.protocol==="https:"&&(profileUrl.hostname==="linkedin.com"||profileUrl.hostname.endsWith(".linkedin.com"))){const profile=document.createElement("a");profile.className="link";profile.href=profileUrl.href;profile.target="_blank";profile.rel="noopener";profile.textContent="LinkedIn profile ↗";card.append(profile)}}catch{}}
        }
        const meta=document.createElement("small");meta.textContent=row.category==="student_note"?[row.level,row.subject&&("Subject: "+row.subject),row.chapter&&("Chapter: "+row.chapter)].filter(Boolean).join(" · "):((revisionLevelApps||revisionLevelFilter)&&grid===adminGrid?[row.level,row.subject,row.chapter].filter(Boolean):[row.level,row.subject].filter(Boolean)).join(" · ");if(meta.textContent)card.append(meta);
        const action=row.external_url?document.createElement("a"):document.createElement("button");
        action.className="link";
        if(row.external_url){action.href=row.external_url;action.target="_blank";action.rel="noopener";action.textContent="Open PDF ↗"}
        else{action.type="button";action.textContent="Open PDF";action.addEventListener("click",()=>downloadMaterial(row,statusId))}
        card.append(action);
        if(row.category==="student_note"&&currentUserId&&row.submitted_by===currentUserId&&row.student_submission_id){
          const remove=document.createElement("button");remove.type="button";remove.className="link remove-note";remove.textContent="Remove my PDF";
          remove.addEventListener("click",async()=>{
            if(!window.confirm("Remove this PDF from Contributions by Students? This cannot be undone."))return;
            remove.disabled=true;msg(statusId,"Removing your PDF…");
            const {data:filePath,error:removeError}=await sb.rpc("remove_own_student_note",{target_submission:row.student_submission_id});
            if(removeError){remove.disabled=false;msg(statusId,removeError.message,"error");return}
            all=all.filter(note=>note.id!==row.id);render();
            const {error:storageError}=await sb.storage.from("student-notes").remove([filePath]);
            msg(statusId,storageError?"Your PDF is no longer listed. Its stored file could not be cleaned up: "+storageError.message:"Your PDF has been removed from Contributions by Students.",storageError?"error":"success");
          });
          card.append(remove);
        }
        grid.append(card);
      });
    };
    const revisionLevels=["Foundation","Intermediate","Final"];
    const revisionSubjects=()=>{
      const current=revisionSubjectFilter?.value||"";
      const selected=revisionLevelFilter?.value?[revisionLevelFilter.value]:revisionLevels;
      const names=[...new Set(selected.flatMap(level=>subjectsByLevel[level]||[]))];
      if(revisionSubjectFilter){revisionSubjectFilter.replaceChildren(new Option("All subjects",""),...names.map(name=>new Option(name,name)));if(names.includes(current))revisionSubjectFilter.value=current}
      if(revisionIcaiLink){const chosen=revisionLevelFilter?.value||"";revisionIcaiLink.hidden=!chosen;if(chosen)revisionIcaiLink.href=materialUrls[chosen]}
      if(revisionChapterFilter&&!revisionSubjectFilter?.value){revisionChapterFilter.replaceChildren(new Option("All chapters",""));revisionChapterFilter.disabled=true}
    };
    let revisionChapterRequest=0;
    const loadRevisionChapters=async()=>{
      if(!revisionChapterFilter||!revisionSubjectFilter)return;
      const requestId=++revisionChapterRequest,subjectName=revisionSubjectFilter.value;
      const current=revisionChapterFilter.value;
      if(!subjectName){revisionChapterFilter.replaceChildren(new Option("All chapters",""));revisionChapterFilter.disabled=true;return}
      revisionChapterFilter.disabled=true;revisionChapterFilter.replaceChildren(new Option("Loading ICAI chapters…",""));
      const canonical=chapterSubjectAliases[subjectName]||subjectName;
      const selectedLevels=revisionLevelFilter?.value?[revisionLevelFilter.value]:revisionLevels;
      const matchingLevels=selectedLevels.filter(level=>(subjectsByLevel[level]||[]).some(name=>(chapterSubjectAliases[name]||name)===canonical));
      try{
        const outlines=await Promise.all(matchingLevels.map(async level=>{
          const params=new URLSearchParams({mode:"chapters",level,subjects:canonical});
          const response=await fetch("/api/ai-planner?"+params.toString(),{headers:{accept:"application/json"}});
          const result=await response.json().catch(()=>({}));
          if(!response.ok)return[];
          return Array.isArray(result.outlines)?result.outlines.flatMap(item=>Array.isArray(item.chapters)?item.chapters:[]):[];
        }));
        if(requestId!==revisionChapterRequest)return;
        const chapters=[...new Set(outlines.flat().map(name=>String(name).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        revisionChapterFilter.replaceChildren(new Option("All chapters",""),...chapters.map(name=>new Option(name,name)));
        revisionChapterFilter.disabled=!chapters.length;
        if(chapters.includes(current))revisionChapterFilter.value=current;
        if(!chapters.length&&revisionCount)revisionCount.textContent="Official chapter list is temporarily unavailable.";
      }catch{
        if(requestId===revisionChapterRequest){revisionChapterFilter.replaceChildren(new Option("All chapters",""));revisionChapterFilter.disabled=true;if(revisionCount)revisionCount.textContent="Could not load ICAI chapter titles. Please try again."}
      }
    };
    const fillFilters=()=>{
      if(!subjectFilter||!chapterFilter||!authorFilter)return;
      const studentRows=all.filter(row=>row.category==="student_note"&&matchesLevel(row));
      const currentSubject=subjectFilter.value;
      const levels=levelFilter?.value?[levelFilter.value]:Object.keys(subjectsByLevel);
      const subjects=[...new Set(levels.flatMap(level=>subjectsByLevel[level]||[]))];
      subjectFilter.replaceChildren(new Option("All subjects",""),...subjects.map(value=>new Option(value,value)));
      if(subjects.includes(currentSubject))subjectFilter.value=currentSubject;
      const currentChapter=chapterFilter.value;
      const chapterRows=studentRows.filter(row=>!subjectFilter.value||row.subject===subjectFilter.value);
      const chapters=[...new Set(chapterRows.map(row=>row.chapter).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      chapterFilter.replaceChildren(new Option("All chapters",""),...chapters.map(value=>new Option(value,value)));
      if(chapters.includes(currentChapter))chapterFilter.value=currentChapter;
      chapterFilter.disabled=chapters.length===0;
      const currentAuthor=authorFilter.value;
      const authorRows=chapterRows.filter(row=>!chapterFilter.value||row.chapter===chapterFilter.value);
      const authors=[...new Set(authorRows.map(row=>row.contributor_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      authorFilter.replaceChildren(new Option("All authors",""),...authors.map(value=>new Option(value,value)));
      if(authors.includes(currentAuthor))authorFilter.value=currentAuthor;
    };
    const render=()=>{
      fillFilters();
      const students=all.filter(row=>row.category==="student_note"&&matchesLevel(row)&&(!subjectFilter?.value||row.subject===subjectFilter.value)&&(!chapterFilter?.value||row.chapter===chapterFilter.value)&&(!authorFilter?.value||row.contributor_name===authorFilter.value));
      const admin=all.filter(row=>["revision","mind_map","formula"].includes(row.category)&&matchesLevel(row)&&(!revisionSubjectFilter?.value||row.subject===revisionSubjectFilter.value)&&(!revisionChapterFilter?.value||row.chapter===revisionChapterFilter.value));
      if(revisionCount)revisionCount.textContent=admin.length+" resource"+(admin.length===1?"":"s")+" available";
      if(levelLabel)levelLabel.textContent=studentGrid?(activeLevel()?"Showing "+activeLevel()+" student PDFs.":"Showing student PDFs across all levels."):(activeLevel()?"Showing "+activeLevel()+" resources.":"Choose your CA level on the homepage.");
      const count=$("#studentPdfCount");if(count)count.textContent=students.length+" PDF"+(students.length===1?"":"s");
      draw(studentGrid,students,activeLevel()?"Student contributions are on their way! No PDFs have been shared for this level yet. Be the first to help another CA student.":"Student contributions are on their way! No PDFs have been shared yet. Be the first to help another CA student.","#materialStatus");
      draw(adminGrid,admin,revisionLevelApps?"No resources published for this level yet.":"No summary charts or mind maps have been uploaded for this level yet.","#adminResourcesStatus");
    };
    revisionSubjects();
    revisionLevelFilter?.addEventListener("change",()=>{if(revisionSubjectFilter)revisionSubjectFilter.value="";if(revisionChapterFilter)revisionChapterFilter.value="";revisionSubjects();loadRevisionChapters().then(render);render()});
    revisionSubjectFilter?.addEventListener("change",()=>{if(revisionChapterFilter)revisionChapterFilter.value="";loadRevisionChapters().then(render);render()});
    revisionChapterFilter?.addEventListener("change",render);
    levelFilter?.addEventListener("change",()=>{if(subjectFilter)subjectFilter.value="";if(chapterFilter)chapterFilter.value="";if(authorFilter)authorFilter.value="";render()});
    subjectFilter?.addEventListener("change",()=>{if(chapterFilter)chapterFilter.value="";if(authorFilter)authorFilter.value="";render()});
    chapterFilter?.addEventListener("change",()=>{if(authorFilter)authorFilter.value="";render()});
    authorFilter?.addEventListener("change",render);
    sb.from("materials").select("id,title,description,level,subject,chapter,category,file_bucket,file_path,external_url,created_at,submitted_by,contributor_name,instagram_handle,linkedin_url,student_submission_id,is_premium").eq("is_published",true).order("created_at",{ascending:false}).then(async({data,error})=>{
      if(error){msg("#materialStatus",error.message,"error");msg("#adminResourcesStatus",error.message,"error");if(revisionCount)revisionCount.textContent="Resources could not be loaded.";return}
      const {data:{user}}=await sb.auth.getUser();currentUserId=user?.id||"";
      all=data||[];render();
    });
  }

  async function downloadMaterial(material,statusId="#materialStatus"){
    const {data:{user}}=await sb.auth.getUser();
    if(!user){location.href="account.html?next="+encodeURIComponent(location.pathname.split("/").pop()+location.search);return}
    msg(statusId,"Opening PDF…");
    const {error:claimError}=await sb.rpc("register_material_download",{target_material:material.id});
    if(claimError){msg(statusId,material.is_premium?"This resource requires premium access. Premium checkout is not available yet.":claimError.message,"error");return}
    const {data,error}=await sb.storage.from(material.file_bucket||"ca-materials").createSignedUrl(material.file_path,90);
    if(error){msg(statusId,error.message,"error");return}
    window.open(data.signedUrl,"_blank","noopener");
    msg(statusId,"PDF opened.");
  }

  function initMtp(){
    const series=document.body.dataset.paperSeries||"mtp";
    const config={
      mtp:{file:"mtp.html",name:"ICAI MTP",chapters:{question:"mtp_question",suggested:"mtp_suggested_answer"},types:["question","suggested"]},
      rtp:{file:"rtp.html",name:"ICAI RTP",chapters:{question:"rtp_question",suggested:"rtp_suggested_answer"},types:["question","suggested"]},
      previous_year:{file:"previous-papers.html",name:"Previous Year Question Papers",chapters:{question:"previous_year_question",suggested:"previous_year_solution"},types:["question","suggested"]}
    }[series]||{file:"mtp.html",name:"ICAI MTP",chapters:{question:"mtp_question",suggested:"mtp_suggested_answer"},types:["question","suggested"]};
    const levels=["Foundation","Intermediate","Final"];
    const levelButtons=$$("[data-mtp-level]");
    const typeButtons=$$("[data-mtp-type]");
    const levelPage=$("#mtpLevelPage"),typePage=$("#mtpTypePage"),paperPage=$("#mtpPaperPage");
    const levelTitle=$("#mtpTypeLevelTitle"),paperTitle=$("#mtpPaperTitle"),backTypes=$("#mtpBackToTypes"),pageHeading=$("#mtpPageHeading"),pageIntro=$("#mtpPageIntro");
    const list=$("#mtpPapersList");
    const params=new URLSearchParams(location.search);
    const paramLevel=params.get("level")||"";
    const selectedLevel=levels.find(x=>x.toLowerCase()===paramLevel.toLowerCase())||"";
    const typeParam=params.get("type")||"";
    const selectedType=config.chapters[typeParam]?typeParam:"";
    if(series==="previous_year"){const solution=typeButtons.find(button=>button.dataset.mtpType==="suggested");if(solution){const labels=$("span",solution);if(labels[0])labels[0].textContent="Solutions";if(labels[1])labels[1].textContent="View uploaded solutions";}}

    const showPage=page=>{
      if(levelPage)levelPage.hidden=page!=="level";
      if(typePage)typePage.hidden=page!=="type";
      if(paperPage)paperPage.hidden=page!=="paper";
    };
    levelButtons.forEach(button=>button.addEventListener("click",()=>{
      location.href=config.file+"?level="+encodeURIComponent(button.dataset.mtpLevel);
    }));
    typeButtons.forEach(button=>button.addEventListener("click",()=>{
      if(!selectedLevel)return;
      location.href=config.file+"?level="+encodeURIComponent(selectedLevel)+"&type="+button.dataset.mtpType;
    }));
    if(!selectedLevel){showPage("level");if(pageHeading)pageHeading.textContent=config.name+" · Choose your level";if(pageIntro)pageIntro.textContent="Select Foundation, Intermediate or Final to view "+config.name+" resources.";return}
    if(!selectedType){
      showPage("type");
      if(pageHeading)pageHeading.textContent="CA "+selectedLevel+" · "+config.name;
      if(pageIntro)pageIntro.textContent="Choose a paper type to open its own page.";
      if(levelTitle)levelTitle.textContent="Choose a paper type";
      typeButtons.forEach(button=>{button.hidden=!config.types.includes(button.dataset.mtpType)});
      return;
    }
    showPage("paper");
    const typeLabel=selectedType==="question"?(series==="previous_year"?"Previous Year Question Papers":"Question Papers"):(series==="previous_year"?"Solutions":"Suggested Answers");
    if(pageHeading)pageHeading.textContent="CA "+selectedLevel+" · "+typeLabel;
    if(pageIntro)pageIntro.textContent="Papers uploaded by the CA Junction team will appear below.";
    if(paperTitle)paperTitle.textContent="Available PDFs";
    if(backTypes)backTypes.href=config.file+"?level="+encodeURIComponent(selectedLevel);
    load();

    async function load(){
      if(!list)return;
      list.replaceChildren();
      list.hidden=false;
      if(!ready()){msg("#mtpStatus",backendMessage,"error");return}
      msg("#mtpStatus","Loading "+typeLabel.toLowerCase()+"…");
      const {data,error}=await sb.from("materials").select("id,title,description,level,subject,chapter,file_bucket,file_path,external_url,is_premium,created_at").eq("category","icai_link").eq("is_published",true).eq("is_premium",false).eq("level",selectedLevel).eq("chapter",config.chapters[selectedType]).order("created_at",{ascending:false}).limit(200);
      if(error){emptyRow(list,"Could not load papers right now. Please try again in a moment.");msg("#mtpStatus",error.message,"error");return}
      if(!data?.length){
        const empty=document.createElement("article");empty.className="card";
        const h=document.createElement("h3");h.textContent="Your next practice paper is on its way";
        const resourceName=selectedType==="question"?(series==="previous_year"?"previous-year question paper":"question paper"):(series==="previous_year"?"solution":"suggested answers");
        const p=document.createElement("p");p.textContent="No "+resourceName+" has been uploaded by the CA Junction team for "+selectedLevel+" yet. Keep preparing—your papers will appear here as soon as they are shared.";
        empty.append(h,p);list.append(empty);msg("#mtpStatus","");return
      }
      data.forEach(row=>{
        const card=document.createElement("article");card.className="card";
        const h=document.createElement("h3");h.textContent=row.title;
        const p=document.createElement("p");p.textContent=[row.subject,row.description].filter(Boolean).join(" · ")||row.level+" "+config.name+" resource";
        const button=document.createElement("button");button.type="button";button.className="btn";button.textContent="Open PDF";
        button.addEventListener("click",()=>downloadMaterial(row,"#mtpStatus"));
        card.append(h,p,button);list.append(card);
      });
      msg("#mtpStatus",data.length+" PDF"+(data.length===1?"":"s")+" available.");
    }
  }

  function initAiMcqPractice(){
    const form=$("#aiPracticeForm");if(!form)return;
    const level=$("#aiPracticeLevel"),preferred=new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"";
    const subject=$("#aiPracticeSubject"),chapterSelect=$("#aiPracticeChapterSelect"),selectedChaptersBox=$("#aiPracticeSelectedChapters"),chapterHelp=$("#aiPracticeChapterHelp"),materialLink=$("#aiPracticeMaterialLink");
    const selectedChapters=[];
    const subjectsByLevel={
      Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
      Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
      Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
    };
    const chapterSubjectAliases={
      "Taxation — Income-tax Law":"Taxation",
      "Taxation — Goods and Services Tax":"Taxation",
      "Financial Management":"Financial Management and Strategic Management",
      "Strategic Management":"Financial Management and Strategic Management",
      "Integrated Business Solutions":"Integrated Business Solutions (Multidisciplinary Case Study with Strategic Management)"
    };
    const renderSelectedChapters=()=>{
      selectedChaptersBox.replaceChildren();
      selectedChapters.forEach((name,index)=>{
        const chip=document.createElement("span");chip.className="chapter-chip";chip.append(document.createTextNode(name));
        const remove=document.createElement("button");remove.type="button";remove.setAttribute("aria-label","Remove "+name);remove.textContent="×";
        remove.addEventListener("click",()=>{selectedChapters.splice(index,1);const option=[...chapterSelect.options].find(item=>item.value===name);if(option)option.disabled=false;renderSelectedChapters();updateChapterControls()});
        chip.append(remove);selectedChaptersBox.append(chip);
      });
      chapterHelp.textContent=selectedChapters.length+" of 8 chapters selected. Tap another chapter to add it; tap × to remove one.";
    };
    const updateChapterControls=()=>{chapterSelect.disabled=selectedChapters.length>=8;};
    const resetChapters=placeholder=>{
      selectedChapters.splice(0);selectedChaptersBox.replaceChildren();chapterSelect.replaceChildren(new Option(placeholder,""));chapterSelect.disabled=true;chapterHelp.textContent="Choose a subject to load ICAI chapters. Tap a chapter to select it.";
    };
    const loadChapters=async()=>{
      resetChapters("Loading ICAI chapters…");
      if(!subject.value||!level.value){chapterSelect.options[0].textContent="Choose a subject first";return}
      const lookupSubject=chapterSubjectAliases[subject.value]||subject.value;
      try{
        const query=new URLSearchParams({mode:"chapters",level:level.value,subjects:lookupSubject});
        const response=await fetch("/api/ai-planner?"+query.toString(),{headers:{accept:"application/json"}});
        const result=await response.json().catch(()=>({}));
        const outline=Array.isArray(result.outlines)?result.outlines.find(item=>item.subject?.toLowerCase()===lookupSubject.toLowerCase()):null;
        const chapters=Array.isArray(outline?.chapters)?[...new Set(outline.chapters.map(name=>String(name).trim()).filter(Boolean))]:[];
        if(!response.ok||!chapters.length)throw new Error(result.error||"ICAI chapter titles are temporarily unavailable. Please open the official material link.");
        chapterSelect.replaceChildren(new Option("Choose a chapter",""),...chapters.map(name=>new Option(name,name)));
        chapterSelect.disabled=false;chapterHelp.textContent="Chapter titles loaded from ICAI material for "+subject.value+". Tap a chapter to select it; up to 8.";
      }catch(error){resetChapters(error?.message||"Could not load ICAI chapters. Please try again.");chapterHelp.textContent=error?.message||"Could not load ICAI chapters. Please try again."}
      updateChapterControls();
    };
    chapterSelect.addEventListener("change",()=>{
      const name=chapterSelect.value;
      if(!name)return;
      if(!selectedChapters.includes(name)&&selectedChapters.length<8){
        selectedChapters.push(name);
        const option=[...chapterSelect.options].find(item=>item.value===name);
        if(option)option.disabled=true;
        renderSelectedChapters();
      }
      chapterSelect.value="";
      updateChapterControls();
    });
    const materialUrls={
      Foundation:"https://boslive.icai.org/study_material_new_paper_details.php?c=foundation&language=English",
      Intermediate:"https://boslive.icai.org/study_material_new_paper_details.php?c=intermediate&language=English",
      Final:"https://boslive.icai.org/study_material_new_paper_details.php?c=final&language=English"
    };
    const updateMaterialChoices=()=>{
      const current=subject.value,subjects=subjectsByLevel[level.value]||[];
      subject.replaceChildren(new Option(level.value?"Choose a subject":"Choose a level first",""),...subjects.map(name=>new Option(name,name)));
      subject.disabled=!level.value;
      if(subjects.includes(current))subject.value=current;
      resetChapters(subject.value?"Loading ICAI chapters…":"Choose a subject first");
      if(subject.value)loadChapters();
      if(materialLink){materialLink.hidden=!level.value;if(level.value)materialLink.href=materialUrls[level.value]}
    };
    if(["Foundation","Intermediate","Final"].includes(preferred))level.value=preferred;
    updateMaterialChoices();
    level.addEventListener("change",()=>{subject.value="";resetChapters("Choose a subject first");updateMaterialChoices()});
    subject.addEventListener("change",loadChapters);
    const session=$("#aiPracticeSession"),box=$("#aiPracticeQuestion"),caseStudy=$("#aiPracticeCaseStudy"),start=$("#aiPracticeStart"),feedback=$("#aiPracticeFeedback"),next=$("#aiPracticeNext"),check=$("#aiPracticeCheck");
    const review=$("#aiPracticeReview"),reviewSummary=$("#aiPracticeReviewSummary"),reviewCase=$("#aiPracticeReviewCaseStudy"),reviewItems=$("#aiPracticeReviewItems");
    let questions=[],score=0,answers=[],reviewOrder=[],currentDifficulty=1,currentQuestionIndex=-1,preparationTimer=null,preparationStarted=0,caseStudyText="";
    const stopPreparationTimer=()=>{if(preparationTimer)clearInterval(preparationTimer);preparationTimer=null;$("#aiPracticeTimer").hidden=true};
    const updatePreparationTimer=()=>{const elapsed=Math.floor((Date.now()-preparationStarted)/1000),minutes=String(Math.floor(elapsed/60)).padStart(2,"0"),seconds=String(elapsed%60).padStart(2,"0");$("#aiPracticeTimer").textContent="Preparing your questions · this can take up to 1 minute · "+minutes+":"+seconds};
    const marksForQuestion=q=>Number(q?.marks)===2?2:1;
    const maxMarks=()=>questions.reduce((sum,q)=>sum+marksForQuestion(q),0);
    const difficultyLabel=value=>["","Warm-up","Core","Applied","Advanced","Expert"][value]||"Adaptive";
    const chooseNextQuestion=()=>{
      const nextKind=reviewOrder.length<5?"individual":"case-linked";
      const available=questions.map((q,i)=>({q,i})).filter(item=>!answers[item.i]&&item.q.kind===nextKind);
      if(!available.length)return-1;
      available.sort((a,b)=>{
        const distance=Math.abs(a.q.difficulty-currentDifficulty)-Math.abs(b.q.difficulty-currentDifficulty);
        if(distance)return distance;
        return currentDifficulty>= (questions[currentQuestionIndex]?.difficulty||1)?b.q.difficulty-a.q.difficulty:a.q.difficulty-b.q.difficulty;
      });
      return available[0].i;
    };
    const showQuestion=()=>{
      currentQuestionIndex=chooseNextQuestion();const q=questions[currentQuestionIndex];if(!q)return;
      caseStudy.textContent=q.kind==="case-linked"?caseStudyText:"";caseStudy.hidden=q.kind!=="case-linked";
      feedback.hidden=true;next.hidden=true;check.hidden=false;box.replaceChildren();
      const legend=document.createElement("legend");legend.textContent=(reviewOrder.length+1)+". "+(q.kind==="case-linked"?"Case-linked · ":"Individual · ")+q.question+" ("+marksForQuestion(q)+" "+(marksForQuestion(q)===1?"mark":"marks")+")";legend.style.fontWeight="700";box.append(legend);
      q.options.forEach((option,i)=>{const label=document.createElement("label");label.className="answer";const radio=document.createElement("input");radio.type="radio";radio.name="aiPracticeAnswer";radio.value=String(i);const span=document.createElement("span");span.textContent=option;label.append(radio,span);box.append(label)});
      $("#aiPracticeProgress").textContent="Question "+(reviewOrder.length+1)+" of "+questions.length+" · "+difficultyLabel(q.difficulty)+" challenge ("+q.difficulty+"/5)";
      $("#aiPracticeScore").textContent="Score so far: "+score+" / "+maxMarks()+" marks";
    };
    const renderReview=()=>{
      if(!reviewItems||!reviewSummary)return;
      reviewItems.replaceChildren();
      const maximum=maxMarks(),percent=maximum?Math.round(score/maximum*100):0;
      reviewSummary.textContent="Final score: "+score+" / "+maximum+" marks ("+percent+"%).";
      reviewCase.textContent=caseStudyText;reviewCase.hidden=!caseStudyText;
      reviewOrder.forEach((questionIndex,reviewIndex)=>{
        const q=questions[questionIndex],answer=answers[questionIndex]||{selectedIndex:-1,correct:false};
        const card=document.createElement("article");card.className="mcq-review-item "+(answer.correct?"mcq-review-correct":"mcq-review-incorrect");
        const questionMarks=marksForQuestion(q);const heading=document.createElement("h3");heading.textContent="Question "+(reviewIndex+1)+" · "+(q.kind==="case-linked"?"Case-linked":"Individual")+" · "+difficultyLabel(q.difficulty)+" · "+(answer.correct?questionMarks+" "+(questionMarks===1?"mark":"marks"):"0 marks");
        const question=document.createElement("p");question.textContent=q.question;
        const student=document.createElement("p");student.textContent="Your answer: "+(answer.selectedIndex>=0?q.options[answer.selectedIndex]:"No answer");
        const correct=document.createElement("p");correct.textContent="Correct answer: "+q.options[q.correct_index];
        const explanation=document.createElement("p");explanation.textContent="Review: "+q.explanation;
        card.append(heading,question,student,correct,explanation);reviewItems.append(card);
      });
      review.hidden=false;review.scrollIntoView({behavior:"smooth",block:"start"});
    };
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(!ready()){msg("#aiPracticeStatus","Please sign in to start AI practice.","error");return}
      const chapters=[...selectedChapters];
      if(chapters.length>8){msg("#aiPracticeStatus","Enter no more than 8 chapters.","error");return}
      if(!chapters.length){msg("#aiPracticeStatus","Select at least one ICAI chapter.","error");return}
      start.disabled=true;session.hidden=true;review.hidden=true;caseStudy.hidden=true;msg("#aiPracticeStatus","Preparing your 10 questions…");preparationStarted=Date.now();updatePreparationTimer();$("#aiPracticeTimer").hidden=false;preparationTimer=setInterval(updatePreparationTimer,1000);
      try{
        const {data:{session:authSession},error:authError}=await sb.auth.getSession();
        if(authError||!authSession?.access_token){msg("#aiPracticeStatus","Please sign in to start AI practice.","error");return}
        const response=await fetch("/api/ai-mcq",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+authSession.access_token},body:JSON.stringify({level:level.value,subject:$("#aiPracticeSubject").value.trim(),chapters})});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||"Could not start practice. Please try again.");
        if(!Array.isArray(result.questions)||result.questions.length!==10)throw new Error("The practice set was incomplete. Please try again.");
        questions=result.questions;score=0;answers=[];reviewOrder=[];currentDifficulty=1;currentQuestionIndex=-1;caseStudyText=result.case_study||"";caseStudy.hidden=true;session.hidden=false;showQuestion();$("#aiPracticeScore").textContent="Score so far: 0 / "+maxMarks()+" marks";msg("#aiPracticeStatus","Your 10-question adaptive practice is ready.");session.scrollIntoView({behavior:"smooth",block:"center"});
      }catch(error){msg("#aiPracticeStatus",error?.message||"Could not start practice. Please try again.","error")}
      finally{stopPreparationTimer();start.disabled=false}
    });
    check.addEventListener("click",()=>{
      if(currentQuestionIndex<0||answers[currentQuestionIndex])return;
      const selected=$('input[name="aiPracticeAnswer"]:checked',box);
      if(!selected){msg("#aiPracticeStatus","Choose an answer first.","error");return}
      const q=questions[currentQuestionIndex],selectedIndex=Number(selected.value),correct=selectedIndex===q.correct_index;
      answers[currentQuestionIndex]={selectedIndex,correct};reviewOrder.push(currentQuestionIndex);const questionMarks=marksForQuestion(q);if(correct)score+=questionMarks;
      currentDifficulty=correct?Math.min(5,q.difficulty+1):Math.max(1,q.difficulty-1);
      const nextHint=correct?(q.difficulty<5?" The next challenge will be harder.":" You are at the highest challenge level."):" The next challenge will adjust to your answer.";
      feedback.textContent=(correct?"Correct · +"+questionMarks+" "+(questionMarks===1?"mark. ":"marks. "):"Not quite · 0 marks. The right answer is "+q.options[q.correct_index]+". ")+q.explanation+nextHint;
      feedback.hidden=false;check.hidden=true;next.hidden=false;next.textContent=reviewOrder.length===questions.length?"Finish practice":"Next question";$("#aiPracticeScore").textContent="Score so far: "+score+" / "+maxMarks()+" marks";msg("#aiPracticeStatus",correct?"Well done!":"Keep going—you’re learning with every question.",correct?"success":"info");
    });
    next.addEventListener("click",()=>{
      if(reviewOrder.length>=questions.length){session.hidden=true;renderReview();msg("#aiPracticeStatus","Practice complete. Your score and answer review are below.","success");return}
      showQuestion();
    });
    $("#aiPracticeTryAgain")?.addEventListener("click",()=>{review.hidden=true;form.scrollIntoView({behavior:"smooth",block:"start"})});
  }

  function initTests(){
    initAiMcqPractice();
  }

  function initPlanner(){
    const date=$("#examDate"),daysDisplay=$("#countdownDays"),countdownPanel=$("#countdownPanel"),countdownMinimize=$("#countdownMinimize");
    if(date){if(!date.value)date.value=localStorage.getItem("caJunctionExamDate")||"";date.addEventListener("change",()=>{localStorage.setItem("caJunctionExamDate",date.value);renderCountdown();window.dispatchEvent(new Event("ca:timer-update"))})}
    const renderCountdown=()=>{
      if(!date||!daysDisplay)return;
      if(!date.value){daysDisplay.hidden=true;msg("#countdownResult","Your days remaining will appear here.");return}
      const [year,month,day]=date.value.split("-").map(Number),target=new Date(year,month-1,day);target.setHours(0,0,0,0);
      const today=new Date();today.setHours(0,0,0,0);const days=Math.round((target-today)/86400000);daysDisplay.hidden=false;
      if(days>0){daysDisplay.textContent=days+" DAYS LEFT";msg("#countdownResult","Keep showing up. Every focused day brings you closer to your goal.")}
      else if(days===0){daysDisplay.textContent="EXAM DAY";msg("#countdownResult","Wishing you calm focus and confidence today.")}
      else{daysDisplay.hidden=true;msg("#countdownResult","That exam date has passed. Choose a future date.","error")}
    };
    if(new URLSearchParams(location.search).get("timer")==="restore"){studyTimer=readTimerState();studyTimer.minimized=false;studyTimer.countdownMinimized=false;saveTimerState();}
    countdownMinimize?.addEventListener("click",()=>{studyTimer=readTimerState();studyTimer.countdownMinimized=true;saveTimerState();if(countdownPanel)countdownPanel.classList.add("is-minimized")});
    window.addEventListener("ca:timer-update",()=>{studyTimer=readTimerState();if(countdownPanel)countdownPanel.classList.toggle("is-minimized",studyTimer.countdownMinimized)});
    $("#countdownButton")?.addEventListener("click",renderCountdown);renderCountdown();if(countdownPanel)countdownPanel.classList.toggle("is-minimized",studyTimer.countdownMinimized);
    const display=$("#focusTimer"),startButton=$("#timerStart"),pauseButton=$("#timerPause"),resetButton=$("#timerReset"),minimizeButton=$("#timerMinimize"),focusButton=$("#timerFocus"),panel=$("#timerPanel");
    const renderTimer=()=>{studyTimer=readTimerState();if(display)display.textContent=timerClock(currentTimerSeconds());if(startButton){startButton.textContent=studyTimer.runningSince?"Session running":(currentTimerSeconds()?"Resume session":"Start session");startButton.disabled=Boolean(studyTimer.runningSince)}if(pauseButton)pauseButton.disabled=!studyTimer.runningSince;if(minimizeButton)minimizeButton.disabled=studyTimer.focusMode;if(focusButton)focusButton.textContent=studyTimer.focusMode?"Pause & exit focus":"Start focus mode";if(panel)panel.classList.toggle("is-minimized",studyTimer.minimized)};
    startButton?.addEventListener("click",()=>{startStudyTimer();renderTimer();msg("#timerStatus","Session running. Your elapsed time is saved on this device.")});
    pauseButton?.addEventListener("click",()=>{pauseStudyTimer();renderTimer();msg("#timerStatus","Paused and saved. Resume to continue from this time.")});
    resetButton?.addEventListener("click",()=>{if(studyTimer.runningSince)pauseStudyTimer();studyTimer=readTimerState();studyTimer.elapsed=0;studyTimer.runningSince=null;studyTimer.focusMode=false;saveTimerState();renderTimer();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});msg("#timerStatus","Session finished. All paused time remains in your study-hours total.")});
    minimizeButton?.addEventListener("click",()=>{studyTimer=readTimerState();studyTimer.minimized=true;saveTimerState();renderTimer()});
    focusButton?.addEventListener("click",async()=>{studyTimer=readTimerState();if(studyTimer.focusMode){pauseStudyTimer();if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});renderTimer();msg("#timerStatus","Focus mode ended. Your study time is saved; you can use other resources now.");return}try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();studyTimer.focusMode=true;if(!studyTimer.runningSince)studyTimer.runningSince=Date.now();saveTimerState();msg("#timerStatus","Focus mode is on. Leaving this page will pause and save your session.")}catch{studyTimer.focusMode=false;saveTimerState();msg("#timerStatus","Fullscreen is unavailable in this browser. You can still use the timer normally.","error")}renderTimer()});
    const leaveFocusPage=()=>{studyTimer=readTimerState();if(studyTimer.focusMode)pauseStudyTimer()};
    document.addEventListener("visibilitychange",()=>{studyTimer=readTimerState();if(document.visibilityState==="hidden"&&studyTimer.focusMode){pauseStudyTimer();renderTimer();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}});
    window.addEventListener("pagehide",leaveFocusPage);
    window.addEventListener("ca:timer-update",renderTimer);setInterval(renderTimer,1000);renderTimer();
    const loadHours=async()=>{const label=$("#todayHours");if(!label)return;if(ready()){try{const {data:{user}}=await sb.auth.getUser();if(user){const start=new Date();start.setHours(0,0,0,0);const {data}=await sb.from("study_sessions").select("duration_seconds").eq("user_id",user.id).gte("started_at",start.toISOString());label.textContent=Math.round((data||[]).reduce((sum,row)=>sum+Number(row.duration_seconds||0),0)/60)+" minutes";return}}catch{}}label.textContent=Math.round(Number(localStorage.getItem("caJunctionLocalStudySeconds")||0)/60)+" minutes"};
    const builder=$("#plannerBuilderForm");
    if(builder){
      const level=$("#plannerLevel"),countInput=$("#plannerSubjectCount"),choices=$("#plannerSubjectOptions"),subjectsStatus=$("#plannerSubjectsStatus"),daysInput=$("#plannerDays"),results=$("#plannerBuilderResults"),createButton=$("#plannerCreateButton");
      const preferred=new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"";
      if(["Foundation","Intermediate","Final"].includes(preferred))level.value=preferred;
      let availableSubjects=[],loadingSubjects=false,subjectsMessage="";
      let savedPlan=null;
      try{savedPlan=JSON.parse(localStorage.getItem("caJunctionCustomPlan")||"null")}catch{}
      const selectedSubjects=()=>[...choices.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
      const updateSelection=()=>{
        const selected=selectedSubjects(),target=Number(countInput.value)||0;
        choices.querySelectorAll('input[type="checkbox"]').forEach(input=>{input.disabled=!input.checked&&selected.length>=target});
        if(!availableSubjects.length)subjectsStatus.textContent=loadingSubjects?"Loading official ICAI subjects…":subjectsMessage||"Choose a CA level to load its official subjects.";
        else subjectsStatus.textContent="Selected "+selected.length+" of "+target+" subjects · "+availableSubjects.length+" official ICAI subjects available.";
        createButton.disabled=loadingSubjects||!availableSubjects.length||selected.length!==target;
      };
      const renderSubjectChoices=(restore=[])=>{
        choices.replaceChildren();
        const restoreSet=new Set(restore.map(name=>String(name).trim().toLowerCase()));
        availableSubjects.forEach(item=>{
          const label=document.createElement("label");label.className="subject-choice";
          const input=document.createElement("input");input.type="checkbox";input.value=item.subject;input.checked=restoreSet.has(item.subject.toLowerCase());
          const copy=document.createElement("span");
          const name=document.createElement("strong");name.textContent=item.subject;
          const detail=document.createElement("small");detail.textContent="ICAI official study material";
          copy.append(name,detail);label.append(input,copy);
          input.addEventListener("change",()=>{const count=Number(countInput.value)||0;if(input.checked&&selectedSubjects().length>count)input.checked=false;updateSelection()});
          choices.append(label);
        });
        updateSelection();
      };
      const loadMaterialSubjects=async(restore=[])=>{
        choices.replaceChildren();availableSubjects=[];loadingSubjects=true;subjectsMessage="";countInput.disabled=true;createButton.disabled=true;subjectsStatus.textContent="Loading official ICAI subjects…";results.replaceChildren();
        if(!level.value){loadingSubjects=false;subjectsMessage="Choose a CA level to load its official subjects.";updateSelection();return}
        try{
          const response=await fetch("/api/ai-planner?mode=subjects&level="+encodeURIComponent(level.value),{headers:{accept:"application/json"}});
          const result=await response.json().catch(()=>({}));
          if(!response.ok||!Array.isArray(result.subjects))throw new Error(result.error||"Could not load the ICAI subject list. Please try again.");
          availableSubjects=result.subjects.filter(item=>item&&typeof item.subject==="string").slice(0,12);
          loadingSubjects=false;
          if(!availableSubjects.length){subjectsMessage="The official ICAI subject list could not be loaded. Please try again shortly.";updateSelection();countInput.disabled=true;return}
          countInput.disabled=false;countInput.max=String(availableSubjects.length);
          const restored=restore.filter(name=>availableSubjects.some(item=>item.subject.toLowerCase()===String(name).toLowerCase()));
          const target=restored.length||Math.min(3,availableSubjects.length);
          countInput.value=String(target);
          renderSubjectChoices(restored);
          subjectsMessage=result.source==="icai"?"Subjects loaded from ICAI’s official course listing.":"Showing the current ICAI course subject list.";
        }catch(error){loadingSubjects=false;subjectsMessage=error?.message||"Could not load the ICAI subject list. Please try again.";updateSelection();countInput.disabled=true;countInput.max="12";createButton.disabled=true}
      };
      const renderSchedule=schedule=>{
        results.replaceChildren();
        schedule.forEach(day=>{
          const card=document.createElement("article");card.className="plan-day";
          const sessions=Array.isArray(day.sessions)?day.sessions:(day.subject?[day]:[]);
          const title=document.createElement("strong");title.textContent="Day "+day.day+" · "+sessions.length+" subject session"+(sessions.length===1?"":"s");
          const list=document.createElement("div");list.className="day-sessions";
          sessions.forEach(session=>{
            const block=document.createElement("section");block.className="study-session";
            const subject=document.createElement("strong");subject.textContent=session.subject||"Subject";
            const chapter=document.createElement("small");chapter.className="resource-focus";chapter.textContent=session.chapter?"Chapter · "+session.chapter:(session.topic||"Chapter-wise study");
            const activity=document.createElement("p");activity.textContent=session.activity||"Study this chapter and complete matching ICAI practice questions.";
            const minutes=Number(session.study_minutes||120),time=document.createElement("small");time.className="session-time";time.textContent="Time · "+minutes+" minutes";
            block.append(subject,chapter,activity,time);
            if(session.source_url){const source=document.createElement("a");source.className="resource-focus";source.href=session.source_url;source.target="_blank";source.rel="noopener noreferrer";source.textContent="Open ICAI material";block.append(source)}
            list.append(block);
          });
          card.append(title,list);results.append(card);
        });
      };
      if(savedPlan?.subjects&&savedPlan?.days){daysInput.value=savedPlan.days;if(["Foundation","Intermediate","Final"].includes(savedPlan.level))level.value=savedPlan.level;if(Array.isArray(savedPlan.schedule))renderSchedule(savedPlan.schedule)}
      countInput.addEventListener("change",()=>{
        const target=Number(countInput.value)||0;
        const selected=[...choices.querySelectorAll('input[type="checkbox"]:checked')];
        selected.slice(target).forEach(input=>{input.checked=false});
        updateSelection();
      });
      level.addEventListener("change",()=>loadMaterialSubjects([]));
      builder.addEventListener("submit",async event=>{
        event.preventDefault();
        const subjects=selectedSubjects(),subjectCount=Number(countInput.value),days=Number(daysInput.value);
        if(subjects.length!==subjectCount){msg("#plannerBuilderStatus","Select exactly "+subjectCount+" subjects from the official ICAI list above.","error");return}
        if(!Number.isInteger(days)||days<1||days>180){msg("#plannerBuilderStatus","Choose a duration from 1 to 180 days.","error");return}
        if(!ready()){msg("#plannerBuilderStatus",backendMessage,"error");return}
        createButton.disabled=true;createButton.textContent="Creating your AI plan…";results.replaceChildren();msg("#plannerBuilderStatus","AI is checking ICAI chapter lists and assigning a chapter and time to each subject session…");
        try{
          const {data:{session},error:authError}=await sb.auth.getSession();
          if(authError||!session?.access_token){msg("#plannerBuilderStatus","Please sign in to create an AI study plan.","error");return}
          const response=await fetch("/api/ai-planner",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+session.access_token},body:JSON.stringify({level:level.value,subjects,subject_count:subjectCount,days})});
          const result=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(result.error||"Could not create your plan. Please try again.");
          const plan={level:level.value,subjects,subject_count:subjectCount,days,schedule:result.schedule};
          localStorage.setItem("caJunctionCustomPlan",JSON.stringify(plan));renderSchedule(plan.schedule);
          msg("#plannerBuilderStatus","Your "+days+"-day AI plan for "+subjectCount+" subjects is ready and saved in this browser.");results.scrollIntoView({behavior:"smooth",block:"nearest"});
        }catch(error){msg("#plannerBuilderStatus",error?.message||"Could not create your plan. Please try again.","error")}
        finally{createButton.textContent="Create my AI plan";updateSelection()}
      });
      loadMaterialSubjects(savedPlan?.level===level.value?savedPlan.subjects||[]:[]);
    }
    const planList=$("#planList");
    async function loadPlans(){
      if(!planList)return;
      if(!ready()){emptyRow(planList,"Connect an account to save planner tasks online.");return}
      const {data:{user}}=await sb.auth.getUser();if(!user){emptyRow(planList,"Sign in to save your planner tasks.");return}
      const {data,error}=await sb.from("study_plans").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
      planList.replaceChildren();if(error||!data?.length){emptyRow(planList,"No study targets yet.");return}
      data.forEach(task=>{const row=document.createElement("div");row.className="task"+(task.is_complete?" done":"");const check=document.createElement("input");check.type="checkbox";check.checked=task.is_complete;check.setAttribute("aria-label","Mark task complete");const span=document.createElement("span");span.textContent=task.title+" · "+task.planned_minutes+" min"+(task.due_on?" · "+task.due_on:"");check.addEventListener("change",async()=>{await sb.from("study_plans").update({is_complete:check.checked}).eq("id",task.id);loadPlans()});const del=document.createElement("button");del.type="button";del.className="btn";del.textContent="Delete";del.addEventListener("click",async()=>{await sb.from("study_plans").delete().eq("id",task.id);loadPlans()});row.append(check,span,del);planList.append(row)});
    }
    $("#planForm")?.addEventListener("submit",async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();if(!user){msg("#planStatus","Sign in to save your timetable.","error");location.href="account.html";return}
      const {error}=await sb.from("study_plans").insert({user_id:user.id,title:$("#planTitle").value.trim(),due_on:$("#planDue").value||null,planned_minutes:Number($("#planMinutes").value||45)});
      if(error){msg("#planStatus",error.message,"error");return}e.target.reset();$("#planMinutes").value="45";msg("#planStatus","Study target saved.");loadPlans();
    });
    $("#consultForm")?.addEventListener("submit",async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();if(!user){msg("#consultStatus","Sign in to request a consultation.","error");location.href="account.html";return}const inquiry=$("#consultMessage").value.trim();const {error}=await sb.from("service_requests").insert({user_id:user.id,service_type:"study_consultation",message:inquiry});if(error){msg("#consultStatus",error.message,"error");return}e.target.reset();const whatsappLink=$("#consultWhatsAppLink"),whatsappUrl=window.caWhatsAppUrl("Hello, I just requested a one-on-one consultation through CA Junction. My request: "+inquiry);if(whatsappLink&&whatsappUrl){whatsappLink.href=whatsappUrl;whatsappLink.hidden=false;msg("#consultStatus","Your request is saved. Tap below to message us on WhatsApp.")}else{if(whatsappLink)whatsappLink.hidden=true;msg("#consultStatus","Your request is saved, but WhatsApp contact is not configured yet. Please check back soon.")}});
    $("#myGroupLink")&&loadGroup();
    const groupLink=$("#groupLink");
    if(groupLink)loadGroup();
    async function loadGroup(){
      if(!ready()){msg("#groupStatus",backendMessage);return}
      const {data,error}=await sb.from("premium_resources").select("resource_url").eq("resource_key","whatsapp_study_group").eq("is_active",true).maybeSingle();
      if(error||!data){msg("#groupStatus","Sign in with an active premium membership to access the group invite.");return}
      const a=$("#groupLink");a.href=data.resource_url;a.hidden=false;msg("#groupStatus","Premium study group link is available to your account.");
    }
    loadPlans();
  }

  async function initResourceLink(){
    const link=$("#resourceLink"),status=$("#resourceStatus"),key=document.body.dataset.resourceKey;
    if(key==="virtual_library"){
      const levels=[
        {key:"virtual_library_foundation",name:"Foundation",tab:"#libraryTabFoundation"},
        {key:"virtual_library_intermediate",name:"Intermediate",tab:"#libraryTabIntermediate"},
        {key:"virtual_library_final",name:"Finals",tab:"#libraryTabFinal"}
      ];
      const title=$("#libraryLevelTitle");
      let links={};
      if(ready()){
        const {data}=await sb.from("premium_resources").select("resource_key,resource_url").in("resource_key",levels.map(level=>level.key).concat("virtual_library")).eq("is_active",true);
        links=Object.fromEntries((data||[]).map(row=>[row.resource_key,row.resource_url]));
        if(!links.virtual_library_foundation&&links.virtual_library)links.virtual_library_foundation=links.virtual_library;
      }
      const activate=level=>{
        levels.forEach(item=>$(item.tab)?.setAttribute("aria-selected",String(item.key===level.key)));
        if(title)title.textContent=level.name+" Virtual Library";
        if(links[level.key]){link.href=links[level.key];link.hidden=false;status.textContent="Your "+level.name+" study room is ready. The meeting opens in a new tab, so CA Junction stays available here."}
        else{link.hidden=true;status.textContent="The "+level.name+" study room link has not been added yet. Please check again soon."}
      };
      levels.forEach(level=>$(level.tab)?.addEventListener("click",()=>activate(level)));
      const requested=(new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"Foundation").toLowerCase();
      activate(levels.find(level=>level.name.toLowerCase()===requested||(level.key==="virtual_library_final"&&["final","finals"].includes(requested)))||levels[0]);
      return;
    }
    if(!ready()){if(status)status.textContent="This link has not been added yet.";return}
    const {data,error}=await sb.from("premium_resources").select("resource_url").eq("resource_key",key).eq("is_active",true).maybeSingle();
    if(error||!data){if(status)status.textContent="This link has not been added yet.";return}
    link.href=data.resource_url;link.hidden=false;if(status)status.textContent="";
  }

  function initIcaiMaterial(){
    const level=new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"";
    const title=$("#selectedIcaiLevel"),link=$("#selectedIcaiLink"),status=$("#icaiLevelStatus");
    if(!level){if(status)status.textContent="Choose your CA level on the homepage first.";return}
    if(title)title.textContent="CA "+level;
    if(link){link.href=app.config.ICAI_STUDY_URL||"https://boslive.icai.org/";link.hidden=false}
    if(status)status.textContent="Opening official ICAI study material for the level you selected.";
  }

  function initCareer(){
    const careerSections=[...document.querySelectorAll("[data-career-tab]")],careerLinks=[...document.querySelectorAll("[data-career-tab-link]")];
    const activateCareerTab=()=>{
      const requested=location.hash.slice(1),active=careerSections.some(section=>section.dataset.careerTab===requested)?requested:(careerSections[0]?.dataset.careerTab||"resume");
      careerSections.forEach(section=>{section.hidden=section.dataset.careerTab!==active});
      careerLinks.forEach(link=>{if(link.dataset.careerTabLink===active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current")});
    };
    window.addEventListener("hashchange",activateCareerTab);activateCareerTab();
    const fields=["resumeName","resumeEmail","resumePhone","resumeLocation","resumeLinkedIn","resumePortfolio","resumeRole","resumeIndustry","resumeCareerStage","resumeObjective","resumeEducation","resumeProfessional","resumeExperience","resumeProjects","resumeSkills","resumeAchievements","resumeLanguages","resumeHobbies"];
    const fieldValue=id=>$("#"+id)?.value.trim()||"";
    const previewText=(targetId,sourceId,placeholder)=>{const target=$("#"+targetId);if(target)target.textContent=fieldValue(sourceId)||placeholder};
    function refreshResume(){
      $("#previewName").textContent=fieldValue("resumeName")||"Your name";
      $("#previewContact").textContent=[fieldValue("resumeEmail"),fieldValue("resumePhone"),fieldValue("resumeLocation")].filter(Boolean).join(" · ")||"Email · Phone · Location";
      const links=$("#previewLinks");
      if(links){links.replaceChildren();[["LinkedIn profile","resumeLinkedIn"],["Portfolio","resumePortfolio"]].forEach(([label,id])=>{const value=fieldValue(id);if(!value)return;try{const url=new URL(value);if(url.protocol==="https:"){const anchor=document.createElement("a");anchor.href=url.href;anchor.target="_blank";anchor.rel="noopener";anchor.textContent=label;links.append(anchor);links.append(document.createTextNode(" · "))}}catch{}});if(links.lastChild?.textContent===" · ")links.lastChild.remove()}
      const headline=$("#previewHeadline");if(headline)headline.textContent=[fieldValue("resumeRole"),fieldValue("resumeIndustry")].filter(Boolean).join(" · ");
      previewText("previewObjective","resumeObjective","Your AI-drafted objective will appear here.");
      previewText("previewEducation","resumeEducation","Your education details will appear here.");
      previewText("previewProfessional","resumeProfessional","Your professional qualifications will appear here.");
      previewText("previewExperience","resumeExperience","Your experience will appear here.");
      previewText("previewProjects","resumeProjects","Your projects will appear here.");
      previewText("previewSkills","resumeSkills","Your skills will appear here.");
      previewText("previewAchievements","resumeAchievements","Your achievements will appear here.");
      previewText("previewLanguages","resumeLanguages","Your languages will appear here.");
      previewText("previewHobbies","resumeHobbies","Your interests will appear here.");
    }
    fields.forEach(id=>$("#"+id)?.addEventListener("input",refreshResume));
    const theme=$("#resumeTheme"),layout=$("#resumePageLayout"),preview=$("#resumePreview");
    $("#resumeForm")?.addEventListener("reset",()=>setTimeout(()=>{if(theme&&preview){preview.dataset.theme=theme.value==="auto"?recommendedTheme:theme.value;preview.dataset.layout=layout?.value||"single-column"}refreshResume()},0));
    $("#printResume")?.addEventListener("click",()=>window.print());
    let recommendedTheme="modern";
    theme?.addEventListener("change",()=>{if(preview)preview.dataset.theme=theme.value==="auto"?recommendedTheme:theme.value});
    layout?.addEventListener("change",()=>{if(preview)preview.dataset.layout=layout.value});
    $("#generateResumeDraft")?.addEventListener("click",async()=>{
      const role=fieldValue("resumeRole");
      if(!role){msg("#resumeStatus","Tell us the role you want so AI can tailor your resume.","error");$("#resumeRole")?.focus();return}
      if(!fieldValue("resumeEducation")&&!fieldValue("resumeProfessional")&&!fieldValue("resumeExperience")&&!fieldValue("resumeSkills")){msg("#resumeStatus","Add at least one education, qualification, experience or skills detail first.","error");return}
      if(!ready()){msg("#resumeStatus","Please sign in to use the free AI resume builder.","error");return}
      const button=$("#generateResumeDraft");button.disabled=true;button.textContent="Drafting your resume…";msg("#resumeStatus","AI is preparing your resume sections and recommending a design…");
      try{
        const {data:{session},error:authError}=await sb.auth.getSession();
        if(authError||!session?.access_token)throw new Error("Please sign in again to use the AI resume builder.");
        const payload={role,industry:fieldValue("resumeIndustry"),career_stage:fieldValue("resumeCareerStage"),education:fieldValue("resumeEducation"),qualification:fieldValue("resumeProfessional"),experience:fieldValue("resumeExperience"),projects:fieldValue("resumeProjects"),skills:fieldValue("resumeSkills"),achievements:fieldValue("resumeAchievements"),languages:fieldValue("resumeLanguages"),interests:fieldValue("resumeHobbies"),theme_preference:theme?.value||"auto"};
        const response=await fetch("/api/ai-resume-draft",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+session.access_token},body:JSON.stringify(payload)});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||"Could not draft your resume. Please try again.");
        const mapping={resumeObjective:"objective",resumeEducation:"education",resumeProfessional:"qualifications",resumeExperience:"experience",resumeProjects:"projects",resumeSkills:"skills",resumeAchievements:"achievements",resumeLanguages:"languages",resumeHobbies:"interests"};
        Object.entries(mapping).forEach(([inputId,resultKey])=>{const input=$("#"+inputId);if(input&&typeof result[resultKey]==="string")input.value=result[resultKey]});
        recommendedTheme=["modern","classic","executive","minimal"].includes(result.recommended_theme)?result.recommended_theme:"modern";
        if(theme?.value==="auto")preview.dataset.theme=recommendedTheme;
        refreshResume();
        msg("#resumeStatus","Your complete AI resume draft is ready. Review every detail, edit anything you like, then print or save as PDF. "+(result.theme_reason||""),"success");
      }catch(error){msg("#resumeStatus",error?.message||"Could not draft your resume. Please try again.","error")}
      finally{button.disabled=false;button.textContent="✨ Draft my complete resume with AI"}
    });
    if(!ready()){msg("#jobsStatus",backendMessage);msg("#careerStatus",backendMessage);return}
    const loadJobs=async()=>{
      const {data,error}=await sb.from("jobs").select("id,title,organization,location,job_type,description,application_url,contact_email,closes_at").eq("is_published",true).order("created_at",{ascending:false});
      const grid=$("#jobsGrid");if(!grid)return;grid.replaceChildren();
      if(error||!data?.length){const empty=document.createElement("div");empty.className="listing";empty.textContent=error?"Job listings could not be loaded. Please refresh and try again.":"No opportunities are published yet. Check back soon.";grid.append(empty);return}
      data.forEach(job=>{
        const card=document.createElement("article");card.className="job-card";
        const company=document.createElement("div");company.className="job-company";company.textContent=job.organization||"Company details coming soon";
        const title=document.createElement("h3");title.textContent=job.title;
        const meta=document.createElement("div");meta.className="job-meta";
        [job.job_type,job.location].filter(Boolean).forEach(value=>{const item=document.createElement("span");item.textContent=value;meta.append(item)});
        const description=document.createElement("p");description.className="job-description";description.textContent=job.description||"Contact the company for further details.";
        const actions=document.createElement("div");actions.className="job-actions";
        let applyUrl="";
        if(job.application_url){try{const parsed=new URL(job.application_url);if(parsed.protocol==="https:"||parsed.protocol==="http:")applyUrl=parsed.href}catch{}}
        if(applyUrl){const apply=document.createElement("a");apply.className="btn";apply.href=applyUrl;apply.target="_blank";apply.rel="noopener noreferrer";apply.textContent="Apply now ↗";actions.append(apply)}
        else if(job.contact_email){const email=document.createElement("a");email.className="btn";email.href="mailto:"+job.contact_email;email.textContent="Email to apply";actions.append(email)}
        else{const unavailable=document.createElement("span");unavailable.className="apply-unavailable";unavailable.textContent="Application link coming soon";actions.append(unavailable)}
        if(job.contact_email&&applyUrl){const contact=document.createElement("a");contact.className="contact-link";contact.href="mailto:"+job.contact_email;contact.textContent="Contact by email";actions.append(contact)}
        card.append(company,title,meta,description,actions);grid.append(card);
      });
    };
    loadJobs();
    $("#careerRequest")?.addEventListener("submit",async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();if(!user){msg("#careerStatus","Sign in to send a request.","error");location.href="account.html";return}const {error}=await sb.from("service_requests").insert({user_id:user.id,service_type:$("#careerService").value,message:$("#careerMessage").value.trim()});if(error){msg("#careerStatus",error.message,"error");return}e.target.reset();msg("#careerStatus","Request received. The team will follow up to confirm the service.")});
  }

  async function initAdmin(){
    if(!ready()){msg("#adminStatus",backendMessage,"error");$("#adminSetup").hidden=false;$("#adminSetup").textContent="To activate this panel: connect Supabase, run supabase/schema.sql, create your account, then add your own account as admin in Supabase SQL Editor. Never use a shared/default password.";return}
    const {data:{user}}=await sb.auth.getUser();
    if(!user){msg("#adminStatus","Sign in with your admin account via the student login first.");$("#adminSetup").hidden=false;$("#adminSetup").textContent="No admin session. Sign in at account.html, then return here.";return}
    const {data:role}=await sb.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
    if(!role){msg("#adminStatus","This account does not have the admin role.","error");$("#adminSetup").hidden=false;$("#adminSetup").textContent="Only the account you manually promote in Supabase can use this panel.";return}
    $("#adminPanel").hidden=false;msg("#adminStatus","Admin access verified for "+user.email+".");
    const adminSubjectsByLevel={
      Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
      Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
      Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
    };
    const adminChapterAliases={"Taxation — Income-tax Law":"Taxation","Taxation — Goods and Services Tax":"Taxation","Financial Management":"Financial Management and Strategic Management","Strategic Management":"Financial Management and Strategic Management","Integrated Business Solutions":"Integrated Business Solutions (Multidisciplinary Case Study with Strategic Management)"};
    const adminCanonical=subject=>adminChapterAliases[subject]||subject;
    $("#resourceLevel")?.addEventListener("change",loadAdminResourceSubjects);
    $("#resourceSubject")?.addEventListener("change",loadAdminResourceChapters);
    $("#adminMaterialForm")?.addEventListener("submit",saveMaterial);
    $("#adminMindMapForm")?.addEventListener("submit",saveMindMap);
    $("#adminMtpForm")?.addEventListener("submit",saveMtpPaper);
    $("#mtpCollection")?.addEventListener("change",syncMtpPaperTypes);
    syncMtpPaperTypes();
    $("#adminTestForm")?.addEventListener("submit",saveTest);
    $("#adminJobForm")?.addEventListener("submit",saveJob);
    $("#adminProductForm")?.addEventListener("submit",saveProduct);
    $("#adminCourseForm")?.addEventListener("submit",saveCourse);
    $("#groupLinkForm")?.addEventListener("submit",saveGroupLink);
    $("#virtualLibraryFoundationForm")?.addEventListener("submit",e=>saveManagedLink(e,"virtual_library_foundation","Foundation Virtual Library study room","#virtualLibraryFoundationUrl","#virtualLibraryFoundationStatus"));
    $("#virtualLibraryIntermediateForm")?.addEventListener("submit",e=>saveManagedLink(e,"virtual_library_intermediate","Intermediate Virtual Library study room","#virtualLibraryIntermediateUrl","#virtualLibraryIntermediateStatus"));
    $("#virtualLibraryFinalForm")?.addEventListener("submit",e=>saveManagedLink(e,"virtual_library_final","Final Virtual Library study room","#virtualLibraryFinalUrl","#virtualLibraryFinalStatus"));
    $("#doubtSolvingForm")?.addEventListener("submit",e=>saveManagedLink(e,"doubt_solving","Doubt-solving group","#doubtSolvingUrl","#doubtSolvingStatus"));
    await Promise.all([loadAdminResources(),loadAdminMtpPapers(),loadAdminMindMaps(),loadNoteSubmissions(),loadPendingPayments(),loadAdminProducts(),loadServiceRequests(),loadEvaluationQueue(),loadProductTargets(),loadAdminTests(),loadAdminJobs(),loadAdminCourses(),loadAdminStudents(),loadManagedLinks()]);
    async function loadAdminResourceSubjects(){
      const level=$("#resourceLevel"),subject=$("#resourceSubject"),chapter=$("#resourceChapter");if(!level||!subject||!chapter)return;
      const current=subject.value,levels=level.value==="All"?Object.keys(adminSubjectsByLevel):[level.value];
      const names=[...new Set(levels.flatMap(name=>adminSubjectsByLevel[name]||[]))];
      subject.replaceChildren(new Option("Choose an ICAI subject",""),...names.map(name=>new Option(name,name)));
      subject.disabled=false;if(names.includes(current))subject.value=current;
      if(subject.value)await loadAdminResourceChapters();else{chapter.replaceChildren(new Option("Choose a subject first",""));chapter.disabled=true}
    }
    async function loadAdminResourceChapters(){
      const level=$("#resourceLevel"),subject=$("#resourceSubject"),chapter=$("#resourceChapter");if(!level||!subject||!chapter)return;
      const subjectName=subject.value;if(!subjectName){chapter.replaceChildren(new Option("Choose a subject first",""));chapter.disabled=true;return}
      const canonical=adminCanonical(subjectName),levels=(level.value==="All"?Object.keys(adminSubjectsByLevel):[level.value]).filter(name=>(adminSubjectsByLevel[name]||[]).some(item=>adminCanonical(item)===canonical));
      chapter.replaceChildren(new Option("Loading ICAI chapters…",""));chapter.disabled=true;
      const outlines=await Promise.all(levels.map(async name=>{try{const params=new URLSearchParams({mode:"chapters",level:name,subjects:canonical});const response=await fetch("/api/ai-planner?"+params.toString(),{headers:{accept:"application/json"}});const result=await response.json().catch(()=>({}));return response.ok&&Array.isArray(result.outlines)?result.outlines.flatMap(item=>item.chapters||[]):[]}catch{return[]}}));
      const chapters=[...new Set(outlines.flat().map(item=>String(item).trim()).filter(Boolean))];
      chapter.replaceChildren(new Option(chapters.length?"Choose an ICAI chapter":"No ICAI chapters available",""),...chapters.map(name=>new Option(name,name)));
      chapter.disabled=!chapters.length;
    }
    loadAdminResourceSubjects();
    async function saveMaterial(e){
      e.preventDefault();msg("#resourceStatus","Saving resource…");const {data:{user}}=await sb.auth.getUser();let path=null,bucket=null;const file=$("#resourcePdf").files[0];
      if(file){if(file.type!=="application/pdf"||file.size>50*1024*1024){msg("#resourceStatus","Choose a PDF no larger than 50 MB.","error");return}bucket="ca-materials";path="admin/"+crypto.randomUUID()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:"application/pdf"});if(error){msg("#resourceStatus",error.message,"error");return}}
      const url=$("#resourceExternal").value.trim()||null;if(!path&&!url){msg("#resourceStatus","Upload a PDF or provide an external URL.","error");return}
      const {error}=await sb.from("materials").insert({title:$("#resourceTitle").value.trim(),description:$("#resourceDescription").value.trim(),level:$("#resourceLevel").value,subject:$("#resourceSubject").value.trim(),chapter:$("#resourceChapter").value.trim(),category:$("#resourceCategory").value,file_bucket:bucket,file_path:path,external_url:url,is_premium:false,is_published:$("#resourcePublished").checked,created_by:user.id});
      if(error){if(path)await sb.storage.from(bucket).remove([path]);msg("#resourceStatus",error.message,"error");return}e.target.reset();msg("#resourceStatus","Resource saved.");loadAdminResources();
    }

    function syncMtpPaperTypes(){
      const collection=$("#mtpCollection"),type=$("#mtpPaperType");if(!collection||!type)return;
      const current=type.value;
      type.replaceChildren(new Option("Question paper","question"));
      if(collection.value==="previous_year")type.add(new Option("Solutions","suggested"));
      else if(collection.value!=="mock_test")type.add(new Option("Suggested answers","suggested"));
      type.value=[...type.options].some(option=>option.value===current)?current:"question";
    }
    async function saveMtpPaper(e){
      e.preventDefault();
      msg("#mtpAdminStatus","Uploading paper PDF…");
      const {data:{user}}=await sb.auth.getUser();
      const file=$("#mtpPdf").files[0],collection=$("#mtpCollection").value,paperType=$("#mtpPaperType").value;
      if(!file||file.type!=="application/pdf"||file.size>50*1024*1024){msg("#mtpAdminStatus","Choose a PDF no larger than 50 MB.","error");return}
      const chapter=collection==="previous_year"?(paperType==="question"?"previous_year_question":"previous_year_solution"):collection==="mock_test"?"mock_test_question":collection+"_"+(paperType==="question"?"question":"suggested_answer");
      const path="admin/exam-papers/"+chapter+"/"+crypto.randomUUID()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const {error:uploadError}=await sb.storage.from("ca-materials").upload(path,file,{contentType:"application/pdf"});
      if(uploadError){msg("#mtpAdminStatus",uploadError.message,"error");return}
      const {error}=await sb.from("materials").insert({
        title:$("#mtpTitle").value.trim(),
        description:$("#mtpDescription").value.trim(),
        level:$("#mtpLevel").value,
        subject:$("#mtpSubject").value.trim(),
        chapter,
        category:"icai_link",
        file_bucket:"ca-materials",
        file_path:path,
        external_url:null,
        is_premium:false,
        is_published:$("#mtpPublished").checked,
        created_by:user.id
      });
      if(error){await sb.storage.from("ca-materials").remove([path]);msg("#mtpAdminStatus",error.message,"error");return}
      e.target.reset();
      syncMtpPaperTypes();
      $("#mtpPublished").checked=true;
      msg("#mtpAdminStatus","Paper PDF uploaded.");
      loadAdminMtpPapers();
    }
    async function loadAdminMtpPapers(){
      const chapters=["mtp_question","mtp_suggested_answer","rtp_question","rtp_suggested_answer","previous_year_question","previous_year_solution","mock_test_question"];
      const {data,error}=await sb.from("materials").select("id,title,level,subject,chapter,is_published,file_bucket,file_path").eq("category","icai_link").in("chapter",chapters).order("created_at",{ascending:false}).limit(300);
      const list=$("#adminMtpPapers");if(!list)return;list.replaceChildren();
      if(error||!data?.length){emptyRow(list,error?"Could not load exam papers.":"No exam PDFs uploaded yet.");return}
      const labels={mtp_question:"ICAI MTP · Question paper",mtp_suggested_answer:"ICAI MTP · Suggested answers",rtp_question:"ICAI RTP · Question paper",rtp_suggested_answer:"ICAI RTP · Suggested answers",previous_year_question:"Previous Year · Question paper",previous_year_solution:"Previous Year · Solutions",mock_test_question:"Mock Test · Question paper"};
      data.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";
        const info=document.createElement("div"),h=document.createElement("strong"),p=document.createElement("p");
        h.textContent=row.title;
        p.textContent=row.level+" · "+(labels[row.chapter]||row.chapter)+(row.subject?" · "+row.subject:"")+" · "+(row.is_published?"Published":"Draft");
        info.append(h,p);
        const actions=document.createElement("div");actions.className="row-actions";
        const visibility=document.createElement("button");visibility.className="btn";visibility.type="button";visibility.textContent=row.is_published?"Unpublish":"Publish";
        visibility.addEventListener("click",async()=>{visibility.disabled=true;const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#mtpAdminStatus",error?error.message:"Paper visibility updated.",error?"error":"success");loadAdminMtpPapers()});
        const remove=document.createElement("button");remove.className="btn danger";remove.type="button";remove.textContent="Delete";
        remove.addEventListener("click",async()=>{if(!confirm("Delete “"+row.title+"” permanently?"))return;remove.disabled=true;const {error}=await sb.from("materials").delete().eq("id",row.id);if(error){msg("#mtpAdminStatus",error.message,"error");remove.disabled=false;return}if(row.file_bucket&&row.file_path){const {error:storageError}=await sb.storage.from(row.file_bucket).remove([row.file_path]);if(storageError)msg("#mtpAdminStatus","Paper deleted, but its PDF file could not be removed: "+storageError.message,"error");else msg("#mtpAdminStatus","Paper deleted.","success")}else msg("#mtpAdminStatus","Paper deleted.","success");loadAdminMtpPapers()});
        actions.append(visibility,remove);item.append(info,actions);list.append(item);
      });
    }
    async function loadAdminMindMaps(){
      const {data,error}=await sb.from("materials").select("id,title,level,subject,is_premium,is_published,file_bucket,file_path,external_url").eq("category","mind_map").order("created_at",{ascending:false}).limit(200);
      const list=$("#adminMindMaps");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load mind maps.":"No mind maps uploaded yet.");return}
      data.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+(row.subject||"No subject")+" · "+(row.is_premium?"Premium":"Free")+" · "+(row.is_published?"Published":"Draft");info.append(h,p);
        const actions=document.createElement("div");actions.className="row-actions";
        const access=document.createElement("button");access.className="btn";access.type="button";access.textContent=row.is_premium?"Set Free":"Set Premium";access.addEventListener("click",async()=>{access.disabled=true;const {error}=await sb.from("materials").update({is_premium:!row.is_premium}).eq("id",row.id);msg("#mindMapAdminStatus",error?error.message:(row.is_premium?"Mind map is now free.":"Mind map is now premium and access-restricted."),error?"error":"success");loadAdminMindMaps()});
        const visibility=document.createElement("button");visibility.className="btn";visibility.type="button";visibility.textContent=row.is_published?"Unpublish":"Publish";visibility.addEventListener("click",async()=>{visibility.disabled=true;const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#mindMapAdminStatus",error?error.message:"Mind map visibility updated.",error?"error":"success");loadAdminMindMaps()});
        const remove=document.createElement("button");remove.className="btn danger";remove.type="button";remove.textContent="Delete";remove.addEventListener("click",async()=>{if(!confirm("Delete “"+row.title+"” permanently from CA Junction?"))return;remove.disabled=true;const {error}=await sb.from("materials").delete().eq("id",row.id);if(error){msg("#mindMapAdminStatus",error.message,"error");remove.disabled=false;return}if(row.file_bucket&&row.file_path){const {error:storageError}=await sb.storage.from(row.file_bucket).remove([row.file_path]);if(storageError)msg("#mindMapAdminStatus","Mind map deleted, but its stored PDF could not be cleaned up: "+storageError.message,"error");else msg("#mindMapAdminStatus","Mind map deleted.","success")}else msg("#mindMapAdminStatus","Mind map deleted.","success");loadAdminMindMaps()});
        actions.append(access,visibility,remove);item.append(info,actions);list.append(item);
      });
    }
    async function loadAdminResources(){
      const {data}=await sb.from("materials").select("id,title,level,subject,chapter,category,is_premium,is_published").neq("category","icai_link").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminResources");if(!list)return;list.replaceChildren();if(!data?.length){emptyRow(list,"No resources yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=[row.level,row.subject,row.chapter,row.category,row.is_premium?"Premium":"Free",row.is_published?"Published":"Draft"].filter(Boolean).join(" · ");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#resourceStatus",error?error.message:"Resource status updated.",error?"error":"success");loadAdminResources()});item.append(info,button);list.append(item)});
    }
    async function loadNoteSubmissions(){
      const {data,error}=await sb.from("student_note_submissions").select("*").eq("status","pending").order("created_at");
      const list=$("#noteSubmissions");list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load submissions.":"No pending submissions.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+row.subject+" · "+row.user_id;info.append(h,p);const actions=document.createElement("div");actions.className="row-actions";const view=document.createElement("button");view.className="btn";view.textContent="Open PDF";view.addEventListener("click",async()=>{const {data:link,error}=await sb.storage.from("student-notes").createSignedUrl(row.file_path,120);if(error){msg("#submissionStatus",error.message,"error");return}window.open(link.signedUrl,"_blank","noopener")});const approve=document.createElement("button");approve.className="btn";approve.textContent="Approve";approve.addEventListener("click",()=>approveNote(row));const reject=document.createElement("button");reject.className="btn danger";reject.textContent="Reject";reject.addEventListener("click",async()=>{const {error}=await sb.from("student_note_submissions").update({status:"rejected",reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",row.id);msg("#submissionStatus",error?error.message:"Submission rejected.",error?"error":"success");loadNoteSubmissions()});actions.append(view,approve,reject);item.append(info,actions);list.append(item)});
    }
    async function approveNote(row){
      const newPath="community/"+crypto.randomUUID()+"_"+row.file_path.split("/").pop();
      const {data:file,error:downloadError}=await sb.storage.from("student-notes").download(row.file_path);
      if(downloadError){msg("#submissionStatus",downloadError.message,"error");return}
      const {error:uploadError}=await sb.storage.from("ca-materials").upload(newPath,file,{contentType:"application/pdf"});
      if(uploadError){msg("#submissionStatus",uploadError.message,"error");return}
      const {error:insertError}=await sb.from("materials").insert({title:row.title,description:row.description,level:row.level,subject:row.subject,category:"student_note",file_bucket:"ca-materials",file_path:newPath,is_premium:false,is_published:true,submitted_by:row.user_id,contributor_name:row.contributor_name,instagram_handle:row.instagram_handle,student_submission_id:row.id,created_by:user.id});
      if(insertError){await sb.storage.from("ca-materials").remove([newPath]);msg("#submissionStatus",insertError.message,"error");return}
      const {error:updateError}=await sb.from("student_note_submissions").update({status:"approved",reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",row.id);
      msg("#submissionStatus",updateError?updateError.message:"Approved and published.",updateError?"error":"success");loadNoteSubmissions();loadAdminResources();
    }
    async function saveTest(e){
      e.preventDefault();const kind=$("#testType").value;let questions=[];
      if(kind!=="evaluated"){try{questions=JSON.parse($("#testQuestions").value||"[]")}catch{msg("#testAdminStatus","Question list must be valid JSON.","error");return}if(!Array.isArray(questions)||!questions.length){msg("#testAdminStatus","Add at least one MCQ question.","error");return}}
      const {data:{user}}=await sb.auth.getUser();
      const {data:test,error}=await sb.from("study_tests").insert({title:$("#testTitle").value.trim(),description:$("#testDescription").value.trim(),level:$("#testLevel").value,subject:$("#testSubject").value.trim(),test_type:kind,part_label:$("#testPart").value.trim(),access_tier:"free",duration_minutes:Number($("#testMinutes").value),is_published:$("#testPublished").checked,created_by:user.id}).select().single();
      if(error){msg("#testAdminStatus",error.message,"error");return}
      if(questions.length){const rows=questions.map((q,i)=>({test_id:test.id,question:String(q.question||""),options:q.options,correct_index:Number(q.correct_index),explanation:String(q.explanation||""),position:i}));const {error:qError}=await sb.from("test_questions").insert(rows);if(qError){msg("#testAdminStatus","Test was created, but questions failed: "+qError.message,"error");return}}
      e.target.reset();$("#testMinutes").value="60";msg("#testAdminStatus","Test created.");
    }
    async function saveJob(e){
      e.preventDefault();
      const company=$("#jobOrg").value.trim(),url=$("#jobUrl").value.trim();
      let applicationUrl="";
      try{const parsed=new URL(url);if(parsed.protocol==="https:"||parsed.protocol==="http:")applicationUrl=parsed.href}catch{}
      if(!company){msg("#jobAdminStatus","Add the company or firm name before posting.","error");return}
      if(!applicationUrl){msg("#jobAdminStatus","Add a valid application link starting with http:// or https://.","error");return}
      const {data:{user}}=await sb.auth.getUser();
      const {error}=await sb.from("jobs").insert({title:$("#jobTitle").value.trim(),organization:company,location:$("#jobLocation").value.trim(),job_type:$("#jobType").value,description:$("#jobDescription").value.trim(),application_url:applicationUrl,contact_email:$("#jobEmail").value.trim()||null,is_premium:false,is_published:$("#jobPublished").checked,created_by:user.id});
      if(error){msg("#jobAdminStatus",error.message,"error");return}e.target.reset();msg("#jobAdminStatus","Opportunity saved. Published posts will appear on Jobs & Internships.");loadAdminJobs();
    }
    async function saveProduct(e){
      e.preventDefault();const productType=$("#productType").value;
      const materialId=$("#productMaterial")?.value||null,testId=$("#productTest")?.value||null;
      if(productType==="material"&&!materialId){msg("#productStatus","Choose the material this product unlocks.","error");return}
      if(productType==="test"&&!testId){msg("#productStatus","Choose the test this product unlocks.","error");return}
      const {error}=await sb.from("products").insert({title:$("#productTitle").value.trim(),description:$("#productDescription").value.trim(),product_type:productType,material_id:productType==="material"?materialId:null,test_id:productType==="test"?testId:null,price_inr:Number($("#productPrice").value),duration_days:productType==="membership"?Number($("#productDuration").value||30):null,is_active:$("#productActive").checked});
      if(error){msg("#productStatus",error.message,"error");return}e.target.reset();msg("#productStatus","Product saved.");loadAdminProducts();
    }
    async function saveManagedLink(e,key,label,inputSelector,statusSelector){
      e.preventDefault();const url=$(inputSelector).value.trim();
      try{const parsed=new URL(url);if(!["http:","https:"].includes(parsed.protocol))throw new Error()}catch{msg(statusSelector,"Enter a valid link beginning with https://.","error");return}
      const {error}=await sb.from("premium_resources").upsert({resource_key:key,label,resource_url:url,is_active:true,updated_at:new Date().toISOString()},{onConflict:"resource_key"});
      msg(statusSelector,error?error.message:"Link saved.",error?"error":"success");
    }
    async function loadManagedLinks(){
      const keys=["virtual_library","virtual_library_foundation","virtual_library_intermediate","virtual_library_final","doubt_solving"];
      const {data,error}=await sb.from("premium_resources").select("resource_key,resource_url").in("resource_key",keys);
      if(error)return;
      const links=Object.fromEntries((data||[]).map(row=>[row.resource_key,row.resource_url]));
      if($("#virtualLibraryFoundationUrl"))$("#virtualLibraryFoundationUrl").value=links.virtual_library_foundation||links.virtual_library||"";
      if($("#virtualLibraryIntermediateUrl"))$("#virtualLibraryIntermediateUrl").value=links.virtual_library_intermediate||"";
      if($("#virtualLibraryFinalUrl"))$("#virtualLibraryFinalUrl").value=links.virtual_library_final||"";
      if($("#doubtSolvingUrl"))$("#doubtSolvingUrl").value=links.doubt_solving||"";
    }
    async function saveGroupLink(e){
      e.preventDefault();const url=$("#groupUrl").value.trim();
      if(!/^https:\/\/chat\.whatsapp\.com\//i.test(url)){msg("#groupAdminStatus","Enter a valid WhatsApp group invite link.","error");return}
      const {error}=await sb.from("premium_resources").upsert({resource_key:"whatsapp_study_group",label:"Student WhatsApp study group",resource_url:url,is_active:true,updated_at:new Date().toISOString()},{onConflict:"resource_key"});
      msg("#groupAdminStatus",error?error.message:"Student group invite saved.",error?"error":"success");
    }
    async function loadProductTargets(){
      const [m,t]=await Promise.all([sb.from("materials").select("id,title").order("created_at",{ascending:false}),sb.from("study_tests").select("id,title").order("created_at",{ascending:false})]);
      const materialSelect=$("#productMaterial"),testSelect=$("#productTest");
      if(materialSelect){materialSelect.replaceChildren();const o=document.createElement("option");o.value="";o.textContent="Choose a material";materialSelect.append(o);(m.data||[]).forEach(row=>{const option=document.createElement("option");option.value=row.id;option.textContent=row.title;materialSelect.append(option)})}
      if(testSelect){testSelect.replaceChildren();const o=document.createElement("option");o.value="";o.textContent="Choose a test";testSelect.append(o);(t.data||[]).forEach(row=>{const option=document.createElement("option");option.value=row.id;option.textContent=row.title;testSelect.append(option)})}
    }
    async function loadAdminProducts(){
      const {data,error}=await sb.from("products").select("id,title,product_type,price_inr,is_active").order("created_at",{ascending:false});
      const list=$("#adminProducts");list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load products.":"No products yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=window.caFormatINR(row.price_inr)+" · "+row.product_type+" · "+(row.is_active?"Active":"Draft");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_active?"Deactivate":"Activate";button.addEventListener("click",async()=>{const {error}=await sb.from("products").update({is_active:!row.is_active}).eq("id",row.id);msg("#productStatus",error?error.message:"Product status updated.",error?"error":"success");loadAdminProducts()});item.append(info,button);list.append(item)});
    }
    async function saveCourse(e){
      e.preventDefault();const {data:{user}}=await sb.auth.getUser();
      const {error}=await sb.from("courses").insert({title:$("#courseTitle").value.trim(),description:$("#courseDescription").value.trim(),level:$("#courseLevel").value,course_url:$("#courseUrl").value.trim()||null,is_published:$("#coursePublished").checked,created_by:user.id});
      if(error){msg("#courseStatus",error.message,"error");return}e.target.reset();msg("#courseStatus","Course saved.");loadAdminCourses();
    }
    async function loadAdminTests(){
      const {data,error}=await sb.from("study_tests").select("id,title,level,test_type,access_tier,is_published").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminTests");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load tests.":"No tests created yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+row.test_type+" · "+row.access_tier+" · "+(row.is_published?"Published":"Draft");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("study_tests").update({is_published:!row.is_published}).eq("id",row.id);msg("#testAdminStatus",error?error.message:"Test status updated.",error?"error":"success");loadAdminTests()});item.append(info,button);list.append(item)});
    }
    async function loadAdminJobs(){
      const {data,error}=await sb.from("jobs").select("id,title,organization,job_type,is_published").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminJobs");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load opportunities.":"No opportunities yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.organization+" · "+row.job_type+" · "+(row.is_published?"Published":"Draft");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("jobs").update({is_published:!row.is_published}).eq("id",row.id);msg("#jobAdminStatus",error?error.message:"Opportunity status updated.",error?"error":"success");loadAdminJobs()});item.append(info,button);list.append(item)});
    }
    async function loadAdminCourses(){
      const {data,error}=await sb.from("courses").select("id,title,level,is_published").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminCourses");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load courses.":"No courses yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+(row.is_published?"Published":"Draft");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("courses").update({is_published:!row.is_published}).eq("id",row.id);msg("#courseStatus",error?error.message:"Course status updated.",error?"error":"success");loadAdminCourses()});item.append(info,button);list.append(item)});
    }
    async function loadAdminStudents(){
      const {data,error}=await sb.from("profiles").select("user_id,full_name,ca_level,phone,created_at").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminStudents");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load student profiles.":"No student accounts yet.");return}
      data.forEach(row=>addRow(list,(row.full_name||"Student")+" · "+row.ca_level,row.phone||row.user_id));
    }
    async function loadPendingPayments(){
      const {data,error}=await sb.from("payment_orders").select("id,user_id,product_id,amount_inr,status,upi_reference,created_at,products(title)").eq("status","pending_review").order("created_at");
      const list=$("#pendingPayments");list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load payment requests.":"No payments waiting for review.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const body=document.createElement("div");const h=document.createElement("strong");h.textContent=(row.products?.title||"Purchase")+" · "+window.caFormatINR(row.amount_inr);const p=document.createElement("p");p.textContent="User "+row.user_id+" · UTR "+(row.upi_reference||"missing")+" · Order "+row.id;body.append(h,p);const actions=document.createElement("div");actions.className="row-actions";const approve=document.createElement("button");approve.className="btn";approve.textContent="Verify & unlock";approve.addEventListener("click",async()=>{if(!row.upi_reference){msg("#paymentAdminStatus","No UTR entered; cannot approve.","error");return}if(!confirm("Confirm you matched this UTR and exact amount in the receiving account record?"))return;const {error}=await sb.from("payment_orders").update({status:"paid",verified_by:user.id}).eq("id",row.id).eq("status","pending_review");msg("#paymentAdminStatus",error?error.message:"Payment verified; purchased access has been granted.",error?"error":"success");loadPendingPayments()});const reject=document.createElement("button");reject.className="btn danger";reject.textContent="Reject";reject.addEventListener("click",async()=>{const {error}=await sb.from("payment_orders").update({status:"rejected",verified_by:user.id}).eq("id",row.id).eq("status","pending_review");msg("#paymentAdminStatus",error?error.message:"Payment request rejected.",error?"error":"success");loadPendingPayments()});actions.append(approve,reject);item.append(body,actions);list.append(item)});
    }
    async function loadServiceRequests(){
      const {data,error}=await sb.from("service_requests").select("*").order("created_at",{ascending:false}).limit(50);
      const list=$("#serviceRequests");list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load requests.":"No service requests yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.service_type+" · "+row.status;const p=document.createElement("p");p.textContent=row.message;info.append(h,p);const select=document.createElement("select");["new","contacted","scheduled","complete","declined"].forEach(x=>{const o=document.createElement("option");o.value=x;o.textContent=x;o.selected=x===row.status;select.append(o)});select.addEventListener("change",async()=>{const {error}=await sb.from("service_requests").update({status:select.value}).eq("id",row.id);msg("#serviceAdminStatus",error?error.message:"Request status updated.",error?"error":"success")});item.append(info,select);list.append(item)});
    }
    async function loadEvaluationQueue(){
      const {data,error}=await sb.from("evaluation_submissions").select("id,user_id,test_id,file_path,status,score,feedback,created_at").in("status",["pending","in_review"]).order("created_at");
      const list=$("#evaluationQueue");list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load scripts.":"No scripts waiting for evaluation.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent="Submission · "+row.status;const p=document.createElement("p");p.textContent="Student "+row.user_id+" · Test "+row.test_id;info.append(h,p);const actions=document.createElement("div");actions.className="row-actions";const open=document.createElement("button");open.className="btn";open.textContent="Open PDF";open.addEventListener("click",async()=>{const {data:link,error}=await sb.storage.from("test-scripts").createSignedUrl(row.file_path,120);if(error){msg("#evaluationAdminStatus",error.message,"error");return}window.open(link.signedUrl,"_blank","noopener")});const grade=document.createElement("button");grade.className="btn";grade.textContent="Record score";grade.addEventListener("click",async()=>{const score=prompt("Enter score after completing the review.");if(score===null)return;const feedback=prompt("Enter feedback for the student.")||"";const {error}=await sb.from("evaluation_submissions").update({status:"reviewed",score:Number(score),feedback,reviewer_id:user.id,reviewed_at:new Date().toISOString()}).eq("id",row.id);msg("#evaluationAdminStatus",error?error.message:"Evaluation saved.",error?"error":"success");loadEvaluationQueue()});actions.append(open,grade);item.append(info,actions);list.append(item)});
    }
  }

  function run() {
    initCommon();
    const page=document.body.dataset.page;
    if(page==="home")initHome();
    if(page==="icai-material")initIcaiMaterial();
    if(page==="account")initAccount();
    if(page==="dashboard")initDashboard();
    if(page==="study")initStudy();
    if(page==="resource-link")initResourceLink();
    if(page==="mtp")initMtp();
    if(page==="tests")initTests();
    if(page==="planner")initPlanner();
    if(page==="career")initCareer();
    if(page==="admin")initAdmin();
  }
  run();
})();