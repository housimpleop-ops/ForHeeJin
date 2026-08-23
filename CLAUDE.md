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

- events: {id,date,type(run|date|wed),sub,title,memo,kcal,by(cs|hj),done,x,y,lat,lng,photo}
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

## 스킬트리 규칙
- 결혼(wedding)·아이(boards.baby)는 체크리스트를 스킬트리(qtree)로 그림. 노드 탭 → qsheet(날짜·장소·메모·담당).
- 목표형 화면(금연 타임라인, 몸무게 목표, 저축 목표)은 qpathHTML() 마일스톤 경로로 그림.

## 이력
- 2026-08-21 v1: 클로드 아티팩트 단일 파일로 첫 버전 (기능 동일)
- 2026-08-22 v2: 파일 분리 + Supabase + 로그인 + 스킬트리. 이 저장소 시작.

## 다음에 할 일(사용자가 원할 때)
- 카카오맵 실제 지도(키 필요), 관광공사 축제 API, 실시간 시세, 사진→kcal AI, 캘린더 양방향 동기화
- 희진 계정 추가(Supabase Authentication → Add user)

## 지도 데이터
- `js/map-borders.js` — 시도 17개(SIDO_SHAPES) + 시군구 249개(SGG_SHAPES), 각 {n 이름, c 코드, d 경로, b 범위}
- `data/dong-{시도코드}.json` — 읍면동 3,504개를 시도별로 분리(총 1.8MB). 많이 확대(viewBox 폭<28)했을 때
  화면에 걸치는 시도 파일만 fetch해서 그림 → 처음 로딩은 가볍게 유지
- 원본: southkorea-maps (통계청 2018). 변환 스크립트는 세션 scratchpad의 convert_borders2.py / convert_dong.py
- 조작: 한 손가락 드래그=이동, 두 손가락=확대·축소, 휠=확대, ＋/－/전체 버튼, 지역 탭 2단계(강조→확대)

## 스팟 데이터 (가볼 곳 모음)
- `js/data-run.js` — 러닝 156곳(RUN_SPOTS). 러닝 전용 항목(km·노면·경사·그늘·벌레) 때문에 파일 분리 유지
- `js/data-spots.js` — 나머지 분야(SPOTS) + 분야 정의(SPOT_CATS)·카드 표시 규칙(SPOT_ROWS/SPOT_FLAGS)
  - 분야: cafe 카페 / food 맛집 / hike 등산 / stay 숙박 / beach 해변 / valley 계곡 / culture 전시·구경
  - `allSpots()`가 러닝+나머지를 합쳐 하나로 다룬다
- 공통 항목: cat·n·r(지역)·a·sub·tags[]·pk·pkTxt·**parkSpot(추천 주차 위치)**·season·tip·lat·lng·conf
- 분야별 추가 항목은 SPOT_ROWS(카드 줄)·SPOT_FLAGS(알약)에만 등록하면 화면에 자동 반영
- 화면: 계획🌳 → 어디 갈까 → `view-spot`(분야·지역·세부·검색 필터) / 러닝은 `view-run` 유지
- 조사 원칙: 장소마다 블로그 후기 2~3개 교차검증, 값이 엇갈리면 최다 언급 채택 + conf 하향
- 분야마다 항목 이름이 달라서 SPOTS 아래 정규화 한 줄이 있다 — 해변·계곡의 `acts`를 `tags`로,
  등산의 `level`을 `lvTxt`(한글 난이도)로 바꿔준다. 새 분야를 넣을 땐 여기도 확인할 것

### 현재 수량 (2026-08-23)
러닝 156 / 카페 65 / 전시·구경 45 / 맛집 41 / 등산 39 / 숙박 36 / 해변 11 / 계곡 8 = **401곳**
좌표는 394곳(98%). 8개 분류 전부 그림지도에 겹쳐 볼 수 있다.

### 좌표 채우는 법
카카오 장소검색을 브라우저에서 돌려 채웠다. 배포된 사이트(도메인이 등록돼 있어야 SDK가 뜬다)에서
`loadKakao()` 후 `kakao.maps.services.Places().keywordSearch()`로 이름+주소 토큰을 검색하고,
**결과 주소의 시도와 `a` 필드의 시·군·구 토큰이 둘 다 맞을 때만** 채택했다.
그래도 같은 이름의 다른 지점이 잡히는 경우가 있어(리플로우 북한산점→스타필드 고양점,
정발산→김대중사저기념관, 봄날카페→제주시내 동명 카페) 결과 목록을 눈으로 한 번 훑어야 한다.

### 아직 비어 있는 곳
- 좌표 없는 7곳 — 리플로우 북한산점(폐점 의심), 봄날카페, 별채반 교동쌈밥,
  광교산 형제봉, 수리산 태을봉, 홍천 인마이라이프, 속초 비로소
- 해변·계곡 21곳 미조사(강원 동해안 11·제주 6·강원/지리산 계곡 8) — 세션 웹검색 한도 소진으로 중단
- 러닝 156곳에 `parkSpot`(추천 주차 위치)이 아직 없다. `pkTxt`만 있음
- 추가 예정 분야: 축제·쇼핑·드라이브·캠핑·공연

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
- 좌표는 추측 금지 — OSM Nominatim으로 정확히 잡힌 것만 넣고 나머지는 `null` (현재 209곳 중 115곳)
- 결과 취합: 에이전트 출력을 `scratchpad/spot-*.json`으로 저장 → `scratchpad/merge.py` 실행
  (이름이 같으면 정보가 많은 쪽을 남기고, 분야→지역→신뢰도 순으로 정렬해 data-spots.js에 써넣는다)
