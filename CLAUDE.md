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
