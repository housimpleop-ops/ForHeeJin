/* ============================================================
   data-spots.js — 러닝 외 모든 스팟 (카페·맛집·등산·숙박·해변·계곡·전시…)
   러닝은 data-run.js의 RUN_SPOTS에 따로 있고, allSpots()가 둘을 합쳐준다.

   공통 항목: cat, n(이름), r(지역), a(위치), sub(세부분류), tags[],
             pk(주차 free/paid/hard), pkTxt(주차설명), parkSpot(★추천 주차 위치),
             season, tip, lat, lng, conf(high/mid/low)
   분야별 추가 항목은 SPOT_CATS[cat].rows 에서 카드에 뿌린다.
   ============================================================ */

const SPOT_CATS = {
  run:     { l:"러닝",     em:"🏃", color:"run" },
  cafe:    { l:"카페",     em:"☕", color:"date" },
  food:    { l:"맛집",     em:"🍽️", color:"date" },
  hike:    { l:"등산",     em:"⛰️", color:"run" },
  stay:    { l:"숙박",     em:"🏨", color:"fest" },
  beach:   { l:"해변",     em:"🌊", color:"run" },
  valley:  { l:"계곡",     em:"🏞️", color:"run" },
  culture: { l:"전시·구경", em:"🎨", color:"fest" },
};

/* 카드에 보여줄 줄 — [항목키, 앞에 붙일 아이콘·라벨] */
const SPOT_ROWS = {
  cafe:   [["signature","🥐"],["price","💳"],["wait","⏳"],["open","🕘"]],
  food:   [["signature","🍚"],["price","💳"],["wait","⏳"],["open","🕘"]],
  hike:   [["kmTxt","📏"],["hours","⏱️"],["elev","⛰️"]],
  stay:   [["priceLow","💳 비성수기"],["priceHigh","💳 성수기"],["peak","📅"],["runNear","🏃 근처 러닝"],["review","💬"]],
  beach:  [["water","🌊"],["surfLv","🏄"],["diveInfo","🤿"],["crowd","👥"]],
  valley: [["water","💧"],["crowd","👥"]],
  culture:[["fee","🎫"],["hours","🕘"],["stay","⏱️"]],
};

/* 태그(작은 알약)로 보여줄 항목 — [항목키, 참일 때 문구] */
const SPOT_FLAGS = {
  stay:   [["gym","🏋️ 헬스장"],["pool","🏊 수영장"],["bbq","🍖 바비큐"],["pet","🐾 애견동반"],["breakfast","🍳 조식"]],
  cafe:   [["pet","🐾 애견동반"]],
  food:   [["resv","📞 예약 가능"],["pet","🐾 애견동반"]],
  hike:   [["wc","🚻 화장실"],["water","🚰 약수터"]],
  beach:  [["shower","🚿 샤워장"],["wc","🚻 화장실"],["pet","🐾 애견동반"]],
  valley: [["shower","🚿 샤워장"],["wc","🚻 화장실"],["pet","🐾 애견동반"]],
  culture:[["indoor","🏠 실내(비와도 OK)"]],
};

/* 조사 결과가 여기에 쌓임 */
const SPOTS = [];

/* 러닝 + 나머지를 한 배열로 (러닝은 cat이 없으니 붙여준다) */
function allSpots(){
  return RUN_SPOTS.map(s=>s.cat ? s : Object.assign({cat:"run"}, s)).concat(SPOTS);
}
function spotsOfCat(cat){ return allSpots().filter(s=>s.cat===cat); }
