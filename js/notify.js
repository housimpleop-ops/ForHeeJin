/* ============================================================
   notify.js — 폰 알림
   - 앱이 열려 있거나 백그라운드일 때: 새 쪽지 도착·오늘의 계획 알림
   - 앱이 완전히 꺼져 있을 때 오는 "진짜 푸시"는 서버 발송이 필요 → 다음 단계
   ============================================================ */

let swReg = null;

async function initNotify(){
  if("serviceWorker" in navigator){
    try{ swReg = await navigator.serviceWorker.register("sw.js"); }catch(_){ }
  }
}
function notifyOK(){ return ("Notification" in window) && Notification.permission === "granted"; }
async function askNotify(){
  if(!("Notification" in window)){ banner("이 브라우저는 알림을 지원하지 않아요. 홈 화면에 추가한 앱에서 시도해 주세요."); return; }
  const p = await Notification.requestPermission();
  renderSet();
  if(p === "granted") showNote("계획하는 사이 💛", "알림이 켜졌어요! 쪽지가 오면 알려드릴게요.");
}
function showNote(title, body){
  if(!notifyOK()) return;
  try{
    if(swReg) swReg.showNotification(title, { body, icon: "icon.svg", badge: "icon.svg" });
    else new Notification(title, { body, icon: "icon.svg" });
  }catch(_){ }
}
/* 오늘의 계획 알림 — 하루에 한 번, 앱을 열었을 때 */
function notifyToday(){
  if(!notifyOK()) return;
  const t = ymd(new Date());
  if(localStorage.getItem("gyehoek-daynote") === t) return;
  const evs = DATA.events.filter(e => e.date === t);
  if(!evs.length) return;
  localStorage.setItem("gyehoek-daynote", t);
  showNote("오늘의 계획 " + evs.length + "개 🗓️", evs.map(e => subEm(e.type, e.sub) + " " + e.title).join(" · "));
}
