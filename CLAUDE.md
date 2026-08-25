# 계획하는 사이 (couple-planner)

창석·희진 커플 플래너 웹앱. GitHub Pages(정적 호스팅) + Supabase(공유 저장·로그인·실시간).
사용자는 비개발자 — 코드는 단순하게, 설명은 한국어로, 빌드 도구 없이 순수 HTML/CSS/JS 유지.

## 구조 (파일별 역할 — 여기만 보면 길을 안 잃음)

```
index.html            화면 마크업 전부 (섹션 주석으로 구분)
css/style.css         스타일 전부 (맨 위 목차 주석 참고)
js/config.js          ★ Supabase 주소·키 — 설정은 이 파일만 수정
js/data.js            상수·목록 (분류, 축제, 체크리스트 템플릿, 명언, 시간표)
js/state.js           전역 상태(DATA)·유틸·applyChange(변경 반영)·guards(데이터 보정)
js/saju.js            사주·궁합 계산 + 궁합 결과 HTML
js/map.js             대한민국 SVG 지도 + 핀
js/store.js           저장/불러오기 — Supabase(공유)·localStorage(로컬)·로그인·사진 URL
js/views.js           모든 화면 그리기 render*() + 스킬트리/마일스톤 HTML
js/sheets.js          바텀시트 3종 (일정 sheet / 식단 msheet / 퀘스트 상세 qsheet)
js/app.js             이벤트 연결 + 탭 이동 + 부팅 (스크립트 로드 순서 마지막)
supabase/couple-schema.sql   Supabase SQL Editor에 붙여넣는 테이블·정책
docs/시작하기.md       사용자용 배포·설정 안내 (단계별)
```

스크립트 로드 순서(index.html 하단): config → data → state → saju → map → store → views → sheets → app.
모듈 시스템 없음 — 전역 함수/변수를 그대로 공유한다. 새 파일 추가 시 로드 순서에 주의.

⚠️ **배포 캐시 규칙**: css/js를 수정해 배포할 때는 index.html의 `?v=숫자`를 전부 +1 할 것.
(GitHub Pages가 파일을 10분 캐시해서, 안 올리면 폰에서 새 index + 옛 js가 섞여 깨질 수 있음)

## 데이터 모델

Supabase `couple_state` 테이블의 **한 행(id='main')에 DATA 전체를 jsonb로** 저장.
사진·음성·영상은 Storage 버킷 `couple-media`(public)에 `photos/…`, `media/…` 경로로.

```
DATA = { v, events[], wishes[], meals[], notes[], wedding[], trips[],
         boards:{home,baby,pet}, fridge[], shop[], profile, bodyP, bodyLogs[],
         shows[], smoke:{cs,hj}, invest:{goal,notes[]} }
```

- events: {id,date,type(run|date|wed),sub,title,memo,felCs,felHj,spot,kcal,by(cs|hj),done,x,y,lat,lng,photo}
  - felCs/felHj = 그날의 느낌(각자 한 칸씩). spot={cat,n}은 스팟 참조 —
    **메모에 장소 설명을 복사해 넣지 않는다.** 카드 아래 `spotInfoHTML()`이 원본에서 읽어 보여준다.
- trips: {id,title,start,nights,items[{id,text,done}], wish[{id,kind(go|eat|do),text,note,link,photo,by,done}]}
  - wish = 하고싶은거·먹고싶은거·가보고싶은거. 사진은 photos/{id}.jpg, 링크는 noteParts()가 유튜브·인스타·일반으로 갈라 렌더.
  - 시트는 `#wsheet` / `openWish(trip, kind, w)` (sheets.js [2.7]). 새 시트를 추가하면
    closeAllSheets·anySheetOpen·bind*Sheet 세 곳에 반드시 등록할 것.
  - x,y는 그림 지도 SVG viewBox(300×420) 좌표, lat/lng는 카카오맵용 실좌표.
  - map.js의 svgToLatLng/latLngToSvg로 상호 변환 — 두 지도가 같은 핀 공유. photo는 storage 경로.
  - 카카오맵: config.js의 KAKAO_JS_KEY(도메인 잠금), 지도 탭 [그림/진짜] 전환, 장소 검색→일정 만들기.
