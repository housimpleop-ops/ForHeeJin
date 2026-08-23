/* ============================================================
   map.js — 대한민국 SVG 지도 + 핀
   좌표계: viewBox 0 0 300 420. 일정의 x,y는 이 좌표로 저장됨.
   ============================================================ */

function mapSVG(id){
  return `<svg class="kmap" id="${id}" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="대한민국 지도">
  <g class="sido-g">${SIDO_SHAPES.map((s,i)=>`<path class="land" data-si="${i}" d="${s.d}"/>`).join("")}</g>
  <g class="sgg-g">${SGG_SHAPES.map((s,i)=>`<path class="sggp" data-gi="${i}" d="${s.d}"/>`).join("")}</g>
  <g class="dong-g"></g>
  <g class="lbl4"></g>
  <g>
    <rect class="inset-b" x="238" y="12" width="54" height="32" rx="6"/>
    <circle class="city" cx="252" cy="24" r="3"/><circle class="city" cx="276" cy="21" r="1.5"/>
    <text x="265" y="38" text-anchor="middle" font-size="7">울릉도·독도</text>
  </g>
  <g class="lbl1" style="font-size:9px">
    <circle class="city" cx="93" cy="95" r="1.8"/><text x="98" y="98">서울</text>
    <circle class="city" cx="222" cy="88" r="1.8"/><text x="203" y="91">강릉</text>
    <circle class="city" cx="121" cy="179" r="1.8"/><text x="126" y="182">대전</text>
    <circle class="city" cx="104" cy="216" r="1.8"/><text x="85" y="219">전주</text>
    <circle class="city" cx="206" cy="212" r="1.8"/><text x="211" y="215">대구</text>
    <circle class="city" cx="83" cy="261" r="1.8"/><text x="64" y="264">광주</text>
    <circle class="city" cx="232" cy="252" r="1.8"/><text x="237" y="255">부산</text>
    <circle class="city" cx="138" cy="282" r="1.8"/><text x="143" y="285">여수</text>
    <text x="62" y="403" text-anchor="middle">제주</text>
    <text x="82" y="88" font-size="9" text-anchor="middle">🏠</text>
  </g>
  <g class="lbl2" style="font-size:7.5px">
    <text x="73" y="102">인천</text><text x="96" y="116">수원</text><text x="103" y="105">성남</text>
    <text x="78" y="84">고양🏠</text><text x="107" y="120">용인</text><text x="128" y="159">청주</text>
    <text x="104" y="147">천안</text><text x="114" y="170">세종</text><text x="255" y="202">포항</text>
    <text x="212" y="256">창원</text><text x="252" y="235">울산</text><text x="145" y="73">춘천</text>
    <text x="160" y="111">원주</text><text x="51" y="283">목포</text><text x="128" y="276">순천</text>
    <text x="172" y="259">진주</text><text x="215" y="164">안동</text><text x="188" y="195">구미</text>
    <text x="76" y="205">군산</text><text x="56" y="149">서산</text><text x="205" y="51">속초</text>
    <text x="62" y="386">서귀포</text>
  </g>
  <g class="lbl3" style="font-size:6.5px">
    <text x="79" y="80">파주</text><text x="74" y="91">김포</text><text x="79" y="100">부천</text>
    <text x="82" y="112">안산</text><text x="91" y="107">안양</text><text x="96" y="83">의정부</text>
    <text x="109" y="90">남양주</text><text x="109" y="97">하남</text><text x="102" y="135">평택</text>
    <text x="82" y="120">화성</text><text x="80" y="108">시흥</text><text x="84" y="101">광명</text>
    <text x="125" y="116">이천</text><text x="139" y="114">여주</text><text x="128" y="100">양평</text>
    <text x="130" y="77">가평</text><text x="108" y="73">포천</text><text x="104" y="93">구리</text>
    <text x="114" y="133">안성</text><text x="99" y="124">오산</text><text x="58" y="82">강화</text>
  </g>
  <g>
    <rect class="inset-b" x="216" y="368" width="76" height="44" rx="8"/>
    <text x="254" y="388" text-anchor="middle" font-size="9">🌏 해외</text>
    <text x="254" y="401" text-anchor="middle" font-size="6.5">해외 일정은 여기에 콕!</text>
  </g>
  <path class="selo"/>
  <g class="pins"></g>
</svg>`;
}

