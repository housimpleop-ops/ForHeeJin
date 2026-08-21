/* ============================================================
   sheets.js — 바텀시트 3종
   [1] sheet  : 일정 추가/수정 (사진·위치·칼로리·캘린더 내보내기)
   [2] msheet : 식단 기록 (사진·칼로리·집밥/외식)
   [3] qsheet : 스킬트리 노드 상세 (날짜·장소·메모·담당)
   ============================================================ */

let sheet = null;   // {mode:'add'|'edit', blob, ev:{...}}
let mSheet = null;  // {mode, blob, item:{...}}
let qSheet = null;  // {mode, board, item:{...}}

/* ---------- 공용 ---------- */
function closeAllSheets(){ closeSheet(); closeMSheet(); closeQSheet(); }
function blobToDataURL(b){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(b); }); }
/* 사진을 900px 이하 JPEG로 줄이기 (용량 절약) */
function shrink(file){ return new Promise((res,rej)=>{
  const img = new Image();
  img.onload = ()=>{
    const max = 900; let w = img.naturalWidth, h = img.naturalHeight;
    if(w>max || h>max){ const r = Math.min(max/w, max/h); w = Math.round(w*r); h = Math.round(h*r); }
    const c = document.createElement("canvas"); c.width=w; c.height=h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(img.src);
    c.toBlob(b=>b?res(b):rej(new Error("toBlob")), "image/jpeg", .82);
  };
  img.onerror = rej;
  img.src = URL.createObjectURL(file);
});}

/* ============================================================
   [1] 일정 시트
   ============================================================ */
function openSheet(m, ev){
  sheet = { mode:m, blob:null, ev: Object.assign({ id:uid(), date:selDate, type:"run", sub:"러닝", title:"", memo:"", kcal:null, by:me, done:false, x:null, y:null, lat:null, lng:null, photo:null }, ev||{}) };
  if(!(SUBS[sheet.ev.type]||[]).some(s=>s[0]===sheet.ev.sub)) sheet.ev.sub = SUBS[sheet.ev.type][0][0];
  $("#shTitle").textContent = m==="edit" ? "일정 수정 ✏️" : "일정 추가 ✨";
  $("#shDate").value = sheet.ev.date;
  $("#shTitleIn").value = sheet.ev.title;
  $("#shMemo").value = sheet.ev.memo||"";
  $("#shKcal").value = sheet.ev.kcal||"";
  $("#shDel").hidden = m!=="edit";
  $("#shDoneRow").hidden = m!=="edit";
  $("#shDone").checked = !!sheet.ev.done;
  const spv = $("#shPreview");
  if(sheet.ev.photo){ spv.src = photoSrc(sheet.ev); spv.hidden = false; } else { spv.hidden = true; spv.removeAttribute("src"); }
  $("#shMapWrap").innerHTML = mapSVG("shMap");
  syncSheetUI();
  $("#scrim").classList.add("open"); $("#sheet").classList.add("open");
}
function syncSheetUI(){
  document.querySelectorAll("#shType button").forEach(b=>b.classList.toggle("on", b.dataset.v===sheet.ev.type));
  $("#shSub").innerHTML = (SUBS[sheet.ev.type]||[]).map(s=>`<button type="button" data-v="${s[0]}" class="${s[0]===sheet.ev.sub?"on":""}">${s[1]} ${s[0]}</button>`).join("");
  $("#shKcalRow").hidden = sheet.ev.type!=="run";
  document.querySelectorAll("#shBy button").forEach(b=>b.classList.toggle("on", b.dataset.v===sheet.ev.by));
  const has = sheet.ev.x!=null;
  $("#shMap .pins").innerHTML = has ? pinHTML(sheet.ev,false) : "";
  $("#shLocTxt").textContent = has ? "위치 표시됨 — 다시 누르면 옮겨져요" : "지도를 눌러 위치를 표시하세요";
  $("#shLocClear").hidden = !has;
}
function closeSheet(){ sheet=null; $("#scrim").classList.remove("open"); $("#sheet").classList.remove("open"); }

