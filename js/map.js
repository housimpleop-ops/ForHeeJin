/* ============================================================
   map.js — 대한민국 SVG 지도 + 핀
   좌표계: viewBox 0 0 300 420. 일정의 x,y는 이 좌표로 저장됨.
   ============================================================ */

/* 지역 이름을 놓을 자리 (경계 상자 가운데) — 라벨을 데이터에서 자동 생성 */
function shapeCenter(s){ return { x:(s.b[0]+s.b[2])/2, y:(s.b[1]+s.b[3])/2 }; }
/* 시도별 파스텔 색 (아기자기하게) */
/* 시도 17개에 색 8개를 배정한다. 그냥 순서대로 %8 하면 서울과 경기가 같은 색이 돼
   서울이 경기에 묻혀 버린다(울산↔경북도 마찬가지). 그래서 맞닿은 시도끼리는
   반드시 다른 색이 되도록 손으로 짰다.
   순서: 서울 부산 대구 인천 광주 대전 울산 세종 경기 강원 충북 충남 전북 전남 경북 경남 제주 */
const SIDO_TONE_MAP = [1,6,5,2,4,6,7,7,0,3,4,5,0,2,1,3,0];
const sidoTone = i => SIDO_TONE_MAP[i] != null ? SIDO_TONE_MAP[i] : 0;

