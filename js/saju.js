/* ============================================================
   saju.js — 사주·궁합 계산 + 궁합 결과 HTML
   절기는 약식(고정 날짜) 계산 — 경계일 출생은 하루 이틀 오차 가능. 재미용!
   ============================================================ */

const GAN=["갑","을","병","정","무","기","경","신","임","계"];
const GAN_EL=["목","목","화","화","토","토","금","금","수","수"];
const JI=["자","축","인","묘","진","사","오","미","신","유","술","해"];
const JI_EL=["수","토","목","목","토","화","화","토","금","금","토","수"];
const JI_AN=["쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"];
const EL_EM={"목":"🌳","화":"🔥","토":"⛰️","금":"🗡️","수":"💧"};
const SHENG={"목":"화","화":"토","토":"금","금":"수","수":"목"}; // 상생: A가 B를 살림
const KE={"목":"토","토":"수","수":"화","화":"금","금":"목"};    // 상극
const TERM_DAY=[6,4,6,5,6,6,7,8,8,8,7,7];                        // 각 월 절기 대략일

/* 생년월일(+시진)로 사주 네 기둥 계산. hourJi: -1=모름, 0~11=자~해시 */
function sajuPillars(bs, hourJi){
  const p = bs.split("-").map(Number), y=p[0], m=p[1], d=p[2];
  let ey=y; if(m<2||(m===2&&d<TERM_DAY[1])) ey=y-1;                 // 년주: 입춘 기준
  const ys=((ey-4)%10+10)%10, yb=((ey-4)%12+12)%12;
  let mm=m; if(d<TERM_DAY[m-1]) mm=(m-1===0)?12:m-1;                // 월주: 절기 기준
  const mb=mm%12, mOff=(mb-2+12)%12, ms=((ys%5)*2+2+mOff)%10;
  const days=Math.round((Date.UTC(y,m-1,d)-Date.UTC(1900,0,1))/86400000); // 일주: 1900-01-01=갑술
  const di=((10+days)%60+60)%60, ds=di%10, db=di%12;
  const out={ys,yb,ms,mb,ds,db,hs:null,hb:null};
  if(hourJi>=0){ out.hb=hourJi; out.hs=((ds%5)*2+hourJi)%10; }      // 시주
  return out;
}

function elCount(p){
  const c={"목":0,"화":0,"토":0,"금":0,"수":0};
  c[GAN_EL[p.ys]]++; c[JI_EL[p.yb]]++; c[GAN_EL[p.ms]]++; c[JI_EL[p.mb]]++; c[GAN_EL[p.ds]]++; c[JI_EL[p.db]]++;
  if(p.hs!=null){ c[GAN_EL[p.hs]]++; c[JI_EL[p.hb]]++; }
  return c;
}
function elRel(a,b){
  if(a===b) return {s:10, d:`둘 다 ${a}${EL_EM[a]} — 닮은꼴이라 서로를 한눈에 알아봐요.`};
  if(SHENG[a]===b) return {s:15, d:`${a}${EL_EM[a]}이(가) ${b}${EL_EM[b]}을(를) 살려주는 <b>상생</b> — 한쪽이 자연스럽게 힘을 실어주는 관계예요.`};
  if(SHENG[b]===a) return {s:15, d:`${b}${EL_EM[b]}이(가) ${a}${EL_EM[a]}을(를) 살려주는 <b>상생</b> — 한쪽이 자연스럽게 힘을 실어주는 관계예요.`};
  return {s:6, d:`${a}${EL_EM[a]}과(와) ${b}${EL_EM[b]}은(는) 서로를 자극하는 <b>상극</b> — 티격태격해도 그만큼 서로를 단단하게 만드는 관계예요.`};
}
function ziRel(a,b){
  const yuk=[[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
  if(a===b) return {s:8, d:"같은 띠 — 거울처럼 서로를 알아봐요."};
  if(yuk.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a))) return {s:12, d:"<b>육합(六合)</b> — 조용히 서로를 끌어당기는 찰떡 조합이에요."};
  const sam=[[8,0,4],[11,3,7],[2,6,10],[5,9,1]];
  if(sam.some(g=>g.includes(a)&&g.includes(b))) return {s:12, d:"<b>삼합(三合)</b> — 같은 팀처럼 손발이 잘 맞는 조합이에요."};
  if(Math.abs(a-b)===6) return {s:4, d:"<b>충(沖)</b> — 부딪히는 만큼 서로를 깨우는, 자극이 되는 조합이에요."};
  return {s:8, d:"무난하게 잘 어울리는 띠 조합이에요."};
}
function yearLuck(yr, myDs, name){
  const s=((yr-4)%10+10)%10, b=((yr-4)%12+12)%12;
  const yEl=GAN_EL[s], mEl=GAN_EL[myDs];
  let t;
  if(SHENG[yEl]===mEl) t="기운을 받아 일이 술술 풀리기 좋은 해예요";
  else if(SHENG[mEl]===yEl) t="에너지를 많이 쓰는 해 — 무리 말고 쉬어가며 가요";
  else if(yEl===mEl) t="내 기운이 두 배가 되는 해 — 뭔가 시작하기 좋아요";
  else if(KE[yEl]===mEl) t="긴장감 있는 해 — 큰 결정은 천천히, 둘이 상의해서";
  else t="내가 주도권을 잡는 해 — 세운 계획을 밀고 나가요";
  return `· <b>${yr}년 ${GAN[s]}${JI[b]}년${EL_EM[yEl]}</b> ${name}: ${t}`;
}

