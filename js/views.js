/* ============================================================
   views.js — 화면 그리기 전부
   목차: 공통 → 달력 → 지도 → 축제 → 식단 → 쪽지 → 여행
        → 체크리스트/스킬트리 → 살림 → 궁합 → 몸 → 보기 → 금연 → 재테크 → 약속
   ============================================================ */

/* ---------- 공통 ---------- */
function banner(msg){ const b=$("#banner"); if(!msg){ b.hidden=true; return; } b.hidden=false; b.textContent=msg; }
function pickQuote(cat){
  const pool = cat ? QUOTES.filter(q=>q.c===cat) : QUOTES;
  const day = Math.floor(Date.now()/86400000);
  const q = pool[day % pool.length];
  return `“${q.t}” — ${q.w}`;
}
function evOf(date){ return DATA.events.filter(e=>e.date===date).sort((a,b)=>a.type<b.type?-1:1); }
/* 일정에 붙은 장소를 스팟 목록에서 찾아온다 (없으면 null) */
function evSpot(e){
  if(!e || !e.spot) return null;
  return allSpots().find(s=>s.cat===e.spot.cat && s.n===e.spot.n) || null;
}
/* 장소 정보 칸 — 메모와 따로, 조사해둔 내용을 그대로 보여준다 */
function spotInfoHTML(s, open){
  if(!s) return "";
  const rows = (SPOT_ROWS[s.cat]||[]).filter(([k])=>s[k])
    .map(([k,ic])=>`<div class="ev-sub">${ic} ${esc(String(s[k]))}</div>`).join("");
  const flags = (SPOT_FLAGS[s.cat]||[]).filter(([k])=>s[k]===true).map(([,l])=>`<span class="rtag">${l}</span>`).join("");
  const pk = RUN_PARK[s.pk];
  const body = rows
    + (flags||pk ? `<div class="chips" style="margin:6px 0 0">${flags}${pk?`<span class="rtag">${pk.em} ${pk.l}</span>`:""}</div>` : "")
    + (s.parkSpot?`<div class="memo" style="margin-top:8px">🅿️ <b>추천 주차</b> — ${esc(s.parkSpot)}</div>`
       : (s.pkTxt?`<div class="ev-sub">🅿️ ${esc(s.pkTxt)}</div>`:""))
    + (s.season?`<div class="ev-sub">📅 ${esc(s.season)}</div>`:"")
    + (s.tip?`<div class="memo" style="margin-top:8px">💡 ${esc(s.tip)}</div>`:"");
  if(!body) return "";
  return `<details class="spotbox"${open?" open":""}>
    <summary>${SPOT_CATS[s.cat].em} ${esc(s.n)} 정보 — 가기 좋은 때·주차·팁</summary>
    <div class="spotbox-in">${body}</div>
  </details>`;
}
/* 두 사람의 느낌 */
function feelHTML(e){
  if(!e.felCs && !e.felHj) return "";
  return `<div class="feels">`
    + (e.felCs?`<div class="feel cs"><span class="who">창석</span>${esc(e.felCs)}</div>`:"")
    + (e.felHj?`<div class="feel hj"><span class="who">희진</span>${esc(e.felHj)}</div>`:"")
    + `</div>`;
}
function evCard(e, withDate){
  const t = TYPES[e.type] || TYPES.date;
  const dt = withDate ? `<span>${e.date.slice(5).replace("-","/")}</span> · ` : "";
  return `<div class="ev ${e.type} ${e.done?"":"dim"}" data-id="${e.id}">
    <div class="bar"></div>
    <div class="bd" data-act="edit" style="cursor:pointer">
      <div class="t"><span class="em">${subEm(e.type,e.sub)}</span>${esc(e.title)}</div>
      <div class="m">${dt}${t.label}${e.sub?" · "+esc(e.sub):""} · ${PEOPLE[e.by]||""}${e.kcal?" · 🔥"+e.kcal+"kcal":""}${e.x!=null?" · 📍":""}</div>
      ${e.memo?`<div class="memo">${esc(e.memo)}</div>`:""}
      ${feelHTML(e)}
      ${e.photo?`<img class="ev-ph" src="${esc(photoSrc(e))}" alt="" loading="lazy" onerror="this.hidden=true">`:""}
    </div>
    ${spotInfoHTML(evSpot(e))}
    <button class="done-b ${e.done?"yes":""}" data-act="done">${e.done?"다녀옴 ✓":"계획중"}</button>
  </div>`;
}

/* ---------- 달력 ---------- */
function renderCal(){
  $("#calTitle").textContent = calY+"년 "+(calM+1)+"월";
  const mm = String(calM+1).padStart(2,"0");
  const inMonth = DATA.events.filter(e=>e.date.startsWith(calY+"-"+mm));
  const cnt = t => inMonth.filter(e=>e.type===t).length;
  $("#calStats").innerHTML =
    `<span class="st-run">💪 운동 ${cnt("run")}</span><span class="st-date">💛 데이트 ${cnt("date")}</span><span class="st-fest">💍 결혼 ${cnt("wed")}</span>`;
  const first = new Date(calY, calM, 1);
  const start = new Date(calY, calM, 1 - first.getDay());
  let html = "";
  const tstr = ymd(new Date());
  for(let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    if(i===35 && d.getMonth()!==calM) break;
    const ds = ymd(d);
    const out = d.getMonth()!==calM;
    const evs = evOf(ds);
    const dots = evs.slice(0,3).map(e=>`<i class="${e.type} ${e.done?"":"plan"}"></i>`).join("");
    html += `<button class="day ${out?"out":""} ${d.getDay()===0?"sun":""} ${ds===tstr?"today":""} ${ds===selDate?"sel":""}" data-d="${ds}">
      <span class="n">${d.getDate()}</span><span class="dots">${dots}</span></button>`;
  }
  $("#calGrid").innerHTML = html;
  const sd = new Date(selDate+"T00:00:00");
  $("#dayTitle").textContent = (sd.getMonth()+1)+"월 "+sd.getDate()+"일 "+["일","월","화","수","목","금","토"][sd.getDay()]+"요일";
  const evs = evOf(selDate);
  $("#dayList").innerHTML = evs.length ? evs.map(e=>evCard(e,false)).join("") : `<div class="empty">아직 일정이 없어요 🌱</div>`;
  $("#dayAdd").style.display = mode==="readonly" ? "none" : "";
}

/* ---------- 지도 ---------- */
function renderMap(){
  if(!$("#mainMap")){
    $("#mapWrap").innerHTML = mapSVG("mainMap") + `<div class="map-ctl">
      <button id="mapZoomIn" aria-label="확대">＋</button>
      <button id="mapZoomOut" aria-label="축소">－</button>
      <button id="mapZoomReset" aria-label="전체 보기" style="font-size:11px">전체</button>
    </div><div class="map-cap" id="mapCap" hidden></div>`;
    bindMainMapNav();
  }
  const list = DATA.events.filter(e=>e.x!=null && (mapFilter==="all"||e.type===mapFilter));
  /* 가볼 곳(스팟)을 그림지도에 겹쳐 띄운다 — 분야를 고른 경우에만 */
  const spots = mapSpots();
  const spotPins = spots.map(s=>{
    const p = latLngToSvg(s.lat, s.lng);
    const co = (SPOT_CATS[s.cat]||{}).color || "run";
    return `<g class="pin cand ${co} ${mapSpotSel===s.n?"picked":""}" data-spot="${esc(s.n)}" data-x="${p.x}" data-y="${p.y}" transform="translate(${p.x},${p.y})" style="cursor:pointer"><circle class="c" r="${mapSpotSel===s.n?4.5:3.4}"/></g>`;
  }).join("");
  $("#mainMap .pins").innerHTML = spotPins + list.map(e=>pinHTML(e,false)).join("");
  renderRunSpotBar();
  renderMapSpotInfo();
  renderMapSearch();
  applyMapView();
  /* 그림 지도 ↔ 진짜 지도 전환 */
  document.querySelectorAll("#mapMode button").forEach(b=>b.classList.toggle("on", b.dataset.m===mapMode));
  $("#mapWrap").hidden = mapMode!=="art";
  $("#mapLegend").hidden = mapMode!=="art";
  $("#kmapWrap").hidden = mapMode!=="real";
  $("#mapAdd").style.display = (mode==="readonly" || mapMode!=="art") ? "none" : "";
  if(mapMode==="real"){
    loadKakao(()=>{ initKakaoMap(); kmap.relayout(); renderKakaoMarkers(); });
  }
  const sorted = DATA.events.filter(e=>mapFilter==="all"||e.type===mapFilter)
    .slice().sort((a,b)=>b.date.localeCompare(a.date));
  $("#mapList").innerHTML = sorted.length ? sorted.map(e=>evCard(e,true)).join("") : `<div class="empty">아직 기록이 없어요 🐾</div>`;
}

