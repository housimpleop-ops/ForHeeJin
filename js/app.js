/* ============================================================
   app.js — 이벤트 연결 + 탭 이동 + 부팅 (로드 순서 마지막)
   목차: 탭 → 헤더 → 달력 → 지도 → 축제 → 식단 → 쪽지
        → 체크리스트/스킬트리 → 살림 → 여행 → 궁합 → 몸 → 보기
        → 금연 → 재테크 → 약속 → 로그인 → 부팅
   ============================================================ */

/* ---------- 탭 이동 ----------
   하단 6탭: 달력·지도·쪽지·계획(허브)·서랍(허브)·설정
   세부 화면은 허브에서 트리로 들어가고, 탭바에는 부모 허브가 켜진다. */
const ALL_VIEWS = ["cal","map","note","plan","box","set","fest","meal","trip","wed","home","fate","body","show","smoke","invest","us","benefit","run"];
const VIEW_PARENT = {
  cal:"cal", map:"map", note:"note", plan:"plan", box:"box", set:"set",
  trip:"plan", wed:"plan", home:"plan", smoke:"plan", body:"plan", invest:"plan", meal:"plan", show:"plan", run:"plan",
  fate:"box", us:"box", fest:"box", benefit:"box",
};
function goTab(t, fromBack){
  tab = t;
  const parent = VIEW_PARENT[t] || "plan";
  document.querySelectorAll("nav.tabbar button").forEach(x=>x.classList.toggle("on", x.dataset.tab===parent));
  ALL_VIEWS.forEach(v=>{ const el=$("#view-"+v); if(el) el.hidden = v!==t; });
  window.scrollTo(0,0);
  /* 폰 뒤로가기로 이전 화면에 돌아갈 수 있게 방문기록에 남김 */
  if(!fromBack){ try{ history.pushState({tab:t}, ""); }catch(_){ } }
}
/* 뒤로가기: 시트가 열려 있으면 시트만 닫고, 아니면 이전 화면으로 */
window.addEventListener("popstate", e=>{
  if(anySheetOpen()){ closeAllSheets(); return; }
  const st = e.state || {};
  goTab(st.tab || "cal", true);
});
document.querySelector("nav.tabbar").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  goTab(b.dataset.tab);
});
/* 허브 트리에서 항목 선택 (살림 계열은 살림 화면의 해당 보드로) */
function goFromHub(key){
  if(key==="home"||key==="baby"||key==="pet"||key==="fridge"){
    homeBoard = key;
    renderHome();
    goTab("home");
    return;
  }
  goTab(key);
}
$("#planTree").addEventListener("click", e=>{ const b=e.target.closest("[data-go]"); if(b) goFromHub(b.dataset.go); });
$("#boxTree").addEventListener("click", e=>{ const b=e.target.closest("[data-go]"); if(b) goFromHub(b.dataset.go); });

/* ---------- 러닝 스팟 ---------- */
$("#runRegion").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b){ runF.region=b.dataset.g; renderRun(); } });
$("#runDist").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b){ runF.dist=b.dataset.d; renderRun(); } });
$("#runSurf").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b){ runF.surf=b.dataset.s; renderRun(); } });
$("#runWant").addEventListener("click", e=>{
  const b=e.target.closest("button"); if(!b) return;
  const w=b.dataset.w; runF.want[w] = !runF.want[w]; renderRun();
});
$("#runList").addEventListener("click", e=>{
  const card = e.target.closest(".runc"); if(!card) return;
  const p = RUN_SPOTS[+card.dataset.i]; if(!p) return;
  const act = e.target.closest("[data-act]"); if(!act) return;
  if(act.dataset.act==="run-plan"){
    if(mode==="readonly") return;
    const xy = (p.lat!=null && p.lng!=null) ? latLngToSvg(p.lat, p.lng) : {x:null,y:null};
    openSheet("add", { type:"run", sub:"러닝", title:p.n,
      memo:[p.kmTxt||(p.km?p.km+"km":""), p.pkTxt].filter(Boolean).join(" · "),
      lat:p.lat, lng:p.lng, x:xy.x, y:xy.y });
    return;
  }
  if(act.dataset.act==="run-map"){
    if(p.lat!=null && p.lng!=null) mapFocus(p.lat, p.lng);
    else { mapMode="real"; goTab("map"); renderMap(); loadKakao(()=>{ initKakaoMap(); kmap.relayout(); $("#kSearchIn").value=p.n; kakaoSearch(p.n); }); }
    return;
  }
});