function bindSheet(){
  $("#shType").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&sheet){
    sheet.ev.type=b.dataset.v;
    if(!(SUBS[sheet.ev.type]||[]).some(s=>s[0]===sheet.ev.sub)) sheet.ev.sub = SUBS[sheet.ev.type][0][0];
    syncSheetUI();
  } });
  $("#shSub").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&sheet){ sheet.ev.sub=b.dataset.v; syncSheetUI(); } });
  $("#shBy").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&sheet){ sheet.ev.by=b.dataset.v; syncSheetUI(); } });
  $("#shMapWrap").addEventListener("click", e=>{
    if(!sheet) return;
    const svg = $("#shMap"); if(!svg || !svg.contains(e.target)) return;
    const p = svgPoint(svg, e);
    sheet.ev.x=p.x; sheet.ev.y=p.y;
    const c = svgToLatLng(p.x, p.y); sheet.ev.lat=c.lat; sheet.ev.lng=c.lng; /* 진짜 지도에도 같은 자리 */
    syncSheetUI();
  });
  $("#shLocClear").addEventListener("click", ()=>{ if(sheet){ sheet.ev.x=null; sheet.ev.y=null; sheet.ev.lat=null; sheet.ev.lng=null; syncSheetUI(); } });
  $("#shPhotoBtn").addEventListener("click", ()=>$("#shPhoto").click());
  $("#shPhoto").addEventListener("change", async e=>{
    const f = e.target.files && e.target.files[0]; e.target.value="";
    if(!f || !sheet) return;
    try{
      const blob = await shrink(f);
      sheet.blob = blob;
      const pv = $("#shPreview"); pv.src = URL.createObjectURL(blob); pv.hidden = false;
    }catch(_){ banner("사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요."); }
  });
  $("#shCancel").addEventListener("click", closeSheet);
  $("#shDel").addEventListener("click", ()=>{
    if(!sheet) return;
    const id = sheet.ev.id, ph = sheet.ev.photo;
    DATA.events = DATA.events.filter(e=>e.id!==id);
    let files = null;
    if(mode==="shared" && ph && ph.indexOf("data:")!==0){ files = {}; files[ph] = null; }
    closeSheet(); save({kind:"ev-del", id}, files);
  });
  $("#shSave").addEventListener("click", async ()=>{
    if(!sheet) return;
    const ev = sheet.ev;
    ev.date = $("#shDate").value;
    ev.title = $("#shTitleIn").value.trim() || (TYPES[ev.type].label);
    ev.memo = $("#shMemo").value.trim();
    ev.kcal = ev.type==="run" && $("#shKcal").value ? +$("#shKcal").value : null;
    ev.done = $("#shDone").checked;
    if(!ev.date){ $("#shDate").focus(); return; }
    let files = null;
    if(sheet.blob){
      if(mode==="shared"){
        ev.photo = "photos/"+ev.id+".jpg";
        files = {}; files[ev.photo] = sheet.blob;
        photoCache[ev.id] = URL.createObjectURL(sheet.blob);
      }else{
        try{ ev.photo = await blobToDataURL(sheet.blob); }catch(_){ }
      }
    }
    const i = DATA.events.findIndex(x=>x.id===ev.id);
    if(i>=0) DATA.events[i]=ev; else DATA.events.push(ev);
    selDate = ev.date;
    const d = new Date(ev.date+"T00:00:00"); calY=d.getFullYear(); calM=d.getMonth();
    const stash = (ev.photo && ev.photo.indexOf("data:")===0) ? Object.assign({},ev,{photo:null}) : ev;
    closeSheet(); save({kind:"ev", item:stash}, files);
  });
  /* 캘린더 내보내기 */
  $("#shGcal").addEventListener("click", ()=>{
    const s = sheetSnapshot(); if(!s){ $("#shDate").focus(); return; }
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE&text="
      + encodeURIComponent(subEm(sheet.ev.type, sheet.ev.sub)+" "+s.title)
      + "&dates="+s.date.replace(/-/g,"")+"/"+nextDayStr(s.date)
      + "&details="+encodeURIComponent(s.memo||"계획하는 사이 💌");
    window.open(url, "_blank", "noopener");
  });
  $("#shIcs").addEventListener("click", ()=>{
    const s = sheetSnapshot(); if(!s){ $("#shDate").focus(); return; }
    const escI = t=>String(t).replace(/([,;\\])/g,"\\$1");
    const ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//gyehoek//KR\r\nBEGIN:VEVENT\r\nUID:"
      + sheet.ev.id+"@gyehoek\r\nDTSTART;VALUE=DATE:"+s.date.replace(/-/g,"")
      + "\r\nDTEND;VALUE=DATE:"+nextDayStr(s.date)
      + "\r\nSUMMARY:"+escI(s.title)+"\r\nDESCRIPTION:"+escI(s.memo||"")
      + "\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
    const blob = new Blob([ics], {type:"text/calendar"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "우리일정_"+s.date+".ics";
    document.body.appendChild(a); a.click(); a.remove();
  });
}
function sheetSnapshot(){
  if(!sheet) return null;
  const date = $("#shDate").value; if(!date) return null;
  return { title: $("#shTitleIn").value.trim()||TYPES[sheet.ev.type].label, memo: $("#shMemo").value.trim(), date };
}
function nextDayStr(s){ const x=new Date(s+"T00:00:00"); x.setDate(x.getDate()+1); return ymd(x).replace(/-/g,""); }

/* ============================================================
   [2] 식단 시트
   ============================================================ */
function openMSheet(m, item){
  mSheet = { mode:m, blob:null, item: Object.assign({ id:uid(), date:mealDate, slot:"l", mkind:"home", text:"", by:me, photo:null, kcal:null }, item||{}) };
  $("#msTitle").textContent = m==="edit" ? "식단 수정 ✏️" : "식단 기록 🍚";
  $("#msText").value = mSheet.item.text||"";
  $("#msKcal").value = mSheet.item.kcal||"";
  $("#msDel").hidden = m!=="edit";
  const pv = $("#msPreview");
  if(mSheet.item.photo){ pv.src = photoSrc(mSheet.item); pv.hidden = false; } else { pv.hidden = true; pv.removeAttribute("src"); }
  syncMSheetUI();
  $("#scrim").classList.add("open"); $("#msheet").classList.add("open");
}
function syncMSheetUI(){
  document.querySelectorAll("#msSlot button").forEach(b=>b.classList.toggle("on", b.dataset.v===mSheet.item.slot));
  document.querySelectorAll("#msKind button").forEach(b=>b.classList.toggle("on", b.dataset.v===mSheet.item.mkind));
  document.querySelectorAll("#msBy button").forEach(b=>b.classList.toggle("on", b.dataset.v===mSheet.item.by));
}
function closeMSheet(){ mSheet=null; $("#scrim").classList.remove("open"); $("#msheet").classList.remove("open"); }

function bindMSheet(){
  $("#msSlot").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&mSheet){ mSheet.item.slot=b.dataset.v; syncMSheetUI(); } });
  $("#msKind").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&mSheet){ mSheet.item.mkind=b.dataset.v; syncMSheetUI(); } });
  $("#msBy").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&mSheet){ mSheet.item.by=b.dataset.v; syncMSheetUI(); } });
  $("#msPhotoBtn").addEventListener("click", ()=>$("#msPhoto").click());
  $("#msPhoto").addEventListener("change", async e=>{
    const f = e.target.files && e.target.files[0]; e.target.value="";
    if(!f || !mSheet) return;
    try{
      const blob = await shrink(f);
      mSheet.blob = blob;
      const pv = $("#msPreview"); pv.src = URL.createObjectURL(blob); pv.hidden = false;
    }catch(_){ banner("사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요."); }
  });
  $("#msCancel").addEventListener("click", closeMSheet);
  $("#msDel").addEventListener("click", ()=>{
    if(!mSheet) return;
    const it = mSheet.item;
    DATA.meals = DATA.meals.filter(x=>x.id!==it.id);
    let files = null;
    if(mode==="shared" && it.photo && it.photo.indexOf("data:")!==0){ files = {}; files[it.photo] = null; }
    closeMSheet(); save({kind:"ml-del", id:it.id}, files);
  });
  $("#msSave").addEventListener("click", async ()=>{
    if(!mSheet) return;
    const it = mSheet.item;
    it.text = $("#msText").value.trim();
    it.kcal = $("#msKcal").value ? +$("#msKcal").value : null;
    if(!it.text && !it.photo && !mSheet.blob){ $("#msText").focus(); return; }
    let files = null;
    if(mSheet.blob){
      if(mode==="shared"){
        it.photo = "photos/"+it.id+".jpg";
        files = {}; files[it.photo] = mSheet.blob;
        photoCache[it.id] = URL.createObjectURL(mSheet.blob);
      }else{
        try{ it.photo = await blobToDataURL(mSheet.blob); }catch(_){ }
      }
    }
    const i = DATA.meals.findIndex(x=>x.id===it.id);
    if(i>=0) DATA.meals[i]=it; else DATA.meals.push(it);
    mealDate = it.date;
    const stash = (it.photo && it.photo.indexOf("data:")===0) ? Object.assign({},it,{photo:null}) : it;
    closeMSheet(); save({kind:"ml", item:stash}, files);
  });
}