/* ---------- 지도: 가볼 곳 겹쳐 보기 ---------- */
function mapSpotPool(){ return allSpots().filter(s=>s.lat!=null); }
function mapSpots(){
  if(mapSpotCat==="off" || mapMode!=="art") return [];
  return mapSpotPool().filter(s=>s.cat===mapSpotCat && (mapSpotRegion==="all" || s.r===mapSpotRegion));
}
function renderRunSpotBar(){
  const on = (mapMode==="art");
  $("#runSpotBar").hidden = !on;
  if(!on) return;
  const pool = mapSpotPool();
  /* 분야 칩 — 좌표가 있는 곳이 하나라도 있는 분야만 */
  $("#mapSpotCat").innerHTML = `<button data-sc="off" class="${mapSpotCat==="off"?"on":""}">끄기</button>`
    + Object.keys(SPOT_CATS).filter(c=>pool.some(s=>s.cat===c)).map(c=>{
        const n = pool.filter(s=>s.cat===c).length;
        return `<button data-sc="${c}" class="${mapSpotCat===c?"on":""}">${SPOT_CATS[c].em} ${SPOT_CATS[c].l} ${n}</button>`;
      }).join("");
  /* 지역 칩 — 고른 분야에 실제로 있는 지역만 */
  const inCat = mapSpotCat==="off" ? [] : pool.filter(s=>s.cat===mapSpotCat);
  $("#runSpotRegion").hidden = !inCat.length;
  if(!inCat.length){ $("#runSpotRegion").innerHTML = ""; return; }
  $("#runSpotRegion").innerHTML = [["all","전국"]]
    .concat(RUN_REGIONS.filter(r=>inCat.some(s=>s.r===r)).map(r=>[r,r]))
    .map(([v,l])=>`<button data-sr="${v}" class="${mapSpotRegion===v?"on":""}">${l} ${inCat.filter(s=>v==="all"||s.r===v).length}</button>`).join("");
}
function renderMapSpotInfo(){
  const box = $("#mapSpotInfo");
  const s = mapSpotSel ? mapSpotPool().find(x=>x.n===mapSpotSel) : null;
  if(!s || mapMode!=="art"){ box.innerHTML = ""; return; }
  const pk = RUN_PARK[s.pk];
  let chips;
  if(s.cat==="run"){
    const su = RUN_SURFACE[s.s]||{l:"",em:"🏃"}, el = RUN_ELEV[s.el]||{l:"",em:""};
    chips = `<span class="rtag">${su.em} ${su.l}</span><span class="rtag">${el.em} ${el.l}</span>
      <span class="rtag">🌳 ${RUN_SHADE[s.sh]||"?"}</span><span class="rtag">🦟 ${RUN_BUG[s.bug]||"?"}</span>`;
  } else {
    chips = (s.tags||[]).slice(0,4).map(t=>`<span class="rtag">#${esc(t)}</span>`).join("")
      + (SPOT_FLAGS[s.cat]||[]).filter(([k])=>s[k]===true).map(([,l])=>`<span class="rtag">${l}</span>`).join("");
  }
  const rows = (SPOT_ROWS[s.cat]||[]).filter(([k])=>s[k]).slice(0,2)
    .map(([k,ic])=>`<div class="ev-sub">${ic} ${esc(String(s[k]))}</div>`).join("");
  box.innerHTML = `<div class="card" style="margin-top:10px">
    <div class="trip-h"><span class="nm">${SPOT_CATS[s.cat].em} ${esc(s.n)}</span>
      ${s.cat==="run"&&s.km!=null?`<span class="dday">${s.km}km</span>`:(s.sub?`<span class="dday">${esc(s.sub)}</span>`:"")}
      <button class="del" data-act="spot-close" aria-label="닫기">✕</button></div>
    <div class="trip-dt">${esc(s.r)} · ${esc(s.a||"")}${s.cat==="run"&&s.kmTxt?" · "+esc(s.kmTxt):""}</div>
    <div class="chips" style="margin:8px 0 0">${chips}${pk?`<span class="rtag">${pk.em} ${pk.l}</span>`:""}</div>
    ${rows}
    ${s.parkSpot?`<div class="memo" style="margin-top:8px">🅿️ <b>추천 주차</b> — ${esc(s.parkSpot)}</div>`:""}
    ${s.tip?`<div class="memo" style="margin-top:8px">💡 ${esc(s.tip)}</div>`:""}
    <div class="cal-sync">
      <button data-act="spot-plan">🗓️ ${s.cat==="run"?"여기 뛰러 가기":"일정으로 담기"}</button>
      <button data-act="spot-real">📍 진짜 지도로</button>
    </div>
  </div>`;
}
/* ---------- 지도 검색 (우리 일정 + 러닝 스팟) ---------- */
function renderMapSearch(){
  const box = $("#mapSearchOut");
  const q = mapSearchQ.trim();
  if(!q){ box.innerHTML = ""; return; }
  const evs = DATA.events.filter(e=>e.title.indexOf(q)>=0 || (e.memo||"").indexOf(q)>=0).slice(0,6);
  const sps = mapSpotPool().filter(s=>s.n.indexOf(q)>=0 || (s.a||"").indexOf(q)>=0).slice(0,8);
  if(!evs.length && !sps.length){ box.innerHTML = `<div class="empty" style="padding:8px">'${esc(q)}' 검색 결과가 없어요 🔍</div>`; return; }
  box.innerHTML =
    (evs.length ? `<div class="wl-h">🗓️ 우리 일정 ${evs.length}</div>`
      + evs.map(e=>`<button class="wi" data-sev="${e.id}"><span class="tx">${subEm(e.type,e.sub)} <b>${esc(e.title)}</b>
        <br><span style="font-size:11.5px; color:var(--muted-solid)">${e.date.replace(/-/g,".")}${e.x!=null?" · 📍 지도에 있음":""}</span></span></button>`).join("") : "")
    + (sps.length ? `<div class="wl-h">📍 가볼 곳 ${sps.length}</div>`
      + sps.map(s=>`<button class="wi" data-sspot="${esc(s.n)}"><span class="tx">${SPOT_CATS[s.cat].em} <b>${esc(s.n)}</b>${s.cat==="run"&&s.km?` · ${s.km}km`:""}
        <br><span style="font-size:11.5px; color:var(--muted-solid)">${esc(s.r)} ${esc(s.a||"")}</span></span></button>`).join("") : "");
}

/* ---------- 축제 ---------- */
function renderFest(){
  $("#festList").innerHTML = FESTS.map((f,i)=>`<div class="fe">
    <div class="top"><span class="nm">${esc(f.n)}</span><span class="when">${esc(f.t)}</span></div>
    <div class="where">${esc(f.w)}</div>
    <div class="ds">${esc(f.d)}</div>
    ${mode==="readonly"?"":`<div class="row"><button class="add" data-fi="${i}">🗓️ 달력에 담기</button></div>`}
  </div>`).join("");
}

/* ---------- 식단 ---------- */
function renderMeal(){
  const d = new Date(mealDate+"T00:00:00");
  $("#mealTitle").textContent = (d.getMonth()+1)+"월 "+d.getDate()+"일 "+["일","월","화","수","목","금","토"][d.getDay()]+"요일";
  const list = DATA.meals.filter(m=>m.date===mealDate);
  const inKcal = list.reduce((a,m)=>a+(+m.kcal||0),0);
  const outKcal = DATA.events.filter(e=>e.date===mealDate&&e.type==="run").reduce((a,e)=>a+(+e.kcal||0),0);
  const kcalBar = (inKcal||outKcal) ? `<div class="stats" style="margin:0 0 8px">
      ${inKcal?`<span class="st-fest">🍽️ 섭취 ${inKcal.toLocaleString()} kcal</span>`:""}
      ${outKcal?`<span class="st-run">🔥 운동 -${outKcal.toLocaleString()} kcal</span>`:""}
      ${(inKcal&&outKcal)?`<span class="st-date">= ${(inKcal-outKcal).toLocaleString()} kcal</span>`:""}
    </div>` : "";
  $("#mealList").innerHTML = kcalBar + Object.keys(SLOTS).map(k=>{
    const s = SLOTS[k];
    const items = list.filter(m=>m.slot===k);
    return `<div class="ml-sec">
      <div class="ml-h"><span>${s.em} ${s.label}</span>${mode==="readonly"?"":`<button class="ml-add" data-slot="${k}">+ 기록</button>`}</div>`
      + (items.length ? items.map(m=>`<div class="ml" data-id="${m.id}">
          ${m.photo?`<img class="ml-ph" src="${esc(photoSrc(m))}" alt="" loading="lazy" onerror="this.hidden=true">`:""}
          <div class="ml-bd"><span class="ml-t">${esc(m.text)||"(사진)"}</span><span class="ml-w">${m.kcal?"🔥"+m.kcal+" · ":""}${MKIND[m.mkind]||""} · ${PEOPLE[m.by]||""}</span></div>
        </div>`).join("") : `<div class="empty" style="padding:8px 4px; text-align:left">기록 없음 🍃</div>`)
      + `</div>`;
  }).join("");
}

