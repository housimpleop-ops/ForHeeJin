/* ============================================================
   state.js — 전역 상태(DATA)·유틸·변경 반영(applyChange)·데이터 보정(guards)
   ============================================================ */

/* ---------- 앱 데이터 (Supabase couple_state 한 행에 통째로 저장됨) ---------- */
let DATA = {
  v:2, events:[], wishes:[], meals:[], notes:[], wedding:[], trips:[],
  boards:{ home:[], baby:[], pet:[] }, fridge:[], shop:[], profile:null,
  bodyP:{ cs:{}, hj:{} }, bodyLogs:[], shows:[],
  smoke:{ cs:null, hj:null }, invest:{ goal:null, notes:[] },
};

/* ---------- 화면 상태 (저장 안 됨) ---------- */
const today = new Date();
let me = localStorage.getItem("gyehoek-me") || "cs"; // 지금 보는 사람
let tab = "cal";
let calY = today.getFullYear(), calM = today.getMonth();
let selDate = ymd(today);       // 달력에서 고른 날
let mealDate = ymd(today);      // 식단 탭 날짜
let mapFilter = "all";
let mapMode = "art"; // 지도 탭: art=그림 지도, real=카카오맵
let noteFilter = "all"; // 쪽지 필터: all | chat | card | log
let homeBoard = "home";         // 살림 노트 현재 보드
let bodyP = "cs", smokeP = "cs";
let invKindSel = "주식";
const photoCache = {};          // id → 방금 올린 사진의 objectURL (세션용)
const LS_DATA = "gyehoek-data"; // 로컬 모드 저장 키

/* ---------- 유틸 ---------- */
const $ = s => document.querySelector(s);
function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function esc(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function uid(){ return "e"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function boardItems(key){ return key==="wed" ? DATA.wedding : DATA.boards[key]; }

/* ---------- 변경 반영 ----------
   save(change)의 change를 데이터에 얹는다. 저장 직전 서버 최신본 위에도
   같은 change를 얹어 동시 수정을 병합한다. 새 종류를 만들면 여기에 추가. */
function applyChange(c){
  if(!c || !c.kind) return;
  const up = (arr, item) => { const i = arr.findIndex(x=>x.id===item.id); if(i>=0) arr[i]=item; else arr.push(item); };
  const del = (arr, id) => arr.filter(x=>x.id!==id);

  if(c.kind==="ev")      up(DATA.events, c.item);
  if(c.kind==="ev-del")  DATA.events = del(DATA.events, c.id);
  if(c.kind==="wi")      up(DATA.wishes, c.item);
  if(c.kind==="wi-del")  DATA.wishes = del(DATA.wishes, c.id);
  if(c.kind==="ml")      up(DATA.meals, c.item);
  if(c.kind==="ml-del")  DATA.meals = del(DATA.meals, c.id);
  if(c.kind==="nt")      up(DATA.notes, c.item);
  if(c.kind==="nt-del")  DATA.notes = del(DATA.notes, c.id);
  if(c.kind==="wd")      up(DATA.wedding, c.item);
  if(c.kind==="wd-bulk") c.items.forEach(it=>{ if(!DATA.wedding.some(x=>x.id===it.id)) DATA.wedding.push(it); });
  if(c.kind==="wd-del")  DATA.wedding = del(DATA.wedding, c.id);
  if(c.kind==="tr")      up(DATA.trips, c.item);
  if(c.kind==="tr-del")  DATA.trips = del(DATA.trips, c.id);
  if(c.kind==="bd")      up(DATA.boards[c.board], c.item);
  if(c.kind==="bd-bulk") c.items.forEach(it=>{ if(!DATA.boards[c.board].some(x=>x.id===it.id)) DATA.boards[c.board].push(it); });
  if(c.kind==="bd-del")  DATA.boards[c.board] = del(DATA.boards[c.board], c.id);
  if(c.kind==="fr")      up(DATA.fridge, c.item);
  if(c.kind==="fr-del")  DATA.fridge = del(DATA.fridge, c.id);
  if(c.kind==="sp")      up(DATA.shop, c.item);
  if(c.kind==="sp-del")  DATA.shop = del(DATA.shop, c.id);
  if(c.kind==="sp-buy"){ DATA.shop = del(DATA.shop, c.id); if(!DATA.fridge.some(x=>x.id===c.item.id)) DATA.fridge.push(c.item); }
  if(c.kind==="pf")      DATA.profile = c.item;
  if(c.kind==="bp")      DATA.bodyP[c.who] = c.item;
  if(c.kind==="bl")      up(DATA.bodyLogs, c.item);
  if(c.kind==="bl-del")  DATA.bodyLogs = del(DATA.bodyLogs, c.id);
  if(c.kind==="sh")      up(DATA.shows, c.item);
  if(c.kind==="sh-del")  DATA.shows = del(DATA.shows, c.id);
  if(c.kind==="sm")      DATA.smoke[c.who] = c.item;
  if(c.kind==="ig")      DATA.invest.goal = c.item;
  if(c.kind==="iv")      up(DATA.invest.notes, c.item);
  if(c.kind==="iv-del")  DATA.invest.notes = del(DATA.invest.notes, c.id);
}

/* ---------- 데이터 보정 (불러온 데이터에 빠진 칸 채우기 + 옛 형식 변환) ---------- */
function guards(){
  const arr = k => { if(!Array.isArray(DATA[k])) DATA[k] = []; };
  ["events","wishes","meals","notes","wedding","trips","fridge","shop","bodyLogs","shows"].forEach(arr);
  if(!DATA.boards) DATA.boards = {home:[],baby:[],pet:[]};
  ["home","baby","pet"].forEach(k=>{ if(!Array.isArray(DATA.boards[k])) DATA.boards[k]=[]; });
  if(!DATA.bodyP) DATA.bodyP = {cs:{},hj:{}};
  if(!DATA.smoke) DATA.smoke = {cs:null,hj:null};
  if(!DATA.invest) DATA.invest = {goal:null, notes:[]};
  if(!Array.isArray(DATA.invest.notes)) DATA.invest.notes = [];
  DATA.events.forEach(e=>{
    if(e.type==="fest"){ e.type="date"; if(!e.sub) e.sub="축제"; } // v1 초기 형식 변환
    if(!e.sub) e.sub = e.type==="run" ? "러닝" : "기타";
  });
}
