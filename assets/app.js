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
      if (!level || !/^(study|tests|career|planner)\.html/.test(link.getAttribute("href") || "")) return;
      const href = new URL(link.href);
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
    if (!ready()) {
      msg("#authStatus", backendMessage);
      msg("#uploadStatus", backendMessage);
      msg("#paymentStatus", backendMessage);
      msg("#upiSetupStatus", "Add your Supabase project URL, public key and UPI ID before accepting payments.");
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
      location.href="platform.html";
    });
    signUp?.addEventListener("submit",async e=>{
      e.preventDefault();msg("#authStatus","Creating your account…");
      const {data,error}=await sb.auth.signUp({email:$("#signupEmail").value.trim(),password:$("#signupPassword").value,options:{data:{full_name:$("#signupName").value.trim(),ca_level:$("#signupLevel").value}}});
      if(error){msg("#authStatus",error.message,"error");return}
      msg("#authStatus",data.session ? "Account created. Opening your dashboard…" : "Account created. Check your email to confirm, then sign in.");
      if(data.session) location.href="platform.html";
    });
    loadProducts();
    $("#noteUploadForm")?.addEventListener("submit",submitStudentNote);
    $("#submitUpiReference")?.addEventListener("click",submitUpiReference);
  }

  async function loadProducts() {
    const list=$("#productsGrid");if(!list)return;
    const {data,error}=await sb.from("products").select("id,title,description,product_type,price_inr,duration_days").eq("is_active",true).order("price_inr");
    list.replaceChildren();
    if(error || !data?.length){const p=document.createElement("div");p.className="product";p.textContent=error?"Plans are not available right now.":"The admin has not published membership plans yet.";list.append(p);return}
    data.forEach(product=>{
      const card=document.createElement("article");card.className="product";
      const h=document.createElement("h3");h.textContent=product.title;
      const d=document.createElement("p");d.textContent=product.description || product.product_type.replaceAll("_"," ");
      const price=document.createElement("strong");price.textContent=window.caFormatINR(product.price_inr)+(product.duration_days?" · "+product.duration_days+" days":"");
      const button=document.createElement("button");button.className="btn";button.type="button";button.textContent="Choose this service";button.addEventListener("click",()=>createOrder(product));
      card.append(h,d,price,document.createElement("br"),button);list.append(card);
    });
  }

  let activeOrderId=null;
  async function createOrder(product) {
    const {data:{user}}=await sb.auth.getUser();
    if(!user){msg("#paymentStatus","Sign in before choosing a service.","error");location.hash="#authArea";return}
    const {data,error}=await sb.rpc("create_payment_order",{target_product:product.id});
    if(error){msg("#paymentStatus",error.message,"error");return}
    activeOrderId=data;
    $("#upiOrder").hidden=false;
    $("#orderTitle").textContent=product.title;
    $("#orderAmount").textContent="Amount: "+window.caFormatINR(product.price_inr);
    const upiId=String(app.config.UPI_ID||"").trim();
    const payLink=$("#upiPayLink");
    if(upiId){
      const params=new URLSearchParams({pa:upiId,pn:app.config.PAYEE_NAME||"CA Junction",am:Number(product.price_inr).toFixed(2),cu:app.config.CURRENCY||"INR",tn:"CA Junction order "+data});
      payLink.href="upi://pay?"+params.toString();payLink.hidden=false;
      msg("#upiSetupStatus","After paying, enter the UTR/reference from your bank or UPI app. Access stays locked until an admin verifies it.");
    }else{
      payLink.hidden=true;msg("#upiSetupStatus","UPI ID is not configured yet. The order is saved, but payment instructions are unavailable.");
    }
    $("#upiOrder").scrollIntoView({behavior:"smooth",block:"center"});
  }
  async function submitUpiReference() {
    if(!activeOrderId){msg("#paymentStatus","Choose a service first.","error");return}
    const reference=$("#upiReference").value.trim();
    const {error}=await sb.rpc("submit_upi_reference",{target_order:activeOrderId,reference});
    if(error){msg("#paymentStatus",error.message,"error");return}
    msg("#paymentStatus","Reference submitted. Premium access will unlock after an admin matches the payment in the receiving account record.");
  }

  async function submitStudentNote(event) {
    event.preventDefault();
    const {data:{user}}=await sb.auth.getUser();
    if(!user){msg("#uploadStatus","Sign in before uploading your notes.","error");return}
    const file=$("#notePdf").files[0];
    if(!file || file.type!=="application/pdf" || file.size>10*1024*1024){msg("#uploadStatus","Choose a PDF no larger than 10 MB.","error");return}
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=user.id+"/"+crypto.randomUUID()+"_"+safeName;
    msg("#uploadStatus","Uploading your PDF securely…");
    const {error:uploadError}=await sb.storage.from("student-notes").upload(path,file,{contentType:"application/pdf",upsert:false});
    if(uploadError){msg("#uploadStatus",uploadError.message,"error");return}
    const {error}=await sb.from("student_note_submissions").insert({
      user_id:user.id,title:$("#noteTitle").value.trim(),level:$("#noteLevel").value,
      subject:$("#noteSubject").value.trim(),description:$("#noteDescription").value.trim(),file_path:path
    });
    if(error){await sb.storage.from("student-notes").remove([path]);msg("#uploadStatus",error.message,"error");return}
    event.target.reset();msg("#uploadStatus","Submitted for admin review. It will appear in the library only after approval.");
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
    const [downloads,attempts,orders,plans,evals]=await Promise.all([
      sb.from("material_downloads").select("downloaded_at,materials(title,level)").eq("user_id",user.id).order("downloaded_at",{ascending:false}).limit(10),
      sb.from("test_attempts").select("score,total_questions,submitted_at,study_tests(title)").eq("user_id",user.id).order("submitted_at",{ascending:false}).limit(10),
      sb.from("payment_orders").select("amount_inr,status,created_at,products(title)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
      sb.from("study_plans").select("title,due_on,planned_minutes,is_complete").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
      sb.from("evaluation_submissions").select("status,score,feedback,created_at,study_tests(title)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10)
    ]);
    const renderList=(selector,rows,fn,empty)=>{const el=$(selector);if(!el)return;el.replaceChildren();if(!rows?.length){emptyRow(el,empty);return}rows.forEach(row=>addRow(el,fn(row),row.submitted_at||row.downloaded_at||row.created_at||""))};
    renderList("#myMaterials",downloads.data,r=>r.materials?.title+" · "+r.materials?.level,"No downloads yet.");
    renderList("#myProgress",attempts.data,r=>(r.study_tests?.title||"Test")+" · "+r.score+"/"+r.total_questions,"No completed tests yet.");
    renderList("#myTests",evals.data,r=>(r.study_tests?.title||"Written test")+" · "+r.status+(r.score!==null?" · "+r.score:""),"No evaluated submissions yet.");
    renderList("#myPurchases",orders.data,r=>(r.products?.title||"Service")+" · "+window.caFormatINR(r.amount_inr)+" · "+r.status,"No purchases yet.");
    renderList("#myPlanner",plans.data,r=>r.title+" · "+r.planned_minutes+" min"+(r.is_complete?" · complete":""),"No saved study targets.");
    const dashboardGroup=$("#dashboardGroupLink");
    if(dashboardGroup){const {data:group}=await sb.from("premium_resources").select("resource_url").eq("resource_key","whatsapp_study_group").eq("is_active",true).maybeSingle();if(group){dashboardGroup.href=group.resource_url;dashboardGroup.hidden=false;msg("#dashboardGroupStatus","Your premium group invite is available.");}}
    $("#profileForm")?.addEventListener("submit",async e=>{e.preventDefault();const {error}=await sb.from("profiles").update({full_name:$("#profileName").value.trim(),ca_level:$("#profileLevel").value,updated_at:new Date().toISOString()}).eq("user_id",user.id);msg("#profileStatus",error?error.message:"Profile saved.",error?"error":"success")});
    $("#signOutButton")?.addEventListener("click",async()=>{await sb.auth.signOut();location.href="account.html"});
  }

  function initStudy() {
    const search=$("#materialSearch"),level=$("#materialLevel"),category=$("#materialCategory");
    const grid=$("#materialsGrid");let all=[];
    if(!ready()){msg("#materialStatus",backendMessage);return}
    const render=()=>{
      if(!grid)return;grid.replaceChildren();
      const q=(search?.value||"").trim().toLowerCase();
      const selectedLevel=level?.value||"",selectedCategory=category?.value||"";
      const rows=all.filter(m=>(!selectedLevel||m.level===selectedLevel||m.level==="All")&&(!selectedCategory||m.category===selectedCategory)&&(!q||(m.title+" "+m.description+" "+m.subject).toLowerCase().includes(q)));
      if(!rows.length){const e=document.createElement("div");e.className="empty";e.textContent="No published resources match these filters.";grid.append(e);return}
      rows.forEach(m=>{
        const card=document.createElement("article");card.className="card";
        const badge=document.createElement("span");badge.className="badge free";badge.textContent="Free";
        const h=document.createElement("h3");h.textContent=m.title;
        const p=document.createElement("p");p.textContent=m.description||m.subject||m.level;
        const meta=document.createElement("span");meta.className="badge";meta.textContent=m.level+" · "+m.category.replaceAll("_"," ");
        const action=m.external_url?document.createElement("a"):document.createElement("button");
        action.className="link";
        if(m.external_url){action.href=m.external_url;action.target="_blank";action.rel="noopener";action.textContent="Open resource ↗"}
        else{action.type="button";action.textContent="Download PDF";action.addEventListener("click",()=>downloadMaterial(m))}
        card.append(badge,h,p,meta,action);grid.append(card);
      });
    };
    [search,level,category].forEach(el=>el?.addEventListener("input",render));
    [level,category].forEach(el=>el?.addEventListener("change",render));
    const requested=new URLSearchParams(location.search).get("level");
    if(["Foundation","Intermediate","Final"].includes(requested)&&level)level.value=requested;
    sb.from("materials").select("id,title,description,level,subject,category,file_bucket,file_path,external_url,is_premium,created_at").eq("is_published",true).order("created_at",{ascending:false}).then(({data,error})=>{
      if(error){msg("#materialStatus",error.message,"error");return}all=data||[];render();
    });
  }
  async function downloadMaterial(material){
    const {data:{user}}=await sb.auth.getUser();
    if(!user){location.href="account.html?next="+encodeURIComponent("study.html");return}
    msg("#materialStatus","Checking access…");
    const {error:claimError}=await sb.rpc("register_material_download",{target_material:material.id});
    if(claimError){msg("#materialStatus",claimError.message,"error");return}
    const {data,error}=await sb.storage.from(material.file_bucket||"ca-materials").createSignedUrl(material.file_path,90);
    if(error){msg("#materialStatus",error.message,"error");return}
    window.open(data.signedUrl,"_blank","noopener");
    msg("#materialStatus","Your secure download link is ready.");
  }

  function initTests(){
    if(!ready()){msg("#testsStatus",backendMessage);msg("#quizStatus",backendMessage);return}
    let tests=[];let selectedTest=null;
    const grid=$("#testsGrid"),form=$("#quizForm"),questionArea=$("#questionArea");
    const load=async()=>{
      const {data,error}=await sb.from("study_tests").select("id,title,description,level,subject,test_type,part_label,access_tier,duration_minutes").eq("is_published",true).order("created_at",{ascending:false});
      if(error){msg("#testsStatus","Sign in to view available CA Junction tests.");return}
      tests=data||[];grid?.replaceChildren();
      if(grid&&!tests.length){const e=document.createElement("div");e.className="empty";e.textContent="No CA Junction tests have been published yet.";grid.append(e)}
      tests.forEach(test=>{
        const card=document.createElement("article");card.className="card";
        const badge=document.createElement("span");badge.className="badge free";badge.textContent="Free";
        const h=document.createElement("h3");h.textContent=test.title+(test.part_label?" · "+test.part_label:"");
        const p=document.createElement("p");p.textContent=test.description||test.level+" · "+test.subject+" · "+test.duration_minutes+" minutes";
        const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=test.test_type==="evaluated"?"Submit answer script":"Start test";
        button.addEventListener("click",()=>test.test_type==="evaluated"?selectEvaluation(test):startTest(test));
        card.append(badge,h,p,button);grid?.append(card);
      });
      const evaluated=$("#evaluationTest");if(evaluated){evaluated.replaceChildren();const first=document.createElement("option");first.value="";first.textContent="Select a published evaluated test";evaluated.append(first);tests.filter(t=>t.test_type==="evaluated").forEach(t=>{const o=document.createElement("option");o.value=t.id;o.textContent=t.title;evaluated.append(o)})}
    };
    async function startTest(test){
      const {data:{user}}=await sb.auth.getUser();if(!user){msg("#quizStatus","Sign in to take and save a test.","error");location.href="account.html";return}
      selectedTest=test;msg("#quizStatus","Loading questions…");
      const {data,error}=await sb.from("published_test_questions").select("id,test_id,question,options,position").eq("test_id",test.id).order("position");
      if(error||!data?.length){msg("#quizStatus",error?.message||"No questions are available in this test yet.","error");return}
      form.dataset.testId=test.id;form.dataset.questions=JSON.stringify(data);questionArea.replaceChildren();
      data.forEach((q,i)=>{
        const block=document.createElement("fieldset");block.className="question-block";block.style.border="0";block.style.margin="14px 0";
        const legend=document.createElement("legend");legend.textContent=(i+1)+". "+q.question;block.append(legend);
        (q.options||[]).forEach((option,index)=>{const label=document.createElement("label");label.className="answer";const radio=document.createElement("input");radio.type="radio";radio.name="q_"+q.id;radio.value=String(index);const span=document.createElement("span");span.textContent=option;label.append(radio,span);block.append(label)});
        questionArea.append(block);
      });
      form.hidden=false;form.scrollIntoView({behavior:"smooth",block:"center"});msg("#quizStatus",test.title+" · "+data.length+" questions.");
    }
    form?.addEventListener("submit",async event=>{
      event.preventDefault();let questions=[];try{questions=JSON.parse(form.dataset.questions||"[]")}catch{}
      const answers={};
      for(const q of questions){const chosen=$('input[name="q_'+q.id+'"]:checked',form);if(!chosen){msg("#quizStatus","Answer every question before submitting.","error");return}answers[q.id]=Number(chosen.value)}
      msg("#quizStatus","Submitting test…");
      const {data,error}=await sb.rpc("create_mcq_attempt",{target_test:form.dataset.testId,submitted_answers:answers});
      if(error){msg("#quizStatus",error.message,"error");return}
      const result=Array.isArray(data)?data[0]:data;
      msg("#quizStatus","Submitted. Score: "+result.points+" / "+result.question_count+". View your history in My Account.");
      form.hidden=true;
    });
    function selectEvaluation(test){const select=$("#evaluationTest");if(select){select.value=test.id;$("#evaluated")?.scrollIntoView({behavior:"smooth"})}}
    $("#evaluationForm")?.addEventListener("submit",async event=>{
      event.preventDefault();const {data:{user}}=await sb.auth.getUser();if(!user){msg("#evaluationStatus","Sign in to submit an answer script.","error");location.href="account.html";return}
      const testId=$("#evaluationTest").value,file=$("#answerPdf").files[0];if(!testId||!file||file.type!=="application/pdf"||file.size>25*1024*1024){msg("#evaluationStatus","Choose a test and a PDF no larger than 25 MB.","error");return}
      const path=user.id+"/"+crypto.randomUUID()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const {error:up}=await sb.storage.from("test-scripts").upload(path,file,{contentType:"application/pdf"});
      if(up){msg("#evaluationStatus",up.message,"error");return}
      const {error}=await sb.from("evaluation_submissions").insert({user_id:user.id,test_id:testId,file_path:path});
      if(error){await sb.storage.from("test-scripts").remove([path]);msg("#evaluationStatus",error.message,"error");return}
      event.target.reset();msg("#evaluationStatus","Answer script submitted for review.");
    });
    load();
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
    const planList=$("#planList");
    async function loadPlans(){
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
    $("#adminTestForm")?.addEventListener("submit",saveTest);
    $("#adminJobForm")?.addEventListener("submit",saveJob);
    $("#adminProductForm")?.addEventListener("submit",saveProduct);
    $("#adminCourseForm")?.addEventListener("submit",saveCourse);
    $("#groupLinkForm")?.addEventListener("submit",saveGroupLink);
    await Promise.all([loadAdminResources(),loadNoteSubmissions(),loadPendingPayments(),loadAdminProducts(),loadServiceRequests(),loadEvaluationQueue(),loadProductTargets(),loadAdminTests(),loadAdminJobs(),loadAdminCourses(),loadAdminStudents()]);
    async function saveMaterial(e){
      e.preventDefault();msg("#resourceStatus","Saving resource…");const {data:{user}}=await sb.auth.getUser();let path=null,bucket=null;const file=$("#resourcePdf").files[0];
      if(file){if(file.type!=="application/pdf"||file.size>50*1024*1024){msg("#resourceStatus","Choose a PDF no larger than 50 MB.","error");return}bucket="ca-materials";path="admin/"+crypto.randomUUID()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:"application/pdf"});if(error){msg("#resourceStatus",error.message,"error");return}}
      const url=$("#resourceExternal").value.trim()||null;if(!path&&!url){msg("#resourceStatus","Upload a PDF or provide an external URL.","error");return}
      const {error}=await sb.from("materials").insert({title:$("#resourceTitle").value.trim(),description:$("#resourceDescription").value.trim(),level:$("#resourceLevel").value,subject:$("#resourceSubject").value.trim(),category:$("#resourceCategory").value,file_bucket:bucket,file_path:path,external_url:url,is_premium:false,is_published:$("#resourcePublished").checked,created_by:user.id});
      if(error){if(path)await sb.storage.from(bucket).remove([path]);msg("#resourceStatus",error.message,"error");return}e.target.reset();msg("#resourceStatus","Resource saved.");loadAdminResources();
    }
    async function loadAdminResources(){
      const {data}=await sb.from("materials").select("id,title,level,category,is_premium,is_published").order("created_at",{ascending:false}).limit(100);
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
      const {error:insertError}=await sb.from("materials").insert({title:row.title,description:row.description,level:row.level,subject:row.subject,category:"student_note",file_bucket:"ca-materials",file_path:newPath,is_premium:false,is_published:true,submitted_by:row.user_id,created_by:user.id});
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
    async function saveGroupLink(e){
      e.preventDefault();const url=$("#groupUrl").value.trim();
      if(!/^https:\/\/chat\.whatsapp\.com\//i.test(url)){msg("#groupAdminStatus","Enter a valid WhatsApp group invite link.","error");return}
      const {error}=await sb.from("premium_resources").upsert({resource_key:"whatsapp_study_group",label:"Premium WhatsApp study group",resource_url:url,is_active:true,updated_at:new Date().toISOString()},{onConflict:"resource_key"});
      msg("#groupAdminStatus",error?error.message:"Members-only group link saved.",error?"error":"success");
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
    if(page==="account")initAccount();
    if(page==="dashboard")initDashboard();
    if(page==="study")initStudy();
    if(page==="tests")initTests();
    if(page==="planner")initPlanner();
    if(page==="career")initCareer();
    if(page==="admin")initAdmin();
  }
  run();
})();