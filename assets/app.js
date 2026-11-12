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
    const revisionLevelFilter=$("#revisionLevelFilter"),revisionSubjectFilter=$("#revisionSubjectFilter"),revisionChapterFilter=$("#revisionChapterFilter"),revisionCount=$("#revisionResourceCount"),revisionIcaiLink=$("#revisionIcaiLink"),revisionLevelTabs=$("[data-revision-level]");
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
        if((revisionLevelApps||revisionLevelFilter)&&grid===adminGrid){const kind=document.createElement("small");kind.className="resource-kind";kind.textContent=({revision:"Chapter summary PDF",mind_map:"Chapter mind map PDF",formula:"Formula sheet"})[row.category]||"Study resource";card.append(kind)}
        if(row.category!=="student_note"&&row.is_premium){const access=document.createElement("small");access.className="resource-access premium";access.textContent="Premium";card.append(access)}
        if(row.category==="student_note"){
          const detail=document.createElement("p");detail.textContent=row.description||"";if(detail.textContent)card.append(detail);
        }else{
          const detail=document.createElement("p");detail.textContent=grid===adminGrid&&String(row.description||"").startsWith("CAJ_AI_REVISION_V1|")?"AI-created study aid. Verify with the official ICAI chapter material.":(revisionLevelApps&&grid===adminGrid?(row.description||row.subject||""):(row.description||[row.subject,row.level].filter(Boolean).join(" · ")));if(detail.textContent)card.append(detail);
        }
        if(row.category==="student_note"){
          const author=document.createElement("small");author.className="note-author";author.textContent="Shared by "+(row.contributor_name||"CA Junction student");card.append(author);
          if(row.instagram_handle){const handle=row.instagram_handle.replace(/^@/,"");if(/^[A-Za-z0-9._]{1,30}$/.test(handle)){const profile=document.createElement("a");profile.className="link";profile.href="https://www.instagram.com/"+encodeURIComponent(handle)+"/";profile.target="_blank";profile.rel="noopener";profile.textContent="Instagram: @"+handle+" ↗";card.append(profile)}}
          if(row.linkedin_url){try{const profileUrl=new URL(row.linkedin_url);if(profileUrl.protocol==="https:"&&(profileUrl.hostname==="linkedin.com"||profileUrl.hostname.endsWith(".linkedin.com"))){const profile=document.createElement("a");profile.className="link";profile.href=profileUrl.href;profile.target="_blank";profile.rel="noopener";profile.textContent="LinkedIn profile ↗";card.append(profile)}}catch{}}
        }
        const meta=document.createElement("small");meta.textContent=row.category==="student_note"?[row.level,row.subject&&("Subject: "+row.subject),row.chapter&&("Chapter: "+row.chapter)].filter(Boolean).join(" · "):((revisionLevelApps||revisionLevelFilter)&&grid===adminGrid?[row.level,row.subject,row.chapter].filter(Boolean):[row.level,row.subject].filter(Boolean)).join(" · ");if(meta.textContent)card.append(meta);
        const action=document.createElement("button");action.className="link";action.type="button";
        if(row.file_bucket&&row.file_path){action.textContent="Open PDF ↗";action.addEventListener("click",()=>downloadMaterial(row,statusId))}
        else if(row.external_url){action.textContent="Open resource ↗";action.addEventListener("click",()=>window.open(row.external_url,"_blank","noopener"))}
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
      if(revisionIcaiLink){const chosen=revisionLevelFilter?.value||"";revisionIcaiLink.hidden=!chosen;if(chosen){revisionIcaiLink.href=materialUrls[chosen];revisionIcaiLink.textContent="Open official ICAI material ↗"}}
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
          const params=new URLSearchParams({mode:"chapters",level,subject:canonical});
          const response=await fetch("/api/ai-planner?"+params.toString(),{headers:{accept:"application/json"}});
          const result=await response.json().catch(()=>({}));
          if(!response.ok)return[];
          return Array.isArray(result.outlines)?result.outlines:[];
        }));
        if(requestId!==revisionChapterRequest)return;
        const chapterNames=outlines.flatMap(items=>Array.isArray(items)?items.flatMap(item=>Array.isArray(item.chapters)?item.chapters:[]):[]);
        let chapters=[...new Set(chapterNames.map(name=>String(name).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        if(!chapters.length&&selectedLevels.includes("Final")&&canonical.toLowerCase().replace(/\s+/g," ")==="advanced auditing, assurance and professional ethics")chapters=["Chapter 1: Quality Control","Chapter 2: General Auditing Principles and Auditors Responsibilities","Chapter 3: Audit Planning, Strategy and Execution","Chapter 4: Materiality, Risk Assessment and Internal Control","Chapter 5: Audit Evidence","Chapter 6: Completion and Review","Chapter 7: Reporting","Chapter 8: Specialised Areas","Chapter 9: Related Services","Chapter 10: Review of Financial Information","Chapter 11: Prospective Financial Information and Other Assurance Services","Chapter 12: Digital Auditing & Assurance","Chapter 13: Group Audits","Chapter 14: Special Features of Audit of Banks & Non-Banking Financial Companies","Chapter 15: Overview of Audit of Public Sector Undertakings","Chapter 16: Internal Audit","Chapter 17: Due Diligence, Investigation & Forensic Accounting","Chapter 18: Sustainable Development Goals (SDG) & Environment, Social and Governance (ESG) Assurance","Chapter 19: Professional Ethics & Liabilities of Auditors"];
        const officialOutline=outlines.flatMap(items=>Array.isArray(items)?items:[]).find(item=>item.url);
        if(revisionIcaiLink&&officialOutline?.url){revisionIcaiLink.href=officialOutline.url;revisionIcaiLink.textContent="Open official ICAI material for "+subjectName+" ↗"}
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
      draw(adminGrid,admin,revisionLevelApps?"No resources published for this level yet.":(revisionSubjectFilter?.value&&revisionChapterFilter?.value?"No summary or mind map PDFs have been uploaded for this chapter yet.":"Choose a subject and chapter to find its summary and mind map PDFs."),"#adminResourcesStatus");
    };
    revisionSubjects();
    const syncRevisionLevelTabs=()=>revisionLevelTabs.forEach(tab=>{const active=tab.dataset.revisionLevel===revisionLevelFilter?.value;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active))});
    syncRevisionLevelTabs();
    revisionLevelTabs.forEach(tab=>tab.addEventListener("click",()=>{if(!revisionLevelFilter)return;revisionLevelFilter.value=tab.dataset.revisionLevel;revisionLevelFilter.dispatchEvent(new Event("change",{bubbles:true}))}));
    revisionLevelFilter?.addEventListener("change",()=>{localStorage.setItem("caJunctionLevel",revisionLevelFilter.value);syncRevisionLevelTabs();if(revisionSubjectFilter)revisionSubjectFilter.value="";if(revisionChapterFilter)revisionChapterFilter.value="";revisionSubjects();loadRevisionChapters().then(render);render()});
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

  function initRevisionPage(){
    const levelOptions={
      Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
      Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
      Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
    };
    const aliases={"Taxation — Income-tax Law":"Taxation","Taxation — Goods and Services Tax":"Taxation","Financial Management":"Financial Management and Strategic Management","Strategic Management":"Financial Management and Strategic Management","Integrated Business Solutions":"Integrated Business Solutions (Multidisciplinary Case Study with Strategic Management)"};
    const materialUrls={Foundation:"https://boslive.icai.org/study_material_new_paper_details.php?c=foundation&language=English",Intermediate:"https://boslive.icai.org/study_material_new_paper_details.php?c=intermediate&language=English",Final:"https://boslive.icai.org/study_material_new_paper_details.php?c=final&language=English"};
    const finalAuditChapters=["Chapter 1: Quality Control","Chapter 2: General Auditing Principles and Auditors Responsibilities","Chapter 3: Audit Planning, Strategy and Execution","Chapter 4: Materiality, Risk Assessment and Internal Control","Chapter 5: Audit Evidence","Chapter 6: Completion and Review","Chapter 7: Reporting","Chapter 8: Specialised Areas","Chapter 9: Related Services","Chapter 10: Review of Financial Information","Chapter 11: Prospective Financial Information and Other Assurance Services","Chapter 12: Digital Auditing & Assurance","Chapter 13: Group Audits","Chapter 14: Special Features of Audit of Banks & Non-Banking Financial Companies","Chapter 15: Overview of Audit of Public Sector Undertakings","Chapter 16: Internal Audit","Chapter 17: Due Diligence, Investigation & Forensic Accounting","Chapter 18: Sustainable Development Goals (SDG) & Environment, Social and Governance (ESG) Assurance","Chapter 19: Professional Ethics & Liabilities of Auditors"];
    const level=new URLSearchParams(location.search).get("level")||"";
    const levelPage=$("#revisionLevelPage"),chapterPage=$("#revisionChapterPage");
    if(!levelOptions[level]){if(levelPage)levelPage.hidden=false;if(chapterPage)chapterPage.hidden=true;return}
    if(levelPage)levelPage.hidden=true;if(chapterPage)chapterPage.hidden=false;
    $("#revisionHeroIntro").textContent="Select a subject and chapter to create your summary and mind map PDFs.";
    const subject=$("#revisionSubjectFilter"),chapter=$("#revisionChapterFilter"),official=$("#revisionIcaiLink"),generate=$("#generateRevisionPack");
    const subjects=levelOptions[level],selected=new URLSearchParams(location.search).get("subject")||"";
    subject.replaceChildren(new Option("Choose a subject",""),...subjects.map(name=>new Option(name,name)));
    if(subjects.includes(selected))subject.value=selected;
    if(official){official.href=materialUrls[level];official.hidden=false;official.textContent="Open official ICAI study material ↗"}
    let sourceUrl=materialUrls[level],chapterRequest=0,generatedUrls=[];
    const chapterPacks=new Map();
    const releaseGenerated=()=>{generatedUrls.forEach(url=>URL.revokeObjectURL(url));generatedUrls=[];$("#revisionGeneratedFiles").hidden=true};
    const slug=value=>String(value||"chapter").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"chapter";
    const pdfSafe=value=>String(value||"").replace(/•/g,"-").replace(/→|➜/g,"->").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ");
    const makePdf=(title,meta,body)=>{
      const esc=v=>pdfSafe(v).replace(/([\\()])/g,"\\$1");
      const wrap=(v,width)=>{const out=[];let line="";for(const word of pdfSafe(v).split(/\s+/)){if((line+" "+word).length>width&&line){out.push(line);line=""}line+=(line?" ":"")+word}if(line)out.push(line);return out};
      const isMap=title.includes("Mind Map"),pages=[],colors=[[.42,.28,.82],[.02,.52,.52],[.14,.40,.77],[.70,.28,.48]];
      let commands=[],y=0,page=0;
      const rect=(x,y,w,h,rgb)=>commands.push(rgb.join(" ")+" rg "+x+" "+y+" "+w+" "+h+" re f");
      const text=(value,x,y,size=11,color=[.12,.16,.28])=>commands.push("BT /F1 "+size+" Tf "+color.join(" ")+" rg 1 0 0 1 "+x+" "+y+" Tm ("+esc(value)+") Tj ET");
      const newPage=()=>{
        if(commands.length)pages.push(commands.join("\n"));commands=[];page++;
        rect(0,0,612,842,[.94,.96,1]);rect(0,716,612,126,[.12,.15,.32]);
        rect(0,716,612,5,[.43,.83,.76]);text("CA JUNCTION  /  "+(isMap?"MIND MAP":"LAST-MINUTE REVISION"),38,811,11,[.54,.91,.83]);
        wrap(title,61).slice(0,3).forEach((line,i)=>text(line,38,786-i*19,16,[1,1,1]));
        wrap(meta,100).slice(0,3).forEach((line,i)=>text(line,38,696-i*12,8,[.30,.36,.49]));
        text("CA Junction  |  Verify exam-specific details with official ICAI material",38,25,8);
        text(String(page),560,25,9);y=638;
      };
      newPage();
      const blocks=String(body).split(isMap?/\n\s*\n/:/\n\s*\[CARD\]\s*\n|\n\s*\n/).filter(x=>x.trim());
      blocks.forEach((block,index)=>{
        const icon=block.match(/^\[(book|checklist|balance|process)\]/)?.[1]||"book";
        const lines=block.replace(/^\[CARD\]\s*/,"").replace(/^\[(book|checklist|balance|process)\]\s*/,"").split(/\r?\n/).flatMap(line=>wrap(line,isMap?72:87));
        let offset=0;
        while(offset<lines.length){
          if(y<120)newPage();
          if(offset===0&&lines.length*15+26<=553&&lines.length*15+26>y-70)newPage();
          const count=Math.min(lines.length-offset,Math.max(1,Math.floor((y-85)/15)));
          const chunk=lines.slice(offset,offset+count),height=chunk.length*15+26;
          const accent=colors[index%colors.length],x=isMap?90:38,w=isMap?484:536;
          if(isMap){commands.push(".65 .70 .82 RG 2 w 48 "+(y+12)+" m 48 "+(y-height/2)+" l "+x+" "+(y-height/2)+" l S")}
          if(isMap){
            const iy=y-26;commands.push("q "+accent.join(" ")+" RG 1.5 w");
            if(icon==="checklist"){for(let k=0;k<3;k++){commands.push("60 "+(iy-k*8)+" 4 4 re S 68 "+(iy+2-k*8)+" m 80 "+(iy+2-k*8)+" l S")}}
            else if(icon==="balance"){commands.push("70 "+(iy+8)+" m 70 "+(iy-18)+" l 60 "+(iy-18)+" m 80 "+(iy-18)+" l 57 "+iy+" m 83 "+iy+" l S 57 "+iy+" m 52 "+(iy-9)+" l 62 "+(iy-9)+" l h S 83 "+iy+" m 78 "+(iy-9)+" l 88 "+(iy-9)+" l h S")}
            else if(icon==="process"){commands.push("57 "+iy+" 10 10 re S 74 "+(iy-18)+" 10 10 re S 62 "+iy+" m 62 "+(iy-13)+" l 74 "+(iy-13)+" l S")}
            else{commands.push("55 "+(iy-15)+" 14 23 re S 69 "+(iy-15)+" 14 23 re S 59 "+(iy+2)+" m 65 "+(iy+2)+" l 73 "+(iy+2)+" m 79 "+(iy+2)+" l S")}
            commands.push("Q");
          }
          rect(x+3,y-height-3,w,height,[.85,.88,.94]);
          rect(x,y-height,w,height,[.99,.995,1]);rect(x,y-height,4,height,accent);
          commands.push(".80 .85 .94 RG .6 w "+x+" "+(y-height)+" "+w+" "+height+" re S");
          rect(x+4,y-2,w-4,2,[1,1,1]);
          chunk.forEach((line,i)=>text(line,x+16,y-20-i*15,i===0?11:10,i===0?accent:[.16,.20,.31]));
          y-=height+14;offset+=count;
        }
      });
      pages.push(commands.join("\n"));
      const objects=[];objects[1]="<< /Type /Catalog /Pages 2 0 R >>";objects[2]="<< /Type /Pages /Kids ["+pages.map((_,i)=>(5+i*2)+" 0 R").join(" ")+"] /Count "+pages.length+" >>";objects[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
      pages.forEach((stream,i)=>{objects[4+i*2]="<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream";objects[5+i*2]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents "+(4+i*2)+" 0 R >>"});
      let pdf="%PDF-1.4\n";const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n"}const xref=pdf.length;pdf+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";pdf+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";return new Blob([pdf],{type:"application/pdf"});
    };
    const mapText=map=>"Central topic: "+map.topic+"\n\n"+map.branches.map((branch,index)=>"["+branch.icon+"] "+(index+1)+". "+branch.title+"\nMemory aid: "+branch.mnemonic+"\nPicture this: "+branch.visual_cue+"\n"+branch.points.map(point=>"   - "+point).join("\n")).join("\n\n");
    const loadChapters=async()=>{
      const request=++chapterRequest,name=subject.value,canonical=aliases[name]||name;
      releaseGenerated();generate.disabled=true;
      if(!name){chapter.replaceChildren(new Option("Choose a subject first",""));chapter.disabled=true;official.href=materialUrls[level];official.textContent="Open official ICAI study material ↗";return}
      chapter.replaceChildren(new Option("Loading ICAI chapters…",""));chapter.disabled=true;
      try{
        const params=new URLSearchParams({mode:"chapters",level,subject:canonical}),response=await fetch("/api/ai-planner?"+params.toString(),{headers:{accept:"application/json"}}),result=await response.json().catch(()=>({}));
        if(request!==chapterRequest)return;
        const outlines=response.ok&&Array.isArray(result.outlines)?result.outlines:[],outline=outlines.find(item=>Array.isArray(item.chapters)&&item.chapters.length);
        const names=[...new Set(outlines.flatMap(item=>Array.isArray(item.chapters)?item.chapters:[]).map(item=>String(item).trim()).filter(Boolean))];
        sourceUrl=outline?.url||materialUrls[level];official.href=sourceUrl;official.textContent="Open official ICAI chapter material ↗";
        chapter.replaceChildren(new Option("Choose a chapter",""),...names.map(name=>new Option(name,name)));chapter.disabled=!names.length;
        if(!names.length){chapter.replaceChildren(new Option("ICAI chapters unavailable",""));msg("#revisionGenerateStatus","The official ICAI chapter list could not be loaded. Please try again.","error")}
      }catch{if(request===chapterRequest){chapter.replaceChildren(new Option("ICAI chapters unavailable",""));chapter.disabled=true;msg("#revisionGenerateStatus","The official ICAI chapter list could not be loaded. Please try again.","error")}}
    };
    const setLevel=(newLevel)=>{location.href="revision.html?level="+encodeURIComponent(newLevel)};
    document.querySelectorAll("[data-revision-level]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();setLevel(link.dataset.revisionLevel)}));
    subject.addEventListener("change",loadChapters);
    chapter.addEventListener("change",()=>{releaseGenerated();generate.disabled=!chapter.value;});
    if(selected){subject.value=selected;loadChapters()}
    generate.addEventListener("click",async()=>{
      const chapterName=chapter.value,subjectName=subject.value;
      if(!chapterName||!subjectName)return;
      const buttonText=generate.textContent;generate.disabled=true;generate.textContent="CA Junction is preparing your PDFs…";subject.disabled=true;chapter.disabled=true;msg("#revisionGenerateStatus","");
      const timer=$("#revisionElapsed"),started=Date.now();timer.hidden=false;
      const tick=()=>{const seconds=Math.floor((Date.now()-started)/1000);timer.textContent="Preparing your PDFs · usually up to 2 minutes · "+String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");};
      tick();const timerId=setInterval(tick,1000);
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(!session?.access_token){location.href="account.html?next="+encodeURIComponent("revision.html?level="+level+"&subject="+encodeURIComponent(subjectName));return}
        const key=JSON.stringify([level,subjectName,chapterName]);
        const pack=chapterPacks.get(key)||{};chapterPacks.set(key,pack);
        const prepare=async(mode)=>{
          for(let attempt=0;attempt<2;attempt++){
            msg("#revisionGenerateStatus",(mode==="summary"?"Preparing your detailed summary":"Summary ready. Preparing your memory map")+(attempt?" — retrying automatically…":"…"));
            try{
              const response=await fetch("/api/ai-revision",{method:"POST",headers:{authorization:"Bearer "+session.access_token,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({level,subject:subjectName,chapter:chapterName,source_url:sourceUrl,mode,...(mode==="mind_map"?{summary:pack.summary}:{})})});
              const result=await response.json().catch(()=>({}));
              if(response.ok)return result;
              const error=new Error(result.error||"CA Junction could not finish this step.");
              error.retryable=[502,503,504].includes(response.status);
              throw error;
            }catch(error){
              if(attempt===1||!(error.retryable||error instanceof TypeError))throw error;
              await new Promise(resolve=>setTimeout(resolve,1500));
            }
          }
        };
        releaseGenerated();
        const meta=level+" · "+subjectName+" · "+chapterName+" · Verify with the linked ICAI material";
        const base=slug(chapterName),summaryLink=$("#generatedSummaryDownload"),mapLink=$("#generatedMindMapDownload");
        mapLink.closest("article").hidden=true;
        if(!pack.summary)pack.summary=(await prepare("summary")).summary;
        const summaryUrl=URL.createObjectURL(makePdf(chapterName+" — Summary",meta,pack.summary));generatedUrls.push(summaryUrl);
        summaryLink.href=summaryUrl;summaryLink.download=base+"-summary.pdf";
        $("#generatedSummaryTitle").textContent=chapterName+" — Summary";
        $("#revisionGeneratedFiles").hidden=false;
        if(!pack.mind_map)pack.mind_map=(await prepare("mind_map")).mind_map;
        const mapUrl=URL.createObjectURL(makePdf(chapterName+" — Mind Map",meta,mapText(pack.mind_map)));generatedUrls.push(mapUrl);
        mapLink.href=mapUrl;mapLink.download=base+"-mind-map.pdf";
        $("#generatedMindMapTitle").textContent=chapterName+" — Mind Map";
        mapLink.closest("article").hidden=false;
        msg("#revisionGenerateStatus","Both PDFs are ready. Check them against the linked ICAI material before relying on exam-specific details.");
      }catch(error){msg("#revisionGenerateStatus",error.message||"CA Junction could not create these PDFs. Please try again.","error")}
      finally{clearInterval(timerId);timer.hidden=true;subject.disabled=false;chapter.disabled=false;generate.disabled=!chapter.value;generate.textContent=buttonText}
    });
    if(!ready()){msg("#revisionGenerateStatus",backendMessage,"error");generate.disabled=true}
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
        const query=new URLSearchParams({mode:"chapters",level:level.value,subject:lookupSubject});
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
    const updatePreparationTimer=()=>{const elapsed=Math.floor((Date.now()-preparationStarted)/1000),minutes=String(Math.floor(elapsed/60)).padStart(2,"0"),seconds=String(elapsed%60).padStart(2,"0");$("#aiPracticeTimer").textContent="Preparing your questions · this can take up to 2 minutes · "+minutes+":"+seconds};
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
    const adminViewButtons=[...document.querySelectorAll("#adminPanel [data-admin-nav]")];
    const adminViewPanels=[...document.querySelectorAll("#adminPanel [data-admin-view]")];
    const adminViewSections=[...document.querySelectorAll("#adminPanel .admin-main > section:not(#adminOverview):not([data-admin-view])")];
    const showAdminView=view=>{
      $("#adminOverview").hidden=view!=="overview";
      adminViewPanels.forEach(panel=>panel.hidden=panel.dataset.adminView!==view);
      adminViewSections.forEach(section=>{const panels=[...section.querySelectorAll(":scope > .panel[data-admin-view]")];if(panels.length)section.hidden=panels.every(panel=>panel.hidden)});
      adminViewButtons.forEach(button=>{const active=button.dataset.adminNav===view;button.classList.toggle("active",active);button.setAttribute("aria-current",active?"page":"false")});
    };
    adminViewButtons.forEach(button=>button.addEventListener("click",()=>showAdminView(button.dataset.adminNav)));
    showAdminView("overview");
    document.querySelectorAll("#adminPanel [data-library-tab]").forEach(button=>button.addEventListener("click",()=>{
      const level=button.dataset.libraryTab;
      document.querySelectorAll("#adminPanel [data-library-tab]").forEach(tab=>tab.classList.toggle("active",tab===button));
      document.querySelectorAll("#adminPanel [data-library-level]").forEach(card=>card.hidden=card.dataset.libraryLevel!==level);
    }));
    const adminSubjectsByLevel={
      Foundation:["Accounting","Business Laws","Quantitative Aptitude","Business Economics"],
      Intermediate:["Advanced Accounting","Corporate and Other Laws","Taxation — Income-tax Law","Taxation — Goods and Services Tax","Cost and Management Accounting","Auditing and Ethics","Financial Management","Strategic Management"],
      Final:["Financial Reporting","Advanced Financial Management","Advanced Auditing, Assurance and Professional Ethics","Direct Tax Laws & International Taxation","Indirect Tax Laws","Integrated Business Solutions"]
    };
    const adminChapterAliases={"Taxation — Income-tax Law":"Taxation","Taxation — Goods and Services Tax":"Taxation","Financial Management":"Financial Management and Strategic Management","Strategic Management":"Financial Management and Strategic Management","Integrated Business Solutions":"Integrated Business Solutions (Multidisciplinary Case Study with Strategic Management)"};
        const adminCanonical=subject=>adminChapterAliases[subject]||subject;
    const revisionMaterialUrls={Foundation:"https://boslive.icai.org/study_material_new_paper_details.php?c=foundation&language=English",Intermediate:"https://boslive.icai.org/study_material_new_paper_details.php?c=intermediate&language=English",Final:"https://boslive.icai.org/study_material_new_paper_details.php?c=final&language=English"};
    let revisionSourceUrl="",revisionDraftMeta=null;
    const fillRevisionAdminSubjects=()=>{
      const level=$("#adminRevisionLevel"),subject=$("#adminRevisionSubject"),chapter=$("#adminRevisionChapter");
      if(!level||!subject||!chapter)return;
      const names=adminSubjectsByLevel[level.value]||[];
      subject.replaceChildren(...names.map(name=>new Option(name,name)));
      chapter.replaceChildren(new Option("Loading ICAI chapters…",""));chapter.disabled=true;
      loadAdminRevisionChapters();
    };
    async function loadAdminRevisionChapters(){
      const level=$("#adminRevisionLevel")?.value,subject=$("#adminRevisionSubject")?.value,chapter=$("#adminRevisionChapter");
      const link=$("#adminRevisionIcaiLink");
      if(!level||!subject||!chapter)return;
      const params=new URLSearchParams({mode:"chapters",level,subjects:adminCanonical(subject)});
      chapter.disabled=true;chapter.replaceChildren(new Option("Loading ICAI chapters…",""));
      try{
        const response=await fetch("/api/ai-planner?"+params.toString(),{headers:{accept:"application/json"}});
        const result=await response.json().catch(()=>({}));
        const outlines=response.ok&&Array.isArray(result.outlines)?result.outlines:[];
        const outline=outlines.find(item=>item.subject&&item.chapters?.length);
        const names=[...new Set(outlines.flatMap(item=>Array.isArray(item.chapters)?item.chapters:[]).map(name=>String(name).trim()).filter(Boolean))];
        revisionSourceUrl=outline?.url||revisionMaterialUrls[level];
        if(link){link.href=revisionSourceUrl;link.hidden=false}
        chapter.replaceChildren(...(names.length?names.map(name=>new Option(name,name)):[new Option("ICAI chapter list unavailable","")]));
        chapter.disabled=!names.length;
        if(!names.length)msg("#revisionPackStatus","Could not load the official ICAI chapter list. Please try again.","error");
      }catch{
        chapter.replaceChildren(new Option("Could not load ICAI chapters",""));chapter.disabled=true;
        msg("#revisionPackStatus","Could not load the official ICAI chapter list. Please try again.","error");
      }
    }
    function revisionMapText(map){
      return "Central topic: "+map.topic+"\n\n"+map.branches.map((branch,index)=>(index+1)+". "+branch.title+"\n"+branch.points.map(point=>"   - "+point).join("\n")).join("\n\n");
    }
    async function generateRevisionDraft(event){
      event.preventDefault();
      const level=$("#adminRevisionLevel").value,subject=$("#adminRevisionSubject").value,chapter=$("#adminRevisionChapter").value;
      if(!chapter){msg("#revisionPackStatus","Choose an ICAI chapter first.","error");return}
      const button=$("#generateRevisionPack");button.disabled=true;msg("#revisionPackStatus","Creating the chapter summary and mind map drafts…");
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(!session?.access_token)throw new Error("Your admin session expired. Please sign in again.");
        const response=await fetch("/api/ai-revision",{method:"POST",headers:{authorization:"Bearer "+session.access_token,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({level,subject,chapter,source_url:revisionSourceUrl})});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||"CA Junction could not create the chapter drafts.");
        revisionDraftMeta={level,subject,chapter,sourceUrl:result.source_url||revisionSourceUrl};
        $("#revisionSummaryDraft").value=result.summary||"";
        $("#revisionMindMapDraft").value=revisionMapText(result.mind_map);
        $("#revisionDraftPanel").hidden=false;
        msg("#revisionPackStatus","Drafts are ready. Review or edit them, then save both PDFs.");
        $("#revisionDraftPanel").scrollIntoView({behavior:"smooth",block:"nearest"});
      }catch(error){msg("#revisionPackStatus",error.message||"CA Junction could not create the chapter drafts.","error")}
      finally{button.disabled=false}
    }
    function pdfText(value){
      return String(value||"").replace(/•/g,"-").replace(/→|➜/g,"->").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ");
    }
    function makeRevisionPdf(title,meta,body){
      const wrap=(line,width)=>{
        const words=pdfText(line).split(/\s+/);const out=[];let current="";
        words.forEach(word=>{if(!word)return;if((current+" "+word).trim().length>width&&current){out.push(current);current=word}else current=(current?current+" ":"")+word});
        out.push(current);return out;
      };
      let lines=[];
      String(body||"").split(/\r?\n/).forEach(line=>{if(!line.trim()){lines.push("");return}lines.push(...wrap(line,88))});
      const pageLines=[];for(let i=0;i<lines.length||!pageLines.length;i+=48)pageLines.push(lines.slice(i,i+48));
      const objects=[];
      objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
      objects[2]="<< /Type /Pages /Kids ["+pageLines.map((_,i)=>(5+i*2)+" 0 R").join(" ")+"] /Count "+pageLines.length+" >>";
      objects[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
      pageLines.forEach((page,i)=>{
        const stream=["BT","/F1 17 Tf","50 790 Td","("+pdfText(title).replace(/([\\()])/g,"\\$1")+") Tj","/F1 9 Tf","0 -23 Td","("+pdfText(meta).replace(/([\\()])/g,"\\$1")+") Tj","0 -25 Td","/F1 10 Tf"];
        page.forEach(line=>{stream.push("("+pdfText(line).replace(/([\\()])/g,"\\$1")+") Tj","0 -14 Td")});
        stream.push("ET");
        const content=stream.join("\n");
        const contentId=4+i*2,pageId=5+i*2;
        objects[contentId]="<< /Length "+content.length+" >>\nstream\n"+content+"\nendstream";
        objects[pageId]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents "+contentId+" 0 R >>";
      });
      let pdf="%PDF-1.4\n",offsets=[0];
      for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n"}
      const xref=pdf.length;pdf+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
      for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
      pdf+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";
      return new Blob([pdf],{type:"application/pdf"});
    }
    async function saveRevisionPdfs(){
      if(!revisionDraftMeta){msg("#revisionPackStatus","Generate a chapter draft first.","error");return}
      const summary=$("#revisionSummaryDraft").value.trim(),mindMap=$("#revisionMindMapDraft").value.trim();
      if(summary.length<40||mindMap.length<40){msg("#revisionPackStatus","Add more detail to both drafts before saving.","error");return}
      const button=$("#publishRevisionPack");button.disabled=true;msg("#revisionPackStatus","Uploading both PDFs…");
      const uploaded=[],insertedRows=[];
      let published=false;
      try{
        const userResult=await sb.auth.getUser(),user=userResult.data?.user;
        if(userResult.error||!user)throw new Error("Your admin session expired. Please sign in again.");
        const chapterSlug=revisionDraftMeta.chapter.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"chapter";
        const levelSlug=revisionDraftMeta.level.toLowerCase();
        const pack=[
          {kind:"summary",category:"revision",title:revisionDraftMeta.chapter+" — Summary",body:summary},
          {kind:"mind map",category:"mind_map",title:revisionDraftMeta.chapter+" — Mind Map",body:mindMap}
        ];
        for(const item of pack){
          const file=makeRevisionPdf(item.title,revisionDraftMeta.level+" · "+revisionDraftMeta.subject+" · "+revisionDraftMeta.chapter,item.body);
          const path="admin/revision-packs/"+levelSlug+"/"+chapterSlug+"/"+item.kind.replace(/ /g,"_")+"_"+crypto.randomUUID()+".pdf";
          const {error:uploadError}=await sb.storage.from("ca-materials").upload(path,file,{contentType:"application/pdf",upsert:false});
          if(uploadError)throw uploadError;
          uploaded.push({item,path});
        }
        for(const entry of uploaded){
          const marker="CAJ_AI_REVISION_V1|"+entry.item.kind+"|";
          const {data:oldRows,error:findError}=await sb.from("materials").select("id,file_bucket,file_path").eq("level",revisionDraftMeta.level).eq("subject",revisionDraftMeta.subject).eq("chapter",revisionDraftMeta.chapter).eq("category",entry.item.category).like("description",marker+"%").limit(20);
          if(findError)throw findError;
          entry.oldRows=oldRows||[];
        }
        for(const entry of uploaded){
          const marker="CAJ_AI_REVISION_V1|"+entry.item.kind+"|";
          const rowData={title:entry.item.title,description:marker+"AI-generated study aid. Verify with the linked official ICAI material.",level:revisionDraftMeta.level,subject:revisionDraftMeta.subject,chapter:revisionDraftMeta.chapter,category:entry.item.category,file_bucket:"ca-materials",file_path:entry.path,external_url:revisionDraftMeta.sourceUrl,is_premium:false,is_published:true,created_by:user.id};
          const {data:newRow,error:insertError}=await sb.from("materials").insert(rowData).select("id").single();
          if(insertError)throw insertError;
          insertedRows.push(newRow.id);
        }
        published=true;
        for(const entry of uploaded){
          for(const old of entry.oldRows||[]){
            const {error:deleteError}=await sb.from("materials").delete().eq("id",old.id);
            if(!deleteError&&old.file_bucket&&old.file_path)await sb.storage.from(old.file_bucket).remove([old.file_path]);
          }
        }
        msg("#revisionPackStatus","Both PDFs are published and visible in the student chapter page.");
        loadAdminResources();loadAdminMindMaps();
      }catch(error){
        if(!published){
          for(const id of insertedRows)await sb.from("materials").delete().eq("id",id);
          for(const entry of uploaded)await sb.storage.from("ca-materials").remove([entry.path]);
        }
        msg("#revisionPackStatus",published?"The new PDFs are published, but an older version could not be removed. Check the resource list.":(error.message||"The PDFs could not be saved. Please try again."),"error");
      }finally{button.disabled=false}
    }
    $("#resourceLevel")?.addEventListener("change",loadAdminResourceSubjects);
    ["adminResourceLevelFilter","adminResourceCategoryFilter"].forEach(id=>$("#"+id)?.addEventListener("change",loadAdminResources));
    $("#adminResourceSearch")?.addEventListener("input",loadAdminResources);
    ["adminMtpCollectionFilter","adminMtpLevelFilter","adminMtpTypeFilter"].forEach(id=>$("#"+id)?.addEventListener("change",loadAdminMtpPapers));
    ["submissionLevelFilter","submissionSubjectFilter","submissionChapterFilter","submissionAuthorFilter"].forEach(id=>$("#"+id)?.addEventListener("input",loadNoteSubmissions));
    ["studentLevelFilter"].forEach(id=>$("#"+id)?.addEventListener("change",loadAdminStudents));
    $("#studentSearch")?.addEventListener("input",loadAdminStudents);
    $("#adminRoleForm")?.addEventListener("submit",manageAdminRole);
    $("#resourceSubject")?.addEventListener("change",loadAdminResourceChapters);
    $("#adminMaterialForm")?.addEventListener("submit",saveMaterial);
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
    [["Foundation","virtual_library_foundation"],["Intermediate","virtual_library_intermediate"],["Final","virtual_library_final"]].forEach(([level,key])=>$("#virtualLibrary"+level+"Remove")?.addEventListener("click",()=>removeManagedLink(key,level)));
    $("#doubtSolvingForm")?.addEventListener("submit",e=>saveManagedLink(e,"doubt_solving","Doubt-solving group","#doubtSolvingUrl","#doubtSolvingStatus"));
    await Promise.all([loadAdminOverview(),loadAdminAiUsage(),loadAdminResources(),loadAdminMtpPapers(),loadNoteSubmissions(),loadAdminJobs(),loadAdminStudents(),loadAdminRoles(),loadManagedLinks()]);window.setInterval(()=>{loadAdminOverview();loadAdminAiUsage()},30000);
    async function loadAdminOverview(){
      const {data,error}=await sb.rpc("admin_platform_overview");
      const row=Array.isArray(data)?data[0]:data;
      if(error||!row){["overviewStudents","overviewNewStudents","overviewStudyHours","overviewStudySessions","overviewMaterials","overviewPendingNotes","overviewJobs","overviewRequests"].forEach(id=>{const element=$("#"+id);if(element)element.textContent="—"});return}
      const set=(id,value)=>{const element=$("#"+id);if(element)element.textContent=Number(value||0).toLocaleString("en-IN")};
      set("overviewStudents",row.student_count);set("overviewNewStudents",row.new_students_7d);
      const hours=$("#overviewStudyHours");if(hours)hours.textContent=(Number(row.study_seconds_30d||0)/3600).toFixed(1);
      set("overviewStudySessions",row.study_sessions_30d);set("overviewMaterials",row.published_materials);
      set("overviewPendingNotes",row.pending_notes);set("overviewJobs",row.published_opportunities);set("overviewRequests",row.open_requests);
    }
    async function loadAdminAiUsage(){
      const list=$("#adminAiUsageUsers");if(!list)return;
      const {data,error}=await sb.rpc("admin_ai_mcq_usage_today");
      const total=$("#adminAiTotal");
      if(error||!data){if(total)total.textContent="—";emptyRow(list,error?"Could not load AI practice usage. Apply the AI usage setup in Supabase.":"No usage data is available.");return}
      if(total)total.textContent=Number(data.request_count||0).toLocaleString("en-IN");
      const rows=Array.isArray(data.users)?data.users:[];
      if(!rows.length){emptyRow(list,"No AI practice requests have been recorded today.");return}
      list.replaceChildren();
      rows.forEach(row=>{
        const last=row.last_used_at?new Date(row.last_used_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"time unavailable";
        addRow(list,row.full_name||"Student",[row.email||"No email on record",row.ca_level||"Level unavailable",Number(row.request_count||0)+" MCQ request(s)","Last used "+last].join(" · "));
      });
    }
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
      const outlines=await Promise.all(levels.map(async name=>{try{const params=new URLSearchParams({mode:"chapters",level:name,subject:canonical});const response=await fetch("/api/ai-planner?"+params.toString(),{headers:{accept:"application/json"}});const result=await response.json().catch(()=>({}));return response.ok&&Array.isArray(result.outlines)?result.outlines.flatMap(item=>item.chapters||[]):[]}catch{return[]}}));
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
    async function deleteManagedMaterial(row,statusSelector,label){
      if(!confirm("Delete “"+row.title+"” permanently, including its stored PDF?"))return;
      let sourcePath=null;
      if(row.student_submission_id){
        const {data:submission,error}=await sb.from("student_note_submissions").select("file_path").eq("id",row.student_submission_id).maybeSingle();
        if(error){msg(statusSelector,error.message,"error");return}sourcePath=submission?.file_path||null;
      }
      const files=[],fileKeys=new Set();
      const addFile=(bucket,path)=>{if(!bucket||!path)return;const key=bucket+"\\n"+path;if(!fileKeys.has(key)){fileKeys.add(key);files.push([bucket,path])}};
      addFile(row.file_bucket,row.file_path);addFile("student-notes",sourcePath);
      for(const [bucket,path] of files){
        const {error:storageError}=await sb.storage.from(bucket).remove([path]);
        if(storageError){msg(statusSelector,"Could not delete the stored file. The item remains listed so you can retry: "+storageError.message,"error");return}
      }
      const {error}=await sb.from("materials").delete().eq("id",row.id);
      if(error){msg(statusSelector,"The PDF was removed, but its resource record could not be deleted: "+error.message,"error");return}
      if(row.student_submission_id){
        const {error:submissionError}=await sb.from("student_note_submissions").delete().eq("id",row.student_submission_id);
        if(submissionError){msg(statusSelector,label+" file and resource were removed, but its contributor record could not be deleted: "+submissionError.message,"error");return}
      }
      msg(statusSelector,label+" and stored file deleted.","success");
    }
    async function loadAdminMtpPapers(){
      const chapters=["mtp_question","mtp_suggested_answer","rtp_question","rtp_suggested_answer","previous_year_question","previous_year_solution","mock_test_question"];
      const {data,error}=await sb.from("materials").select("id,title,level,subject,chapter,is_published,file_bucket,file_path").eq("category","icai_link").in("chapter",chapters).order("created_at",{ascending:false}).limit(300);
      const list=$("#adminMtpPapers");if(!list)return;list.replaceChildren();
      if(error||!data?.length){emptyRow(list,error?"Could not load test papers.":"No test papers uploaded yet.");return}
      const family=$("#adminMtpCollectionFilter")?.value||"",level=$("#adminMtpLevelFilter")?.value||"",kind=$("#adminMtpTypeFilter")?.value||"";
      const familyKey=family?({mtp_question:"mtp_",rtp_question:"rtp_",previous_year_question:"previous_year_",mock_test_question:"mock_test_"}[family]||""):"";
      const filtered=data.filter(row=>(!level||row.level===level)&&(!familyKey||row.chapter.startsWith(familyKey))&&(!kind||(kind==="question"?row.chapter.endsWith("_question"):/(suggested_answer|_solution)$/.test(row.chapter))));
      if(!filtered.length){emptyRow(list,"No papers match these filters.");return}
      const labels={mtp_question:"ICAI MTP · Question paper",mtp_suggested_answer:"ICAI MTP · Suggested answers",rtp_question:"ICAI RTP · Question paper",rtp_suggested_answer:"ICAI RTP · Suggested answers",previous_year_question:"Previous year · Question paper",previous_year_solution:"Previous year · Solutions",mock_test_question:"Mock test · Question paper"};
      filtered.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";const info=document.createElement("div"),h=document.createElement("strong"),p=document.createElement("p");
        h.textContent=row.title;p.textContent=row.level+" · "+(labels[row.chapter]||row.chapter)+(row.subject?" · "+row.subject:"")+" · "+(row.is_published?"Published":"Draft");info.append(h,p);
        const actions=document.createElement("div");actions.className="row-actions";
        const visibility=document.createElement("button");visibility.className="btn";visibility.type="button";visibility.textContent=row.is_published?"Unpublish":"Publish";
        visibility.addEventListener("click",async()=>{visibility.disabled=true;const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#mtpAdminStatus",error?error.message:"Paper visibility updated.",error?"error":"success");loadAdminMtpPapers()});
        const remove=document.createElement("button");remove.className="btn danger";remove.type="button";remove.textContent="Delete";
        remove.addEventListener("click",async()=>{remove.disabled=true;await deleteManagedMaterial(row,"#mtpAdminStatus","Paper");loadAdminMtpPapers()});
        actions.append(visibility,remove);item.append(info,actions);list.append(item);
      });
    }
        async function loadAdminMindMaps(){
      const {data,error}=await sb.from("materials").select("id,title,level,subject,is_premium,is_published,file_bucket,file_path,external_url").eq("category","mind_map").order("created_at",{ascending:false}).limit(200);
      const list=$("#adminMindMaps");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load mind maps.":"No mind maps uploaded yet.");return}
      const level=$("#adminMindMapLevelFilter")?.value||"",subject=($("#adminMindMapSubjectFilter")?.value||"").trim().toLowerCase();
      const rows=data.filter(row=>(!level||row.level===level||row.level==="All")&&(!subject||(row.subject||"").toLowerCase().includes(subject)));
      if(!rows.length){emptyRow(list,"No mind maps match these filters.");return}
      rows.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+(row.subject||"No subject")+" · "+(row.is_premium?"Premium":"Free")+" · "+(row.is_published?"Published":"Draft");info.append(h,p);
        if(row.external_url){const a=document.createElement("a");a.href=row.external_url;a.target="_blank";a.rel="noopener";a.textContent="Open source link";info.append(a)}
        const actions=document.createElement("div");actions.className="row-actions";
        const access=document.createElement("button");access.className="btn";access.type="button";access.textContent=row.is_premium?"Set Free":"Set Premium";access.addEventListener("click",async()=>{access.disabled=true;const {error}=await sb.from("materials").update({is_premium:!row.is_premium}).eq("id",row.id);msg("#mindMapAdminStatus",error?error.message:(row.is_premium?"Mind map is now free.":"Mind map is now premium and access-restricted."),error?"error":"success");loadAdminMindMaps()});
        const visibility=document.createElement("button");visibility.className="btn";visibility.type="button";visibility.textContent=row.is_published?"Unpublish":"Publish";visibility.addEventListener("click",async()=>{visibility.disabled=true;const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#mindMapAdminStatus",error?error.message:"Mind map visibility updated.",error?"error":"success");loadAdminMindMaps()});
        const remove=document.createElement("button");remove.className="btn danger";remove.type="button";remove.textContent="Delete";remove.addEventListener("click",async()=>{remove.disabled=true;await deleteManagedMaterial(row,"#mindMapAdminStatus","Mind map");loadAdminMindMaps()});
        actions.append(access,visibility,remove);item.append(info,actions);list.append(item);
      });
    }
        async function loadAdminResources(){
      const {data,error}=await sb.from("materials").select("id,title,description,level,subject,chapter,category,is_premium,is_published,file_bucket,file_path,student_submission_id,contributor_name,external_url").neq("category","icai_link").neq("category","revision").neq("category","mind_map").order("created_at",{ascending:false}).limit(500);
      const list=$("#adminResources");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load resources.":"No resources yet.");return}
      const level=$("#adminResourceLevelFilter")?.value||"",category=$("#adminResourceCategoryFilter")?.value||"",search=($("#adminResourceSearch")?.value||"").trim().toLowerCase();
      const rows=data.filter(row=>(!level||row.level===level||row.level==="All")&&(!category||row.category===category)&&(!search||[row.title,row.subject,row.chapter,row.contributor_name].some(value=>String(value||"").toLowerCase().includes(search))));
      if(!rows.length){emptyRow(list,"No resources match these filters.");return}
      rows.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=[row.level,row.subject,row.chapter,row.category,row.contributor_name?"By "+row.contributor_name:"",row.is_premium?"Premium":"Free",row.is_published?"Published":"Draft"].filter(Boolean).join(" · ");info.append(h,p);
        if(row.external_url){const a=document.createElement("a");a.href=row.external_url;a.target="_blank";a.rel="noopener";a.textContent="Open source link";info.append(a)}
        const actions=document.createElement("div");actions.className="row-actions";const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#resourceStatus",error?error.message:"Resource status updated.",error?"error":"success");loadAdminResources()});
        const remove=document.createElement("button");remove.className="btn danger";remove.textContent="Delete";remove.addEventListener("click",async()=>{remove.disabled=true;await deleteManagedMaterial(row,"#resourceStatus","Resource");loadAdminResources()});
        if((row.category==="revision"||row.category==="mind_map")&&String(row.description||"").startsWith("CAJ_AI_REVISION_V1|")){
          const update=document.createElement("button");update.className="btn";update.type="button";update.textContent="Edit / update PDFs";
          update.addEventListener("click",async()=>{
            $("#adminRevisionLevel").value=row.level;
            const subjectControl=$("#adminRevisionSubject");subjectControl.replaceChildren(...(adminSubjectsByLevel[row.level]||[]).map(name=>new Option(name,name)));subjectControl.value=row.subject;
            await loadAdminRevisionChapters();$("#adminRevisionChapter").value=row.chapter;revisionDraftMeta={level:row.level,subject:row.subject,chapter:row.chapter,sourceUrl:revisionSourceUrl};
            $("#revisionDraftPanel").hidden=true;$("#admin-ai-revision-pack").scrollIntoView({behavior:"smooth",block:"start"});
            msg("#revisionPackStatus","Chapter selected. Generate new drafts, edit them, then save to replace both PDFs.");
          });actions.append(update)
        }
        actions.append(button,remove);item.append(info,actions);list.append(item);
      });
    }
        async function loadNoteSubmissions(){
      const {data,error}=await sb.from("student_note_submissions").select("*").in("status",["pending","approved","rejected"]).order("created_at",{ascending:false});
      const list=$("#noteSubmissions");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load submissions.":"No contributor uploads yet.");return}
      const level=$("#submissionLevelFilter")?.value||"",subject=($("#submissionSubjectFilter")?.value||"").trim().toLowerCase(),chapter=($("#submissionChapterFilter")?.value||"").trim().toLowerCase(),author=($("#submissionAuthorFilter")?.value||"").trim().toLowerCase();
      const rows=data.filter(row=>(!level||row.level===level)&&(!subject||String(row.subject||"").toLowerCase().includes(subject))&&(!chapter||String(row.chapter||"").toLowerCase().includes(chapter))&&(!author||String(row.contributor_name||"").toLowerCase().includes(author)));
      if(!rows.length){emptyRow(list,"No uploads match these filters.");return}
      rows.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";const info=document.createElement("div"),h=document.createElement("strong"),p=document.createElement("p");
        h.textContent=row.title;p.textContent=[row.status,row.level,row.subject,row.chapter,row.contributor_name?"By "+row.contributor_name:"",row.instagram_handle?"Instagram "+row.instagram_handle:"",row.linkedin_url?"LinkedIn provided":"",new Date(row.created_at).toLocaleDateString()].filter(Boolean).join(" · ");info.append(h,p);
        const actions=document.createElement("div");actions.className="row-actions";
        const view=document.createElement("button");view.className="btn";view.textContent="Open PDF";view.addEventListener("click",async()=>{const {data:link,error}=await sb.storage.from("student-notes").createSignedUrl(row.file_path,120);if(error){msg("#submissionStatus",error.message,"error");return}window.open(link.signedUrl,"_blank","noopener")});actions.append(view);
        if(row.status==="pending"){
          const approve=document.createElement("button");approve.className="btn";approve.textContent="Approve";approve.addEventListener("click",()=>approveNote(row));
          const reject=document.createElement("button");reject.className="btn";reject.textContent="Reject";reject.addEventListener("click",async()=>{const {error}=await sb.from("student_note_submissions").update({status:"rejected",reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",row.id);msg("#submissionStatus",error?error.message:"Submission rejected.",error?"error":"success");loadNoteSubmissions()});
          actions.append(approve,reject)
        }
        const remove=document.createElement("button");remove.className="btn danger";remove.textContent="Delete";remove.addEventListener("click",async()=>{
          if(row.status==="approved"){
            const {data:material,error}=await sb.from("materials").select("id,title,file_bucket,file_path,student_submission_id").eq("student_submission_id",row.id).maybeSingle();
            if(error){msg("#submissionStatus",error.message,"error");return}
            if(material){await deleteManagedMaterial(material,"#submissionStatus","Student note");loadNoteSubmissions();loadAdminResources();return}
          }
          if(!confirm("Permanently delete this contributor upload and its stored PDF?"))return;
          const {error:storageError}=await sb.storage.from("student-notes").remove([row.file_path]);
          if(storageError){msg("#submissionStatus","Could not delete the stored PDF. The upload remains listed so you can retry: "+storageError.message,"error");return}
          const {error}=await sb.from("student_note_submissions").delete().eq("id",row.id);
          msg("#submissionStatus",error?"The PDF was deleted, but its upload record could not be removed: "+error.message:"Contributor upload and PDF deleted.",error?"error":"success");loadNoteSubmissions()
        });
        actions.append(remove);item.append(info,actions);list.append(item)
      })
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
    async function removeManagedLink(key,level){
      if(!confirm("Remove the saved "+level+" Virtual Library link? Students will no longer be able to open that room."))return;
      const {error}=await sb.from("premium_resources").delete().eq("resource_key",key);
      msg("#virtualLibrary"+level+"Status",error?error.message:"Virtual Library link removed.",error?"error":"success");
      if(!error)await loadManagedLinks()
    }
    async function loadManagedLinks(){
      const keys=["virtual_library","virtual_library_foundation","virtual_library_intermediate","virtual_library_final","doubt_solving"];
      const {data,error}=await sb.from("premium_resources").select("resource_key,resource_url").in("resource_key",keys);
      if(error)return;
      const links=Object.fromEntries((data||[]).map(row=>[row.resource_key,row.resource_url]));
      if($("#virtualLibraryFoundationUrl"))$("#virtualLibraryFoundationUrl").value=links.virtual_library_foundation||links.virtual_library||"";
      if($("#virtualLibraryIntermediateUrl"))$("#virtualLibraryIntermediateUrl").value=links.virtual_library_intermediate||"";
      if($("#virtualLibraryFinalUrl"))$("#virtualLibraryFinalUrl").value=links.virtual_library_final||"";
      [["Foundation","virtual_library_foundation"],["Intermediate","virtual_library_intermediate"],["Final","virtual_library_final"]].forEach(([level,key])=>{const button=$("#virtualLibrary"+level+"Remove");if(button)button.hidden=!links[key]});
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
      const {data,error}=await sb.from("jobs").select("id,title,organization,job_type,location,description,application_url,is_published").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminJobs");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load opportunities.":"No opportunities yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row job-glass";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title+" · "+row.organization;const p=document.createElement("p");p.textContent=[row.job_type,row.location,row.is_published?"Published":"Draft"].filter(Boolean).join(" · ");const desc=document.createElement("p");desc.textContent=row.description||"";info.append(h,p,desc);if(row.application_url){const a=document.createElement("a");a.href=row.application_url;a.target="_blank";a.rel="noopener";a.textContent="Open apply link ↗";info.append(a)}
        const actions=document.createElement("div");actions.className="row-actions";const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("jobs").update({is_published:!row.is_published}).eq("id",row.id);msg("#jobAdminStatus",error?error.message:"Opportunity status updated.",error?"error":"success");loadAdminJobs()});const remove=document.createElement("button");remove.className="btn danger";remove.textContent="Delete";remove.addEventListener("click",async()=>{if(!confirm("Delete the opportunity “"+row.title+"”?"))return;const {error}=await sb.from("jobs").delete().eq("id",row.id);msg("#jobAdminStatus",error?error.message:"Opportunity deleted.",error?"error":"success");loadAdminJobs()});actions.append(button,remove);item.append(info,actions);list.append(item)});
    }
        async function loadAdminCourses(){
      const {data,error}=await sb.from("courses").select("id,title,level,is_published").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminCourses");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Could not load courses.":"No courses yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+(row.is_published?"Published":"Draft");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("courses").update({is_published:!row.is_published}).eq("id",row.id);msg("#courseStatus",error?error.message:"Course status updated.",error?"error":"success");loadAdminCourses()});item.append(info,button);list.append(item)});
    }
    async function manageAdminRole(e){
      e.preventDefault();const email=$("#adminRoleEmail").value.trim();msg("#adminRoleStatus","Updating admin access…");
      const {data,error}=await sb.rpc("admin_manage_admin",{target_email:email,grant_admin:true});
      msg("#adminRoleStatus",error?error.message:(data||"Admin access granted."),error?"error":"success");
      if(!error){e.target.reset();await loadAdminRoles()}
    }
    async function loadAdminRoles(){
      const list=$("#adminRolesList");if(!list)return;list.replaceChildren();
      const [{data:directory,error:directoryError},{data:roleRows,error:roleError}]=await Promise.all([sb.rpc("admin_student_directory"),sb.from("user_roles").select("user_id").eq("role","admin")]);
      if(directoryError||roleError){emptyRow(list,(directoryError||roleError).message);return}
      const byId=new Map((directory||[]).map(row=>[row.user_id,row]));
      const admins=(roleRows||[]).map(role=>({role,...(byId.get(role.user_id)||{})}));
      if(!admins.length){emptyRow(list,"No admin accounts were found.");return}
      admins.forEach(row=>{
        const item=document.createElement("div");item.className="data-row";const info=document.createElement("div"),name=document.createElement("strong"),detail=document.createElement("p");
        name.textContent=row.full_name||row.email||"Admin account";detail.textContent=[row.email||"Email unavailable","ID: "+row.user_id].join(" · ");info.append(name,detail);
        const remove=document.createElement("button");remove.className="btn danger";remove.type="button";remove.textContent="Remove admin";remove.disabled=row.user_id===user.id;remove.title=remove.disabled?"You cannot remove your own admin access.":"Remove admin access for this account.";
        remove.addEventListener("click",async()=>{if(!confirm("Remove admin access from "+(row.email||"this account")+"? They will lose access to the admin panel."))return;remove.disabled=true;const {data,error}=await sb.rpc("admin_manage_admin",{target_email:row.email,grant_admin:false});msg("#adminRoleStatus",error?error.message:(data||"Admin access removed."),error?"error":"success");await loadAdminRoles()});
        item.append(info,remove);list.append(item)
      })
    }
    async function loadAdminStudents(){
      const {data,error}=await sb.rpc("admin_student_directory");
      const list=$("#adminStudents");if(!list)return;list.replaceChildren();if(error||!data?.length){emptyRow(list,error?"Run the admin student directory migration in Supabase to show names, emails and IDs.":"No student accounts yet.");return}
      const level=$("#studentLevelFilter")?.value||"",search=($("#studentSearch")?.value||"").trim().toLowerCase();
      const rows=data.filter(row=>(!level||row.ca_level===level)&&(!search||[row.full_name,row.email,row.user_id].some(value=>String(value||"").toLowerCase().includes(search))));
      if(!rows.length){emptyRow(list,"No students match these filters.");return}
      rows.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.full_name||"Student";const p=document.createElement("p");p.textContent=[row.email||"No email on record",row.ca_level,"ID: "+row.user_id,"Joined "+new Date(row.created_at).toLocaleDateString()].join(" · ");info.append(h,p);item.append(info);list.append(item)});
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
    if(page==="revision")initRevisionPage();
    if(page==="resource-link")initResourceLink();
    if(page==="mtp")initMtp();
    if(page==="tests")initTests();
    if(page==="planner")initPlanner();
    if(page==="career")initCareer();
    if(page==="admin")initAdmin();
  }
  run();
})();