/* 화면 클릭 위치 → 지도 좌표 */
function svgPoint(svg, ev){
  const r = svg.getBoundingClientRect();
  const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
  const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
  return { x: Math.round((cx-r.left)/r.width*300*10)/10, y: Math.round((cy-r.top)/r.height*420*10)/10 };
}

/* ---------- 큰 지도 확대·이동 (＋/－ 버튼과 드래그) ---------- */
let mapView = { x:0, y:0, w:300, h:420 };
let mapDragged = false; // 드래그 직후의 클릭이 핀 선택으로 오인되지 않게
function clampMapView(){
  mapView.w = Math.min(300, Math.max(3, mapView.w)); /* 최대 ×100 — 동 단위까지 */
  mapView.h = mapView.w * 420/300;
  mapView.x = Math.max(0, Math.min(300 - mapView.w, mapView.x));
  mapView.y = Math.max(0, Math.min(420 - mapView.h, mapView.y));
}
function applyMapView(){
  const svg = $("#mainMap"); if(!svg) return;
  svg.setAttribute("viewBox", mapView.x+" "+mapView.y+" "+mapView.w+" "+mapView.h);
  /* 확대 단계별로 지명이 점점 자세해짐 */
  svg.classList.toggle("z2", mapView.w < 200);
  svg.classList.toggle("z3", mapView.w < 100);
  svg.classList.toggle("z4", mapView.w < 28); /* 동 단위 */
  updateDongLayer();
  /* 글씨·점·핀은 확대해도 화면상 같은 크기 유지 (지역 선택 중엔 글씨 크게) */
  const k = mapView.w/300;
  const boost = (mapSel && !mapSel.zoomed) ? 1.7 : 1;
  const setFs = (sel, base)=>{ const g=svg.querySelector(sel); if(g) g.style.fontSize = (base*k*boost).toFixed(2)+"px"; };
  setFs(".lbl1", 9); setFs(".lbl2", 7.5); setFs(".lbl3", 6.5); setFs(".lbl4", 5.5);
  svg.querySelectorAll(".lbl1 circle").forEach(c=>c.setAttribute("r", (1.8*k).toFixed(2)));
  const sc = Math.max(0.3, Math.sqrt(k));
  svg.querySelectorAll(".pin").forEach(p=>{
    if(p.dataset.x) p.setAttribute("transform", "translate("+p.dataset.x+","+p.dataset.y+") scale("+sc.toFixed(3)+")");
  });
}
/* ---------- 동(洞) 레이어 — 많이 확대했을 때만 그 지역 파일을 불러옴 ---------- */
const dongCache = {};      // 시도코드 → [{n,d,b}]
const dongLoading = {};    // 불러오는 중인 시도코드
let dongShownSido = null;  // 지금 그려둔 시도코드 묶음

