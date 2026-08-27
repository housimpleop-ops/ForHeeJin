const vm=require('vm'),fs=require('fs');
const c=vm.createContext({});
['js/data-spots.js','js/data-run.js'].forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c));
vm.runInContext('globalThis.__S=SPOTS; globalThis.__R=(typeof RUN_SPOTS!=="undefined")?RUN_SPOTS:[]; globalThis.__ROWS=SPOT_ROWS; globalThis.__FLAGS=(typeof SPOT_FLAGS!=="undefined")?SPOT_FLAGS:[];',c);
const S=c.__S, R=c.__R, ROWS=c.__ROWS, FLAGS=c.__FLAGS;
const out=[];
const P=(...a)=>out.push(a.join(' '));

// 1) 지역(r) 과 주소(a) 불일치
const MAP={'서울':['서울'],'인천':['인천'],'경기북부':['경기'],'경기남부':['경기'],'강원':['강원'],
 '충청':['충북','충남','대전','세종','충청'],'전라':['전북','전남','광주','전라'],
 '경상':['경북','경남','부산','대구','울산','경상'],'제주':['제주']};
P('== 지역(r) ↔ 주소 불일치 ==');
let n1=0;
S.forEach(s=>{const ok=(MAP[s.r]||[]).some(p=>(s.a||'').indexOf(p)===0||(s.a||'').indexOf(p)>=0&&(s.a||'').indexOf(p)<4);
 if(!ok){n1++;P('  ',s.r,'|',s.n,'|',s.a);}});
P('  총 '+n1+'건');

// 2) 카드에 안 나오는 필드 (고아 필드)
const BASE=new Set(['cat','n','r','a','sub','tags','pk','pkTxt','parkSpot','season','tip','lat','lng','conf',
 'acts','acts4','level','sig','menu','hours2','bug','indoor','km','price','stay','stopBy','facility','signature','open','fac','fee','stop','spend','kmTxt','course','lvTxt','bugTxt','acts4Txt','surfLv','diveInfo','book','runNear','mart']);
const shown={};
Object.keys(ROWS).forEach(cat=>{shown[cat]=new Set(ROWS[cat].map(r=>r[0]));});
Object.keys(FLAGS).forEach(cat=>{shown[cat]=shown[cat]||new Set();FLAGS[cat].forEach(r=>shown[cat].add(r[0]));});
P(''); P('== 카드에 표시되지 않는 값 있는 필드 ==');
const orph={};
S.forEach(s=>{Object.keys(s).forEach(k=>{
 const v=s[k]; if(v===null||v===''||(Array.isArray(v)&&!v.length))return;
 if(BASE.has(k))return; if(shown[s.cat]&&shown[s.cat].has(k))return;
 const key=s.cat+'.'+k; orph[key]=(orph[key]||0)+1;});});
Object.entries(orph).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>P('  ',k,v));
if(!Object.keys(orph).length)P('  없음');

// 3) 같은 카드 안에서 아이콘 중복
P(''); P('== 카드 아이콘 중복 ==');
let n3=0;
S.forEach(s=>{const ic=[];(ROWS[s.cat]||[]).forEach(([k,i])=>{const v=s[k];if(v!==undefined&&v!==null&&v!=='')ic.push(i);});
 const d=ic.filter((x,i)=>ic.indexOf(x)!==i); if(d.length){n3++;P('  ',s.cat,s.n,'→',[...new Set(d)].join(','));}});
P('  총 '+n3+'건');

// 4) URL 이상
P(''); P('== URL 이상 ==');
let n4=0;
S.concat(R).forEach(s=>{const b=s.book||''; if(!b)return;
 if(b.indexOf('&amp;')>=0){n4++;P('  &amp; :',s.n);}
 const m=b.match(/https?:\/\/[^\s)]+/); if(m&&/[가-힣]/.test(m[0])){n4++;P('  한글URL :',s.n,m[0]);}});
P('  총 '+n4+'건');

// 5) 거리 모순
P(''); P('== km ↔ kmTxt 모순 ==');
let n5=0;
S.forEach(s=>{if(s.km==null||!s.kmTxt)return; const m=String(s.kmTxt).match(/([\d.]+)\s*km/);
 if(m&&Math.abs(parseFloat(m[1])-s.km)>0.6){n5++;P('  ',s.n,'km='+s.km,'kmTxt='+s.kmTxt);}});
P('  총 '+n5+'건');

// 6) 주차 표기 모순 (pk=free 인데 pkTxt 에 유료)
P(''); P('== pk ↔ pkTxt 모순 ==');
let n6=0;
S.forEach(s=>{const t=s.pkTxt||'';
 if(s.pk==='free'&&/유료|원\)|\d,\d{3}원/.test(t)&&!/무료/.test(t)){n6++;P('  free인데유료:',s.n,'|',t);}
 if(s.pk==='paid'&&/무료/.test(t)&&!/유료/.test(t)){n6++;P('  paid인데무료:',s.n,'|',t);}});
P('  총 '+n6+'건');

// 7) 정보가 너무 적은 항목
P(''); P('== 채워진 칸이 8개 미만인 항목 ==');
let n7=0;
S.forEach(s=>{const k=Object.keys(s).filter(k=>{const v=s[k];return !(v===null||v===''||(Array.isArray(v)&&!v.length));}).length;
 if(k<8){n7++;P('  ',k,s.cat,s.n);}});
P('  총 '+n7+'건');

// 8) beach acts4 누락
P(''); P('== beach 인데 acts4 없음 ==');
let n8=0; S.filter(s=>s.cat==='beach'&&!Array.isArray(s.acts4)).forEach(s=>{n8++;P('  ',s.n);});
P('  총 '+n8+'건');

// 9) hike level 값 이상
P(''); P('== hike level 값 이상 ==');
let n9=0; S.filter(s=>s.cat==='hike').forEach(s=>{if(s.level&&['easy','mid','hard'].indexOf(s.level)<0){n9++;P('  ',s.n,s.level);}});
P('  총 '+n9+'건');

fs.writeFileSync('tools/audit.txt',out.join('\n'),'utf8');
