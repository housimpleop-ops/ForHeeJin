/* ============================================================
   gpx.js — 러닝 기록 파일(GPX·TCX)을 읽어 거리·시간·경로로 바꾼다

   가민 / 나이키런 / 애플 건강 / 삼성헬스 무엇으로 뛰었든,
   내보낸 기록 파일 하나만 있으면 지도에 경로가 그려진다.
   서버도 API 키도 쓰지 않고 브라우저 안에서 전부 처리한다.
   ============================================================ */

/* 두 점 사이 거리(m) — 지구를 구로 보고 계산 */
function gpxDist(a, b){
  const R = 6371000, rad = Math.PI/180;
  const dLat = (b[0]-a[0])*rad, dLng = (b[1]-a[1])*rad;
  const s = Math.sin(dLat/2)**2 +
            Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1, Math.sqrt(s)));
}

/* 점이 너무 많으면 저장 용량이 커지므로 고르게 솎아낸다 (처음·끝은 항상 남김) */
function gpxThin(pts, max){
  if(pts.length <= max) return pts;
  const out = [], step = (pts.length-1)/(max-1);
  for(let i=0;i<max;i++) out.push(pts[Math.round(i*step)]);
  return out;
}

/* 파일 내용(문자열)을 읽어 기록 한 건으로 만든다. 못 읽으면 null */
function parseGPX(text){
  let doc;
  try{ doc = new DOMParser().parseFromString(text, "application/xml"); }
  catch(_){ return null; }
  if(!doc || doc.querySelector("parsererror")) return null;

  const pts = [], times = [], eles = [];
  const push = (lat, lng, t, el) => {
    lat = +lat; lng = +lng;
    if(!isFinite(lat) || !isFinite(lng)) return;
    if(lat===0 && lng===0) return;
    pts.push([lat, lng]);
    times.push(t ? Date.parse(t) : NaN);
    eles.push(el!=null && isFinite(+el) ? +el : NaN);
  };

  /* GPX: <trkpt lat lon><time><ele> */
  const trk = doc.getElementsByTagName("trkpt");
  for(let i=0;i<trk.length;i++){
    const p = trk[i];
    const t = p.getElementsByTagName("time")[0];
    const e = p.getElementsByTagName("ele")[0];
    push(p.getAttribute("lat"), p.getAttribute("lon"),
         t && t.textContent, e && e.textContent);
  }
  /* TCX(가민·애플 일부): <Trackpoint><Position><LatitudeDegrees> */
  if(!pts.length){
    const tp = doc.getElementsByTagName("Trackpoint");
    for(let i=0;i<tp.length;i++){
      const p = tp[i];
      const la = p.getElementsByTagName("LatitudeDegrees")[0];
      const lo = p.getElementsByTagName("LongitudeDegrees")[0];
      const t  = p.getElementsByTagName("Time")[0];
      const e  = p.getElementsByTagName("AltitudeMeters")[0];
      if(la && lo) push(la.textContent, lo.textContent,
                        t && t.textContent, e && e.textContent);
    }
  }
  if(pts.length < 2) return null;

  /* 거리: 이어진 점 사이를 모두 더한다. 튀는 점(1초에 100m 이상)은 건너뛴다 */
  let m = 0, up = 0;
  for(let i=1;i<pts.length;i++){
    const d = gpxDist(pts[i-1], pts[i]);
    const dt = (times[i]-times[i-1])/1000;
    if(d > 300 && (!isFinite(dt) || dt < 3)) continue;   /* GPS 튐 */
    m += d;
    if(isFinite(eles[i]) && isFinite(eles[i-1])){
      const de = eles[i]-eles[i-1];
      if(de > 0 && de < 30) up += de;                    /* 오르막만 합산 */
    }
  }

  const t0 = times.find(t=>isFinite(t));
  const t1 = [...times].reverse().find(t=>isFinite(t));
  const secs = (isFinite(t0) && isFinite(t1) && t1>t0) ? Math.round((t1-t0)/1000) : null;
  const start = isFinite(t0) ? new Date(t0) : null;

  /* 이름: <name> 이 있으면 쓴다 (나이키런 등이 넣어준다) */
  const nameEl = doc.querySelector("trk > name, Activity > Notes, name");
  const name = nameEl ? (nameEl.textContent||"").trim().slice(0,40) : "";

  return {
    km:   Math.round(m/10)/100,
    secs: secs,
    up:   Math.round(up),
    date: start ? ymd(start) : ymd(new Date()),
    time: start ? String(start.getHours()).padStart(2,"0")+":"+String(start.getMinutes()).padStart(2,"0") : "",
    name: name,
    n:    pts.length,
    pts:  gpxThin(pts, 120).map(p=>[Math.round(p[0]*1e5)/1e5, Math.round(p[1]*1e5)/1e5]),
  };
}

/* 초 → "32분 10초" */
function gpxDur(s){
  if(!s) return "";
  const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60;
  return (h?h+"시간 ":"") + (m?m+"분 ":"") + x + "초";
}
/* 초 → "29:57" / "1:05:22" (좁은 칸에 넣을 때) */
function gpxClock(s){
  if(!s) return "-";
  const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60;
  const p2 = n => String(n).padStart(2,"0");
  return h ? h+":"+p2(m)+":"+p2(x) : m+":"+p2(x);
}
/* 페이스 → "6'08\"/km" */
function gpxPace(km, secs){
  if(!km || !secs) return "";
  const p = secs/km, m = Math.floor(p/60), s = Math.round(p%60);
  return m + "'" + String(s).padStart(2,"0") + '"/km';
}

/* 경로 미리보기 SVG — 저장 전에 눈으로 확인하라고 */
function gpxPreviewSVG(pts){
  if(!pts || pts.length<2) return "";
  const la = pts.map(p=>p[0]), ln = pts.map(p=>p[1]);
  const y0 = Math.min(...la), y1 = Math.max(...la);
  const x0 = Math.min(...ln), x1 = Math.max(...ln);
  const W = 300, H = 150, pad = 12;
  /* 위도 1도와 경도 1도의 실제 길이가 다르므로 가로를 보정해 모양이 안 찌그러지게 */
  const kx = Math.cos((y0+y1)/2*Math.PI/180);
  const w = Math.max((x1-x0)*kx, 1e-6), h = Math.max(y1-y0, 1e-6);
  const sc = Math.min((W-pad*2)/w, (H-pad*2)/h);
  const ox = (W-w*sc)/2, oy = (H-h*sc)/2;
  const P = pts.map(p=>[ox+(p[1]-x0)*kx*sc, oy+(y1-p[0])*sc]);
  const d = P.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const a = P[0], b = P[P.length-1];
  return `<svg class="gpx-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" fill="none" stroke="var(--run)" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="5" fill="var(--run)"/>
    <circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="5" fill="var(--date)"/>
  </svg>`;
}