/* 화면에 걸치는 시도들 (서울·경기처럼 겹치는 곳은 여러 개) */
function viewSidos(){
  const x1 = mapView.x, y1 = mapView.y, x2 = x1+mapView.w, y2 = y1+mapView.h;
  return SIDO_SHAPES.filter(s=>!(s.b[2]<x1 || s.b[0]>x2 || s.b[3]<y1 || s.b[1]>y2))
    .map(s=>s.c).slice(0, 4);
}
function updateDongLayer(){
  const svg = $("#mainMap"); if(!svg) return;
  const g = svg.querySelector(".dong-g"), lg = svg.querySelector(".lbl4");
  if(!g) return;
  if(mapView.w >= 28){ /* 멀리서 보면 동 레이어는 끔 */
    if(dongShownSido){ g.innerHTML = ""; lg.innerHTML = ""; dongShownSido = null; }
    return;
  }
  const codes = viewSidos();
  if(!codes.length) return;
  /* 아직 없는 지역 파일은 불러오기 */
  const missing = codes.filter(c=>!dongCache[c]);
  if(missing.length){
    missing.forEach(c=>{
      if(dongLoading[c]) return;
      dongLoading[c] = true;
      fetch("data/dong-"+c+".json", {cache:"force-cache"})
        .then(r=>r.ok ? r.json() : null)
        .then(j=>{ delete dongLoading[c]; if(j){ dongCache[c] = j; updateDongLayer(); } })
        .catch(()=>{ delete dongLoading[c]; });
    });
  }
  const ready = codes.filter(c=>dongCache[c]);
  if(!ready.length) return;
  const list = [].concat.apply([], ready.map(c=>dongCache[c]));
  const key = ready.join(",");
  if(dongShownSido !== key){
    g.innerHTML = list.map((s,i)=>`<path class="dongp" data-di="${i}" d="${s.d}"/>`).join("");
    dongShownSido = key;
  }
  /* 이름표는 화면에 보이는 것만 */
  const inView = [];
  for(let i=0;i<list.length && inView.length<60;i++){
    const b = list[i].b;
    const cx = (b[0]+b[2])/2, cy = (b[1]+b[3])/2;
    if(cx>=mapView.x && cx<=mapView.x+mapView.w && cy>=mapView.y && cy<=mapView.y+mapView.h) inView.push([cx,cy,list[i].n]);
  }
  lg.innerHTML = inView.map(p=>`<text x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}" text-anchor="middle">${esc(p[2])}</text>`).join("");
}

/* ---------- 지역 선택 (2단계) ----------
   1번째 탭: 경계 강조 + 지명 글씨 크게 (확대는 안 함)
   2번째 탭(같은 지역): 그 지역으로 확대
   3번째 탭 또는 이름칩 ✕: 선택 해제                       */