/* ---------- 궁합 결과 HTML ---------- */
function pilHTML(p, name){
  const cells=[["년주","조상·뿌리",p.ys,p.yb],["월주","부모·청년기",p.ms,p.mb],["일주","나 자신 💫",p.ds,p.db],["시주","자녀·말년",p.hs,p.hb]];
  return `<div class="fate-p" style="margin-top:12px"><b>${name}</b> — ${JI_AN[p.yb]}띠</div>
  <div class="pil">`+cells.map(c=>`<div class="pc"><div class="g">${c[2]==null?"?":GAN[c[2]]+JI[c[3]]}</div><div class="lbl">${c[0]}${c[2]!=null?" "+EL_EM[GAN_EL[c[2]]]:""}</div><div class="lbl">${c[1]}</div></div>`).join("")+`</div>`;
}
function elBarHTML(c){
  const tot=Object.values(c).reduce((a,b)=>a+b,0)||1;
  return `<div class="elbar">`+["목","화","토","금","수"].map(el=>c[el]?`<span class="el-${el}" style="width:${c[el]/tot*100}%"></span>`:"").join("")+`</div>
  <div class="el-lg">`+["목","화","토","금","수"].map(el=>`<span><i class="el-${el}"></i>${el}${EL_EM[el]} ${c[el]}</span>`).join("")+`</div>`;
}
function mbtiCmp(a,b){
  if(!a||!b||a.length<4||b.length<4) return "";
  const names=["에너지 방향","세상 읽기","판단 기준","생활 리듬"];
  let out="";
  for(let i=0;i<4;i++){
    const same=a[i]===b[i];
    let line = same ? `둘 다 <b>${a[i]}</b> — 리듬이 잘 맞아요` : `<b>${a[i]} × ${b[i]}</b> — 서로의 빈칸을 채워줘요`;
    if(i===3&&!same) line += ` (이 앱이 존재하는 이유 😄)`;
    out += `<br>· ${names[i]}: ${line}`;
  }
  return `<div class="fate-p"><b>MBTI ${esc(a)} × ${esc(b)}</b>${out}<br><span style="color:var(--muted-solid); font-size:11.5px">E외향/I내향 · S현실/N직관 · T논리/F감성 · J계획/P즉흥</span></div>`;
}
const AXES=[["E","I"],["S","N"],["T","F"],["J","P"]];
function mbtiRow(p, val){
  return `<div class="mbti-row" data-p="${p}">`+AXES.map(ax=>`<span class="pair">`+ax.map(L=>`<button type="button" data-l="${L}" class="${val&&val.indexOf(L)>=0?"on":""}">${L}</button>`).join("")+`</span>`).join("")+`</div>`;
}
/* 생일 입력 — 달력 대신 년·월·일 고르기 (폰에서 훨씬 편함) */
function birthPicker(p, val){
  const [y,m,d] = (val||"").split("-").map(Number);
  const nowY = new Date().getFullYear();
  const years = [];
  for(let i=nowY; i>=1940; i--) years.push(i);
  const opt = (list, cur, unit) => list.map(v=>`<option value="${v}" ${v===cur?"selected":""}>${v}${unit}</option>`).join("");
  const days = []; for(let i=1;i<=31;i++) days.push(i);
  const months = []; for(let i=1;i<=12;i++) months.push(i);
  return `<div class="birth-row" data-p="${p}">
    <select class="f-in bp-y" data-p="${p}"><option value="">연도</option>${opt(years, y, "년")}</select>
    <select class="f-in bp-m" data-p="${p}"><option value="">월</option>${opt(months, m, "월")}</select>
    <select class="f-in bp-d" data-p="${p}"><option value="">일</option>${opt(days, d, "일")}</select>
  </div>`;
}
function birthValue(p){
  const y = document.querySelector(`.bp-y[data-p="${p}"]`).value;
  const m = document.querySelector(`.bp-m[data-p="${p}"]`).value;
  const d = document.querySelector(`.bp-d[data-p="${p}"]`).value;
  if(!y || !m || !d) return null;
  return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
}
function timeOptions(sel){
  const names=["자시 23~01","축시 01~03","인시 03~05","묘시 05~07","진시 07~09","사시 09~11","오시 11~13","미시 13~15","신시 15~17","유시 17~19","술시 19~21","해시 21~23"];
  return `<option value="-1">모름</option>`+names.map((n,i)=>`<option value="${i}" ${sel===i?"selected":""}>${n}</option>`).join("");
}
function fateOutHTML(pf){
  if(!(pf && pf.cs && pf.cs.birth && pf.hj && pf.hj.birth))
    return `<div class="card"><div class="empty">두 사람의 생일을 넣고 저장하면 궁합이 짜잔 🔮✨</div></div>`;
  const pa=sajuPillars(pf.cs.birth, pf.cs.time!=null?+pf.cs.time:-1);
  const pb=sajuPillars(pf.hj.birth, pf.hj.time!=null?+pf.hj.time:-1);
  const ea=GAN_EL[pa.ds], eb=GAN_EL[pb.ds];
  const rel=elRel(ea,eb), zr=ziRel(pa.yb,pb.yb);
  const ca=elCount(pa), cb=elCount(pb);
  let comp=0; ["목","화","토","금","수"].forEach(el=>{ if(!ca[el]&&cb[el]) comp++; if(!cb[el]&&ca[el]) comp++; });
  const score=Math.min(99, 62+rel.s+zr.s+Math.min(8,comp*2));
  const comb={}; ["목","화","토","금","수"].forEach(el=>comb[el]=ca[el]+cb[el]);
  return `<div class="card">
    <div class="score">💘 ${score}점</div>
    <div class="score-cap">${PEOPLE.cs} ${GAN[pa.ds]}${EL_EM[ea]} × ${PEOPLE.hj} ${GAN[pb.ds]}${EL_EM[eb]} — 일간(나 자신)끼리의 만남</div>
    ${pilHTML(pa,PEOPLE.cs)}${pilHTML(pb,PEOPLE.hj)}
    <div class="fate-p" style="margin-top:14px"><b>둘이 합친 오행 밸런스</b></div>${elBarHTML(comb)}
    <div class="fate-p"><b>일간 궁합</b> — ${rel.d}</div>
    <div class="fate-p"><b>띠 궁합</b> — ${JI_AN[pa.yb]}띠 × ${JI_AN[pb.yb]}띠: ${zr.d}</div>
    ${comp?`<div class="fate-p"><b>오행 보완</b> — 한 사람에게 없는 기운을 상대가 ${comp}가지 채워주고 있어요. 같이 있을 때 완성되는 팔자 🧩</div>`:""}
    ${mbtiCmp(pf.cs.mbti,pf.hj.mbti)}
    <div class="fate-p"><b>앞으로의 기운 (세운)</b><br>${yearLuck(2026,pa.ds,PEOPLE.cs)}<br>${yearLuck(2026,pb.ds,PEOPLE.hj)}<br>${yearLuck(2027,pa.ds,PEOPLE.cs)}<br>${yearLuck(2027,pb.ds,PEOPLE.hj)}</div>
    <details class="gls"><summary>사주팔자, 이게 다 무슨 뜻이냐면 🤓</summary>
      <b>사주팔자</b>: 태어난 연·월·일·시 네 기둥(사주)에 두 글자씩, 총 여덟 글자(팔자)예요. 년주는 뿌리(조상·유년기), 월주는 부모·청년기, <b>일주는 나 자신과 배우자</b>, 시주는 자녀·말년을 봐요. 그래서 궁합은 일주의 윗글자(일간)끼리 먼저 봐요.<br><br>
      <b>천간·지지</b>: 윗글자(갑을병정…)는 하늘의 기운, 아랫글자(자축인묘…)는 땅의 기운이자 띠예요.<br><br>
      <b>오행</b>: 목🌳(성장·시작) 화🔥(열정·표현) 토⛰️(중심·신뢰) 금🗡️(결단·정리) 수💧(지혜·유연함). 목→화→토→금→수→목 순서로 서로 살려주는 게 <b>상생</b>, 서로 누르는 게 <b>상극</b>이에요. 상극이 나쁜 게 아니라 긴장과 성장을 주는 관계로 봐요.<br><br>
      <b>세운</b>: 해마다 바뀌는 그 해의 기운. 내 일간과의 관계로 그 해의 흐름을 봐요.<br><br>
      ⚠️ 절기(입춘 등)는 약식 계산이라 경계일(2월 초 등) 출생은 하루 이틀 오차가 날 수 있어요. 진지한 해석은 전문가에게, 여기서는 재미로! 😉
    </details>
  </div>`;
}