/* ---------- 설정 ---------- */
$("#setMe").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  me = b.dataset.v; localStorage.setItem("gyehoek-me", me); renderAll();
});
$("#setLogout").addEventListener("click", async ()=>{
  if(!confirm("로그아웃할까요?")) return;
  await doLogout();
});

/* ---------- 달력 ---------- */
$("#calPrev").addEventListener("click", ()=>{ calM--; if(calM<0){calM=11;calY--;} renderCal(); });
$("#calNext").addEventListener("click", ()=>{ calM++; if(calM>11){calM=0;calY++;} renderCal(); });
$("#calGrid").addEventListener("click", e=>{
  const b = e.target.closest(".day"); if(!b) return;
  selDate = b.dataset.d;
  const d = new Date(selDate+"T00:00:00");
  if(d.getMonth()!==calM){ calY=d.getFullYear(); calM=d.getMonth(); }
  renderCal();
});
$("#dayAdd").addEventListener("click", ()=>openSheet("add"));

/* 일정 카드 공통 (달력·지도 목록) */
function bindEvList(sel){
  $(sel).addEventListener("click", e=>{
    const card = e.target.closest(".ev"); if(!card) return;
    const ev = DATA.events.find(x=>x.id===card.dataset.id); if(!ev) return;
    const act = e.target.closest("[data-act]");
    if(act && act.dataset.act==="done"){
      if(mode==="readonly") return;
      ev.done = !ev.done; save({kind:"ev", item:ev});
    } else if(mode!=="readonly"){ openSheet("edit", ev); }
  });
}
bindEvList("#dayList"); bindEvList("#mapList");