let mapSel = null; // {type, i, zoomed}
function zoomToBBox(b, minW){
  const bw = b[2]-b[0], bh = b[3]-b[1];
  mapView.w = Math.min(300, Math.max(bw*1.35, bh*1.35*300/420, minW));
  clampMapView();
  mapView.x = (b[0]+b[2])/2 - mapView.w/2;
  mapView.y = (b[1]+b[3])/2 - mapView.h/2;
  clampMapView(); applyMapView();
}
function clearRegionSel(){
  mapSel = null;
  const o = document.querySelector("#mainMap .selo"); if(o) o.setAttribute("d","");
  const cap = $("#mapCap"); if(cap) cap.hidden = true;
  applyMapView();
}
function selectRegion(type, i){
  const s = (type==="sido" ? SIDO_SHAPES : SGG_SHAPES)[i];
  if(!s) return;
  const same = mapSel && mapSel.type===type && mapSel.i===i;
  if(same && mapSel.zoomed){ clearRegionSel(); return; }   /* 3번째 탭 → 해제 */
  if(same){                                                /* 2번째 탭 → 확대 */
    mapSel.zoomed = true;
    const cap = $("#mapCap"); if(cap) cap.textContent = "📍 "+s.n+"  ✕";
    zoomToBBox(s.b, type==="sido" ? 60 : 28);
    return;
  }
  /* 1번째 탭 → 경계 강조 + 글씨 크게 */
  mapSel = { type, i, zoomed:false };
  const o = document.querySelector("#mainMap .selo"); if(o) o.setAttribute("d", s.d);
  const cap = $("#mapCap"); if(cap){ cap.hidden = false; cap.textContent = "📍 "+s.n+" — 한 번 더 누르면 확대  ✕"; }
  applyMapView();
}
function mapZoomBy(f){
  const cx = mapView.x + mapView.w/2, cy = mapView.y + mapView.h/2;
  mapView.w *= f; clampMapView();
  mapView.x = cx - mapView.w/2; mapView.y = cy - mapView.h/2; clampMapView();
  applyMapView();
}
function mapReset(){ clearRegionSel(); mapView = { x:0, y:0, w:300, h:420 }; applyMapView(); }
function bindMainMapNav(){
  const svg = $("#mainMap");
  const pts = new Map();          // 화면에 닿아 있는 손가락들
  let moved = false, sx = 0, sy = 0;
  let pinchDist = 0, pinchMid = null;

  const dist = ()=>{ const a=[...pts.values()]; return Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y); };
  const mid  = ()=>{ const a=[...pts.values()]; return { x:(a[0].x+a[1].x)/2, y:(a[0].y+a[1].y)/2 }; };
  /* 화면 좌표 → 지도 좌표 */
  const toMap = p=>{ const r = svg.getBoundingClientRect();
    return { x: mapView.x + (p.x-r.left)/r.width*mapView.w, y: mapView.y + (p.y-r.top)/r.height*mapView.h }; };

  svg.addEventListener("pointerdown", e=>{
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pts.size === 1){ moved = false; sx = e.clientX; sy = e.clientY; }
    if(pts.size === 2){ pinchDist = dist(); pinchMid = toMap(mid()); moved = true; }
    if(svg.setPointerCapture) try{ svg.setPointerCapture(e.pointerId); }catch(_){ }
  });
  svg.addEventListener("pointermove", e=>{
    if(!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    const r = svg.getBoundingClientRect();
    if(pts.size >= 2){
      /* 두 손가락 확대·축소 — 손가락 사이 지점을 기준으로 */
      const d = dist(); if(!pinchDist || !d) return;
      const m = mid();
      mapView.w = mapView.w * (pinchDist/d);
      clampMapView();
      mapView.x = pinchMid.x - (m.x-r.left)/r.width*mapView.w;
      mapView.y = pinchMid.y - (m.y-r.top)/r.height*mapView.h;
      pinchDist = d;
      clampMapView(); applyMapView();
      return;
    }
    /* 한 손가락 이동 */
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if(Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    if(!moved) return;
    mapView.x -= dx * mapView.w / r.width;
    mapView.y -= dy * mapView.h / r.height;
    sx = e.clientX; sy = e.clientY;
    clampMapView(); applyMapView();
  });
  const end = e=>{
    pts.delete(e.pointerId);
    if(pts.size < 2) pinchDist = 0;
    if(pts.size === 1){ const a=[...pts.values()][0]; sx=a.x; sy=a.y; }
    if(pts.size === 0){
      if(moved){ mapDragged = true; setTimeout(()=>{ mapDragged = false; }, 80); }
      moved = false;
    }
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  /* 마우스 휠 확대 (컴퓨터에서) */
  svg.addEventListener("wheel", e=>{
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const anchor = { x: mapView.x + (e.clientX-r.left)/r.width*mapView.w,
                     y: mapView.y + (e.clientY-r.top)/r.height*mapView.h };
    mapView.w *= (e.deltaY > 0 ? 1.2 : 1/1.2);
    clampMapView();
    mapView.x = anchor.x - (e.clientX-r.left)/r.width*mapView.w;
    mapView.y = anchor.y - (e.clientY-r.top)/r.height*mapView.h;
    clampMapView(); applyMapView();
  }, {passive:false});

  $("#mapZoomIn").addEventListener("click", ()=>mapZoomBy(1/1.5));
  $("#mapZoomOut").addEventListener("click", ()=>mapZoomBy(1.5));
  $("#mapZoomReset").addEventListener("click", mapReset);
}

/* ============================================================
   카카오맵 (진짜 지도) — 그림 지도의 x,y와 위도·경도를 서로 변환해서
   두 지도가 같은 핀을 공유한다.
   ============================================================ */
function svgToLatLng(x, y){ return { lat: 38.8-(y-10)/69, lng: (x-10)/70+125.8 }; }
function latLngToSvg(lat, lng){ return { x: Math.round(((lng-125.8)*70+10)*10)/10, y: Math.round(((38.8-lat)*69+10)*10)/10 }; }

let kakaoReady = false, kakaoLoading = false;
let kmap = null, kMarkers = [], kTempMarker = null, kPick = null;

function loadKakao(cb){
  if(kakaoReady){ cb(); return; }
  if(kakaoLoading) return;
  const key = (window.COUPLE_CONFIG||{}).KAKAO_JS_KEY;
  if(!key){ banner("카카오맵 키가 아직 설정되지 않았어요."); return; }
  kakaoLoading = true;
  const s = document.createElement("script");
  s.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey="+key+"&libraries=services&autoload=false";
  s.onload = ()=>{ kakao.maps.load(()=>{ kakaoReady = true; kakaoLoading = false; cb(); }); };
  s.onerror = ()=>{ kakaoLoading = false; banner("카카오맵을 불러오지 못했어요. 카카오개발자 사이트에서 ①카카오맵 ON ②플랫폼 도메인 등록을 확인해 주세요."); };
  document.head.appendChild(s);
}
function initKakaoMap(){
  if(kmap) return;
  kmap = new kakao.maps.Map(document.getElementById("kmapDiv"), {
    center: new kakao.maps.LatLng(37.62, 126.87), // 우리 동네(향동) 근처
    level: 8,
  });
}
function renderKakaoMarkers(){
  if(!kmap) return;
  kMarkers.forEach(m=>m.setMap(null)); kMarkers = [];
  DATA.events.filter(e=>(mapFilter==="all"||e.type===mapFilter)).forEach(e=>{
    let lat = e.lat, lng = e.lng;
    if(lat==null && e.x!=null){ const c = svgToLatLng(e.x, e.y); lat=c.lat; lng=c.lng; }
    if(lat==null) return;
    const mk = new kakao.maps.Marker({ map:kmap, position:new kakao.maps.LatLng(lat,lng), title:(e.title||"") });
    kakao.maps.event.addListener(mk, "click", ()=>{
      const card = document.querySelector('#mapList .ev[data-id="'+e.id+'"]');
      if(card) card.scrollIntoView({behavior:"smooth", block:"center"});
    });
    kMarkers.push(mk);
  });
}
/* 카카오 장소검색 — 콜백으로 결과 배열을 준다 (지도 탭·일정 시트 공용) */
function kakaoPlaces(q, cb){
  if(!q) { cb([]); return; }
  loadKakao(()=>{
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(q, (res, status)=>{
      cb(status === kakao.maps.services.Status.OK ? res : []);
    });
  });
}
function kakaoSearch(q){
  if(!q) return;
  kakaoPlaces(q, res=>{
    const box = document.getElementById("kSearchOut");
    if(!res.length){
      box.innerHTML = '<div class="empty">검색 결과가 없어요 🔍</div>'; return;
    }
    box.innerHTML = res.slice(0,5).map(r=>
      '<button class="wi ksr" data-lat="'+r.y+'" data-lng="'+r.x+'" data-name="'+esc(r.place_name)+'">'
      + '<span class="tx"><b>'+esc(r.place_name)+'</b><br><span style="font-size:11.5px; color:var(--muted-solid)">'+esc(r.road_address_name||r.address_name||"")+'</span></span></button>').join("");
  });
}
function kakaoPickPlace(lat, lng, name){
  kPick = { lat:+lat, lng:+lng, name };
  const pos = new kakao.maps.LatLng(+lat, +lng);
  kmap.setLevel(4); kmap.panTo(pos);
  if(kTempMarker) kTempMarker.setMap(null);
  kTempMarker = new kakao.maps.Marker({ map:kmap, position:pos });
  document.getElementById("kPickBar").hidden = false;
  document.getElementById("kPickAdd").textContent = "➕ \""+name+"\" 일정 만들기";
}

function pinHTML(ev, hot){
  return `<g class="pin ${ev.type} ${ev.done?"done":""} ${hot?"hot":""}" data-id="${ev.id}" data-x="${ev.x}" data-y="${ev.y}" transform="translate(${ev.x},${ev.y})" style="cursor:pointer">
    <circle class="halo" r="6" fill="none" stroke="var(--${ev.type==="wed"?"fest":ev.type})" stroke-width="1.5" opacity="0"/>
    <circle class="c" r="5.2"/></g>`;
}
/* 지도 탭을 특정 위치(카카오맵)로 열기 — 쪽지의 📍 배지에서 사용 */
function mapFocus(lat, lng){
  mapMode = "real"; goTab("map"); renderMap();
  loadKakao(()=>{
    initKakaoMap(); kmap.relayout(); renderKakaoMarkers();
    kmap.setLevel(5); kmap.panTo(new kakao.maps.LatLng(+lat, +lng));
  });
}