- 저장 흐름: 어떤 변경이든 `save(change, files?)` 하나로. change는 applyChange가 이해하는
  {kind, ...} 꼴 — 저장 직전 서버 최신본을 받아 change만 얹어서 덮어씀(동시 수정 병합).
- 실시간: couple_state UPDATE 이벤트 수신 → 다시 select → renderAll().

## 동작 모드 (store.js의 mode)
- "shared": 로그인됨, Supabase 저장. "local": config 미설정/미로그인 — localStorage만.
- config.js가 비어 있으면 자동으로 local — Supabase 없이도 개발·테스트 가능.

## 화면 구조 (하단 6탭 + 트리 허브)
- 하단 탭: 달력 · 지도 · 쪽지 · **계획🌳** · **서랍📦** · 설정
- 계획 허브 = 「목표·준비」(결혼·여행·신혼집·아이·반려·금연·몸·재테크) + 「매일 기록」(식단·같이보기·냉장고)
- 서랍 허브 = 「우리 이야기」(궁합·약속) + 「참고 자료」(축제·나라혜택)
- app.js의 VIEW_PARENT가 각 세부 화면의 부모 탭을 정한다. 새 화면 추가 시:
  index.html 섹션 + ALL_VIEWS + VIEW_PARENT + (views.js) PLAN_TREE/BOX_TREE + planStatus 한 줄.
- "지금 보는 사람"(me) 전환은 설정 탭에 있다.

## 화면 규칙 몇 가지
- 쪽지 피드는 **옛날이 위, 최근이 아래**(보통 메신저 순서). renderNote()에서 오름차순 정렬만 하고
  reverse 하지 않는다. 아래쪽을 보고 있었으면 렌더 후 자동으로 맨 아래로 내려간다.
- 글자를 눌러 그 자리에서 고치는 건 views.js의 `inlineEdit(el, 현재값, 저장콜백)`.
  저장콜백에 null이 오면 취소이니 다시 렌더만 하면 된다.
- 여행 제목·날짜는 `tripEdit`(수정 중인 여행 id)에 담아 renderTrip()이 편집 폼을 그린다 —
  다시 렌더돼도 편집 상태가 안 날아간다.

## 스킬트리 규칙
- 결혼(wedding)·아이(boards.baby)는 체크리스트를 스킬트리(qtree)로 그림. 노드 탭 → qsheet(날짜·장소·메모·담당).
- 목표형 화면(금연 타임라인, 몸무게 목표, 저축 목표)은 qpathHTML() 마일스톤 경로로 그림.

## 이력
- 2026-08-21 v1: 클로드 아티팩트 단일 파일로 첫 버전 (기능 동일)
- 2026-08-22 v2: 파일 분리 + Supabase + 로그인 + 스킬트리. 이 저장소 시작.
- 2026-08-23 v27: 스팟 470곳(좌표 100%)·러닝 주차 156곳, 여행 위시 칸, 일정마다 느낌 칸,
  쪽지 시간순, 제목·항목 눌러서 수정

## 다음에 할 일(사용자가 원할 때)
- 카카오맵 실제 지도(키 필요), 관광공사 축제 API, 실시간 시세, 사진→kcal AI, 캘린더 양방향 동기화
- 희진 계정 추가(Supabase Authentication → Add user)

## 그림지도 (v37에서 크게 손봄)

- **도로**: `js/map-roads.js` — `tools/make-roads.py` 로 생성(직접 고치지 말 것).
  고속도로 17 + 국도 13. **지나는 시군구 중심점을 이어 만든 대략도**라 실제 도로 대장이 아니다.
  좌표를 `map-borders.js` 도형에서 뽑으므로 지도와 절대 어긋나지 않는 게 이 방식의 장점.
  섬처럼 시군구로 못 그리는 곳은 `(위도, 경도)` 튜플로 직접 지정(제주 일주도로).
  표시 규칙: 고속도로는 항상, **국도는 z3(폭<95, 시군구 단위)부터** 나타난다.
