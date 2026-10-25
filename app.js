/* FoxChat V8 — mobile-first polished local-first client */
const LS={account:"foxchat_account_v4",conversations:"conversations",messages:"messages",quick:"quick_emojis",profile:"profile",contacts:"contacts",prefs:"prefs"};
const LEGACY={account:"foxchat_account_v1",conversations:"foxchat_conversations_v1",messages:"foxchat_messages_v1",quick:"foxchat_quick_emojis_v1",profile:"foxchat_profile_v1",contacts:"foxchat_contacts_v1"};
const defaultQuick=["❤️","😂","👍","🔥"];
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function safeJSON(raw,f){try{return raw==null?f:JSON.parse(raw)}catch{return f}}
function migrate(){if(localStorage.getItem(LS.account))return;const a=safeJSON(localStorage.getItem(LEGACY.account),null);if(!a?.account_id)return;localStorage.setItem(LS.account,JSON.stringify({account_id:a.account_id,account_name:a.account_name,created_at:a.created_at||null}));for(const k of ["conversations","messages","quick","profile","contacts"]){const v=localStorage.getItem(LEGACY[k]);if(v!==null)localStorage.setItem(`${k}_${a.account_id}`,v)}}
migrate();
const state={account:safeJSON(localStorage.getItem(LS.account),null),conversations:[],messages:[],quick:[...defaultQuick],profile:{nickname:"",avatar:""},contacts:{},prefs:{sound:true,motion:false},active:null,search:"",messageSearch:"",typing:false};
function key(k){return `${k}_${state.account?.account_id||"guest"}`}
function load(){if(!state.account){state.conversations=[];state.messages=[];state.quick=[...defaultQuick];state.profile={nickname:"",avatar:""};state.contacts={};state.prefs={sound:true,motion:false};state.active=null;return}state.conversations=safeJSON(localStorage.getItem(key(LS.conversations)),[]);state.messages=safeJSON(localStorage.getItem(key(LS.messages)),[]);state.quick=safeJSON(localStorage.getItem(key(LS.quick)),[...defaultQuick]);state.profile=safeJSON(localStorage.getItem(key(LS.profile)),{nickname:"",avatar:""});state.contacts=safeJSON(localStorage.getItem(key(LS.contacts)),{});state.prefs={sound:true,motion:false,...safeJSON(localStorage.getItem(key(LS.prefs)),{})};document.body.classList.toggle("reduced",state.prefs.motion)}
function save(){if(!state.account)return;for(const [k,v] of [[LS.conversations,state.conversations],[LS.messages,state.messages],[LS.quick,state.quick],[LS.profile,state.profile],[LS.contacts,state.contacts],[LS.prefs,state.prefs]])localStorage.setItem(key(k),JSON.stringify(v));localStorage.setItem(LS.account,JSON.stringify(state.account))}
function toast(t){const e=$("#toast");if(!e)return;e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2400)}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function initials(n=""){return n.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"🦊"}
function displayName(id,fallback=""){if(id===state.account?.account_id)return state.profile.nickname||state.account.account_name;return state.contacts[id]?.nickname||fallback||id}
function avatarFor(id){return id===state.account?.account_id?state.profile.avatar||"":state.contacts[id]?.avatar||""}
function avatar(id,name,cls="avatar"){const src=avatarFor(id);return src?`<button class="${cls}" data-pfp="${esc(id)}"><img src="${src}" alt=""></button>`:`<button class="${cls} avatar-fallback" data-pfp="${esc(id)}">${esc(initials(displayName(id,name)))}</button>`}
function playClick(kind="click"){if(!state.prefs.sound)return;try{if(navigator.vibrate)navigator.vibrate(kind==="send"?8:5);const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;playClick.ctx??=new AC();const c=playClick.ctx,o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=kind==="send"?620:420;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.025,c.currentTime+.005);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.045);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.05)}catch{}}
function renderSidebar(){const list=$("#conversationList");if(!list)return;let arr=state.conversations.filter(c=>displayName(c.id,c.name).toLowerCase().includes(state.search.toLowerCase()));arr.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(b.updated||0)-(a.updated||0));if(!arr.length){list.innerHTML=`<div class="sidebar-empty">${state.search?"No matching chats.":"No conversations yet."}</div>`;return}list.innerHTML=arr.map(c=>{const n=displayName(c.id,c.name),ms=state.messages.filter(m=>m.peerId===c.id),last=ms.at(-1),unread=c.unread||0;return `<button class="conversation ${state.active===c.id?"active":""} ${c.pinned?"pinned":""}" data-chat="${esc(c.id)}">${avatar(c.id,n,"avatar small")}<span class="conversation-copy"><strong>${c.pinned?"📌 ":""}${esc(n)}</strong><span>${esc(last?.image?"📷 Image":last?.text||"Start chatting")}</span></span>${unread?`<span class="unread-dot"></span>`:""}</button>`}).join("")}
function renderQuick(){const r=$("#quickRow");if(r)r.innerHTML=state.quick.map(x=>`<button class="quick-emoji" data-quick="${esc(x)}">${esc(x)}</button>`).join("")}
function formatTime(ts){return new Date(ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
function renderChat(){const empty=$("#emptyState"),chat=$("#chatView");if(!state.active){empty.classList.remove("hidden");chat.classList.add("hidden");$("#chatAvatar").innerHTML="";$("#chatName").textContent="FoxChat";$("#chatStatus").textContent="Your account. Your conversations.";return}empty.classList.add("hidden");chat.classList.remove("hidden");const c=state.conversations.find(x=>x.id===state.active),name=displayName(state.active,c?.name);$("#chatName").textContent=name;$("#chatStatus").textContent=c?.muted?"Muted locally":"Online via relay";$("#chatAvatar").innerHTML=avatar(state.active,name,"avatar");let ms=state.messages.filter(m=>m.peerId===state.active);if(state.messageSearch)ms=ms.filter(m=>(m.text||"").toLowerCase().includes(state.messageSearch.toLowerCase()));const body=$("#messageList");body.innerHTML=ms.map((m,i)=>{const reaction=m.reaction?`<span class="reaction">${esc(m.reaction)}</span>`:"";return `<div class="bubble-row ${m.mine?"mine":"theirs"}" data-mid="${esc(m.id)}"><div class="bubble-wrap"><div class="bubble">${m.image?`<img class="message-image" src="${m.image}" alt="Image" loading="lazy" data-image="${m.image}">`:esc(m.text||"")}</div>${reaction}<div class="bubble-time">${formatTime(m.ts)}${m.mine?" · sent":""}</div><div class="message-actions"><button class="tiny-action" data-react="❤️">♥</button><button class="tiny-action" data-copy="${esc(m.text||"")}">Copy</button><button class="tiny-action" data-delete="${esc(m.id)}">Delete</button></div></div></div>`}).join("")||`<div class="sidebar-empty" style="text-align:center;margin-top:20vh">No messages yet. Say something 👋</div>`;requestAnimationFrame(()=>body.scrollTop=body.scrollHeight)}
function renderSettings(){if(!state.account)return;$("#settingsAccountName").textContent=state.account.account_name;$$('.quick-edit').forEach((x,i)=>x.value=state.quick[i]||"");$("#soundToggle").classList.toggle("on",state.prefs.sound);$("#motionToggle").classList.toggle("on",state.prefs.motion)}
function renderAll(){renderSidebar();renderQuick();renderChat();updateOwn();if(state.account)renderSettings()}
function updateOwn(){const e=$("#ownProfileButton");if(e&&state.account)e.innerHTML=`<div class="own-profile-inner">${avatar(state.account.account_id,displayName(state.account.account_id),"avatar")}<span><strong>${esc(displayName(state.account.account_id))}</strong><small>@${esc(state.account.account_name)}</small></span></div>`}
function openModal(id){$(id)?.classList.add("show");playClick()};function closeModal(id){$(id)?.classList.remove("show")}
function openProfile(id){const own=id===state.account?.account_id,c=state.conversations.find(x=>x.id===id),p=own?state.profile:(state.contacts[id]||{});$("#profileModalTitle").textContent=own?"Your profile":"Contact";$("#profileModalName").textContent=displayName(id,c?.name||id);$("#profileNickname").value=p.nickname||"";$("#profileId").value=id;$("#profileAvatarPreview").innerHTML=avatar(id,displayName(id,c?.name||id),"avatar profile-preview");$("#profileFile").value="";openModal("#profileModal")}
function saveProfile(){const id=$("#profileId").value,own=id===state.account.account_id,nick=$("#profileNickname").value.trim(),file=$("#profileFile").files?.[0];const done=a=>{if(own)state.profile={nickname:nick,avatar:a??state.profile.avatar};else state.contacts[id]={nickname:nick,avatar:a??(state.contacts[id]?.avatar||"")};save();closeModal("#profileModal");renderAll();toast("Profile updated 🦊")};if(!file)return done(null);if(file.size>3e6)return toast("Use an image under 3 MB");const r=new FileReader();r.onload=()=>done(r.result);r.readAsDataURL(file)}
function removeProfile(){const id=$("#profileId").value;if(id===state.account.account_id)state.profile.avatar="";else state.contacts[id]={...(state.contacts[id]||{}),avatar:""};save();closeModal("#profileModal");renderAll();toast("Picture removed")}
let sb=null;async function getSB(){if(sb)return sb;const c=window.FOXCHAT_CONFIG||{};if(!window.supabase?.createClient||!c.SUPABASE_URL||!c.SUPABASE_ANON_KEY)return null;sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);return sb}
function rpcAccount(d){if(Array.isArray(d))d=d[0];if(typeof d==="string")return safeJSON(d,null);return d}
async function createAccount(n,p){n=n.trim();if(!n)return toast("Enter an account name");if(p.length<8)return toast("Password must be at least 8 characters");const c=await getSB();if(!c)return toast("Supabase is not configured");try{const r=await c.rpc("create_account",{p_account_name:n,p_password:p});if(r.error)throw r.error;const a=rpcAccount(r.data);if(!a?.account_id)throw Error("No account returned");state.account=a;save();load();closeModal("#authModal");renderAll();toast("Account created 🦊");playClick("send")}catch(e){toast(e.message||"Could not create account")}}
async function loginAccount(n,p){n=n.trim();if(!n||!p)return toast("Enter your account name and password");const c=await getSB();if(!c)return toast("Supabase is not configured");try{const r=await c.rpc("login_account",{p_account_name:n,p_password:p});if(r.error)throw r.error;const a=rpcAccount(r.data);if(!a?.account_id)throw Error("Invalid account name or password");state.account=a;load();closeModal("#authModal");renderAll();toast("Welcome back 🦊");playClick("send")}catch(e){toast(e.message||"Invalid account name or password")}}
function logout(){state.account=null;state.active=null;localStorage.removeItem(LS.account);load();closeModal("#settingsModal");openModal("#authModal");renderAll()}
function addConversation(id,name){if(!state.conversations.some(c=>c.id===id))state.conversations.unshift({id,name,updated:Date.now(),unread:0,pinned:false,muted:false});else state.conversations=state.conversations.map(c=>c.id===id?{...c,name:name||c.name,updated:Date.now(),unread:0}:c);save()}
async function newChat(){const raw=$("#newChatInput").value.trim();if(!raw)return toast("Enter an account name");const c=await getSB();if(!c)return toast("Supabase is not configured");try{const r=await c.rpc("find_account_by_name",{p_name:raw});if(r.error)throw r.error;const a=rpcAccount(r.data);if(!a?.account_id)throw Error("Account not found");if(a.account_id===state.account.account_id)throw Error("You cannot chat with yourself");addConversation(a.account_id,a.account_name);state.active=a.account_id;$("#newChatInput").value="";closeModal("#newChatModal");closeMobile();renderAll()}catch(e){toast(e.message||"Account not found")}}
function addMessage(m){state.messages.push(m);const c=state.conversations.find(x=>x.id===m.peerId);if(c){c.updated=m.ts;if(!m.mine&&!c.muted&&state.active!==m.peerId)c.unread=(c.unread||0)+1}save();renderSidebar();renderChat()}
async function sendText(text){const clean=text.trim();if(!clean||!state.active)return;addMessage({id:crypto.randomUUID(),peerId:state.active,mine:true,text:clean,image:"",ts:Date.now()});playClick("send");const c=await getSB();if(!c)return toast("Saved locally; relay unavailable");try{const r=await c.rpc("enqueue_message",{p_recipient_id:state.active,p_message_type:"text",p_text_content:clean,p_asset_path:null});if(r.error)throw r.error}catch(e){console.warn(e);toast("Saved locally; relay send failed")}}
function fileName(n){return n.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120)}
async function sendImage(file){if(!file||!state.active)return;if(file.size>8e6)return toast("Images must be under 8 MB");const c=await getSB();if(!c)return toast("Supabase is not configured");const path=`${state.account.account_id}/${crypto.randomUUID()}-${fileName(file.name)}`;const reader=new FileReader();reader.onload=async()=>{try{const up=await c.storage.from("message-images").upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const q=await c.rpc("enqueue_message",{p_recipient_id:state.active,p_message_type:"image",p_text_content:null,p_asset_path:path});if(q.error)throw q.error;addMessage({id:crypto.randomUUID(),peerId:state.active,mine:true,text:"",image:reader.result,ts:Date.now()});playClick("send")}catch(e){await c.storage.from("message-images").remove([path]);toast(e.message||"Could not send image")}};reader.readAsDataURL(file)}
async function poll(){const c=await getSB();if(!c||!state.account)return;try{const r=await c.rpc("receive_messages",{p_recipient_id:state.account.account_id});if(r.error)throw r.error;for(const m of r.data||[]){let conv=state.conversations.find(x=>x.id===m.sender_id);if(!conv){const q=await c.rpc("get_account_by_id",{p_account_id:m.sender_id});const a=rpcAccount(q.data);addConversation(m.sender_id,a?.account_name||m.sender_id);conv=state.conversations.find(x=>x.id===m.sender_id)}let img="";if(m.message_type==="image"&&m.asset_path){const s=await c.storage.from("message-images").createSignedUrl(m.asset_path,300);img=s.data?.signedUrl||"";await c.storage.from("message-images").remove([m.asset_path])}addMessage({id:m.message_id,peerId:m.sender_id,mine:false,text:m.text_content||"",image:img,ts:new Date(m.created_at).getTime()});await c.rpc("acknowledge_message",{p_message_id:m.message_id});playClick()} }catch(e){console.warn("poll",e)}}
function setAuth(mode){const create=mode==="create";$("#authLoginTab").classList.toggle("active",!create);$("#authCreateTab").classList.toggle("active",create);$("#loginBtn").classList.toggle("hidden",create);$("#signupBtn").classList.toggle("hidden",!create);$("#authPassword").autocomplete=create?"new-password":"current-password";$("#authPassword").placeholder=create?"At least 8 characters":"Password";playClick()}
function closeMobile(){$("#sidebar")?.classList.remove("open")}
function saveQuick(){const v=$$('.quick-edit').map(x=>x.value.trim());if(v.length!==4||v.some(x=>!x))return toast("Choose 4 quick emojis");state.quick=v;save();renderQuick();renderSettings();toast("Quick emojis saved")}
function renderSearch(){renderSidebar();renderChat()}
function archive(){const c=state.conversations.find(x=>x.id===state.active);if(c)c.archived=true;state.active=null;save();closeModal("#moreModal");renderAll();toast("Conversation archived")}
function deleteChat(){state.messages=state.messages.filter(m=>m.peerId!==state.active);state.conversations=state.conversations.filter(c=>c.id!==state.active);state.active=null;save();closeModal("#moreModal");renderAll();toast("Local conversation deleted")}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>toast("Copied"),()=>toast("Copy unavailable"))}

