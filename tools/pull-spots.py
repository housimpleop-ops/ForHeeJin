# -*- coding: utf-8 -*-
"""세션 대화 기록(jsonl)에서 조사 에이전트가 돌려준 스팟 JSON을 긁어모은다.

사용법:  python tools/pull-spots.py <세션.jsonl> <출력.json>
  ```json [ ... ] ``` 블록 중 각 원소에 cat·n 이 있는 것만 모은다.
  이미 js/data-spots.js 에 있는 것과 REJECT 목록은 뺀다.
"""
import io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "js", "data-spots.js")
FENCE = re.compile(r"```json\s*(\[.*?\])\s*```", re.S)

# 확인이 안 돼서 일부러 뺀 것들 — 다시 들어오지 않게 막는다
REJECT = {
    ("cafe", "리플로우 북한산점"),   # 폐점 의심, 카카오에서 확인 불가
    ("food", "숙영식당"),            # 경주. 카카오·웹 어디에도 없음
    ("cafe", "..."),                 # 옮겨 적다 깨진 행
    ("food", "..."), ("stay", "..."), ("hike", "..."),
    ("beach", "..."), ("culture", "..."), ("drive", "..."),
    # 이미 들어 있는 항목이 이름만 달리해 다시 잡히는 것들
    ("hike", "정발산 (정발산공원)"),
    ("hike", "행주산성 역사누리길 (덕양산)"),
    ("hike", "감악산 (출렁다리)"),
    ("hike", "용마산 정상 (용마폭포공원 코스)"),
    ("hike", "백운산 (포천 광덕고개·백운계곡)"),
    ("beach", "웅천해변"),
    ("drive", "만항재 414번 지방도 (차로 갈 수 있는 가장 높은 고개)"),
    ("cafe", "행주산성 대대리 135"),
    # 앞선 차수에서 지점 문제·검증 부족으로 넣지 않기로 한 것들
    ("cafe", "헤올커피로스터즈"), ("food", "돈사돈 본관"), ("food", "흑돈가 제주본점"),
    ("food", "다로베"), ("food", "임금님쌀밥집"), ("food", "초원"),
    # 카카오·웹 어디에도 실체가 없어 좌표를 못 붙인 곳 (추측 금지)
    ("cafe", "일다 (동명동)"), ("cafe", "카페 하멜"), ("cafe", "카페 라라라"),
    ("cafe", "짐바란비치"), ("stay", "태안 풀빌라케럿"),
    ("camp", "태안 청포대카라반빌리지"), ("camp", "제주에코힐글램핑"),
    # 미란다호텔: 영업 중단 후 재개 미확인·도메인 만료 / 울산발리온천: 조사 주소와 카카오 위치 불일치
    ("spa", "미란다호텔 스파플러스"), ("spa", "울산발리온천"),
    # 여기어때·야놀자·캠핏·구글 어디에도 상호가 없어 실재 확인 불가
    ("stay", "단양 피플스토리펜션"),
}

def strings(d):
    if isinstance(d, dict):
        for v in d.values(): yield from strings(v)
    elif isinstance(d, list):
        for v in d: yield from strings(v)
    elif isinstance(d, str):
        yield d

def current_spots():
    dump = os.path.join(ROOT, "tools", "_cur.json")
    subprocess.run(["node", "-e",
        "const vm=require('vm'),fs=require('fs');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(%r,'utf8')+';globalThis.__S=SPOTS;',c);"
        "fs.writeFileSync(%r, JSON.stringify(c.__S),'utf8');"
        % (JS.replace("\\", "/"), dump.replace("\\", "/"))], check=True)
    rows = json.load(io.open(dump, encoding="utf-8"))
    os.remove(dump)
    return rows

def main(jl, out_path):
    have = {(s["cat"], s["n"]) for s in current_spots()}
    found, seen = {}, set()
    for line in io.open(jl, encoding="utf-8"):
        if "```json" not in line: continue
        try: o = json.loads(line)
        except Exception: continue
        for s in strings(o):
            if "```json" not in s or '"cat"' not in s: continue
            h = hash(s)
            if h in seen: continue
            seen.add(h)
            for b in FENCE.findall(s):
                try: rows = json.loads(b)
                except Exception: continue
                if not isinstance(rows, list): continue
                for r in rows:
                    if not isinstance(r, dict): continue
                    cat, n = r.get("cat"), r.get("n")
                    if not cat or not n: continue
                    if not r.get("r"): continue          # 부분 패치 행은 건너뛴다
                    # HTML 이스케이프가 섞여 들어오면 이름이 달라 보인다
                    n = n.replace("&amp;", "&").strip()
                    r["n"] = n
                    key = (cat, n)
                    if key in have or key in REJECT: continue
                    # 표기 흔들림 보정 — conf 는 high/mid/low 셋뿐
                    c = str(r.get("conf", "")).lower()
                    r["conf"] = {"med": "mid", "medium": "mid", "": "low"}.get(c, c)
                    if r["conf"] not in ("high", "mid", "low"): r["conf"] = "low"
                    if r.get("r") == "경기": r["r"] = "경기남부"
                    found[key] = r

    rows = list(found.values())
    json.dump(rows, io.open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    per = {}
    for r in rows: per[r["cat"]] = per.get(r["cat"], 0) + 1
    print("새 스팟 %d곳" % len(rows))
    for k in sorted(per): print("  %-8s %3d" % (k, per[k]))

main(sys.argv[1], sys.argv[2])