- **확대**: `zoomToBBox` 여백 8%(전엔 35%), 최소 폭 시도 22 / 시군구 6(전엔 60/28).
- **경계선**: `js/map-lines.js` — `tools/make-lines.py` 로 생성(직접 고치지 말 것).

  지도에서 가장 많이 헤맨 부분이라 규칙을 못박아 둔다.

  ⚠️ **① 도형마다 흰 외곽선을 주면 안 된다.** 이웃과 맞닿은 경계가 두 번 그려지는데
  두 도형의 좌표가 달라(정확히 겹치는 선분 30%) **나란한 두 줄**로 보인다.

  ⚠️ **② 색과 선을 다른 도형에서 뽑으면 안 된다.** 시도 도형과 시군구 도형은
  각각 따로 단순화돼 **10%가 0.7단위, 1%가 1.5단위 어긋난다**(전체 폭 300 기준).
  확대하면 15px씩 벌어져 "색이 바뀌는 자리와 선이 안 맞는" 상태가 된다.

  그래서 **선도 색도 시군구 도형 하나에서만** 뽑는다:
  - `path.sggp` 가 실제로 보이는 칠. 제가 속한 도(道)의 색(`SGG_TONE[i]` → t0~t7)을 입는다.
    같은 도 안에서는 색이 같아 이음매가 안 보이고, 도가 바뀌는 자리는 선과 같은 좌표다.
  - `SIDO_LINE` = 도 경계·바닷가(3,700선분) / `SGG_LINE` = 도 안쪽 시군구 경계(2,483선분).
    멀리서는 도 경계만, z3(폭<95)부터 시군구 경계까지 보인다.
  - `path.land`(시도 도형)는 이제 뒤에 깔리는 배경일 뿐. 클릭·라벨용으로만 남겨둔다.
  - 도형에는 **제 fill 과 같은 색의 얇은 선**만 둘러 도형 사이 틈을 메운다.

  ⚠️ **③ 중복 판정에서 자기 도형의 앞뒤 선분을 세면 안 된다.** 연속된 선분은 당연히
  붙어 있어서, 짧은 선분이 통째로 "중복"으로 지워져 경계가 끊긴다(`owner[c][1] != pi`).
- **동 이름은 쓰지 않는다**(사용자 요청). `.lbl4` 는 비워두고 CSS 로도 숨김.
- **가볼 곳 이모지**: `.pin.spt` = 흰 동그라미 + 분야 이모지. `mapSpotCat="all"` 이면 전 분야.
  `declutterSpots()` 가 화면을 격자(폭/13)로 나눠 한 칸에 하나만 남긴다 →
  전국에서 111개, 확대할수록 더 나타남. 고른 스팟은 항상 보임.
- **지도 아래 목록**(`#spotStrip`): 고른 분야의 스팟이 쭉 나오고 자체 스크롤(max-height 44vh).
  이모지를 누르면 목록이 그 항목으로 스크롤되며 펼쳐진다(주소·정보·추천주차·팁·버튼).
  ⚠️ 목록을 다시 그리면 scrollTop 이 0이 된다. 반드시 이전 값을 기억했다 복구할 것.
  - **목록에서 누른 경우**: `stripAnchor` 에 {이름, offsetTop, scrollTop} 을 적어 두고,
    다시 그린 뒤 offsetTop 변화만큼 scrollTop 을 보정 → 누른 줄이 화면에서 안 움직인다.
  - **지도에서 누른 경우**: `stripFollow=true` 일 때만 그 항목으로 부드럽게 이동.
  - `.sp-list` 에 `position:relative` 필수 — 없으면 자식의 offsetTop 이 목록이 아니라
    페이지 기준이 돼서 위치 계산이 전부 틀어진다.
- ⚠️ **`setPointerCapture` 를 pointerdown 에서 하면 안 된다.** 손을 뗄 때 `click` 이
  실제 요소가 아니라 캡처 대상(지도 전체)으로 가서, 이모지를 눌러도 무엇을 눌렀는지 알 수 없다.
  **끌기가 시작된 뒤에만** 붙잡을 것(`grab()`).

## 조사 에이전트 — 꼭 지킬 것 (실제로 겪은 사고들)

- **하위 에이전트를 만들지 말라고 프롬프트에 못박을 것.** 부모가 먼저 끝나면 결과가 통째로 날아간다.
- **이미 있는 곳 목록을 프롬프트에 통째로 넣을 것.** 안 넣으면 절반이 중복으로 돌아온다.
- **`conf` 는 high/mid/low 셋뿐**이라고 명시. 안 그러면 "med" 같은 게 섞인다(pull-spots.py 가 보정하긴 함).
- **`lat`/`lng` 는 반드시 null.** 좌표는 카카오로만 채운다 — 추측 금지.
- ⚠️ **프롬프트에 넣은 JSON 예시 틀이 결과로 딸려 들어온다.** "장소 이름" 같은 행이 실제로 DB에
  들어간 적 있음. pull-spots.py 에 이름 차단을 넣어뒀지만, 병합 후 눈으로도 확인할 것.