/* ---------- 지도 ---------- */
$("#mapMode").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  mapMode = b.dataset.m; renderMap();
});
$("#kSearchBtn").addEventListener("click", ()=>kakaoSearch($("#kSearchIn").value.trim()));
$("#kSearchIn").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#kSearchBtn").click(); });
$("#kSearchOut").addEventListener("click", e=>{
  const b = e.target.closest(".ksr"); if(!b) return;
  kakaoPickPlace(b.dataset.lat, b.dataset.lng, b.dataset.name);
});
$("#kPickAdd").addEventListener("click", ()=>{
  if(!kPick || mode==="readonly") return;
  const p = latLngToSvg(kPick.lat, kPick.lng);
  const generic = kPick.name === "지도에서 찍은 위치";
  openSheet("add", { type:"date", sub:"기타", title: generic ? "" : kPick.name,
    lat:kPick.lat, lng:kPick.lng, x:p.x, y:p.y });
});
/* 그림 지도에서 바로 일정 추가 (달력과 같은 창) */
$("#mapAdd").addEventListener("click", ()=>{
  if(mode==="readonly") return;
  openSheet("add");
});
$("#mapChips").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  mapFilter = b.dataset.f;
  if(mapFilter!=="run") mapSpotSel = null; /* 운동 필터를 벗어나면 스팟 선택 해제 */
  document.querySelectorAll("#mapChips button").forEach(x=>x.classList.toggle("on", x===b));
  renderMap();
  if(mapFilter==="run") fitToSpots(); /* 스팟이 한눈에 들어오게 */
});
/* 지금 지도에 띄운 러닝 스팟들이 다 보이도록 확대 */
function fitToSpots(){
  const list = mapRunSpots(); if(!list.length) return;
  const pts = list.map(s=>latLngToSvg(s.lat, s.lng));
  zoomToBBox([Math.min(...pts.map(p=>p.x)), Math.min(...pts.map(p=>p.y)),
              Math.max(...pts.map(p=>p.x)), Math.max(...pts.map(p=>p.y))], 40);
}
/* 러닝 스팟 지역 고르기 */
$("#runSpotRegion").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  mapSpotRegion = b.dataset.sr; mapSpotSel = null;
  renderMap();
  fitToSpots(); /* 고른 지역이 화면에 들어오도록 */
});
/* 지도 검색 */
$("#mapSearch").addEventListener("input", e=>{ mapSearchQ = e.target.value; renderMapSearch(); });
$("#mapSearchClear").addEventListener("click", ()=>{ mapSearchQ=""; $("#mapSearch").value=""; renderMapSearch(); });
$("#mapSearchOut").addEventListener("click", e=>{
  const ev = e.target.closest("[data-sev]");
  if(ev){
    const it = DATA.events.find(x=>x.id===ev.dataset.sev); if(!it) return;
    if(it.lat!=null) mapFocus(it.lat, it.lng);
    else if(it.x!=null){ zoomToBBox([it.x-6,it.y-6,it.x+6,it.y+6], 30);
      document.querySelectorAll("#mainMap .pin").forEach(p=>p.classList.toggle("hot", p.dataset.id===it.id)); }
    else if(mode!=="readonly"){ openSheet("edit", it); }
    return;
  }
  const sp = e.target.closest("[data-sspot]");
  if(sp){
    const s = RUN_SPOTS.find(x=>x.n===sp.dataset.sspot); if(!s) return;
    mapFilter = "run"; mapSpotRegion = s.r; mapSpotSel = s.n;
    document.querySelectorAll("#mapChips button").forEach(x=>x.classList.toggle("on", x.dataset.f==="run"));
    renderMap();
    zoomToBBox((p=>[p.x-4,p.y-4,p.x+4,p.y+4])(latLngToSvg(s.lat,s.lng)), 20);
    $("#mapSpotInfo").scrollIntoView({behavior:"smooth", block:"center"});
  }
});
/* 지도 위 러닝 스팟 카드 */
$("#mapSpotInfo").addEventListener("click", e=>{
  const act = e.target.closest("[data-act]"); if(!act) return;
  const s = RUN_SPOTS.find(x=>x.n===mapSpotSel); if(!s) return;
  if(act.dataset.act==="spot-close"){ mapSpotSel=null; renderMap(); return; }
  if(act.dataset.act==="spot-plan"){
    if(mode==="readonly") return;
    const p = latLngToSvg(s.lat, s.lng);
    openSheet("add", { type:"run", sub:"러닝", title:s.n,
      memo:[s.kmTxt||(s.km?s.km+"km":""), s.pkTxt].filter(Boolean).join(" · ").slice(0,120),
      lat:s.lat, lng:s.lng, x:p.x, y:p.y });
    return;
  }
  if(act.dataset.act==="spot-real"){ mapFocus(s.lat, s.lng); }
});
$("#mapWrap").addEventListener("click", e=>{
  if(mapDragged) return; /* 드래그 후의 클릭은 무시 */
  /* 이름 칩 ✕ → 선택 해제 */
  if(e.target.closest("#mapCap")){ clearRegionSel(); return; }
  /* 러닝 스팟 점 → 상세 카드 */
  const spot = e.target.closest("[data-spot]");
  if(spot){
    mapSpotSel = (mapSpotSel===spot.dataset.spot) ? null : spot.dataset.spot;
    renderMap();
    if(mapSpotSel) $("#mapSpotInfo").scrollIntoView({behavior:"smooth", block:"center"});
    return;
  }
  /* 지역 탭: 1번 누르면 강조, 2번 누르면 확대 (확대 상태에선 시군구 우선) */
  const sgg = e.target.closest(".sggp");
  if(sgg){ selectRegion("sgg", +sgg.dataset.gi); return; }
  const sido = e.target.closest(".land");
  if(sido){ selectRegion("sido", +sido.dataset.si); return; }
  const pin = e.target.closest(".pin"); if(!pin) return;
  const id = pin.dataset.id;
  document.querySelectorAll("#mainMap .pin").forEach(p=>p.classList.toggle("hot", p.dataset.id===id));
  const card = document.querySelector(`#mapList .ev[data-id="${id}"]`);
  if(card){ card.scrollIntoView({behavior:"smooth", block:"center"}); }
});

