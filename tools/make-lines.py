# -*- coding: utf-8 -*-
"""경계선을 '한 겹'으로 합치고 도 경계 / 시군구 경계로 나눈다 (js/map-lines.js).

선과 색을 **모두 시군구 도형 하나에서** 뽑는다.
시도 도형과 시군구 도형은 따로 단순화돼 10%가 0.7단위 넘게 어긋나므로,
둘을 섞어 쓰면 색이 바뀌는 자리와 선이 어긋나 보인다.

중복 제거는 '다른 도형이 이미 그린 자리인가'로만 판단한다.
자기 도형의 앞뒤 선분끼리는 당연히 붙어 있으므로 세면 안 된다(전에 이걸로 선이 사라졌다).
"""
import io, json, math

CELL, STEP, DUP = 0.2, 0.1, 0.7

def parse(d):
    toks, num = [], ""
    for ch in d:
        if ch in "MLZmlz":
            if num: toks.append(num); num = ""
            toks.append(ch.upper())
        elif ch in " ,":
            if num: toks.append(num); num = ""
        else: num += ch
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
        else: i += 1
    return out

def cells_of(a, b):
    L = math.hypot(b[0]-a[0], b[1]-a[1])
    k = max(2, int(L/STEP)+1)
    out = []
    for i in range(k):
        t = i/(k-1)
        p = (a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)
        out.append((int(math.floor(p[0]/CELL)), int(math.floor(p[1]/CELL))))
    return out

D = json.load(io.open("borders.json", encoding="utf-8"))

kept   = []     # (a, b)
same   = []     # 같은 도의 이웃과 맞닿았나
diff   = []     # 다른 도의 이웃과 맞닿았나
owner  = {}     # 격자칸 → (kept 번호, 도형 번호)

for pi, s in enumerate(D["sgg"]):
    sido = s["c"][:2]
    for a, b in parse(s["d"]):
        cs = cells_of(a, b)
        hit = [owner[c] for c in cs if c in owner and owner[c][1] != pi]   # 남이 그린 것만
        if len(hit) / len(cs) >= DUP:
            for idx, opi in set(hit):
                if D["sgg"][opi]["c"][:2] == sido: same[idx] = True
                else:                              diff[idx] = True
            continue
        kept.append((a, b)); same.append(False); diff.append(False)
        me = len(kept) - 1
        for cx, cy in cs:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    owner.setdefault((cx+dx, cy+dy), (me, pi))

def to_path(items):
    d, last = [], None
    for a, b in items:
        if last and abs(last[0]-a[0]) < 1e-9 and abs(last[1]-a[1]) < 1e-9:
            d.append("L%g %g" % b)
        else:
            d.append("M%g %gL%g %g" % (a[0], a[1], b[0], b[1]))
        last = b
    return "".join(d)

prov_items, dist_items = [], []
for i, (a, b) in enumerate(kept):
    if diff[i] or not same[i]:   # 다른 도와 맞닿음, 또는 이웃 없음(바닷가)
        prov_items.append((a, b))
    else:
        dist_items.append((a, b))

sido_path, sgg_path = to_path(prov_items), to_path(dist_items)
print("남긴 선분 %d개 → 도 경계·바닷가 %d · 시군구 경계 %d"
      % (len(kept), len(prov_items), len(dist_items)))

codes = [s["c"] for s in D["sido"]]
idx = {c: i for i, c in enumerate(codes)}
sgg_tone = [idx.get(s["c"][:2], 0) for s in D["sgg"]]

js = ("/* map-lines.js — tools/make-lines.py 로 생성. 손대지 마세요.\n"
      "   선과 색을 모두 시군구 도형에서 뽑아 서로 어긋나지 않게 한 것.\n"
      "   SIDO_LINE: 도 경계·바닷가 / SGG_LINE: 도 안쪽 시군구 경계\n"
      "   SGG_TONE[i]: i번째 시군구가 몇 번째 시도에 속하는가 (색 맞추기용) */\n"
      "const SIDO_LINE = " + json.dumps(sido_path) + ";\n"
      "const SGG_LINE = "  + json.dumps(sgg_path) + ";\n"
      "const SGG_TONE = "  + json.dumps(sgg_tone, separators=(",", ":")) + ";\n")
io.open("js/map-lines.js", "w", encoding="utf-8").write(js)
print("→ js/map-lines.js (%.1fKB)" % (len(js)/1024.0))
