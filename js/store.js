/* ============================================================
   store.js — 저장/불러오기
   - "shared" 모드: Supabase (로그인 필요, 실시간 동기화)
   - "local"  모드: config.js가 비어 있으면 이 기기(localStorage)에만 저장
   저장은 어디서든 save(change, files) 하나만 부르면 된다.
   ============================================================ */

let SB = null;           // Supabase 클라이언트
let mode = "loading";    // shared | local | readonly
let sessionEmail = "";   // 로그인한 이메일 (설정 화면 표시용)

/* ---------- 시작 (app.js의 부팅에서 호출) ---------- */
async function initStore(){
  const cfg = window.COUPLE_CONFIG || {};
  const hasCfg = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf("http")===0 && cfg.SUPABASE_ANON_KEY;
  if(hasCfg && window.supabase){
    SB = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const { data } = await SB.auth.getSession();
    if(data && data.session){ await startShared(); }
    else { showLogin(); }
  } else {
    startLocal("아직 서버 연결 전이라 이 기기에만 저장돼요. (docs/시작하기.md 참고)");
  }
}

function startLocal(msg){
  mode = "local";
  const ls = localStorage.getItem(LS_DATA);
  if(ls){ try{ DATA = JSON.parse(ls); }catch(_){ } }
  else { DATA.events = seedEvents.slice(); }
  guards();
  if(msg) banner(msg);
  renderAll();
}

async function startShared(){
  mode = "shared";
  hideLogin();
  try{
    const { data: s } = await SB.auth.getSession();
    sessionEmail = (s && s.session && s.session.user && s.session.user.email) || "";
  }catch(_){ sessionEmail = ""; }
  const { data: row, error } = await SB.from("couple_state").select("data").eq("id","main").maybeSingle();
  if(error){
    startLocal("서버에 연결하지 못해서 이 기기에만 저장돼요. 인터넷을 확인해 주세요.");
    return;
  }
  if(row && row.data){ DATA = row.data; }
  else {
    DATA.events = seedEvents.slice(); guards();
    await SB.from("couple_state").insert({ id:"main", data: DATA });
  }
  guards();
  banner("");
  renderAll();
  /* 상대가 저장하면 이 화면도 바로 갱신 */
  SB.channel("couple-state")
    .on("postgres_changes", { event:"*", schema:"public", table:"couple_state", filter:"id=eq.main" }, async ()=>{
      const { data: d } = await SB.from("couple_state").select("data").eq("id","main").maybeSingle();
      if(d && d.data){ DATA = d.data; guards(); renderAll(); }
    })
    .subscribe();
}

/* ---------- 저장 ----------
   change: applyChange가 이해하는 {kind,...} (이미 DATA에는 반영된 상태로 호출됨)
   files:  {"photos/x.jpg": Blob | {content,contentType} | null(삭제)} */
async function save(change, files){
  if(mode==="local"){
    try{ localStorage.setItem(LS_DATA, JSON.stringify(DATA)); }
    catch(_){ banner("기기 저장 공간이 가득 찼어요. 오래된 사진 기록을 지워주세요."); }
    renderAll(); return;
  }
  if(mode==="readonly"){ renderAll(); return; }
  try{
    if(files){
      for(const path in files){
        const v = files[path];
        if(v===null){ await SB.storage.from("couple-media").remove([path]); }
        else{
          const blob = (v && v.content!==undefined) ? v.content : v;
          const ct = (v && v.contentType) || (blob && blob.type) || undefined;
          const { error } = await SB.storage.from("couple-media").upload(path, blob, { upsert:true, contentType:ct });
          if(error) throw error;
        }
      }
    }
    /* 서버 최신본을 받아 이번 변경만 얹는다 → 동시에 수정해도 안 덮어씀 */
    const { data: row } = await SB.from("couple_state").select("data").eq("id","main").maybeSingle();
    if(row && row.data && change){
      DATA = row.data; guards(); applyChange(change);
    }
    const { error } = await SB.from("couple_state")
      .update({ data: DATA, updated_at: new Date().toISOString() }).eq("id","main");
    if(error) throw error;
    renderAll();
  }catch(err){
    banner("저장에 실패했어요. 인터넷을 확인하고 다시 시도해 주세요.");
    renderAll();
  }
}

/* ---------- 사진·영상 주소 ---------- */
function mediaUrl(path){
  if(!path) return "";
  if(path.indexOf("data:")===0 || path.indexOf("http")===0) return path; // 로컬 모드/외부 주소
  if(!SB) return "";
  return SB.storage.from("couple-media").getPublicUrl(path).data.publicUrl;
}
function photoSrc(m){ return photoCache[m.id] || mediaUrl(m.photo); }

/* ---------- 로그인 ---------- */
function showLogin(){ $("#login").classList.add("open"); }
function hideLogin(){ $("#login").classList.remove("open"); }
async function loginSubmit(){
  const email = $("#loginEmail").value.trim();
  const pw = $("#loginPw").value;
  const err = $("#loginErr");
  if(!email || !pw){ err.textContent = "이메일과 비밀번호를 입력해 주세요."; return; }
  err.textContent = "";
  $("#loginBtn").disabled = true;
  const { error } = await SB.auth.signInWithPassword({ email, password: pw });
  $("#loginBtn").disabled = false;
  if(error){ err.textContent = "로그인 실패: 이메일·비밀번호를 확인해 주세요."; return; }
  await startShared();
}
async function doLogout(){
  try{ if(SB) await SB.auth.signOut(); }catch(_){ }
  location.reload();
}