/* ---------- 축제 ---------- */
$("#festList").addEventListener("click", e=>{
  const b = e.target.closest(".add"); if(!b) return;
  const f = FESTS[+b.dataset.fi];
  openSheet("add", { type:"date", sub:"축제", title:f.n, memo:f.w.split("·")[0].trim(), date:"", x:f.x, y:f.y });
});

/* ---------- 식단 ---------- */
$("#mealPrev").addEventListener("click", ()=>{ const d=new Date(mealDate+"T00:00:00"); d.setDate(d.getDate()-1); mealDate=ymd(d); renderMeal(); });
$("#mealNext").addEventListener("click", ()=>{ const d=new Date(mealDate+"T00:00:00"); d.setDate(d.getDate()+1); mealDate=ymd(d); renderMeal(); });
$("#mealList").addEventListener("click", e=>{
  const add = e.target.closest(".ml-add");
  if(add){ openMSheet("add", { slot: add.dataset.slot }); return; }
  const card = e.target.closest(".ml"); if(!card || mode==="readonly") return;
  const it = DATA.meals.find(x=>x.id===card.dataset.id);
  if(it) openMSheet("edit", it);
});

/* ---------- 쪽지 ---------- */
$("#emoRow").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if(b.id==="noteAud"){ $("#noteAudIn").click(); return; }
  if(b.id==="noteVid"){ $("#noteVidIn").click(); return; }
  const inp = $("#noteIn"); inp.value += b.textContent; inp.focus();
});
$("#noteSend").addEventListener("click", ()=>{
  if(mode==="readonly") return;
  const inp = $("#noteIn"); const text = inp.value.trim(); if(!text) return;
  const item = { id:uid(), date:ymd(new Date()), text, by:me, luv:false };
  DATA.notes.push(item); inp.value = "";
  save({kind:"nt", item});
});
$("#noteIn").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#noteSend").click(); });
async function sendMediaNote(file, mtype){
  if(!file) return;
  if(mode!=="shared"){ banner("음성·영상 쪽지는 서버 연결(로그인) 후에 보낼 수 있어요."); return; }
  if(file.size > 20*1024*1024){ banner("파일이 20MB를 넘어요. 짧게 다시 찍어주세요 🙏"); return; }
  const t = file.type||"";
  let ct;
  if(mtype==="audio"){ ct = ["audio/mpeg","audio/mp4","audio/wav","audio/webm"].indexOf(t)>=0 ? t : "audio/mp4"; }
  else { ct = ["video/mp4","video/webm"].indexOf(t)>=0 ? t : "video/mp4"; }
  const ext = ct.indexOf("mpeg")>=0?"mp3":ct.indexOf("wav")>=0?"wav":ct.indexOf("webm")>=0?"webm":"mp4";
  const item = { id:uid(), date:ymd(new Date()), text: $("#noteIn").value.trim(), by:me, luv:false,
    media:"media/"+Date.now().toString(36)+"."+ext, mtype };
  const files = {}; files[item.media] = { content:file, contentType:ct };
  photoCache[item.id] = URL.createObjectURL(file);
  DATA.notes.push(item); $("#noteIn").value="";
  save({kind:"nt", item}, files);
}
$("#noteAudIn").addEventListener("change", e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; sendMediaNote(f,"audio"); });
$("#noteVidIn").addEventListener("change", e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=""; sendMediaNote(f,"video"); });
$("#noteFilterRow").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  noteFilter = b.dataset.f; renderNote();
});
$("#noteCardBtn").addEventListener("click", ()=>{ if(mode!=="readonly") openNSheet(); });
$("#noteFeed").addEventListener("click", e=>{
  /* 카드의 날짜·장소 배지 */
  const bdg = e.target.closest(".nbdg");
  if(bdg){
    if(bdg.dataset.bdg==="date"){
      selDate = bdg.dataset.d;
      const d = new Date(selDate+"T00:00:00"); calY=d.getFullYear(); calM=d.getMonth();
      renderCal(); goTab("cal");
    }
    if(bdg.dataset.bdg==="loc"){ mapFocus(bdg.dataset.lat, bdg.dataset.lng); }
    return;
  }
  /* 유튜브 썸네일 → 재생 */
  const yt = e.target.closest(".ytthumb");
  if(yt){
    const wrap = document.createElement("div");
    wrap.className = "ytwrap";
    wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt.dataset.yt}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    yt.replaceWith(wrap); return;
  }
  if(e.target.closest("a,audio,video")) return; /* 링크·재생 컨트롤은 그대로 */
  const bub = e.target.closest(".nb"); if(!bub) return;
  const src = bub.dataset.src, id = bub.dataset.id;
  const arr = src==="ev" ? DATA.events : src==="ml" ? DATA.meals : DATA.notes;
  const it = arr.find(x=>x.id===id); if(!it) return;
  const act = e.target.closest("[data-act]");
  if(act && act.dataset.act==="luv"){
    it.luv = !it.luv;
    const kind = src==="ev"?"ev":src==="ml"?"ml":"nt";
    const stash = (it.photo && String(it.photo).indexOf("data:")===0) ? Object.assign({},it,{photo:null}) : it;
    save({kind, item:stash}); return;
  }
  if(act && act.dataset.act==="ndel"){
    DATA.notes = DATA.notes.filter(x=>x.id!==id);
    let files = null;
    if(mode==="shared" && it.media){ files = files||{}; files[it.media] = null; }
    if(mode==="shared" && it.photo && String(it.photo).indexOf("data:")!==0){ files = files||{}; files[it.photo] = null; }
    save({kind:"nt-del", id}, files); return;
  }
  if(mode==="readonly") return;
  if(src==="ev") openSheet("edit", it);
  if(src==="ml") openMSheet("edit", it);
});