function wire(){
  const on=(id,fn)=>$("#"+id)?.addEventListener("click",e=>{playClick();fn(e)});

  on("newChatBtn",()=>state.account?openModal("#newChatModal"):toast("Sign in first"));
  on("newChatBtn2",()=>openModal("#newChatModal"));
  on("settingsBtn",()=>{renderSettings();openModal("#settingsModal")});
  on("mobileMenuBtn",()=>$("#sidebar").classList.toggle("open"));
  on("openChatBtn",newChat);
  on("loginBtn",()=>loginAccount($("#authName").value,$("#authPassword").value));
  on("signupBtn",()=>createAccount($("#authName").value,$("#authPassword").value));
  on("authLoginTab",()=>setAuth("login"));
  on("authCreateTab",()=>setAuth("create"));
  on("saveProfile",saveProfile);
  on("removeProfile",removeProfile);
  on("logoutBtn",logout);
  on("saveQuickBtn",saveQuick);
  on("imageButton",()=>$("#imageInput").click());
  on("sendButton",()=>{const t=$("#composer").value;if(t.trim()){$("#composer").value="";sendText(t)}});
  on("chatSearchBtn",()=>{$("#searchBar").classList.remove("hidden");$("#messageSearch").focus()});
  on("closeSearch",()=>{$("#searchBar").classList.add("hidden");state.messageSearch="";renderChat()});
  on("jumpLatest",()=>{$("#messageList").scrollTop=$("#messageList").scrollHeight});
  on("tipsBtn",()=>openModal("#tipsModal"));
  on("chatMoreBtn",()=>{if(!state.active)return;$("#moreTitle").textContent=displayName(state.active);openModal("#moreModal")});
  on("pinChatBtn",()=>{const c=state.conversations.find(x=>x.id===state.active);if(c)c.pinned=!c.pinned;save();closeModal("#moreModal");renderAll()});
  on("muteChatBtn",()=>{const c=state.conversations.find(x=>x.id===state.active);if(c)c.muted=!c.muted;save();closeModal("#moreModal");renderAll()});
  on("archiveChatBtn",archive);
  on("deleteChatBtn",deleteChat);
  on("soundToggle",()=>{state.prefs.sound=!state.prefs.sound;save();renderSettings()});
  on("motionToggle",()=>{state.prefs.motion=!state.prefs.motion;document.body.classList.toggle("reduced",state.prefs.motion);save();renderSettings()});
  on("clearLocalBtn",()=>{if(confirm("Clear all local messages for this account?")){state.messages=[];save();renderAll();toast("Local messages cleared")}});
  on("closeLightbox",()=>$("#imageLightbox").classList.remove("show"));

  // V8 FIX: bind every modal X directly as well as through delegation.
  // This makes the close controls reliable on touch, mouse, and iOS Safari.
  $$(".modal-close").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      const modal=btn.closest(".modal");
      if(modal) closeModal("#"+modal.id);
      playClick();
    });
  });

  // V8 FIX: harden the image lightbox close control too.
  $("#closeLightbox")?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    $("#imageLightbox")?.classList.remove("show");
    playClick();
  });

  $(document).addEventListener("click",e=>{
    const q=e.target.closest("[data-quick]");
    if(q){sendText(q.dataset.quick);return}

    const ch=e.target.closest("[data-chat]");
    if(ch){
      state.active=ch.dataset.chat;
      const c=state.conversations.find(x=>x.id===state.active);
      if(c)c.unread=0;
      save();
      closeMobile();
      renderAll();
      return
    }

    const p=e.target.closest("[data-pfp]");
    if(p){openProfile(p.dataset.pfp);return}

    const cl=e.target.closest("[data-close]");
    if(cl){
      const modal=cl.closest(".modal");
      if(modal)closeModal("#"+modal.id);
      return
    }

    const im=e.target.closest("[data-image]");
    if(im){
      $("#lightboxImage").src=im.dataset.image;
      $("#imageLightbox").classList.add("show");
      return
    }

    const cp=e.target.closest("[data-copy]");
    if(cp){copyText(cp.dataset.copy);return}

    const dl=e.target.closest("[data-delete]");
    if(dl){
      state.messages=state.messages.filter(m=>m.id!==dl.dataset.delete);
      save();
      renderChat();
      return
    }

    const re=e.target.closest("[data-react]");
    if(re){
      const row=e.target.closest("[data-mid]");
      const m=state.messages.find(x=>x.id===row?.dataset.mid);
      if(m){
        m.reaction=m.reaction?"":re.dataset.react;
        save();
        renderChat()
      }
      return
    }

    if(e.target.id==="authModal"||e.target.id==="newChatModal"||e.target.id==="settingsModal"||e.target.id==="profileModal"||e.target.id==="moreModal"||e.target.id==="tipsModal")e.target.classList.remove("show")
  });

  $(document).addEventListener("change",e=>{
    if(e.target.id==="imageInput"){
      const f=e.target.files?.[0];
      if(f)sendImage(f);
      e.target.value=""
    }
  });

  $(document).addEventListener("input",e=>{
    if(e.target.id==="conversationSearch"){
      state.search=e.target.value;
      renderSidebar()
    }

    if(e.target.id==="messageSearch"){
      state.messageSearch=e.target.value;
      renderChat()
    }

    if(e.target.id==="composer"){
      e.target.style.height="auto";
      e.target.style.height=Math.min(e.target.scrollHeight,150)+"px"
    }
  });

  $(document).addEventListener("keydown",e=>{
    if((e.target.id==="authName"||e.target.id==="authPassword")&&e.key==="Enter"){
      e.preventDefault();
      $("#signupBtn").classList.contains("hidden")
        ?loginAccount($("#authName").value,$("#authPassword").value)
        :createAccount($("#authName").value,$("#authPassword").value)
    }

    if(e.target.id==="newChatInput"&&e.key==="Enter"){
      e.preventDefault();
      newChat()
    }

    if(e.target.id==="composer"&&e.key==="Enter"&&!e.shiftKey){
      e.preventDefault();
      const t=e.target.value;
      e.target.value="";
      e.target.style.height="auto";
      if(t.trim())sendText(t)
    }

    if(e.key==="Escape"){
      $$('.modal.show').forEach(m=>m.classList.remove("show"));
      $("#imageLightbox")?.classList.remove("show")
    }
  });
}

function registerSW(){navigator.serviceWorker?.register("./sw.js?v=8").catch(console.warn)}
function boot(){load();wire();setAuth("login");if(state.account)$("#authModal").classList.remove("show");renderAll();registerSW();setInterval(poll,5000);poll()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
