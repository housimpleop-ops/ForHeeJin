# -*- coding: utf-8 -*-
"""겹쳐 그려지는 행정경계를 '한 줄'로 합친다 (js/map-lines.js 생성).

문제: 시군구 도형은 각자 자기 외곽선을 그린다. 이웃과 맞닿은 경계는 두 번 그려지는데,
      두 도형의 좌표가 서로 조금씩 달라(정확히 겹치는 건 30%뿐) 나란한 두 줄로 보인다.
해결: 이미 그린 선이 지나간 자리를 격자에 표시해 두고,
      새 선분이 그 자리를 대부분 다시 지나가면 건너뛴다. 결과는 선 하나짜리 경계망.
"""
import io, json, math, sys

CELL  = 0.2    # 격자 한 칸 (지도 전체가 300x420)
STEP  = 0.1    # 선분을 따라 점을 찍는 간격
DUP   = 0.75   # 점의 이 비율 이상이 이미 그려진 자리면 중복으로 본다

def parse(d):
    """path 문자열 → [((x,y),(x,y)), ...] 선분 목록. M/L/Z 를 다룬다."""
    toks, num = [], ""
    for ch in d:
        if ch in "MLZmlz":
            if num: toks.append(num); num = ""
            toks.append(ch.upper())
        elif ch in " ,":
            if num: toks.append(num); num = ""
        else:
            num += ch
    if num: toks.append(num)

    out, cur, start, i = [], None, None, 0
    while i < len(toks):
        t = toks[i]
        if t == "M":
            cur = (float(toks[i+1]), float(toks[i+2])); start = cur; i += 3
        elif t == "L":
            p = (float(toks[i+1]), float(toks[i+2]))
            if cur: out.append((cur, p))
            cur = p; i += 3
        elif t == "Z":
            if cur and start and cur != start: out.append((cur, start))
            cur = start; i += 1
        else:
            i += 1
    return out

def build(shapes, label):
    covered = set()
    kept = []
    seg_total = 0
    for s in shapes:
        for a, b in parse(s["d"]):
            seg_total += 1
            L = math.hypot(b[0]-a[0], b[1]-a[1])
            k = max(2, int(L/STEP)+1)
            pts = [(a[0]+(b[0]-a[0])*i/(k-1), a[1]+(b[1]-a[1])*i/(k-1)) for i in range(k)]
            cells = [(int(math.floor(p[0]/CELL)), int(math.floor(p[1]/CELL))) for p in pts]
            hit = sum(1 for c in cells if c in covered)
            if hit / len(cells) >= DUP:
                continue                      # 이웃이 이미 그린 경계
            kept.append((a, b))
            for cx, cy in cells:              # 3x3 붓으로 자리 표시
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        covered.add((cx+dx, cy+dy))
    # 이어지는 선분끼리 묶어 path 를 짧게
    d, last = [], None
    for a, b in kept:
        if last and abs(last[0]-a[0]) < 1e-9 and abs(last[1]-a[1]) < 1e-9:
            d.append("L%g %g" % b)
        else:
            d.append("M%g %gL%g %g" % (a[0], a[1], b[0], b[1]))
        last = b
    path = "".join(d)
    print("%s: 선분 %d -> %d (%.0f%% 제거), path %.1fKB"
          % (label, seg_total, len(kept), (1-len(kept)/seg_total)*100, len(path)/1024))
    return path

D = json.load(io.open("borders.json", encoding="utf-8"))
sido = build(D["sido"], "시도")
sgg  = build(D["sgg"],  "시군구")
js = ("/* map-lines.js — tools/make-lines.py 로 생성. 손대지 마세요.\n"
      "   이웃끼리 두 번 그려지던 경계를 한 줄로 합친 것. */\n"
      "const SIDO_LINE = " + json.dumps(sido, ensure_ascii=False) + ";\n"
      "const SGG_LINE = "  + json.dumps(sgg,  ensure_ascii=False) + ";\n")
io.open("js/map-lines.js", "w", encoding="utf-8").write(js)
print("→ js/map-lines.js (%.1fKB)" % (len(js)/1024.0))
