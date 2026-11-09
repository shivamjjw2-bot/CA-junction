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
      const url = window.caWhatsAppUrl();
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
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function initHome() {
    const accountLink=$("#accountNavLink");
    if(accountLink&&ready())sb.auth.getUser().then(({data:{user}})=>{if(user){accountLink.href="platform.html";accountLink.textContent="My Dashboard";}});
    const levelButtons = $(".level-card[data-level]");
    $("a").forEach(link => link.addEventListener("click", () => {
      if (!link.hash) return;
      const target = $(link.hash);
      if (target?.tagName === "DETAILS") target.open = true;
    }));
    const levelMsg = $("#levelMessage");
    const saved = localStorage.getItem("caJunctionLevel");
    if (saved) {
      const savedButton = levelButtons.find(button => button.dataset.level === saved);
      if (savedButton) {
        savedButton.setAttribute("aria-pressed","true");
        if (levelMsg) levelMsg.textContent = saved + " selected. Links will open at this level.";
      }
    }
    levelButtons.forEach(button => button.addEventListener("click", () => {
      levelButtons.forEach(x => x.setAttribute("aria-pressed", String(x === button)));
      localStorage.setItem("caJunctionLevel", button.dataset.level);
      if (levelMsg) levelMsg.textContent = button.dataset.level + " selected. Your next links will open at this level.";
      $("#service-heads")?.scrollIntoView({behavior:"smooth",block:"start"});
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
    const form = $("#homeSearch");
    if (form) form.addEventListener("submit", event => {
      event.preventDefault();
      const query = ($("#homeSearchInput").value || "").trim().toLowerCase();
      const cards = $("#service-heads .service-tile");
      let matches = 0;
      cards.forEach(card => {
        const show = !query || card.textContent.toLowerCase().includes(query);
        card.hidden = !show;
        if (show) matches++;
      });
      if(query) $("#service-heads .service-group").forEach(group=>{if($(".service-tile:not([hidden])",group).length)group.open=true});
      msg("#searchMessage", query ? (matches ? matches + " matching services found below." : "No matching services. Try another search.") : "Showing all services.");
      if (query && matches) {
        const first = cards.find(card => !card.hidden);
        first?.scrollIntoView({ behavior:"smooth", block:"center" });
      }
    });
    if (!ready()) {
      const status = $("#whatsappStatus");
      if (status) status.textContent = "Add your WhatsApp number in assets/config.js to enable this link.";
    }
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
    localStorage.setItem("caJunctionLevel",chosenLevel);
    if($("#noteLevel"))$("#noteLevel").value=chosenLevel;
    if($("#uploadLevelLabel"))$("#uploadLevelLabel").textContent="Preselected from your homepage choice; change it if needed.";
    $("#noteLevel")?.addEventListener("change",()=>{localStorage.setItem("caJunctionLevel",$("#noteLevel").value);if($("#uploadLevelLabel"))$("#uploadLevelLabel").textContent="Selected: "+$("#noteLevel").value;});
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
    const instagramHandle=$("#noteInstagram").value.trim().replace(/^@/,"");
    if(instagramHandle&&!/^[A-Za-z0-9._]{1,30}$/.test(instagramHandle)){msg("#uploadStatus","Enter a valid Instagram handle, such as @yourusername.","error");return}
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
      user_id:user.id,title:$("#noteTitle").value.trim(),level:$("#noteLevel").value,
      subject:$("#noteSubject").value.trim(),chapter:$("#noteChapter").value.trim(),description:$("#noteDescription").value.trim(),contributor_name:$("#noteContributorName").value.trim(),instagram_handle:instagramHandle,file_path:path
    });
    if(error){await sb.storage.from("student-notes").remove([path]);msg("#uploadStatus",error.message,"error");return}
    const selectedLevel=$("#noteLevel").value;event.target.reset();$("#noteLevel").value=selectedLevel;if($("#uploadLevelLabel"))$("#uploadLevelLabel").textContent=selectedLevel;if($("#viewContributionLink"))$("#viewContributionLink").hidden=false;msg("#uploadStatus","Your PDF is now live in Contributions by Students, with your name"+(instagramHandle?" and Instagram handle":"")+" credited.");
  }

  async function initDashboard() {
    const {data:{user}}=await sb.auth.getUser();
    if(!user){msg("#dashboardStatus","Sign in to see your dashboard.");return}
    $("#welcomeHeading").textContent="Welcome, "+(user.user_metadata?.full_name||user.email||"student")+".";
    const {data:profile}=await sb.from("profiles").select("*").eq("user_id",user.id).maybeSingle();
    if(profile){$("#profileName").value=profile.full_name||"";$("#profileLevel").value=profile.ca_level||"Foundation"}
    const {data:role}=await sb.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
    if(role)$("#adminLink").hidden=false;
    $("#membershipStatus").textContent="Free CA Junction account · all services are free during launch.";
    const [downloads,attempts,plans,evals,purchases]=await Promise.all([
      sb.from("material_downloads").select("downloaded_at,materials(title,level)").eq("user_id",user.id).order("downloaded_at",{ascending:false}).limit(10),
      sb.from("test_attempts").select("score,total_questions,submitted_at,study_tests(title)").eq("user_id",user.id).order("submitted_at",{ascending:false}).limit(10),
      sb.from("study_plans").select("title,due_on,planned_minutes,is_complete").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
      sb.from("evaluation_submissions").select("status,score,feedback,created_at,study_tests(title)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
      sb.from("payment_orders").select("id,amount_inr,status,created_at,products(title)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10)
    ]);
    const renderList=(selector,rows,fn,empty)=>{const el=$(selector);if(!el)return;el.replaceChildren();if(!rows?.length){emptyRow(el,empty);return}rows.forEach(row=>addRow(el,fn(row),row.submitted_at||row.downloaded_at||row.created_at||""))};
    renderList("#myMaterials",downloads.data,r=>r.materials?.title+" · "+r.materials?.level,"No downloads yet.");
    renderList("#myProgress",attempts.data,r=>(r.study_tests?.title||"Test")+" · "+r.score+"/"+r.total_questions,"No completed tests yet.");
    renderList("#myTests",evals.data,r=>(r.study_tests?.title||"Written test")+" · "+r.status+(r.score!==null?" · "+r.score:""),"No evaluated submissions yet.");
    renderList("#myPurchases",purchases.data,r=>(r.products?.title||"Purchase")+" · "+r.status.replace(/_/g," ")+" · "+window.caFormatINR(r.amount_inr),"No purchases yet. All CA Junction services are free during launch.");
    renderList("#myPlanner",plans.data,r=>r.title+" · "+r.planned_minutes+" min"+(r.is_complete?" · complete":""),"No saved study targets.");
    const dashboardGroup=$("#dashboardGroupLink");
    if(dashboardGroup){const {data:group}=await sb.from("premium_resources").select("resource_url").eq("resource_key","whatsapp_study_group").eq("is_active",true).maybeSingle();if(group){dashboardGroup.href=group.resource_url;dashboardGroup.hidden=false;msg("#dashboardGroupStatus","Your premium group invite is available.");}}
    $("#profileForm")?.addEventListener("submit",async e=>{e.preventDefault();const {error}=await sb.from("profiles").update({full_name:$("#profileName").value.trim(),ca_level:$("#profileLevel").value,updated_at:new Date().toISOString()}).eq("user_id",user.id);msg("#profileStatus",error?error.message:"Profile saved.",error?"error":"success")});
    $("#signOutButton")?.addEventListener("click",async()=>{await sb.auth.signOut();location.href="account.html"});
  }

  function initStudy() {
    const levelFilter=$("#levelFilter");
    const subjectFilter=$("#subjectFilter");
    const chapterFilter=$("#chapterFilter");
    const studentGrid=$("#studentNotesGrid");
    const adminGrid=$("#adminResourcesGrid");
    const savedLevel=new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"";
    if(levelFilter&&["Foundation","Intermediate","Final"].includes(savedLevel))levelFilter.value=savedLevel;
    const activeLevel=()=>levelFilter?levelFilter.value:savedLevel;
    const levelLabel=$("#selectedLevelLabel");
    if(levelLabel) levelLabel.textContent=studentGrid?(activeLevel()?"Showing "+activeLevel()+" student PDFs.":"Showing student PDFs across all levels."):(activeLevel()?"Showing "+activeLevel()+" resources.":"Choose your CA level on the homepage.");
    if(!activeLevel()&&!levelFilter){
      if(studentGrid){const empty=document.createElement("div");empty.className="empty";empty.textContent="Student contributions are on their way! No PDFs have been shared yet. Be the first to help another CA student.";studentGrid.replaceChildren(empty)}
      if(adminGrid){const empty=document.createElement("div");empty.className="empty";empty.textContent="Choose your CA level on the homepage to view matching resources.";adminGrid.replaceChildren(empty)}
      return;
    }
    if(!ready()){msg("#materialStatus",backendMessage);msg("#adminResourcesStatus",backendMessage);return}
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
        if(row.category!=="student_note"&&row.is_premium){const access=document.createElement("small");access.className="resource-access premium";access.textContent="Premium";card.append(access)}
        if(row.category==="student_note"){
          const detail=document.createElement("p");detail.textContent=row.description||"";if(detail.textContent)card.append(detail);
        }else{
          const detail=document.createElement("p");detail.textContent=row.description||[row.subject,row.level].filter(Boolean).join(" · ");if(detail.textContent)card.append(detail);
        }
        if(row.category==="student_note"){
          const author=document.createElement("small");author.className="note-author";author.textContent="Shared by "+(row.contributor_name||"CA Junction student");card.append(author);
          if(row.instagram_handle){const handle=row.instagram_handle.replace(/^@/,"");if(/^[A-Za-z0-9._]{1,30}$/.test(handle)){const profile=document.createElement("a");profile.className="link";profile.href="https://www.instagram.com/"+encodeURIComponent(handle)+"/";profile.target="_blank";profile.rel="noopener";profile.textContent="Instagram: @"+handle+" ↗";card.append(profile)}}
        }
        const meta=document.createElement("small");meta.textContent=row.category==="student_note"?[row.level,row.subject&&("Subject: "+row.subject),row.chapter&&("Chapter: "+row.chapter)].filter(Boolean).join(" · "):[row.level,row.subject].filter(Boolean).join(" · ");if(meta.textContent)card.append(meta);
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
    const fillFilters=()=>{
      if(!subjectFilter||!chapterFilter)return;
      const currentSubject=subjectFilter.value;
      const subjects=[...new Set(all.filter(row=>row.category==="student_note"&&matchesLevel(row)).map(row=>row.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      subjectFilter.replaceChildren(new Option("All subjects",""),...subjects.map(value=>new Option(value,value)));
      if(subjects.includes(currentSubject))subjectFilter.value=currentSubject;
      const currentChapter=chapterFilter.value;
      const chapters=[...new Set(all.filter(row=>row.category==="student_note"&&matchesLevel(row)&&(!subjectFilter.value||row.subject===subjectFilter.value)).map(row=>row.chapter).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      chapterFilter.replaceChildren(new Option("All chapters",""),...chapters.map(value=>new Option(value,value)));
      if(chapters.includes(currentChapter))chapterFilter.value=currentChapter;
      chapterFilter.disabled=chapters.length===0;
    };
    const render=()=>{
      fillFilters();
      const students=all.filter(row=>row.category==="student_note"&&matchesLevel(row)&&(!subjectFilter?.value||row.subject===subjectFilter.value)&&(!chapterFilter?.value||row.chapter===chapterFilter.value));
      const admin=all.filter(row=>["revision","mind_map","formula"].includes(row.category)&&matchesLevel(row));
      if(levelLabel)levelLabel.textContent=studentGrid?(activeLevel()?"Showing "+activeLevel()+" student PDFs.":"Showing student PDFs across all levels."):(activeLevel()?"Showing "+activeLevel()+" resources.":"Choose your CA level on the homepage.");
      const count=$("#studentPdfCount");if(count)count.textContent=students.length+" PDF"+(students.length===1?"":"s")+" available";
      draw(studentGrid,students,activeLevel()?"Student contributions are on their way! No PDFs have been shared for this level yet. Be the first to help another CA student.":"Student contributions are on their way! No PDFs have been shared yet. Be the first to help another CA student.","#materialStatus");
      draw(adminGrid,admin,"No summary charts or mind maps have been uploaded for this level yet.","#adminResourcesStatus");
    };
    levelFilter?.addEventListener("change",()=>{if(subjectFilter)subjectFilter.value="";if(chapterFilter)chapterFilter.value="";render()});
    subjectFilter?.addEventListener("change",()=>{if(chapterFilter)chapterFilter.value="";render()});
    chapterFilter?.addEventListener("change",render);
    sb.from("materials").select("id,title,description,level,subject,chapter,category,file_bucket,file_path,external_url,created_at,submitted_by,contributor_name,instagram_handle,student_submission_id,is_premium").eq("is_published",true).order("created_at",{ascending:false}).then(async({data,error})=>{
      if(error){msg("#materialStatus",error.message,"error");msg("#adminResourcesStatus",error.message,"error");return}
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
    if(["Foundation","Intermediate","Final"].includes(preferred))level.value=preferred;
    const session=$("#aiPracticeSession"),box=$("#aiPracticeQuestion"),caseStudy=$("#aiPracticeCaseStudy"),start=$("#aiPracticeStart"),feedback=$("#aiPracticeFeedback"),next=$("#aiPracticeNext"),check=$("#aiPracticeCheck");
    let questions=[],index=0,score=0,answered=false,preparationTimer=null,preparationStarted=0;
    const stopPreparationTimer=()=>{if(preparationTimer)clearInterval(preparationTimer);preparationTimer=null;$("#aiPracticeTimer").hidden=true};
    const updatePreparationTimer=()=>{const elapsed=Math.floor((Date.now()-preparationStarted)/1000),minutes=String(Math.floor(elapsed/60)).padStart(2,"0"),seconds=String(elapsed%60).padStart(2,"0");$("#aiPracticeTimer").textContent="Preparing questions · "+minutes+":"+seconds};
    const showQuestion=()=>{
      const q=questions[index];if(!q)return;answered=false;feedback.hidden=true;next.hidden=true;check.hidden=false;box.replaceChildren();
      const legend=document.createElement("legend");legend.textContent=(index+1)+". "+q.question;legend.style.fontWeight="700";box.append(legend);
      q.options.forEach((option,i)=>{const label=document.createElement("label");label.className="answer";const radio=document.createElement("input");radio.type="radio";radio.name="aiPracticeAnswer";radio.value=String(i);const span=document.createElement("span");span.textContent=option;label.append(radio,span);box.append(label)});
      $("#aiPracticeProgress").textContent="Question "+(index+1)+" of "+questions.length;$("#aiPracticeScore").textContent="Your score: "+score+" / "+questions.length;
    };
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(!ready()){msg("#aiPracticeStatus","Please sign in to start AI practice.","error");return}
      const chapters=$("#aiPracticeChapters").value.split(",").map(v=>v.trim()).filter(Boolean);
      if(chapters.length>8){msg("#aiPracticeStatus","Enter no more than 8 chapters.","error");return}
      if(!chapters.length){msg("#aiPracticeStatus","Enter at least one chapter name.","error");return}
      start.disabled=true;session.hidden=true;caseStudy.hidden=true;msg("#aiPracticeStatus","Preparing your questions…");preparationStarted=Date.now();updatePreparationTimer();$("#aiPracticeTimer").hidden=false;preparationTimer=setInterval(updatePreparationTimer,1000);
      try{
        const {data:{session:authSession},error:authError}=await sb.auth.getSession();
        if(authError||!authSession?.access_token){msg("#aiPracticeStatus","Please sign in to start AI practice.","error");return}
        const response=await fetch("/api/ai-mcq",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+authSession.access_token},body:JSON.stringify({level:level.value,subject:$("#aiPracticeSubject").value.trim(),chapters,mix:$("#aiPracticeMode").value,format:$("#aiPracticeFormat").value})});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||"Could not start practice. Please try again.");
        questions=result.questions;index=0;score=0;caseStudy.textContent=result.case_study||"";caseStudy.hidden=!result.case_study;session.hidden=false;showQuestion();msg("#aiPracticeStatus","Your practice set is ready.");session.scrollIntoView({behavior:"smooth",block:"center"});
      }catch(error){msg("#aiPracticeStatus",error?.message||"Could not start practice. Please try again.","error")}
      finally{stopPreparationTimer();start.disabled=false}
    });
    check.addEventListener("click",()=>{
      if(answered)return;const selected=$('input[name="aiPracticeAnswer"]:checked',box);
      if(!selected){msg("#aiPracticeStatus","Choose an answer first.","error");return}
      answered=true;const q=questions[index],correct=Number(selected.value)===q.correct_index;if(correct)score++;
      feedback.textContent=(correct?"Correct. ":"Not quite. The right answer is "+q.options[q.correct_index]+". ")+q.explanation;feedback.hidden=false;check.hidden=true;next.hidden=false;next.textContent=index===questions.length-1?"Finish practice":"Next question";$("#aiPracticeScore").textContent="Your score: "+score+" / "+questions.length;msg("#aiPracticeStatus",correct?"Well done!":"Keep going—you’re learning with every question.",correct?"success":"info");
    });
    next.addEventListener("click",()=>{if(index>=questions.length-1){session.hidden=true;msg("#aiPracticeStatus","Practice complete: "+score+" out of "+questions.length+". Choose another chapter or start a fresh set.","success");return}index++;showQuestion()});
  }

  function initTests(){
    initAiMcqPractice();
  }

  function initPlanner(){
    const date=$("#examDate");
    $("#countdownButton")?.addEventListener("click",()=>{
      if(!date.value){msg("#countdownResult","Choose a date first.","error");return}
      const target=new Date(date.value+"T00:00:00"),today=new Date();today.setHours(0,0,0,0);
      const days=Math.ceil((target-today)/86400000);
      msg("#countdownResult",days>0?days+" days until your selected exam date.":days===0?"Your selected date is today.":"That date has passed.");
    });
    let started=null,timer=null;
    const display=$("#focusTimer");
    const draw=()=>{if(!started||!display)return;const s=Math.floor((Date.now()-started)/1000),h=String(Math.floor(s/3600)).padStart(2,"0"),m=String(Math.floor(s%3600/60)).padStart(2,"0"),x=String(s%60).padStart(2,"0");display.textContent=h+":"+m+":"+x};
    $("#timerStart")?.addEventListener("click",async()=>{
      if(!started){started=Date.now();$("#timerStart").textContent="Stop and save";timer=setInterval(draw,1000);msg("#timerStatus","Session running.");return}
      const seconds=Math.max(1,Math.floor((Date.now()-started)/1000));clearInterval(timer);timer=null;started=null;$("#timerStart").textContent="Start session";draw();
      if(ready()){const {data:{user}}=await sb.auth.getUser();if(user){await sb.from("study_sessions").insert({user_id:user.id,duration_seconds:seconds});await loadTodayHours(user.id)}else addLocalStudySeconds(seconds)}else addLocalStudySeconds(seconds);
      msg("#timerStatus","Session saved to your study-hours total.");
    });
    $("#timerReset")?.addEventListener("click",()=>{if(timer)clearInterval(timer);timer=null;started=null;display.textContent="00:00:00";$("#timerStart").textContent="Start session";msg("#timerStatus","Timer reset.")});
    function addLocalStudySeconds(seconds){const key="caJunctionLocalStudySeconds";localStorage.setItem(key,String(Number(localStorage.getItem(key)||0)+seconds));loadTodayHours()}
    async function loadTodayHours(userId){
      const label=$("#todayHours");if(!label)return;
      if(ready()&&userId){const start=new Date();start.setHours(0,0,0,0);const {data}=await sb.from("study_sessions").select("duration_seconds").eq("user_id",userId).gte("started_at",start.toISOString());const total=(data||[]).reduce((sum,row)=>sum+row.duration_seconds,0);label.textContent=Math.round(total/60)+" minutes";return}
      label.textContent=Math.round(Number(localStorage.getItem("caJunctionLocalStudySeconds")||0)/60)+" minutes";
    }
    if(ready())sb.auth.getUser().then(({data})=>loadTodayHours(data.user?.id));else loadTodayHours();
    const builder=$("#plannerBuilderForm");
    if(builder){
      const level=$("#plannerLevel"),countInput=$("#plannerSubjectCount"),choices=$("#plannerSubjectOptions"),subjectsStatus=$("#plannerSubjectsStatus"),daysInput=$("#plannerDays"),results=$("#plannerBuilderResults"),createButton=$("#plannerCreateButton");
      const preferred=new URLSearchParams(location.search).get("level")||localStorage.getItem("caJunctionLevel")||"";
      if(["Foundation","Intermediate","Final"].includes(preferred))level.value=preferred;
      let availableSubjects=[],loadingSubjects=false;
      let savedPlan=null;
      try{savedPlan=JSON.parse(localStorage.getItem("caJunctionCustomPlan")||"null")}catch{}
      const selectedSubjects=()=>[...choices.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
      const updateSelection=()=>{
        const selected=selectedSubjects(),target=Number(countInput.value)||0;
        choices.querySelectorAll('input[type="checkbox"]').forEach(input=>{input.disabled=!input.checked&&selected.length>=target});
        if(!availableSubjects.length)subjectsStatus.textContent=loadingSubjects?"Loading subjects from study materials…":"No published study materials with subject names were found for this level.";
        else subjectsStatus.textContent="Selected "+selected.length+" of "+target+" subjects · "+availableSubjects.length+" subjects available from study materials.";
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
          const detail=document.createElement("small");detail.textContent=item.resources.length+" published study resource"+(item.resources.length===1?"":"s");
          copy.append(name,detail);label.append(input,copy);
          input.addEventListener("change",()=>{const count=Number(countInput.value)||0;if(input.checked&&selectedSubjects().length>count)input.checked=false;updateSelection()});
          choices.append(label);
        });
        updateSelection();
      };
      const loadMaterialSubjects=async(restore=[])=>{
        choices.replaceChildren();availableSubjects=[];loadingSubjects=true;countInput.disabled=true;createButton.disabled=true;subjectsStatus.textContent="Loading subjects from study materials…";results.replaceChildren();
        if(!level.value){loadingSubjects=false;subjectsStatus.textContent="Choose a CA level to load available subjects.";updateSelection();return}
        if(!ready()){loadingSubjects=false;subjectsStatus.textContent=backendMessage;updateSelection();return}
        const {data,error}=await sb.from("materials").select("subject,title,chapter,description,category,level").eq("is_published",true).in("level",[level.value,"All"]).not("subject","is",null).order("created_at",{ascending:false}).limit(500);
        loadingSubjects=false;
        if(error){subjectsStatus.textContent="Could not load published subjects from Study Materials. Please try again.";countInput.disabled=true;createButton.disabled=true;return}
        const grouped=new Map();
        (data||[]).forEach(row=>{
          const subject=String(row.subject||"").trim();if(!subject)return;
          const key=subject.toLowerCase();
          if(!grouped.has(key))grouped.set(key,{subject,resources:[]});
          grouped.get(key).resources.push({title:row.title||"",chapter:row.chapter||"",description:row.description||"",category:row.category||""});
        });
        availableSubjects=[...grouped.values()].slice(0,12);
        if(!availableSubjects.length){subjectsStatus.textContent="No published study materials with subject names were found for "+level.value+" yet.";countInput.disabled=true;countInput.max="12";createButton.disabled=true;return}
        countInput.disabled=false;countInput.max=String(Math.min(12,availableSubjects.length));
        const restored=restore.filter(name=>availableSubjects.some(item=>item.subject.toLowerCase()===String(name).toLowerCase()));
        const target=restored.length||Math.min(3,availableSubjects.length);
        countInput.value=String(target);
        renderSubjectChoices(restored);
      };
      const renderSchedule=schedule=>{
        results.replaceChildren();
        schedule.forEach(item=>{
          const card=document.createElement("article");card.className="plan-day";
          const title=document.createElement("strong");title.textContent="Day "+item.day+" · "+item.subject;
          const topic=document.createElement("small");topic.className="resource-focus";topic.textContent=item.topic?"Study material · "+item.topic:"";
          const activity=document.createElement("p");activity.textContent=item.activity||"Study concepts, solve questions, and revise.";
          const minutes=Number(item.study_minutes||150),time=document.createElement("small");time.textContent="Suggested study time · "+(Math.round(minutes/6)/10)+" hours";
          card.append(title);if(item.topic)card.append(topic);card.append(activity,time);results.append(card);
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
        if(subjects.length!==subjectCount){msg("#plannerBuilderStatus","Select exactly "+subjectCount+" subjects from the study materials above.","error");return}
        if(!Number.isInteger(days)||days<1||days>180){msg("#plannerBuilderStatus","Choose a duration from 1 to 180 days.","error");return}
        if(!ready()){msg("#plannerBuilderStatus",backendMessage,"error");return}
        createButton.disabled=true;createButton.textContent="Creating your AI plan…";results.replaceChildren();msg("#plannerBuilderStatus","AI is arranging a study and revision schedule using your selected study materials…");
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
    $("#consultForm")?.addEventListener("submit",async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();if(!user){msg("#consultStatus","Sign in to request a consultation.","error");location.href="account.html";return}const {error}=await sb.from("service_requests").insert({user_id:user.id,service_type:"study_consultation",message:$("#consultMessage").value.trim()});if(error){msg("#consultStatus",error.message,"error");return}e.target.reset();msg("#consultStatus","Request sent. CA Junction will contact you to confirm a time.")});
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
    const fields=["resumeName","resumeEmail","resumeLevel","resumeSummary","resumeSkills"];
    function refreshResume(){
      $("#previewName").textContent=$("#resumeName").value.trim()||"Your name";
      $("#previewContact").textContent=[$("#resumeEmail").value.trim(),$("#resumeLevel").value.trim()].filter(Boolean).join(" · ")||"Email · CA level";
      $("#previewSummary").textContent=$("#resumeSummary").value.trim()||"Your summary will appear here.";
      $("#previewSkills").textContent=$("#resumeSkills").value.trim()||"Your skills will appear here.";
    }
    fields.forEach(id=>$("#"+id)?.addEventListener("input",refreshResume));
    $("#printResume")?.addEventListener("click",()=>window.print());
    if(!ready()){msg("#jobsStatus",backendMessage);msg("#careerStatus",backendMessage);return}
    const loadJobs=async()=>{
      const {data,error}=await sb.from("jobs").select("id,title,organization,location,job_type,description,application_url,closes_at").eq("is_published",true).order("created_at",{ascending:false});
      const grid=$("#jobsGrid");if(!grid)return;grid.replaceChildren();
      if(error||!data?.length){const e=document.createElement("div");e.className="listing";e.textContent=error?"Sign in to view free job listings.":"No live opportunities are published at the moment.";grid.append(e);return}
      data.forEach(job=>{const card=document.createElement("article");card.className="card";const tag=document.createElement("span");tag.className="tag";tag.textContent=job.job_type+" · Free";const h=document.createElement("h3");h.textContent=job.title;const p=document.createElement("p");p.textContent=[job.organization,job.location].filter(Boolean).join(" · ");const d=document.createElement("p");d.textContent=job.description;card.append(tag,h,p,d);if(job.application_url){const a=document.createElement("a");a.className="btn";a.href=job.application_url;a.target="_blank";a.rel="noopener";a.textContent="Application details ↗";card.append(a)}grid.append(card)});
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
    $("#virtualLibraryForm")?.addEventListener("submit",e=>saveManagedLink(e,"virtual_library","Virtual Library study room","#virtualLibraryUrl","#virtualLibraryStatus"));
    $("#doubtSolvingForm")?.addEventListener("submit",e=>saveManagedLink(e,"doubt_solving","Doubt-solving group","#doubtSolvingUrl","#doubtSolvingStatus"));
    await Promise.all([loadAdminResources(),loadAdminMtpPapers(),loadAdminMindMaps(),loadNoteSubmissions(),loadPendingPayments(),loadAdminProducts(),loadServiceRequests(),loadEvaluationQueue(),loadProductTargets(),loadAdminTests(),loadAdminJobs(),loadAdminCourses(),loadAdminStudents(),loadManagedLinks()]);
    async function saveMaterial(e){
      e.preventDefault();msg("#resourceStatus","Saving resource…");const {data:{user}}=await sb.auth.getUser();let path=null,bucket=null;const file=$("#resourcePdf").files[0];
      if(file){if(file.type!=="application/pdf"||file.size>50*1024*1024){msg("#resourceStatus","Choose a PDF no larger than 50 MB.","error");return}bucket="ca-materials";path="admin/"+crypto.randomUUID()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:"application/pdf"});if(error){msg("#resourceStatus",error.message,"error");return}}
      const url=$("#resourceExternal").value.trim()||null;if(!path&&!url){msg("#resourceStatus","Upload a PDF or provide an external URL.","error");return}
      const {error}=await sb.from("materials").insert({title:$("#resourceTitle").value.trim(),description:$("#resourceDescription").value.trim(),level:$("#resourceLevel").value,subject:$("#resourceSubject").value.trim(),category:$("#resourceCategory").value,file_bucket:bucket,file_path:path,external_url:url,is_premium:false,is_published:$("#resourcePublished").checked,created_by:user.id});
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
      const {data}=await sb.from("materials").select("id,title,level,category,is_premium,is_published").neq("category","icai_link").order("created_at",{ascending:false}).limit(100);
      const list=$("#adminResources");if(!list)return;list.replaceChildren();if(!data?.length){emptyRow(list,"No resources yet.");return}
      data.forEach(row=>{const item=document.createElement("div");item.className="data-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=row.title;const p=document.createElement("p");p.textContent=row.level+" · "+row.category+" · "+(row.is_premium?"Premium":"Free")+" · "+(row.is_published?"Published":"Draft");info.append(h,p);const button=document.createElement("button");button.className="btn";button.textContent=row.is_published?"Unpublish":"Publish";button.addEventListener("click",async()=>{const {error}=await sb.from("materials").update({is_published:!row.is_published}).eq("id",row.id);msg("#resourceStatus",error?error.message:"Resource status updated.",error?"error":"success");loadAdminResources()});item.append(info,button);list.append(item)});
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
      e.preventDefault();const {data:{user}}=await sb.auth.getUser();const {error}=await sb.from("jobs").insert({title:$("#jobTitle").value.trim(),organization:$("#jobOrg").value.trim(),location:$("#jobLocation").value.trim(),job_type:$("#jobType").value,description:$("#jobDescription").value.trim(),application_url:$("#jobUrl").value.trim()||null,contact_email:$("#jobEmail").value.trim()||null,is_premium:false,is_published:$("#jobPublished").checked,created_by:user.id});
      if(error){msg("#jobAdminStatus",error.message,"error");return}e.target.reset();msg("#jobAdminStatus","Opportunity saved.");
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
      const {data,error}=await sb.from("premium_resources").select("resource_key,resource_url").in("resource_key",["virtual_library","doubt_solving"]);
      if(error)return;(data||[]).forEach(row=>{if(row.resource_key==="virtual_library"&&$("#virtualLibraryUrl"))$("#virtualLibraryUrl").value=row.resource_url;if(row.resource_key==="doubt_solving"&&$("#doubtSolvingUrl"))$("#doubtSolvingUrl").value=row.resource_url});
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