- ⚠️ **WebSearch 는 세션 전체 200회 한도**를 여러 팀이 나눠 쓴다. 4팀이 한계이고
  "WebSearch 는 아끼고 WebFetch 정독을 많이 하라"고 프롬프트에 적어야 뒷팀이 굶지 않는다.
- 네이버 블로그는 크롤러 차단 — 다이닝코드·대한민국구석구석·지자체 관광 페이지·티스토리·언론으로 우회.
- **카카오 매칭은 반드시 눈으로 훑을 것.** 이번에도 19건이 엉뚱하게 잡혔다
  (잣향기푸른숲캠핑장→가평오스트리아캠핑장, 제주 무수천→메가커피, 힙지로→힙지로누룽지통닭 등).
  이름만으로 안 잡히면 대표 랜드마크로 다시 검색한다.

## 러닝 기록 파일 올리기 (v36)

`js/gpx.js` — 뛴 기록 파일을 브라우저 안에서만 처리한다. 서버·API 키·구독 전부 불필요.
(스트라바 API 가 유료라 이 방식으로 정했음)

- `parseGPX(text)` → `{km, secs, up, date, time, name, n, pts}` / 못 읽으면 null
  - GPX 는 `<trkpt lat lon><time><ele>`, TCX 는 `<Trackpoint><Position>` 을 읽는다. **.fit 은 못 읽음**
  - 거리는 하버사인 합. **1초 안에 100m 넘게 튀면 그 구간은 건너뛴다**(GPS 튐)
  - 오르막은 양수 고도차만, 한 번에 30m 넘는 변화는 오류로 보고 무시
  - `pts` 는 120점으로 솎아내고 소수 5자리 반올림 → **기록 한 건이 약 2.8KB** (jsonb 에 넣어도 부담 없음)
- `gpxPreviewSVG(pts)` — 저장 전 미리보기. 위도·경도 축척이 달라 `cos(위도)` 로 가로를 보정해야 안 찌그러진다
- 저장하면 `DATA.events` 에 `type:"run"` 일정이 생기고 `route`(좌표 배열)·`dist`·`secs` 가 함께 들어간다
- `renderKakaoMarkers()` 가 `e.route` 있는 일정을 `kakao.maps.Polyline` 으로 그린다
- 출발점에서 2km 안의 `RUN_SPOTS` 를 찾아 제목·spot 에 자동으로 붙인다
- ⚠️ 실내 러닝머신 기록은 좌표가 없어 못 올린다(안내 화면에 적어 둠)
- 검증: 시험 GPX 로 파서 10.62km vs 카카오 `Polyline.getLength()` 10,596m — 0.2% 차이
- ⚠️ 디버깅 주의: `kmap`·`kRoutes` 같은 top-level `let` 은 `window` 에 안 붙는다.
  콘솔에서 `window.kmap` 은 undefined — 이름 그대로 `kmap` 으로 봐야 한다

## 지도 데이터
- `js/map-borders.js` — 시도 17개(SIDO_SHAPES) + 시군구 249개(SGG_SHAPES), 각 {n 이름, c 코드, d 경로, b 범위}
- `data/dong-{시도코드}.json` — 읍면동 3,504개를 시도별로 분리(총 1.8MB). 많이 확대(viewBox 폭<28)했을 때
  화면에 걸치는 시도 파일만 fetch해서 그림 → 처음 로딩은 가볍게 유지
- 원본: southkorea-maps (통계청 2018). 변환 스크립트는 세션 scratchpad의 convert_borders2.py / convert_dong.py
- 조작: 한 손가락 드래그=이동, 두 손가락=확대·축소, 휠=확대, ＋/－/전체 버튼, 지역 탭 2단계(강조→확대)