/* ---------- 체크리스트·스킬트리 공용 (결혼·살림) ---------- */
function boardChange(key, kind, extra){
  const base = key==="wed" ? {kind:{up:"wd",bulk:"wd-bulk",del:"wd-del"}[kind]} : {kind:{up:"bd",bulk:"bd-bulk",del:"bd-del"}[kind], board:key};
  return Object.assign(base, extra);
}
function handleBoardClick(e){
  if(mode==="readonly") return false;
  /* 기본 체크리스트 채우기 */
  const seedB = e.target.closest("[data-actseed]");
  if(seedB){
    const key = seedB.dataset.actseed, b = BOARDS[key];
    const items = b.tmpl.map((t,i)=>({ id:uid()+i.toString(36), cat:t[0], text:t[1], done:false, who:"both" }));
    boardItems(key).push.apply(boardItems(key), items);
    save(boardChange(key,"bulk",{items})); return true;
  }
  /* 스킬트리 노드 → 상세 시트 */
  const node = e.target.closest(".qnode");
  if(node){
    const key = node.dataset.board;
    if(node.classList.contains("qadd")){ openQSheet(key, node.dataset.cat, true); return true; }
    const it = boardItems(key).find(x=>x.id===node.dataset.id);
    if(it) openQSheet(key, it, false);
    return true;
  }
  const act = e.target.closest("[data-act]"); if(!act) return false;
  /* 일반 체크리스트 항목 추가 */
  if(act.dataset.act==="bdadd"){
    const inp = act.parentElement.querySelector("input");
    const text = inp.value.trim(); if(!text) return true;
    const key = inp.dataset.board;
    const item = { id:uid(), cat:+inp.dataset.cat, text, done:false, who:"both" };
    boardItems(key).push(item); inp.value="";
    save(boardChange(key,"up",{item})); return true;
  }
  /* 일반 체크리스트 항목 조작 */
  const row = e.target.closest(".wi[data-board]"); if(!row) return false;
  const key = row.dataset.board, arr = boardItems(key);
  const it = arr.find(x=>x.id===row.dataset.id); if(!it) return true;
  if(act.dataset.act==="chk"){ it.done = act.checked; save(boardChange(key,"up",{item:it})); return true; }
  if(act.dataset.act==="who"){ it.who = it.who==="both"?"cs":it.who==="cs"?"hj":"both"; save(boardChange(key,"up",{item:it})); return true; }
  if(act.dataset.act==="del"){ arr.splice(arr.indexOf(it),1); save(boardChange(key,"del",{id:it.id})); return true; }
  return false;
}
$("#wedList").addEventListener("click", handleBoardClick);