/* ---------- 쪽지 (링크 자동 인식: 유튜브는 재생, 인스타·기타는 링크) ---------- */
const URL_RE = /https?:\/\/[^\s]+/g;
function noteParts(t){
  const out = { text:"", yt:[], ig:[], links:[] };
  out.text = (t||"").replace(URL_RE, u=>{
    const y = u.match(/(?:youtube\.com\/(?:watch\?[^\s]*v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
    if(y){ out.yt.push(y[1]); return ""; }
    if(/instagram\.com\/(p|reel|reels|tv)\//.test(u)){ out.ig.push(u); return ""; }
    out.links.push(u); return "";
  }).trim();
  return out;
}
function renderNote(){
  const feed = [];
  DATA.events.forEach(e=>{ if(e.memo||e.photo) feed.push({src:"ev", id:e.id, date:e.date, by:e.by, text:e.memo, photo:e.photo?photoSrc(e):null, ctx:subEm(e.type,e.sub)+" "+e.title, luv:e.luv}); });
  DATA.meals.forEach(m=>{ if(m.text||m.photo) feed.push({src:"ml", id:m.id, date:m.date, by:m.by, text:m.text, photo:m.photo?photoSrc(m):null, ctx:(SLOTS[m.slot]?SLOTS[m.slot].em+" "+SLOTS[m.slot].label:"")+(MKIND[m.mkind]?" · "+MKIND[m.mkind]:""), luv:m.luv}); });
  DATA.notes.forEach(n=>feed.push({src:"nt", ntype:n.ntype||"chat", cat:n.cat, evdate:n.evdate, place:n.place, lat:n.lat, lng:n.lng,
    id:n.id, date:n.date, by:n.by, text:n.text, photo:n.photo?photoSrc(n):null, media:n.media?(photoCache[n.id]||mediaUrl(n.media)):null, mtype:n.mtype, ctx:null, luv:n.luv}));
  /* 옛날 대화가 위, 최근 대화가 아래 — 보통 메신저처럼 */
  feed.sort((a,b)=> a.date===b.date ? String(a.id).localeCompare(String(b.id)) : a.date.localeCompare(b.date));
  /* 필터: 전체 / 대화 / 상황 / 기록(일정·식단에서 온 것) */
  const shown = feed.filter(f=>
    noteFilter==="all" ? true :
    noteFilter==="chat" ? (f.src==="nt" && f.ntype!=="card") :
    noteFilter==="card" ? (f.src==="nt" && f.ntype==="card") :
    (f.src!=="nt"));
  document.querySelectorAll("#noteFilterRow button").forEach(b=>b.classList.toggle("on", b.dataset.f===noteFilter));
  let html = "", lastDate = "";
  shown.forEach(f=>{
    if(f.date!==lastDate){
      lastDate = f.date;
      const d = new Date(f.date+"T00:00:00");
      html += `<div class="nd">· ${d.getMonth()+1}월 ${d.getDate()}일 ${["일","월","화","수","목","금","토"][d.getDay()]} ·</div>`;
    }
    const mine = f.by===me;
    const parts = noteParts(f.text);
    const catEm = f.cat ? ((NCATS.find(c=>c[0]===f.cat)||[])[1]||"💌") : "";
    html += `<div class="nb ${mine?"mine":""} ${f.ntype==="card"?"nbc":""}" data-src="${f.src}" data-id="${f.id}">
      ${f.ntype==="card"&&f.cat?`<div class="ncat">${catEm} ${esc(f.cat)}</div>`:""}
      ${f.ctx?`<div class="ctx">${esc(f.ctx)}</div>`:""}
      ${parts.text?`<div class="tx">${esc(parts.text)}</div>`:""}
      ${f.photo?`<img src="${esc(f.photo)}" alt="" loading="lazy" onerror="this.hidden=true">`:""}
      ${f.media&&f.mtype==="audio"?`<audio controls preload="metadata" src="${esc(f.media)}" style="width:100%; min-width:180px; margin-top:6px"></audio>`:""}
      ${f.media&&f.mtype==="video"?`<video controls preload="metadata" src="${esc(f.media)}" style="width:100%; min-width:180px; border-radius:10px; margin-top:6px"></video>`:""}
      ${parts.yt.map(id=>`<button class="ytthumb" data-yt="${id}" aria-label="유튜브 재생"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="play">▶</span></button>`).join("")}
      ${parts.ig.map(u=>`<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">📸 인스타 영상 보러가기 ↗</a>`).join("")}
      ${parts.links.map(u=>`<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">🔗 ${esc(u.length>40?u.slice(0,40)+"…":u)}</a>`).join("")}
      ${f.evdate?`<button class="nbdg" data-bdg="date" data-d="${f.evdate}">🗓️ ${f.evdate.slice(5).replace("-","/")}</button>`:""}
      ${f.place&&f.lat!=null?`<button class="nbdg" data-bdg="loc" data-lat="${f.lat}" data-lng="${f.lng}">📍 ${esc(f.place)}</button>`:""}
      <div class="ft"><span>${PEOPLE[f.by]||""}</span>
        ${!mine && mode!=="readonly" ? `<button class="luv ${f.luv?"on":""}" data-act="luv" aria-label="하트">💛</button>` : (f.luv?`<span class="luv on">💛</span>`:"")}
        ${mine && f.src==="nt" && mode!=="readonly" ? `<button class="ndel" data-act="ndel" aria-label="삭제">✕</button>`:""}
      </div></div>`;
  });
  /* 최근 쪽지가 맨 아래에 쌓이므로, 아래쪽을 보고 있었으면 자동으로 따라 내려간다 */
  const de = document.documentElement;
  const wasBottom = (de.scrollHeight - window.scrollY - window.innerHeight) < 240;
  $("#noteFeed").innerHTML = html || `<div class="empty">아직 쪽지가 없어요. 첫 쪽지를 보내보세요 💌</div>`;
  if(wasBottom && !$("#view-note").hidden) requestAnimationFrame(()=>window.scrollTo(0, de.scrollHeight));
  const ro = mode==="readonly";
  $("#noteIn").parentElement.style.display = ro?"none":"";
  $("#emoRow").style.display = ro?"none":"";
}

/* ---------- 글자를 눌러서 그 자리에서 고치기 ---------- */
function inlineEdit(el, cur, onSave){
  if(el.dataset.editing) return;
  el.dataset.editing = "1";
  const inp = document.createElement("input");
  inp.type = "text"; inp.maxLength = 200; inp.value = cur; inp.className = "inline-in";
  el.textContent = ""; el.appendChild(inp);
  inp.focus(); inp.setSelectionRange(cur.length, cur.length);
  let fin = false;
  const end = ok=>{
    if(fin) return; fin = true; delete el.dataset.editing;
    const v = inp.value.trim();
    onSave(ok && v && v!==cur ? v : null);
  };
  inp.addEventListener("keydown", e=>{ e.stopPropagation();
    if(e.key==="Enter"){ e.preventDefault(); end(true); }
    if(e.key==="Escape"){ e.preventDefault(); end(false); } });
  inp.addEventListener("blur", ()=>end(true));
  inp.addEventListener("click", e=>e.stopPropagation());
}

/* ---------- 여행 ---------- */
function ddayTxt(start){
  if(!start) return "날짜 미정";
  const t = new Date(ymd(new Date())+"T00:00:00"), s = new Date(start+"T00:00:00");
  const diff = Math.round((s-t)/86400000);
  return diff>0 ? "D-"+diff : diff===0 ? "D-DAY 🎉" : "다녀옴 🧡";
}
let tripEdit = null;          /* 제목·날짜를 고치는 중인 여행 id */
const WISH_KINDS = { go:["📍","가보고 싶은 곳"], eat:["🍜","먹고 싶은 것"], do:["🎡","하고 싶은 것"] };
function wishHTML(t){
  const ws = t.wish||[];
  return Object.keys(WISH_KINDS).map(k=>{
    const list = ws.filter(w=>w.kind===k), km = WISH_KINDS[k];
    return `<div class="wl-h">${km[0]} ${km[1]} <span class="wl-n">${list.length}</span></div>`
      + (list.length ? `<div class="wgrid">` + list.map(w=>{
          const parts = noteParts([w.note, w.link].filter(Boolean).join(" "));
          return `<div class="wcard ${w.done?"done":""}" data-wish="${w.id}">
            ${w.photo?`<img src="${esc(photoSrc(w))}" alt="" loading="lazy" onerror="this.hidden=true">`:""}
            <div class="wc-bd">
              <div class="wc-tx">${esc(w.text)}</div>
              ${parts.text?`<div class="wc-nt">${esc(parts.text)}</div>`:""}
              ${parts.yt.map(id=>`<button class="ytthumb" data-yt="${id}" aria-label="유튜브 재생"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="play">▶</span></button>`).join("")}
              ${parts.ig.map(u=>`<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">📸 인스타 보러가기 ↗</a>`).join("")}
              ${parts.links.map(u=>`<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">🔗 ${esc(u.length>28?u.slice(0,28)+"…":u)}</a>`).join("")}
              <div class="wc-ft"><span>${PEOPLE[w.by]||""}</span>
                ${mode!=="readonly"?`<button class="wc-b" data-act="ws-done">${w.done?"✅ 했어요":"○ 아직"}</button>
                <button class="wc-b" data-act="ws-edit">✏️</button>
                <button class="wc-b" data-act="ws-del">✕</button>`:(w.done?`<span>✅</span>`:"")}
              </div>
            </div></div>`;
        }).join("") + `</div>`
        : `<div class="empty" style="padding:6px 4px; text-align:left">아직 없어요</div>`)
      + (mode!=="readonly"?`<button class="addbtn wl-add" data-act="ws-new" data-kind="${k}">+ ${km[1]} 올리기</button>`:"");
  }).join("");
}
function renderTrip(){
  const fmt = s=>{ if(!s) return "?"; const d=new Date(s+"T00:00:00"); return (d.getMonth()+1)+"/"+d.getDate()+"("+["일","월","화","수","목","금","토"][d.getDay()]+")"; };
  const list = DATA.trips.slice().sort((a,b)=>(a.start||"").localeCompare(b.start||""));
  $("#tripList").innerHTML = list.length ? list.map(t=>{
    let end=""; if(t.start){ const d=new Date(t.start+"T00:00:00"); d.setDate(d.getDate()+(+t.nights||0)); end=ymd(d); }
    const its = t.items||[];
    const done = its.filter(i=>i.done).length, pct = its.length?Math.round(done/its.length*100):0;
    const editing = tripEdit===t.id && mode!=="readonly";
    return `<div class="card" data-trip="${t.id}">
      <div class="trip-h"><span class="nm">✈️ ${esc(t.title)} · ${+t.nights>0?t.nights+"박 "+(+t.nights+1)+"일":"당일치기"}</span>
        <span class="dday">${ddayTxt(t.start)}</span>
        ${mode!=="readonly"?`<button class="del" data-act="tr-edit" aria-label="여행 고치기" title="제목·날짜 고치기">✏️</button>
        <button class="del" data-act="tr-del" aria-label="여행 삭제">✕</button>`:""}</div>
      ${editing ? `<div class="tr-edit">
          <div class="f-lb">어디로</div>
          <input type="text" class="f-in" data-e="title" maxlength="40" value="${esc(t.title)}">
          <div class="tr-row">
            <div style="flex:1"><div class="f-lb">출발일</div><input type="date" class="f-in" data-e="start" value="${esc(t.start||"")}"></div>
            <div style="width:110px"><div class="f-lb">몇 박?</div><input type="number" class="f-in" data-e="nights" min="0" max="60" value="${+t.nights||0}"></div>
          </div>
          <div class="tr-erow"><button class="cancel" data-act="tr-ecancel">취소</button><button class="save" data-act="tr-esave">저장</button></div>
        </div>`
        : `<div class="trip-dt">${fmt(t.start)} 출발 → ${fmt(end)} 도착</div>`}
      <div class="wprog" style="margin-top:8px"><div class="wprog-bar" style="width:${pct}%; background:var(--run)"></div></div>
      <div class="wprog-txt">한국에서 준비할 것 ${done}/${its.length} (${pct}%)</div>
      ${its.map(i=>`<div class="wi ${i.done?"done":""}" data-id="${i.id}">
        <input type="checkbox" class="chk" data-act="tr-chk" style="accent-color:var(--run)" ${i.done?"checked":""} ${mode==="readonly"?"disabled":""}>
        <span class="tx" ${mode!=="readonly"?`data-act="tr-itext" title="눌러서 고치기"`:""}>${esc(i.text)}</span>
        ${mode!=="readonly"?`<button class="del" data-act="tr-idel" aria-label="삭제">✕</button>`:""}
      </div>`).join("")}
      ${mode!=="readonly"?`<div class="wadd"><input type="text" maxlength="80" placeholder="추가 (예: KE721 예약번호 ABC123)"><button data-act="tr-iadd">추가</button></div>`:""}
      <div class="wl-sec">${wishHTML(t)}</div>
    </div>`;
  }).join("") : `<div class="empty">아직 계획한 여행이 없어요 🌏 어디부터 갈까요?</div>`;
}

/* ---------- 체크리스트 · 스킬트리 (결혼·살림 공용) ---------- */
function checkProg(key){ const it=boardItems(key); const d=it.filter(i=>i.done).length; return {d, t:it.length, pct: it.length?Math.round(d/it.length*100):0}; }
function progHTML(key, color){
  const p = checkProg(key);
  if(!p.t) return "";
  return `<div class="wprog"><div class="wprog-bar" style="width:${p.pct}%${color?"; background:"+color:""}"></div></div>
    <div class="wprog-txt">${p.d} / ${p.t} 완료 (${p.pct}%) ${p.pct===100?"🎉":""}</div>`;
}
function seedBtnHTML(key){
  return mode==="readonly" ? `<div class="empty">아직 항목이 없어요</div>`
    : `<button class="addbtn" data-actseed="${key}" style="margin-top:8px">${BOARDS[key].seedLabel}</button>`;
}
/* 일반 체크리스트 (신혼집·반려동물) */
function checklistHTML(key){
  const b = BOARDS[key], items = boardItems(key);
  if(!items.length) return seedBtnHTML(key);
  return b.cats.map((c,ci)=>{
    const list = items.filter(i=>i.cat===ci);
    return `<div class="wl-h">${c}</div>`
      + (list.length ? list.map(i=>`<div class="wi ${i.done?"done":""}" data-board="${key}" data-id="${i.id}">
          <input type="checkbox" class="chk" data-act="chk" ${i.done?"checked":""} ${mode==="readonly"?"disabled":""}>
          <span class="tx">${esc(i.text)}</span>
          <button class="who" data-act="who">${W_WHO[i.who]||"같이"}</button>
          ${mode!=="readonly"?`<button class="del" data-act="del" aria-label="삭제">✕</button>`:""}
        </div>`).join("") : `<div class="empty" style="padding:6px 4px; text-align:left">비어 있어요</div>`)
      + (mode!=="readonly"?`<div class="wadd"><input type="text" maxlength="80" placeholder="항목 추가" data-board="${key}" data-cat="${ci}"><button data-act="bdadd">추가</button></div>`:"");
  }).join("");
}
/* 스킬트리 (결혼·아이): 노드 탭 → 상세(날짜·장소·메모) */
function qtreeHTML(key){
  const b = BOARDS[key], items = boardItems(key);
  if(!items.length) return seedBtnHTML(key);
  return b.cats.map((c,ci)=>{
    const list = items.filter(i=>i.cat===ci);
    const em = c.split(" ")[0];
    const done = list.filter(i=>i.done).length;
    return `<div class="qtier"><div class="qtier-h">${c} <span>⭐ ${done}/${list.length}</span></div>
      <div class="qrow">`
      + list.map(i=>`<button class="qnode ${i.done?"done":""}" data-board="${key}" data-id="${i.id}">
          <span class="c">${i.done?"⭐":em}${(i.date||i.place||i.memo)?`<span class="bdg">📌</span>`:""}</span>
          <span class="t">${esc(i.text)}</span></button>`).join("")
      + (mode!=="readonly"?`<button class="qnode qadd" data-board="${key}" data-cat="${ci}"><span class="c">＋</span><span class="t">추가</span></button>`:"")
      + `</div></div>`;
  }).join("");
}
/* 마일스톤 경로 (금연·몸무게·저축): nodes = [{em,l,s,on,now}] */
function qpathHTML(nodes){
  return `<div class="qpath">`+nodes.map(n=>`<div class="qp ${n.on?"on":""} ${n.now?"now":""}">
    <span class="c">${n.em}</span><div class="l">${n.l}</div><div class="s">${n.s||""}</div>
  </div>`).join("")+`</div>`;
}

function renderWed(){
  $("#wedProg").innerHTML = progHTML("wed");
  $("#wedList").innerHTML = qtreeHTML("wed");
}

/* ---------- 살림 노트 (신혼집·아이·반려동물·냉장고) ---------- */
function fridgeHTML(){
  const todayD = new Date(ymd(new Date())+"T00:00:00");
  const fmtD = s=>{ if(!s) return ""; const dd=Math.round((new Date(s+"T00:00:00")-todayD)/86400000); return dd<0?`<b class="exp-bad">지남!</b>`:dd<=3?`<b class="exp-soon">D-${dd}</b>`:`D-${dd}`; };
  const items = DATA.fridge.slice().sort((a,b)=>(a.exp||"9999").localeCompare(b.exp||"9999"));
  const ro = mode==="readonly";
  return `<div class="wl-h">🧊 냉장고 안에 (유통기한 순)</div>
  ${ro?"":`<div class="fr-add">
    <input type="text" id="frName" maxlength="30" placeholder="음식 이름">
    <input type="date" id="frExp" title="유통기한">
    <button id="frAddBtn">넣기</button>
  </div>`}
  ${items.length? items.map(f=>`<div class="wi" data-id="${f.id}">
      <span class="tx">${esc(f.name)}</span>
      <span class="ml-w">${f.exp? f.exp.slice(5).replace("-","/")+" · "+fmtD(f.exp):""}</span>
      ${ro?"":`<button class="who" data-act="fr-eat">먹었어요 🍽️</button><button class="del" data-act="fr-del">✕</button>`}
    </div>`).join("") : `<div class="empty">냉장고가 비었어요 🧊</div>`}
  <div class="wl-h">🛒 장보기 목록</div>
  ${ro?"":`<div class="wadd"><input type="text" id="spName" maxlength="30" placeholder="살 것"><button id="spAddBtn">추가</button></div>`}
  ${DATA.shop.length? DATA.shop.map(s=>`<div class="wi" data-id="${s.id}">
      <span class="tx">${esc(s.name)}</span>
      ${ro?"":`<button class="who" data-act="sp-buy">샀어요 → 🧊</button><button class="del" data-act="sp-del">✕</button>`}
    </div>`).join(""):`<div class="empty">살 게 없어요 🎉</div>`}
  <div class="us-note" style="margin-top:10px">"먹었어요"를 누르면 그대로 식단 기록으로 이어져요 🍽️</div>`;
}
function renderHome(){
  document.querySelectorAll("#homeChips button").forEach(b=>b.classList.toggle("on", b.dataset.b===homeBoard));
  if(homeBoard==="fridge"){ $("#homeBody").innerHTML = fridgeHTML(); return; }
  const body = BOARDS[homeBoard].tree ? qtreeHTML(homeBoard) : checklistHTML(homeBoard);
  $("#homeBody").innerHTML = progHTML(homeBoard) + body;
}

/* ---------- 궁합 ---------- */
function renderFate(){
  const pf = DATA.profile || {cs:{},hj:{}};
  $("#pfForm").innerHTML = ["cs","hj"].map(p=>{
    const o=pf[p]||{};
    return `<div class="wl-h">${p==="cs"?"🧑":"👩"} ${PEOPLE[p]}</div>
    <div class="f-lb">생년월일 (양력)</div>
    ${birthPicker(p, o.birth)}
    <div class="f-lb">태어난 시</div><select class="f-in pf-time" data-p="${p}">${timeOptions(o.time!=null?+o.time:-1)}</select>
    <div class="f-lb">MBTI</div>${mbtiRow(p,o.mbti||"")}`;
  }).join("");
  $("#pfSave").style.display = mode==="readonly"?"none":"";
  $("#fateOut").innerHTML = fateOutHTML(pf);
}

/* ---------- 몸 기록 ---------- */
function weightPathHTML(P, logs){
  const goal = +P.goal;
  if(!goal || !logs.length) return "";
  const start = logs[logs.length-1].w, cur = logs[0].w;
  if(start===goal) return "";
  const N = 5, nodes = [];
  let nowIdx = 0;
  for(let i=0;i<=N;i++){
    const wv = start + (goal-start)*i/N;
    const on = goal<start ? cur<=wv+0.05 : cur>=wv-0.05;
    if(on) nowIdx = i;
    nodes.push({ em: i===0?"🚩":i===N?"🏆":"🔥", l: wv.toFixed(1)+"kg", s: i===0?"시작":i===N?"목표!":"", on });
  }
  if(nodes[nowIdx]) nodes[nowIdx].now = true;
  return `<div class="wl-h">목표까지 가는 길 (지금 ${cur}kg)</div>` + qpathHTML(nodes);
}
function renderBody(){
  document.querySelectorAll("#bodyChips button").forEach(b=>b.classList.toggle("on", b.dataset.p===bodyP));
  const P = DATA.bodyP[bodyP]||{};
  const logs = DATA.bodyLogs.filter(l=>l.who===bodyP).sort((a,b)=>b.date.localeCompare(a.date));
  const last = logs[0], prev = logs[1];
  const h = +P.height||0;
  const bmi = (last && h) ? (last.w/((h/100)*(h/100))) : null;
  const bmiCat = b=> b<18.5?"저체중":b<23?"정상 ✨":b<25?"과체중":"비만";
  const delta = (a,b)=> (a!=null&&b!=null&&!isNaN(a)&&!isNaN(b)) ? (a===b?"—":(a>b?"▲ ":"▼ ")+Math.abs(a-b).toFixed(1)) : "";
  const ro = mode==="readonly";
  $("#bodyBody").innerHTML = `
    <div class="tr-row" style="margin-top:6px">
      <div style="flex:1"><div class="f-lb">키 (cm)</div><input type="number" class="f-in" id="bdH" step="0.1" value="${P.height||""}" ${ro?"disabled":""}></div>
      <div style="flex:1"><div class="f-lb">목표 몸무게 (kg)</div><input type="number" class="f-in" id="bdG" step="0.1" value="${P.goal||""}" ${ro?"disabled":""}></div>
    </div>
    ${ro?"":`<button class="addbtn" id="bdPSave" style="margin-top:10px; padding:11px">기본 정보 저장 📌</button>`}
    ${last?`<div class="bd-sum">
      <div class="bd-c"><div class="v">${last.w} kg</div><div class="l">몸무게</div><div class="d">${delta(last.w, prev&&prev.w)}${P.goal?" · 목표까지 "+Math.max(0,(last.w-P.goal)).toFixed(1)+"kg":""}</div></div>
      <div class="bd-c"><div class="v">${bmi?bmi.toFixed(1):"—"}</div><div class="l">BMI</div><div class="d">${bmi?bmiCat(bmi):"키를 입력하면 계산돼요"}</div></div>
      <div class="bd-c"><div class="v">${last.m!=null&&last.m!==""?last.m+" kg":"—"}</div><div class="l">골격근량</div><div class="d">${delta(+last.m, prev&&+prev.m)}</div></div>
      <div class="bd-c"><div class="v">${last.f!=null&&last.f!==""?last.f+" %":"—"}</div><div class="l">체지방률</div><div class="d">${delta(+last.f, prev&&+prev.f)}</div></div>
    </div>`:`<div class="empty">첫 기록을 남겨보세요 📊</div>`}
    ${last?weightPathHTML(P, logs):""}
    ${ro?"":`<div class="f-lb" style="margin-top:14px">오늘 기록 (인바디 찍은 날!)</div>
    <div class="bd-row3">
      <div><input type="number" class="f-in" id="bdW" step="0.1" placeholder="몸무게 kg"></div>
      <div><input type="number" class="f-in" id="bdM" step="0.1" placeholder="골격근 kg"></div>
      <div><input type="number" class="f-in" id="bdF" step="0.1" placeholder="체지방 %"></div>
    </div>
    <button class="addbtn" id="bdLSave" style="margin-top:8px; padding:11px">＋ 오늘 기록하기</button>`}
    ${logs.length?`<div class="wl-h">지난 기록</div>`+logs.slice(0,10).map(l=>`<div class="wi" data-id="${l.id}">
      <span class="tx">${l.date.slice(2).replace(/-/g,".")} — ${l.w}kg${l.m?" · 근육 "+l.m+"kg":""}${l.f?" · 지방 "+l.f+"%":""}</span>
      ${ro?"":`<button class="del" data-act="bl-del" aria-label="삭제">✕</button>`}
    </div>`).join(""):""}
    <details class="gls"><summary>이 숫자들이 뭘 뜻하냐면 🤓</summary>
      <b>BMI</b> = 몸무게(kg) ÷ 키(m)². 아시아 기준으로 18.5~23이 정상, 23~25 과체중, 25 이상 비만이에요. 근육이 많으면 높게 나오니 참고용!<br>
      <b>골격근량</b> = 팔다리·몸통의 순수 근육량. 다이어트 중에도 이건 지키는 게 목표예요.<br>
      <b>체지방률</b> = 몸에서 지방의 비율. 보통 남성 15~20%, 여성 20~28%면 건강 범위로 봐요.<br>
      비교는 어제의 나하고만. 둘이 비교는 금지 🙅💛
    </details>`;
}

/* ---------- 같이 보기 ---------- */
function renderShow(){
  const ro = mode==="readonly";
  $("#showList").innerHTML = DATA.shows.length ? DATA.shows.map(s=>`<div class="wi ${s.done?"done":""}" data-id="${s.id}">
      <span class="tx">📺 ${esc(s.title)} — <b>${s.ep||0}화</b>${s.total?" / "+s.total+"화":""}${s.done?" 완주 🎉":""}</span>
      ${ro?"":`<button class="who" data-act="show-ep">+1화</button><button class="who" data-act="show-done">${s.done?"다시":"끝!"}</button><button class="del" data-act="show-del" aria-label="삭제">✕</button>`}
    </div>`).join("") : `<div class="empty">같이 보는 게 없네요. 오늘 하나 정해볼까요? 🍿</div>`;
}

/* ---------- 금연 ---------- */
function renderSmoke(){
  $("#smokeQuote").textContent = pickQuote("smoke");
  document.querySelectorAll("#smokeChips button").forEach(b=>b.classList.toggle("on", b.dataset.p===smokeP));
  const s = DATA.smoke[smokeP];
  const ro = mode==="readonly";
  if(!s){
    $("#smokeBody").innerHTML = ro ? `<div class="empty">아직 금연 도전이 없어요</div>` : `
      <div class="us-note" style="margin:8px 2px">담배를 안 피우면 비워두면 돼요. 도전한다면 아래를 채우고 시작! 💪</div>
      <div class="f-lb">금연 시작일</div><input type="date" class="f-in" id="smStart" value="${ymd(new Date())}">
      <div class="tr-row" style="margin-top:8px">
        <div style="flex:1"><div class="f-lb">하루에 몇 갑?</div><input type="number" class="f-in" id="smPacks" step="0.5" min="0.5" value="1"></div>
        <div style="flex:1"><div class="f-lb">한 갑 가격 (원)</div><input type="number" class="f-in" id="smPrice" step="100" value="4500"></div>
      </div>
      <button class="addbtn" id="smStartBtn" style="margin-top:10px">🚭 금연 시작!</button>`;
    return;
  }
  const days = Math.max(0, Math.round((new Date(ymd(new Date())+"T00:00:00") - new Date(s.quit+"T00:00:00"))/86400000));
  const cigs = Math.round(days * s.packs * 20);
  const won = Math.round(days * s.packs * s.price);
  let nowIdx = -1;
  const nodes = SMOKE_TL.map((t,i)=>{ const on = days>=t.days; if(on) nowIdx=i; return { em:t.em, l:t.l, s:t.s, on }; });
  if(nodes[nowIdx]) nodes[nowIdx].now = true;
  $("#smokeBody").innerHTML = `
    <div class="bd-sum" style="grid-template-columns:1fr 1fr 1fr">
      <div class="bd-c"><div class="v">D+${days}</div><div class="l">금연 ${days}일째 🎉</div></div>
      <div class="bd-c"><div class="v">${cigs.toLocaleString()}개비</div><div class="l">안 피운 담배</div></div>
      <div class="bd-c"><div class="v">₩${won.toLocaleString()}</div><div class="l">아낀 돈 💰</div></div>
    </div>
    <div class="wl-h">몸이 좋아지는 길 (WHO·CDC 기준)</div>
    ${qpathHTML(nodes)}
    <details class="gls"><summary>흡연 욕구가 올라올 때 🆘</summary>
      <b>4D 법칙</b>: Delay(5분만 미루기) · Deep breath(깊게 숨쉬기) · Drink water(물 한 잔) · Do something(딴짓하기 — 쪽지 보내기 💌)<br>
      <b>공짜 도움</b>: 전국 보건소 금연클리닉(무료, 니코틴 보조제 지원) · 금연상담전화 ☎ 1544-9030 · 약국에서 니코틴 패치/껌 상담<br>
      욕구는 보통 3~5분이면 지나가요. 그 5분만 넘기면 이긴 거예요 💪
    </details>
    ${ro?"":`<button class="wide-btn" id="smReset">다시 설정하기</button>`}`;
}

/* ---------- 재테크 ---------- */
function renderInvest(){
  $("#invQuote").textContent = pickQuote("invest");
  const g = DATA.invest.goal;
  const ro = mode==="readonly";
  let goalHtml = "";
  if(g && +g.target){
    const pct = Math.min(100, Math.round((+g.saved||0)/+g.target*100));
    let nowIdx = 0;
    const nodes = [0,25,50,75,100].map((p,i)=>{ const on = pct>=p; if(on) nowIdx=i; return { em:p===0?"🌱":p===100?"🏆":"💰", l:p+"%", s: Math.round(+g.target*p/100/10000).toLocaleString()+"만", on }; });
    if(nodes[nowIdx]) nodes[nowIdx].now = true;
    goalHtml = `<div class="fate-p"><b>🎯 ${esc(g.name||"우리 목표")}</b> — ${(+g.saved||0).toLocaleString()}원 / ${(+g.target||0).toLocaleString()}원</div>`
      + qpathHTML(nodes)
      + `<div class="wprog-txt">${pct}% 모았어요 ${pct>=100?"🎉 달성!":"🌱"}</div>`;
  }
  $("#invGoal").innerHTML = goalHtml +
    (ro?"":`<div class="f-lb" style="margin-top:${g?"12px":"4px"}">${g?"목표 수정":"공동 저축 목표 만들기"}</div>
    <input type="text" class="f-in" id="igName" maxlength="30" placeholder="목표 이름 (예: 신혼집 자금)" value="${g?esc(g.name):""}">
    <div class="tr-row" style="margin-top:8px">
      <div style="flex:1"><div class="f-lb">목표 금액 (원)</div><input type="number" class="f-in" id="igTarget" value="${g?g.target:""}"></div>
      <div style="flex:1"><div class="f-lb">모은 금액 (원)</div><input type="number" class="f-in" id="igSaved" value="${g?g.saved:""}"></div>
    </div>
    <button class="addbtn" id="igSave" style="margin-top:10px; padding:11px">🎯 목표 저장</button>`);
  document.querySelectorAll("#invKind button").forEach(b=>b.classList.toggle("on", b.dataset.k===invKindSel));
  $("#invList").innerHTML = DATA.invest.notes.length ? DATA.invest.notes.map(n=>`<div class="wi" data-id="${n.id}">
      <span class="tx">${INV_KINDS[n.k]||"📦"} ${esc(n.title)}</span>
      <span class="ml-w">${PEOPLE[n.by]||""}</span>
      ${ro?"":`<button class="del" data-act="iv-del" aria-label="삭제">✕</button>`}
    </div>`).join("") : `<div class="empty">아직 기록이 없어요. 첫 자산을 적어볼까요? 🌱</div>`;
}

/* ---------- 약속 (바라는 점·취미·꿈·버킷리스트) ---------- */
function renderUs(){
  const kinds = [
    {k:"do", h:"💛 이렇게 해주면 좋겠어", ack:true},
    {k:"dont", h:"🙏 이건 안 해줬으면", ack:true},
    {k:"value", h:"🌟 지금 나에게 중요한 것"},
    {k:"hobby", h:"🎨 취미"},
    {k:"talent", h:"🏆 특기"},
    {k:"dream", h:"🌙 꿈"},
    {k:"bucket", h:"🪣 버킷리스트 — 이루면 체크!", chk:true},
  ];
  $("#usWrap").innerHTML = ["cs","hj"].map(p=>{
    const mine = p===me;
    return `<div class="card">
      <div class="who-name">${p==="cs"?"🧑":"👩"} ${PEOPLE[p]}의 마음</div>
      <div class="who-sub">${mine?"내 칸이에요 — 자유롭게 적어요 ✏️":PEOPLE[p]+"님의 이야기 — 부탁에는 “알겠어”로 답해줘요 💛"}</div>
      ${kinds.map(kk=>{
        const items = DATA.wishes.filter(w=>w.who===p && w.kind===kk.k);
        return `<div class="wl-h">${kk.h}</div>`
          + (items.length ? items.map(w=>`<div class="wi ${kk.chk&&w.ack?"done":""}" data-id="${w.id}">
              ${kk.chk?`<input type="checkbox" class="chk" data-act="wchk" style="accent-color:var(--date)" ${w.ack?"checked":""} ${mode==="readonly"?"disabled":""}>`:""}
              <span class="tx">${esc(w.text)}${kk.chk&&w.ack?" 🎉":""}</span>
              ${kk.ack ? (!mine && mode!=="readonly" ? `<button class="ack ${w.ack?"yes":""}" data-act="ack">${w.ack?"알겠어 ✓":"알겠어"}</button>`
                : (w.ack?`<span class="ack yes">알겠어 ✓</span>`:"")) : ""}
              ${mine && mode!=="readonly" ? `<button class="del" data-act="del" aria-label="삭제">✕</button>`:""}
            </div>`).join("") : `<div class="empty" style="padding:6px 4px; text-align:left">아직 없어요 💭</div>`)
          + (mine && mode!=="readonly" ? `<div class="wadd"><input type="text" maxlength="80" placeholder="한 가지씩, 짧게" data-p="${p}" data-k="${kk.k}"><button data-act="wadd">추가</button></div>` : "");
      }).join("")}
    </div>`;
  }).join("");
}

/* ---------- 트리 허브 (계획·서랍) ---------- */
const PLAN_TREE = [
  { h:"🌱 목표 · 준비", kids:[
    ["wed","💍","결혼 준비"],["trip","✈️","여행"],["home","🏠","신혼집"],["baby","👶","아이"],
    ["pet","🐾","반려동물"],["smoke","🚭","금연"],["body","📊","몸 만들기"],["invest","🪙","재테크"]]},
  { h:"📔 매일 기록", kids:[
    ["meal","🍚","식단"],["show","📺","같이 보기"],["fridge","🧊","냉장고·장보기"]]},
  { h:"🧭 어디 갈까", kids:[
    ["run","🏃","러닝 스팟"],["spot","🧭","카페·맛집·등산·숙박"],
    ["spot:fest","🎪","축제"],["spot:camp","⛺","캠핑"],["spot:drive","🚗","드라이브"],
    ["spot:snow","⛷️","스키·썰매"],["spot:spa","♨️","온천"]]},
];
const BOX_TREE = [
  { h:"💑 우리 이야기", kids:[["fate","🔮","우리 궁합"],["us","🤙","우리 약속"]]},
  { h:"🗂️ 참고 자료", kids:[["fest","🎪","축제 달력(예년 기준)"],["benefit","🎁","나라 혜택"]]},
];
/* 각 항목 밑에 보여줄 한 줄 진행 상황 */
function planStatus(key){
  const pctOf = k => { const p=checkProg(k); return p.t ? "⭐ "+p.pct+"% ("+p.d+"/"+p.t+")" : "시작 전"; };
  /* spot:축제 처럼 특정 분야로 바로 가는 항목 */
  if(key.indexOf("spot:")===0){
    const c = key.slice(5), n = spotsOfCat(c).length;
    return n ? "전국 "+n+"곳" : "조사 중이에요 🔍";
  }
  switch(key){
    case "wed": case "home": case "baby": case "pet": return pctOf(key);
    case "trip": {
      const t0 = ymd(new Date());
      const up = DATA.trips.filter(t=>t.start && t.start>=t0).sort((a,b)=>a.start.localeCompare(b.start))[0];
      if(up) return ddayTxt(up.start)+" "+up.title;
      return DATA.trips.length ? "다녀온 여행 "+DATA.trips.length+"개" : "계획 없음";
    }
    case "smoke": {
      const s = DATA.smoke[me]; if(!s) return "도전 대기 중";
      const days = Math.max(0, Math.round((new Date(ymd(new Date())+"T00:00:00")-new Date(s.quit+"T00:00:00"))/86400000));
      return "금연 D+"+days+" 🎉";
    }
    case "body": {
      const P = DATA.bodyP[me]||{};
      const logs = DATA.bodyLogs.filter(l=>l.who===me).sort((a,b)=>b.date.localeCompare(a.date));
      if(logs[0] && P.goal) return "목표까지 "+Math.max(0,(logs[0].w-P.goal)).toFixed(1)+"kg";
      return logs.length ? "기록 "+logs.length+"번" : "첫 기록 대기";
    }
    case "invest": {
      const g = DATA.invest.goal;
      return (g && +g.target) ? Math.min(100,Math.round((+g.saved||0)/+g.target*100))+"% 모음" : "목표 없음";
    }
    case "meal": { const n = DATA.meals.filter(m=>m.date===ymd(new Date())).length; return "오늘 "+n+"끼 기록"; }
    case "show": { const n = DATA.shows.filter(s=>!s.done).length; return n ? n+"개 보는 중" : "보는 것 없음"; }
    case "fridge": return DATA.fridge.length+"개 · 장보기 "+DATA.shop.length+"개";
    case "fate": return (DATA.profile && DATA.profile.cs && DATA.profile.cs.birth && DATA.profile.hj && DATA.profile.hj.birth) ? "궁합 완성 💘" : "생일 입력하기";
    case "us": return DATA.wishes.length ? DATA.wishes.length+"개 적음" : "비어 있어요";
    case "run": return "전국 "+RUN_SPOTS.length+"곳 중에서 고르기";
    case "spot": return SPOTS.length ? "전국 "+SPOTS.length+"곳" : "조사 중이에요 🔍";
    case "fest": return "예년 일정 "+FESTS.length+"개";
    case "benefit": return "챙길 혜택 6가지";
  }
  return "";
}
function treeHubHTML(tree){
  return tree.map(b=>`<div class="tree-branch"><div class="tree-h">${b.h}</div>
    <div class="tree-kids">`+b.kids.map(k=>`<button class="tnode" data-go="${k[0]}">
      <span class="ti">${k[1]}</span><span class="tx2"><span class="tl">${k[2]}</span><span class="ts">${planStatus(k[0])}</span></span>
    </button>`).join("")+`</div></div>`).join("");
}
function renderPlanHub(){ $("#planTree").innerHTML = treeHubHTML(PLAN_TREE); }
function renderBoxHub(){ $("#boxTree").innerHTML = treeHubHTML(BOX_TREE); }

/* ---------- 러닝 스팟 찾기 ---------- */
function runMatches(){
  return RUN_SPOTS.filter(p=>{
    if(runF.region!=="all" && p.r!==runF.region) return false;
    if(runF.dist!=="all"){
      const km = p.km;
      if(km==null) return false;
      if(runF.dist==="s" && !(km<=3)) return false;
      if(runF.dist==="m" && !(km>3 && km<=6)) return false;
      if(runF.dist==="l" && !(km>6)) return false;
    }
    if(runF.surf!=="all" && p.s!==runF.surf) return false;
    if(runF.want.flat && p.el!=="flat") return false;
    if(runF.want.shade && !(p.sh>=2)) return false;
    if(runF.want.nobug && !(p.bug<=0)) return false;
    if(runF.want.park && p.pk!=="free") return false;
    if(runF.want.lit && p.lit!==true) return false;
    if(runF.want.wc && p.wc!==true) return false;
    return true;
  });
}
function runCard(p, i){
  const su = RUN_SURFACE[p.s]||{l:p.s,em:"🏃"};
  const el = RUN_ELEV[p.el]||{l:"",em:""};
  const pk = RUN_PARK[p.pk]||{l:"",em:""};
  return `<div class="card runc" data-i="${i}">
    <div class="trip-h"><span class="nm">🏃 ${esc(p.n)}</span>
      ${p.km!=null?`<span class="dday">${p.km}km</span>`:""}</div>
    <div class="trip-dt">${esc(p.r)} · ${esc(p.a||"")}${p.kmTxt?" · "+esc(p.kmTxt):""}</div>
    <div class="chips" style="margin:8px 0 0">
      <span class="rtag">${su.em} ${su.l}</span>
      <span class="rtag">${el.em} ${el.l}</span>
      <span class="rtag">🌳 ${RUN_SHADE[p.sh]||"?"}</span>
      <span class="rtag">🦟 ${RUN_BUG[p.bug]||"?"}</span>
      <span class="rtag">${pk.em} ${pk.l}</span>
      ${p.lit?`<span class="rtag">💡 야간 조명</span>`:""}
      ${p.wc?`<span class="rtag">🚻 화장실</span>`:""}
      ${p.water?`<span class="rtag">🚰 음수대</span>`:""}
    </div>
    ${p.parkSpot?`<div class="memo" style="margin-top:8px">🅿️ <b>추천 주차</b> — ${esc(p.parkSpot)}</div>`:""}
    ${p.pkTxt?`<div class="ev-sub">🅿️ ${esc(p.pkTxt)}</div>`:""}
    ${p.season?`<div class="ev-sub">📅 ${esc(p.season)}</div>`:""}
    ${p.tip?`<div class="memo" style="margin-top:8px">💡 ${esc(p.tip)}</div>`:""}
    <div class="cal-sync">
      <button data-act="run-plan">🗓️ 여기 뛰러 가기</button>
      <button data-act="run-map">📍 지도에서 보기</button>
    </div>
  </div>`;
}
function renderRun(){
  /* 필터 칩 (한 번만 그림) */
  if(!$("#runRegion").children.length){
    $("#runRegion").innerHTML = `<button data-g="all" class="on">전체</button>`
      + RUN_REGIONS.map(r=>`<button data-g="${r}">${r}</button>`).join("");
    $("#runSurf").innerHTML = `<button data-s="all" class="on">전체</button>`
      + Object.keys(RUN_SURFACE).map(k=>`<button data-s="${k}">${RUN_SURFACE[k].em} ${RUN_SURFACE[k].l}</button>`).join("");
  }
  document.querySelectorAll("#runRegion button").forEach(b=>b.classList.toggle("on", b.dataset.g===runF.region));
  document.querySelectorAll("#runDist button").forEach(b=>b.classList.toggle("on", b.dataset.d===runF.dist));
  document.querySelectorAll("#runSurf button").forEach(b=>b.classList.toggle("on", b.dataset.s===runF.surf));
  document.querySelectorAll("#runWant button").forEach(b=>b.classList.toggle("on", !!runF.want[b.dataset.w]));
  const list = runMatches();
  $("#runCount").textContent = RUN_SPOTS.length
    ? `조건에 맞는 곳 ${list.length}곳 / 전체 ${RUN_SPOTS.length}곳`
    : "";
  $("#runList").innerHTML = RUN_SPOTS.length
    ? (list.length ? list.map((p)=>runCard(p, RUN_SPOTS.indexOf(p))).join("")
                   : `<div class="card"><div class="empty">조건에 맞는 곳이 없어요. 조건을 조금 풀어볼까요? 🙂</div></div>`)
    : `<div class="card"><div class="empty">러닝 스팟을 조사해서 채우는 중이에요 🏃‍♂️💨</div></div>`;
}

/* ---------- 스팟 찾기 (카페·맛집·등산·숙박·해변·계곡·전시) ---------- */
function spotMatches(){
  let list = spotsOfCat(spotF.cat);
  if(spotF.region!=="all") list = list.filter(s=>s.r===spotF.region);
  if(spotF.sub!=="all") list = list.filter(s=>s.sub===spotF.sub || (s.tags||[]).indexOf(spotF.sub)>=0);
  const q = spotF.q.trim();
  if(q) list = list.filter(s=>s.n.indexOf(q)>=0 || (s.a||"").indexOf(q)>=0 || (s.tags||[]).some(t=>t.indexOf(q)>=0));
  return list;
}
function spotCard(s, i){
  const rows = (SPOT_ROWS[s.cat]||[]).filter(([k])=>s[k]).map(([k,ic])=>
    `<div class="ev-sub">${ic} ${esc(String(s[k]))}</div>`).join("");
  const flags = (SPOT_FLAGS[s.cat]||[]).filter(([k])=>s[k]===true).map(([,l])=>`<span class="rtag">${l}</span>`).join("");
  const pk = RUN_PARK[s.pk];
  return `<div class="card spotc" data-i="${i}">
    <div class="trip-h"><span class="nm">${SPOT_CATS[s.cat].em} ${esc(s.n)}</span>
      ${s.sub?`<span class="dday">${esc(s.sub)}</span>`:""}</div>
    <div class="trip-dt">${esc(s.r)} · ${esc(s.a||"")}</div>
    ${(s.tags&&s.tags.length)||flags||pk ? `<div class="chips" style="margin:8px 0 0">
      ${(s.tags||[]).map(t=>`<span class="rtag">#${esc(t)}</span>`).join("")}
      ${flags}${pk?`<span class="rtag">${pk.em} ${pk.l}</span>`:""}
    </div>`:""}
    ${rows}
    ${s.parkSpot?`<div class="memo" style="margin-top:8px">🅿️ <b>추천 주차</b> — ${esc(s.parkSpot)}</div>`
      : (s.pkTxt?`<div class="ev-sub">🅿️ ${esc(s.pkTxt)}</div>`:"")}
    ${s.season?`<div class="ev-sub">📅 ${esc(s.season)}</div>`:""}
    ${s.tip?`<div class="memo" style="margin-top:8px">💡 ${esc(s.tip)}</div>`:""}
    <div class="cal-sync">
      <button data-act="spotc-plan">🗓️ 일정으로 담기</button>
      <button data-act="spotc-map">📍 지도에서 보기</button>
    </div>
  </div>`;
}
function renderSpot(){
  /* 분야 칩 */
  $("#spotCat").innerHTML = Object.keys(SPOT_CATS).map(c=>{
    const n = spotsOfCat(c).length;
    return `<button data-c="${c}" class="${spotF.cat===c?"on":""}">${SPOT_CATS[c].em} ${SPOT_CATS[c].l} ${n}</button>`;
  }).join("");
  const inCat = spotsOfCat(spotF.cat);
  /* 지역 칩 — 그 분야에 실제로 있는 지역만 */
  const regions = RUN_REGIONS.filter(r=>inCat.some(s=>s.r===r));
  $("#spotRegion").innerHTML = `<button data-g="all" class="${spotF.region==="all"?"on":""}">전체</button>`
    + regions.map(r=>`<button data-g="${r}" class="${spotF.region===r?"on":""}">${r} ${inCat.filter(s=>s.r===r).length}</button>`).join("");
  /* 세부 종류 칩 — 그 분야의 sub + 자주 나오는 태그 */
  const subs = [];
  inCat.forEach(s=>{ if(s.sub && subs.indexOf(s.sub)<0) subs.push(s.sub); });
  const tagCount = {};
  inCat.forEach(s=>(s.tags||[]).forEach(t=>{ tagCount[t]=(tagCount[t]||0)+1; }));
  const topTags = Object.keys(tagCount).filter(t=>subs.indexOf(t)<0).sort((a,b)=>tagCount[b]-tagCount[a]).slice(0,6);
  $("#spotSub").innerHTML = `<button data-s="all" class="${spotF.sub==="all"?"on":""}">전체</button>`
    + subs.map(v=>`<button data-s="${esc(v)}" class="${spotF.sub===v?"on":""}">${esc(v)}</button>`).join("")
    + topTags.map(v=>`<button data-s="${esc(v)}" class="${spotF.sub===v?"on":""}">#${esc(v)}</button>`).join("");
  /* 목록 */
  const list = spotMatches();
  const all = allSpots();
  $("#spotCount").textContent = inCat.length
    ? `조건에 맞는 곳 ${list.length}곳 / ${SPOT_CATS[spotF.cat].l} 전체 ${inCat.length}곳`
    : "";
  $("#spotList").innerHTML = inCat.length
    ? (list.length ? list.map(s=>spotCard(s, all.indexOf(s))).join("")
                   : `<div class="card"><div class="empty">조건에 맞는 곳이 없어요. 조건을 조금 풀어볼까요? 🙂</div></div>`)
    : `<div class="card"><div class="empty">${SPOT_CATS[spotF.cat].em} ${SPOT_CATS[spotF.cat].l} — 아직 조사 중이에요 🔍<br><span style="font-size:12px">블로그 후기를 비교하며 모으고 있어요</span></div></div>`;
}

/* ---------- 설정 ---------- */
function renderSet(){
  document.querySelectorAll("#setMe button").forEach(b=>b.classList.toggle("on", b.dataset.v===me));
  const conn = $("#setConn"), out = $("#setLogout");
  if(mode==="shared"){
    conn.innerHTML = "✅ 서버 연결됨 — 둘이 실시간으로 공유 중이에요."+(sessionEmail?"<br>로그인: "+esc(sessionEmail):"");
    out.hidden = false;
  } else {
    conn.textContent = "📴 이 기기에만 저장 중이에요. 서버 연결은 docs/시작하기.md 순서대로!";
    out.hidden = true;
  }
  /* 알림 상태 */
  const nt = $("#setNotiTxt"), nb = $("#setNoti");
  if(!("Notification" in window)){ nt.textContent = "이 브라우저는 알림을 지원하지 않아요. (홈 화면에 추가한 앱에서 가능)"; nb.hidden = true; }
  else if(Notification.permission === "granted"){ nt.textContent = "✅ 알림 켜짐 — 새 쪽지와 오늘의 계획을 알려드려요."; nb.hidden = true; }
  else if(Notification.permission === "denied"){ nt.textContent = "❌ 알림이 차단돼 있어요. 폰 설정 → 앱 알림에서 허용해 주세요."; nb.hidden = true; }
  else { nt.textContent = "새 쪽지가 오면 폰 알림으로 알려드려요."; nb.hidden = false; }
}

/* ---------- 헤더 + 전체 다시 그리기 ---------- */
function renderMe(){
  const dq = $("#dayQuote"); if(dq) dq.textContent = pickQuote();
}
function renderAll(){
  renderMe(); renderCal(); renderMap(); renderFest(); renderMeal(); renderNote();
  renderTrip(); renderWed(); renderHome(); renderFate(); renderBody(); renderShow();
  renderSmoke(); renderInvest(); renderUs(); renderRun(); renderSpot(); renderPlanHub(); renderBoxHub(); renderSet();
}