## 스팟 데이터 (가볼 곳 모음)
- `js/data-run.js` — 러닝 156곳(RUN_SPOTS). 러닝 전용 항목(km·노면·경사·그늘·벌레) 때문에 파일 분리 유지
- `js/data-spots.js` — 나머지 분야(SPOTS) + 분야 정의(SPOT_CATS)·카드 표시 규칙(SPOT_ROWS/SPOT_FLAGS)
  - 분야: cafe 카페 / food 맛집 / hike 등산 / stay 숙박(리조트 포함) / beach 해변 / valley 계곡 /
    culture 전시·구경 / fest 축제 / camp 캠핑 / drive 드라이브 / snow 스키·썰매 / spa 온천 /
    shop 쇼핑·시장 / perf 공연 /
    shop 쇼핑·시장 / perf 공연
  - shop 은 buy·eat·hours·day 줄 + indoor 알약. **장날·야시장 요일·정기휴무를 day/hours 에 꼭 적을 것**
    (헛걸음 1순위. 정선 2·7일, 세화 5·10일, 예산 2·7일, 서문야시장 금~일, 남부시장 금·토 등)
  - perf 는 what·price·when·book 줄 + indoor 알약. 공연 **제목이 아니라 장소·상설 프로그램** 단위로 넣어야
    내년에도 유효함. 상설공연은 최근 공연 이력이 확인 안 되면 넣지 말 것(코로나 이후 접은 곳이 많음)
  - `allSpots()`가 러닝+나머지를 합쳐 하나로 다룬다
- 공통 항목: cat·n·r(지역)·a·sub·tags[]·pk·pkTxt·**parkSpot(추천 주차 위치)**·season·tip·lat·lng·conf
- 분야별 추가 항목은 SPOT_ROWS(카드 줄)·SPOT_FLAGS(알약)에만 등록하면 화면에 자동 반영
- 화면: 계획🌳 → 어디 갈까 → `view-spot`(분야·지역·세부·검색 필터) / 러닝은 `view-run` 유지
- 조사 원칙: 장소마다 블로그 후기 2~3개 교차검증, 값이 엇갈리면 최다 언급 채택 + conf 하향
- 분야마다 항목 이름이 달라서 SPOTS 아래 정규화 한 줄이 있다 — 해변·계곡의 `acts`를 `tags`로,
  등산의 `level`을 `lvTxt`(한글 난이도)로 바꿔준다. 새 분야를 넣을 땐 여기도 확인할 것

### 현재 수량 (2026-08-25)
등산 123 / 숙박 106 / 카페 102 / 맛집 96 / 전시·구경 77 / 해변 76 / 쇼핑·시장 74 /
캠핑 70 / 축제 66 / 드라이브 66 / 계곡 63 / 공연 61 / 스키·썰매 52 / 온천 43
= **스팟 1,075곳** + 러닝 156곳 = **1,231곳**
좌표 1,075/1,075(100%), 러닝 추천 주차 156/156(100%). conf 는 high 621 / mid 450 / low 4.
- 리조트는 별도 분야가 아니라 **숙박 안**(sub: 워터파크/스키/온천·스파/해변/골프/테마파크)
- 스키장과 그 리조트가 양쪽에 다 있는 건 의도한 것 — snow 는 슬로프·리프트권, stay 는 숙박 정보

### 좌표 채우는 법
카카오 장소검색을 브라우저에서 돌려 채웠다. 배포된 사이트(도메인이 등록돼 있어야 SDK가 뜬다)에서
`loadKakao()` 후 `kakao.maps.services.Places().keywordSearch()`로 이름+주소 토큰을 검색하고,
**결과 주소의 시도와 `a` 필드의 시·군·구 토큰이 둘 다 맞을 때만** 채택했다.
그래도 같은 이름의 다른 지점이 잡히는 경우가 있어(리플로우 북한산점→스타필드 고양점,
정발산→김대중사저기념관, 봄날카페→제주시내 동명 카페) 결과 목록을 눈으로 한 번 훑어야 한다.

### 데이터 손질 도구 (tools/)
- `merge-spots.py` — `tools/spot-*.json` 을 전부 읽어 중복 제거 후 SPOTS 배열을 통째로 다시 쓴다.
  기존 데이터를 남기려면 현재 SPOTS 를 `spot-000-current.json` 으로 먼저 덤프할 것