/* ---------- 살림 노트 ---------- */
$("#homeChips").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  homeBoard = b.dataset.b; renderHome();
});
$("#homeBody").addEventListener("click", e=>{
  if(handleBoardClick(e)) return;
  if(mode==="readonly") return;
  if(e.target.id==="frAddBtn"){
    const name = $("#frName").value.trim(); if(!name) return;
    const item = { id:uid(), name, exp: $("#frExp").value||null };
    DATA.fridge.push(item); save({kind:"fr", item}); return;
  }
  if(e.target.id==="spAddBtn"){
    const name = $("#spName").value.trim(); if(!name) return;
    const item = { id:uid(), name };
    DATA.shop.push(item); save({kind:"sp", item}); return;
  }
  const act = e.target.closest("[data-act]"); if(!act) return;
  const row = e.target.closest(".wi"); if(!row) return;
  if(act.dataset.act==="fr-eat"){
    const it = DATA.fridge.find(x=>x.id===row.dataset.id); if(!it) return;
    openMSheet("add", { text: it.name, mkind:"home" }); return;
  }
  if(act.dataset.act==="fr-del"){ DATA.fridge = DATA.fridge.filter(x=>x.id!==row.dataset.id); save({kind:"fr-del", id:row.dataset.id}); return; }
  if(act.dataset.act==="sp-buy"){
    const it = DATA.shop.find(x=>x.id===row.dataset.id); if(!it) return;
    const item = { id:it.id, name:it.name, exp:null };
    DATA.shop = DATA.shop.filter(x=>x.id!==it.id);
    if(!DATA.fridge.some(x=>x.id===item.id)) DATA.fridge.push(item);
    save({kind:"sp-buy", id:it.id, item}); return;
  }
  if(act.dataset.act==="sp-del"){ DATA.shop = DATA.shop.filter(x=>x.id!==row.dataset.id); save({kind:"sp-del", id:row.dataset.id}); return; }
});
$("#homeBody").addEventListener("keydown", e=>{
  if(e.key!=="Enter") return;
  if(e.target.id==="frName"||e.target.id==="frExp"){ const b=$("#frAddBtn"); if(b) b.click(); }
  if(e.target.id==="spName"){ const b=$("#spAddBtn"); if(b) b.click(); }
  if(e.target.matches(".wadd input")) e.target.parentElement.querySelector("button").click();
});

/* ---------- 여행 ---------- */
$("#trAdd").addEventListener("click", ()=>{
  if(mode==="readonly") return;
  const title = $("#trWhere").value.trim();
  const start = $("#trStart").value;
  if(!title){ $("#trWhere").focus(); return; }
  if(!start){ $("#trStart").focus(); return; }
  const item = { id:uid(), title, start, nights:+$("#trNights").value||0,
    items: TR_TEMPLATE.map((t,i)=>({ id:uid()+i.toString(36), text:t, done:false })) };
  DATA.trips.push(item);
  $("#trWhere").value=""; $("#trStart").value="";
  save({kind:"tr", item});
});
$("#tripList").addEventListener("click", e=>{
  if(mode==="readonly") return;
  const card = e.target.closest("[data-trip]"); if(!card) return;
  const trip = DATA.trips.find(t=>t.id===card.dataset.trip); if(!trip) return;
  const act = e.target.closest("[data-act]"); if(!act) return;
  if(act.dataset.act==="tr-del"){
    if(!confirm("이 여행을 삭제할까요?")) return;
    DATA.trips = DATA.trips.filter(t=>t.id!==trip.id); save({kind:"tr-del", id:trip.id}); return;
  }
  if(act.dataset.act==="tr-iadd"){
    const inp = act.parentElement.querySelector("input");
    const text = inp.value.trim(); if(!text) return;
    trip.items = trip.items||[]; trip.items.push({ id:uid(), text, done:false }); inp.value="";
    save({kind:"tr", item:trip}); return;
  }
  const row = e.target.closest(".wi"); if(!row) return;
  const it = (trip.items||[]).find(x=>x.id===row.dataset.id); if(!it) return;
  if(act.dataset.act==="tr-chk"){ it.done = act.checked; save({kind:"tr", item:trip}); }
  if(act.dataset.act==="tr-idel"){ trip.items = trip.items.filter(x=>x.id!==it.id); save({kind:"tr", item:trip}); }
});
$("#tripList").addEventListener("keydown", e=>{
  if(e.key==="Enter" && e.target.matches(".wadd input")) e.target.parentElement.querySelector("button").click();
});