function mapSVG(id){
  /* 시도 이름 — 서울·대전처럼 큰 도에 둘러싸인 곳은 겹치지 않게 자리를 살짝 옮김 */
  const placed = [];
  const sidoLbl = SIDO_SHAPES
    .map((s,i)=>({ s, i, area:(s.b[2]-s.b[0])*(s.b[3]-s.b[1]) }))
    .sort((a,b)=>b.area-a.area)          // 큰 도부터 자리 잡기
    .map(({s})=>{
      const c = shapeCenter(s);
      let y = c.y;
      for(let g=0; g<8; g++){
        const hit = placed.some(p=>Math.abs(p.x-c.x)<24 && Math.abs(p.y-y)<9);
        if(!hit) break;
        y = c.y - (g+1)*9;               // 위로 한 칸씩 피하기
      }
      placed.push({x:c.x, y});
      return `<text x="${c.x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${esc(s.n.replace(/(특별자치|특별|광역)?(시|도)$/,""))}</text>`;
    }).join("");
  const sggLbl = SGG_SHAPES.map(s=>{
    const c = shapeCenter(s);
    return `<text x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" text-anchor="middle">${esc(s.n)}</text>`;
  }).join("");
  return `<svg class="kmap" id="${id}" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="대한민국 지도">
  <g class="sido-g">${SIDO_SHAPES.map((s,i)=>`<path class="land t${sidoTone(i)}" data-si="${i}" d="${s.d}"/>`).join("")}</g>
  <g class="sgg-g">${SGG_SHAPES.map((s,i)=>{
      const t = (typeof SGG_TONE!=="undefined" && SGG_TONE[i]!=null) ? sidoTone(SGG_TONE[i]) : 0;
      /* 칠은 경계선에 맞춰 붙인 도형(SGG_FIT)을 쓴다 — 이웃 색이 넘어오지 않게 */
      const d = (typeof SGG_FIT!=="undefined" && SGG_FIT[i]) ? SGG_FIT[i] : s.d;
      return `<path class="sggp t${t}" data-gi="${i}" d="${d}"/>`;
    }).join("")}</g>
  <g class="bline-g">
    <path class="bline sido" d="${typeof SIDO_LINE==="undefined"?"":SIDO_LINE}"/>
    <path class="bline sgg" d="${typeof SGG_LINE==="undefined"?"":SGG_LINE}"/>
  </g>
  <g class="road-g">${(typeof ROADS==="undefined"?[]:ROADS).filter(r=>r.k==="ex").map(r=>
      `<path class="rd ${r.k}" d="${r.d}"/>`).join("")}</g>
  <g class="dong-g"></g>
  <g class="lbl0">${sidoLbl}</g>
  <g class="lbl3">${sggLbl}</g>
  <g class="lbl4"></g>
  <g>
    <rect class="inset-b" x="238" y="12" width="54" height="32" rx="6"/>
    <circle class="city" cx="252" cy="24" r="3"/><circle class="city" cx="276" cy="21" r="1.5"/>
    <text x="265" y="38" text-anchor="middle" font-size="7">울릉도·독도</text>
  </g>
  <g class="lbl1" style="font-size:6px">
    <text x="82" y="88" text-anchor="middle">🏠</text>
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
  svg.classList.toggle("z2", mapView.w < 190);
  svg.classList.toggle("z3", mapView.w < 95);   /* 시군구 — 국도가 보이기 시작 */
  svg.classList.toggle("z4", mapView.w < 26);   /* 동 단위 */
  svg.classList.toggle("z5", mapView.w < 10);   /* 아주 가까이 */
  updateDongLayer();
  /* 글씨·점·핀은 확대해도 화면상 같은 크기 유지 (지역 선택 중엔 글씨 크게) */
  const k = mapView.w/300;
  const boost = (mapSel && !mapSel.zoomed) ? 1.7 : 1;
  const setFs = (sel, base)=>{ const g=svg.querySelector(sel); if(g) g.style.fontSize = (base*k*boost).toFixed(2)+"px"; };
  setFs(".lbl0", 8.5); setFs(".lbl1", 6); setFs(".lbl3", 6); setFs(".lbl4", 5);
  /* 시군구 이름은 화면에 보이는 것만 (글자 겹침 방지) */
  const g3 = svg.querySelector(".lbl3");
  if(g3){
    const showAll = mapView.w < 45;
    g3.querySelectorAll("text").forEach(t=>{
      const x = +t.getAttribute("x"), y = +t.getAttribute("y");
      const inView = x>=mapView.x && x<=mapView.x+mapView.w && y>=mapView.y && y<=mapView.y+mapView.h;
      t.style.display = (inView && (showAll || mapView.w < 100)) ? "" : "none";
    });
  }
  /* 핀은 확대·축소와 무관하게 화면상 같은 크기로.
     가볼 곳 이모지는 확대할수록 조금 더 크게 (누르기 쉽게) */
  const spotK = k * spotBoost();
  svg.querySelectorAll(".pin").forEach(p=>{
    if(!p.dataset.x) return;
    const f = p.classList.contains("spt") ? spotK : k;
    p.setAttribute("transform", "translate("+p.dataset.x+","+p.dataset.y+") scale("+f.toFixed(4)+")");
  });
  declutterSpots(svg);
}

/* ---------- 이모지가 서로 겹치지 않게 솎아내기 ----------
   화면을 격자로 나눠 한 칸에 하나만 남긴다.
   확대할수록 칸이 좁아지므로 가까이 갈수록 더 많이 나타난다.        */
/* 확대 단계별 이모지 배율 — 전국 1.0 → 아주 가까이 1.75 */
function spotBoost(){
  const w = mapView.w;
  if(w >= 95) return 1;
  if(w <= 12) return 1.75;
  return 1 + (95 - w) / (95 - 12) * 0.75;
}

function declutterSpots(svg){
  const spots = svg.querySelectorAll(".pin.spt");
  if(!spots.length) return;
  /* 이모지 지름(지도 단위) — 무리 사이 최소 간격을 이걸로 잡는다.
     격자 한 칸에 하나만 남기는 방식은 칸 경계에서 둘이 딱 붙어버려서,
     실제 거리로 재야 겹치지 않는다. */
  const boost = spotBoost();
  const dia  = 2 * 9.9 * (mapView.w / 300) * boost;   /* 동그라미 지름 */
  const gap  = dia * 1.08;                            /* 사이 여백까지 (살짝만) */
  const cell = gap;                                   /* 격자는 빨리 찾기용 */
  const pad  = gap;
  const x1 = mapView.x - pad, y1 = mapView.y - pad;
  const x2 = mapView.x + mapView.w + pad, y2 = mapView.y + mapView.h + pad;
  const grid = new Map();
  const put = (x,y)=>{ const k = Math.floor(x/cell)+","+Math.floor(y/cell);
    let a = grid.get(k); if(!a){ a=[]; grid.set(k,a); } a.push([x,y]); };
  const clear = (x,y)=>{                              /* 이웃 칸에 너무 가까운 게 있나 */
    const cx = Math.floor(x/cell), cy = Math.floor(y/cell);
    for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++){
      const a = grid.get((cx+dx)+","+(cy+dy)); if(!a) continue;
      for(let i=0;i<a.length;i++){
        const ddx = a[i][0]-x, ddy = a[i][1]-y;
        if(ddx*ddx + ddy*ddy < gap*gap) return false;
      }
    }
    return true;
  };
  /* 고른 곳은 무조건 자리부터 잡는다 */
  const list = [...spots];
  const picked = list.filter(g=>g.classList.contains("picked"));
  picked.forEach(g=>{ g.style.display=""; put(+g.dataset.x, +g.dataset.y); });
  list.forEach(g=>{
    if(g.classList.contains("picked")) return;
    const x = +g.dataset.x, y = +g.dataset.y;
    if(x<x1 || x>x2 || y<y1 || y>y2){ g.style.display = "none"; return; }
    if(!clear(x,y)){ g.style.display = "none"; return; }
    put(x,y); g.style.display = "";
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
  /* 동 경계는 쓰지 않기로 했다 — 시군구와 다른 도형이라 선이 겹치고 어긋난다 */
  return;
  /* eslint-disable no-unreachable */
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
  /* 동 이름은 안 쓴다 — 글씨가 너무 빽빽해져서 (사용자 요청) */
  if(lg.innerHTML) lg.innerHTML = "";
}

/* ---------- 지역 선택 (2단계) ----------
   1번째 탭: 경계 강조 + 지명 글씨 크게 (확대는 안 함)
   2번째 탭(같은 지역): 그 지역으로 확대
   3번째 탭 또는 이름칩 ✕: 선택 해제                       */
let mapSel = null; // {type, i, zoomed}
function zoomToBBox(b, minW){
  const bw = b[2]-b[0], bh = b[3]-b[1];
  /* 고른 지역이 화면을 꽉 채우게 — 여백은 8%만 */
  mapView.w = Math.min(300, Math.max(bw*1.08, bh*1.08*300/420, minW));
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
    zoomToBBox(s.b, type==="sido" ? 22 : 6);
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

  const grabbed = new Set();
  const grab = e=>{ if(svg.setPointerCapture && !grabbed.has(e.pointerId)){
      try{ svg.setPointerCapture(e.pointerId); grabbed.add(e.pointerId); }catch(_){ } } };
  const dist = ()=>{ const a=[...pts.values()]; return Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y); };
  const mid  = ()=>{ const a=[...pts.values()]; return { x:(a[0].x+a[1].x)/2, y:(a[0].y+a[1].y)/2 }; };
  /* 화면 좌표 → 지도 좌표 */
  const toMap = p=>{ const r = svg.getBoundingClientRect();
    return { x: mapView.x + (p.x-r.left)/r.width*mapView.w, y: mapView.y + (p.y-r.top)/r.height*mapView.h }; };

  svg.addEventListener("pointerdown", e=>{
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pts.size === 1){ moved = false; sx = e.clientX; sy = e.clientY; }
    if(pts.size === 2){ pinchDist = dist(); pinchMid = toMap(mid()); moved = true; grab(e); }
    /* 여기서 포인터를 붙잡으면 손을 뗄 때 click 이 지도 전체로 가버려서
       이모지를 눌러도 무엇을 눌렀는지 알 수 없게 된다. 끌기 시작할 때만 붙잡는다. */
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
    if(Math.abs(dx) + Math.abs(dy) > 6){ moved = true; grab(e); }
    if(!moved) return;
    mapView.x -= dx * mapView.w / r.width;
    mapView.y -= dy * mapView.h / r.height;
    sx = e.clientX; sy = e.clientY;
    clampMapView(); applyMapView();
  });
  const end = e=>{
    pts.delete(e.pointerId); grabbed.delete(e.pointerId);
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
let kmap = null, kMarkers = [], kTempMarker = null, kPick = null, kRoutes = [];

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
  /* 지도를 콕 찍으면 그 자리로 일정 만들기 */
  kakao.maps.event.addListener(kmap, "click", e=>{
    const ll = e.latLng;
    kakaoPickPlace(ll.getLat(), ll.getLng(), "지도에서 찍은 위치");
  });
}
function renderKakaoMarkers(){
  if(!kmap) return;
  kMarkers.forEach(m=>m.setMap(null)); kMarkers = [];
  kRoutes.forEach(l=>l.setMap(null)); kRoutes = [];
  DATA.events.filter(e=>(mapFilter==="all"||e.type===mapFilter)).forEach(e=>{
    /* 러닝 기록 파일로 만든 일정이면 뛴 경로를 선으로 그린다 */
    if(e.route && e.route.length > 1){
      const line = new kakao.maps.Polyline({
        map: kmap,
        path: e.route.map(p=>new kakao.maps.LatLng(p[0], p[1])),
        strokeWeight: 5, strokeColor: "#45c39f", strokeOpacity: 0.85, strokeStyle: "solid",
      });
      kRoutes.push(line);
    }
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