- `merge-parkspot.py <park.json>` — `{"이름":"주차 설명"}` 을 data-run.js 에 끼워 넣는다(기존 값은 안 건드림)
- `apply-patch.py <patch.json>` — `[{cat,n,채울 항목…}]` 로 SPOTS 항목 일부만 갱신. conf:low 는 mid 로 올린다

### 아직 비어 있는 곳
- conf:low 21곳 — 후기 표본이 얕은 곳들. 보강하려면 `apply-patch.py` 로 부분 갱신
- **좌표를 확인 못 해 일부러 뺀 곳** (조사팀은 찾았지만 카카오·웹에 실체가 없었다):
  경주 숙영식당, 일다(광주 동명동), 카페 하멜(여수), 카페 라라라(제주 구좌),
  짐바란비치(제주 애월), 태안 풀빌라케럿, 태안 청포대카라반빌리지, 제주에코힐글램핑,
  미란다호텔 스파플러스(영업 중단·도메인 만료), 울산발리온천(조사 주소와 카카오 위치 불일치),
  단양 피플스토리펜션(여기어때·야놀자·캠핏·구글 어디에도 상호 없음).
- **쇠락·종연으로 뺀 곳**: 비밥(인천 상설 퇴출), 정동극장 '미소'(2019 종연), 드로잉쇼·사춤·판타스틱,
  춘천 육림고개 청년몰(공실 과반), 부산 보수동 책방골목(점포 감소), 제주 벨롱장(비정기 휴장),
  인천대공원·인천 서구 사계절 썰매장. 여행 포털에 아직 "운영 중"으로 남아 오정보가 많으니 주의.
- **⚠️ 예약처 불명**: 부안 변산오토캠핑장 — 땡큐캠핑 계약종료·자체 홈페이지 접속 불가인데
  고캠핑에는 운영 중으로 등재. tip 에 전화 확인 경고를 넣어 둠.
  `tools/pull-spots.py` 의 REJECT 목록에 넣어 다시 안 들어오게 막아뒀다
- 추가 예정 분야: 쇼핑·공연

### 그림지도 스팟 레이어
- 상태: `mapSpotCat`(off 또는 분야) · `mapSpotRegion` · `mapSpotSel`
- `mapSpots()`가 띄울 목록을, `mapSpotPool()`이 좌표 있는 전체 스팟을 준다
- 점 색은 `SPOT_CATS[cat].color`(run/date/fest) → CSS `.pin.cand.run|date|fest`

### 조사 에이전트 운영 메모
- 에이전트에게 **하위 에이전트를 만들지 말고 직접 WebSearch·WebFetch로 조사**하라고 못박을 것
  (하위 에이전트를 만들면 부모가 먼저 끝나 결과가 유실된 적이 있다)
- 조사 중인 에이전트를 재촉하지 말 것 — 하위 조사가 중단된다
- WebSearch는 **세션당 200회** 한도라 여러 팀을 동시에 돌리면 뒷팀이 굶는다. 한도가 떨어지면
  네이버 블로그는 크롤러 차단이라 다이닝코드·티스토리·공식 사이트로 우회하게 되고 정확도가 떨어짐
- 좌표는 추측 금지 — 카카오에서 확인된 것만 넣고, 못 찾으면 그 항목 자체를 뺀다
- 결과 취합은 **대화 기록에서 자동으로 긁는다**: `tools/pull-spots.py <세션.jsonl> <출력.json>`
  ```json 블록```을 찾아 이미 있는 것·REJECT 목록을 걸러낸다. 옮겨 적을 필요가 없다.
  (jsonl 원문은 따옴표가 \" 로 이스케이프돼 있어 `"cat"` 으로는 못 거른다 — ```json 으로 걸러야 한다)
- 지오코딩은 배포된 사이트에서 돌린다(카카오 키가 도메인 잠금). 목록이 길면 `geo.json` 을 저장소에
  잠깐 올려 same-origin fetch 로 읽고, 끝나면 지운다 — 콘솔에 한글을 찍으면 깨져서 붙여넣기가 안 된다
- **매칭 결과는 반드시 눈으로 훑을 것.** 실제로 이런 오매칭이 나왔다:
  포항 스페이스워크→포항숯불가든, 카페 라라라(제주)→용인 기흥, 거창 수승대→같은 이름 식당,
  제주 강정천→강정천주유소, 지중해아침펜션→태안군청. 이름만 믿으면 안 된다
