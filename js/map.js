/* ============================================================
   map.js — 대한민국 SVG 지도 + 핀
   좌표계: viewBox 0 0 300 420. 일정의 x,y는 이 좌표로 저장됨.
   ============================================================ */

function mapSVG(id){
  return `<svg class="kmap" id="${id}" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="대한민국 지도">
  <path class="land" d="M60,78 L86,70 L112,62 L150,52 L200,38
    L208,50 L216,62 L230,80 L238,106 L248,140 L256,176 L266,200 L262,226 L256,240 L242,262
    L232,272 L224,279 L206,283 L188,287 L174,291 L158,288 L145,296 L131,286 L119,299 L101,291 L86,303 L71,297 L60,301 L48,287
    L53,271 L58,251 L61,231 L62,218 L57,205 L55,190 L47,172 L52,160 L66,150 L71,136 L61,126 L69,106 L59,91 Z"/>
  <ellipse class="land" cx="62" cy="380" rx="25" ry="10.5" transform="rotate(-8 62 380)"/>
  <g>
    <rect class="inset-b" x="238" y="12" width="54" height="32" rx="6"/>
    <circle class="city" cx="252" cy="24" r="3"/><circle class="city" cx="276" cy="21" r="1.5"/>
    <text x="265" y="38" text-anchor="middle" font-size="7">울릉도·독도</text>
  </g>
  <g>
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
  <g>
    <rect class="inset-b" x="216" y="368" width="76" height="44" rx="8"/>
    <text x="254" y="388" text-anchor="middle" font-size="9">🌏 해외</text>
    <text x="254" y="401" text-anchor="middle" font-size="6.5">해외 일정은 여기에 콕!</text>
  </g>
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
  mapView.w = Math.min(300, Math.max(50, mapView.w));
  mapView.h = mapView.w * 420/300;
  mapView.x = Math.max(0, Math.min(300 - mapView.w, mapView.x));
  mapView.y = Math.max(0, Math.min(420 - mapView.h, mapView.y));
}
function applyMapView(){
  const svg = $("#mainMap"); if(!svg) return;
  svg.setAttribute("viewBox", mapView.x+" "+mapView.y+" "+mapView.w+" "+mapView.h);
}
function mapZoomBy(f){
  const cx = mapView.x + mapView.w/2, cy = mapView.y + mapView.h/2;
  mapView.w *= f; clampMapView();
  mapView.x = cx - mapView.w/2; mapView.y = cy - mapView.h/2; clampMapView();
  applyMapView();
}
function mapReset(){ mapView = { x:0, y:0, w:300, h:420 }; applyMapView(); }
function bindMainMapNav(){
  const svg = $("#mainMap");
  let dragging = false, moved = false, sx = 0, sy = 0;
  svg.addEventListener("pointerdown", e=>{ dragging = true; moved = false; sx = e.clientX; sy = e.clientY; });
  window.addEventListener("pointermove", e=>{
    if(!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if(Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    if(!moved) return;
    const r = svg.getBoundingClientRect();
    mapView.x -= dx * mapView.w / r.width;
    mapView.y -= dy * mapView.h / r.height;
    sx = e.clientX; sy = e.clientY;
    clampMapView(); applyMapView();
  });
  window.addEventListener("pointerup", ()=>{
    if(dragging && moved){ mapDragged = true; setTimeout(()=>{ mapDragged = false; }, 80); }
    dragging = false;
  });
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
  return `<g class="pin ${ev.type} ${ev.done?"done":""} ${hot?"hot":""}" data-id="${ev.id}" transform="translate(${ev.x},${ev.y})" style="cursor:pointer">
    <circle class="halo" r="6" fill="none" stroke="var(--${ev.type==="wed"?"fest":ev.type})" stroke-width="1.5" opacity="0"/>
    <circle class="c" r="5.2"/></g>`;
}