/* ---------- 궁합 ---------- */
$("#pfForm").addEventListener("click", e=>{
  const b = e.target.closest(".pair button"); if(!b) return;
  b.parentElement.querySelectorAll("button").forEach(x=>x.classList.toggle("on", x===b));
});
$("#pfSave").addEventListener("click", ()=>{
  if(mode==="readonly") return;
  const pf = { cs:{}, hj:{} };
  ["cs","hj"].forEach(p=>pf[p].birth = birthValue(p));
  document.querySelectorAll(".pf-time").forEach(s=>pf[s.dataset.p].time = +s.value);
  document.querySelectorAll(".mbti-row").forEach(r=>{
    const ls = Array.prototype.map.call(r.querySelectorAll(".pair button.on"), b=>b.dataset.l);
    pf[r.dataset.p].mbti = ls.length===4 ? ls.join("") : "";
  });
  DATA.profile = pf;
  save({kind:"pf", item:pf});
});

/* ---------- 몸 기록 ---------- */
$("#bodyChips").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  bodyP = b.dataset.p; renderBody();
});
$("#bodyBody").addEventListener("click", e=>{
  if(mode==="readonly") return;
  if(e.target.id==="bdPSave"){
    const item = { height:+$("#bdH").value||null, goal:+$("#bdG").value||null };
    DATA.bodyP[bodyP] = item; save({kind:"bp", who:bodyP, item}); return;
  }
  if(e.target.id==="bdLSave"){
    const w = +$("#bdW").value;
    if(!w){ $("#bdW").focus(); return; }
    const item = { id:uid(), who:bodyP, date:ymd(new Date()), w,
      m: $("#bdM").value?+$("#bdM").value:null, f: $("#bdF").value?+$("#bdF").value:null };
    DATA.bodyLogs.push(item); save({kind:"bl", item}); return;
  }
  const act = e.target.closest("[data-act]");
  if(act && act.dataset.act==="bl-del"){
    const row = e.target.closest(".wi");
    DATA.bodyLogs = DATA.bodyLogs.filter(x=>x.id!==row.dataset.id);
    save({kind:"bl-del", id:row.dataset.id});
  }
});

/* ---------- 같이 보기 ---------- */
$("#showAdd").addEventListener("click", ()=>{
  if(mode==="readonly") return;
  const title = $("#showName").value.trim(); if(!title){ $("#showName").focus(); return; }
  const item = { id:uid(), title, ep:0, total:+$("#showTotal").value||null, done:false };
  DATA.shows.push(item); $("#showName").value=""; $("#showTotal").value="";
  save({kind:"sh", item});
});
$("#showName").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#showAdd").click(); });
$("#showList").addEventListener("click", e=>{
  if(mode==="readonly") return;
  const row = e.target.closest(".wi"); if(!row) return;
  const s = DATA.shows.find(x=>x.id===row.dataset.id); if(!s) return;
  const act = e.target.closest("[data-act]"); if(!act) return;
  if(act.dataset.act==="show-ep"){ s.ep = (s.ep||0)+1; if(s.total && s.ep>=s.total){ s.ep=s.total; s.done=true; } save({kind:"sh", item:s}); }
  if(act.dataset.act==="show-done"){ s.done = !s.done; save({kind:"sh", item:s}); }
  if(act.dataset.act==="show-del"){ DATA.shows = DATA.shows.filter(x=>x.id!==s.id); save({kind:"sh-del", id:s.id}); }
});