/* ============================================================
   [3] 퀘스트 상세 시트 (스킬트리 노드: 결혼·아이)
   ============================================================ */
function openQSheet(board, itemOrCat, isNew){
  const base = isNew
    ? { id:uid(), cat:+itemOrCat, text:"", done:false, who:"both", date:"", place:"", memo:"" }
    : Object.assign({ date:"", place:"", memo:"", who:"both" }, itemOrCat);
  qSheet = { mode: isNew?"add":"edit", board, item: Object.assign({}, base) };
  $("#qsTitle").textContent = (BOARDS[board].cats[qSheet.item.cat]||"") ;
  $("#qsText").value = qSheet.item.text||"";
  $("#qsDate").value = qSheet.item.date||"";
  $("#qsPlace").value = qSheet.item.place||"";
  $("#qsMemo").value = qSheet.item.memo||"";
  $("#qsDel").hidden = isNew;
  syncQSheetUI();
  $("#scrim").classList.add("open"); $("#qsheet").classList.add("open");
}
function syncQSheetUI(){
  $("#qsDone").textContent = qSheet.item.done ? "⭐ 완료했어요! (누르면 취소)" : "⬜ 아직이에요 — 누르면 완료!";
  $("#qsDone").style.background = qSheet.item.done ? "var(--fest)" : "var(--ink)";
  document.querySelectorAll("#qsWho button").forEach(b=>b.classList.toggle("on", b.dataset.v===qSheet.item.who));
}
function closeQSheet(){ qSheet=null; $("#scrim").classList.remove("open"); $("#qsheet").classList.remove("open"); }
function qSheetChange(){
  const b = qSheet.board, it = qSheet.item;
  return b==="wed" ? {kind:"wd", item:it} : {kind:"bd", board:b, item:it};
}
function bindQSheet(){
  $("#qsDone").addEventListener("click", ()=>{ if(qSheet){ qSheet.item.done = !qSheet.item.done; syncQSheetUI(); } });
  $("#qsWho").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b&&qSheet){ qSheet.item.who=b.dataset.v; syncQSheetUI(); } });
  $("#qsCancel").addEventListener("click", closeQSheet);
  $("#qsDel").addEventListener("click", ()=>{
    if(!qSheet) return;
    const b = qSheet.board, id = qSheet.item.id;
    if(b==="wed"){ DATA.wedding = DATA.wedding.filter(x=>x.id!==id); closeQSheet(); save({kind:"wd-del", id}); }
    else { DATA.boards[b] = DATA.boards[b].filter(x=>x.id!==id); closeQSheet(); save({kind:"bd-del", board:b, id}); }
  });
  $("#qsSave").addEventListener("click", ()=>{
    if(!qSheet) return;
    const it = qSheet.item;
    it.text = $("#qsText").value.trim(); if(!it.text){ $("#qsText").focus(); return; }
    it.date = $("#qsDate").value||"";
    it.place = $("#qsPlace").value.trim();
    it.memo = $("#qsMemo").value.trim();
    const arr = boardItems(qSheet.board);
    const i = arr.findIndex(x=>x.id===it.id);
    if(i>=0) arr[i]=it; else arr.push(it);
    const change = qSheetChange();
    closeQSheet(); save(change);
  });
  /* 달력에 일정으로도 추가 */
  $("#qsToCal").addEventListener("click", ()=>{
    if(!qSheet) return;
    const it = qSheet.item, b = qSheet.board;
    const memo = [it.place, it.memo].filter(Boolean).join(" · ");
    closeQSheet();
    openSheet("add", {
      type: b==="wed" ? "wed" : "date",
      sub: "기타",
      title: it.text,
      date: it.date || selDate,
      memo,
    });
  });
}