/* ---------- 금연 ---------- */
$("#smokeChips").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  smokeP = b.dataset.p; renderSmoke();
});
$("#smokeBody").addEventListener("click", e=>{
  if(mode==="readonly") return;
  if(e.target.id==="smStartBtn"){
    const item = { quit: $("#smStart").value || ymd(new Date()), packs: +$("#smPacks").value||1, price: +$("#smPrice").value||4500 };
    DATA.smoke[smokeP] = item; save({kind:"sm", who:smokeP, item}); return;
  }
  if(e.target.id==="smReset"){
    if(!confirm("금연 기록을 다시 설정할까요?")) return;
    DATA.smoke[smokeP] = null; save({kind:"sm", who:smokeP, item:null});
  }
});

/* ---------- 재테크 ---------- */
$("#invKind").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  invKindSel = b.dataset.k; renderInvest();
});
document.querySelector("#view-invest").addEventListener("click", e=>{
  if(mode==="readonly") return;
  if(e.target.id==="igSave"){
    const item = { name: $("#igName").value.trim()||"우리 목표", target:+$("#igTarget").value||0, saved:+$("#igSaved").value||0 };
    DATA.invest.goal = item; save({kind:"ig", item}); return;
  }
  if(e.target.id==="invAdd"){
    const title = $("#invName").value.trim(); if(!title){ $("#invName").focus(); return; }
    const item = { id:uid(), k:invKindSel, title, by:me };
    DATA.invest.notes.push(item); $("#invName").value="";
    save({kind:"iv", item}); return;
  }
  const act = e.target.closest("[data-act]");
  if(act && act.dataset.act==="iv-del"){
    const row = e.target.closest(".wi");
    DATA.invest.notes = DATA.invest.notes.filter(x=>x.id!==row.dataset.id);
    save({kind:"iv-del", id:row.dataset.id});
  }
});
$("#invName").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#invAdd").click(); });

/* ---------- 약속 ---------- */
$("#usWrap").addEventListener("click", e=>{
  if(mode==="readonly") return;
  const act = e.target.closest("[data-act]"); if(!act) return;
  if(act.dataset.act==="wadd"){
    const inp = act.parentElement.querySelector("input");
    const text = inp.value.trim(); if(!text) return;
    const item = { id:uid(), who:inp.dataset.p, kind:inp.dataset.k, text, ack:false };
    DATA.wishes.push(item); inp.value=""; save({kind:"wi", item});
    return;
  }
  const row = e.target.closest(".wi"); if(!row) return;
  const w = DATA.wishes.find(x=>x.id===row.dataset.id); if(!w) return;
  if(act.dataset.act==="ack"){ w.ack=!w.ack; save({kind:"wi", item:w}); }
  if(act.dataset.act==="wchk"){ w.ack=act.checked; save({kind:"wi", item:w}); }
  if(act.dataset.act==="del"){ DATA.wishes = DATA.wishes.filter(x=>x.id!==w.id); save({kind:"wi-del", id:w.id}); }
});
$("#usWrap").addEventListener("keydown", e=>{
  if(e.key==="Enter" && e.target.matches(".wadd input")){ e.target.parentElement.querySelector("button").click(); }
});

/* ---------- 시트·로그인 ---------- */
$("#scrim").addEventListener("click", closeSheetViaUI);
bindSheet(); bindMSheet(); bindQSheet(); bindNSheet();
$("#loginForm").addEventListener("submit", e=>{ e.preventDefault(); loginSubmit(); });
$("#setNoti").addEventListener("click", askNotify);

/* ---------- 부팅 ---------- */
try{ history.replaceState({tab:"cal"}, ""); }catch(_){ }
initNotify();
initStore();
