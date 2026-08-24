# -*- coding: utf-8 -*-
"""scratchpad/spot-*.json 을 모두 읽어 js/data-spots.js 의 SPOTS 배열을 갱신한다."""
import glob, io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
JS = r"C:\dev\couple-planner\js\data-spots.js"

CAT_ORDER = ["cafe", "food", "hike", "stay", "beach", "valley", "culture",
             "fest", "camp", "drive", "snow", "spa"]
REG_ORDER = ["경기북부", "서울", "인천", "경기남부", "강원", "충청", "전라", "경상", "제주"]
CONF_ORDER = ["high", "mid", "low"]


def richness(s):
    """비어 있지 않은 항목이 몇 개인지 — 같은 이름이면 정보가 많은 쪽을 남긴다."""
    n = 0
    for v in s.values():
        if v is None or v == "" or v == []:
            continue
        n += 1
        if isinstance(v, str):
            n += len(v) / 500.0
    return n


def main():
    files = sorted(glob.glob(os.path.join(HERE, "spot-*.json")))
    by_name = {}
    counts = {}
    for f in files:
        rows = json.load(io.open(f, encoding="utf-8"))
        counts[os.path.basename(f)] = len(rows)
        for s in rows:
            key = (s["cat"], s["n"].strip())
            old = by_name.get(key)
            if old is None or richness(s) > richness(old):
                by_name[key] = s

    spots = list(by_name.values())
    spots.sort(key=lambda s: (
        CAT_ORDER.index(s["cat"]) if s["cat"] in CAT_ORDER else 99,
        REG_ORDER.index(s.get("r", "")) if s.get("r") in REG_ORDER else 99,
        CONF_ORDER.index(s.get("conf", "low")) if s.get("conf") in CONF_ORDER else 9,
        s["n"],
    ))

    body = ",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in spots)
    src = io.open(JS, encoding="utf-8").read()
    new, n = re.subn(r"const SPOTS = \[.*?\n\];",
                     "const SPOTS = [\n" + body + "\n];",
                     src, count=1, flags=re.S)
    if n != 1:
        print("!! SPOTS 배열을 찾지 못했습니다"); sys.exit(1)
    io.open(JS, "w", encoding="utf-8").write(new)

    per_cat = {}
    for s in spots:
        per_cat[s["cat"]] = per_cat.get(s["cat"], 0) + 1
    per_reg = {}
    for s in spots:
        per_reg[s.get("r", "?")] = per_reg.get(s.get("r", "?"), 0) + 1
    coord = sum(1 for s in spots if s.get("lat"))

    out = io.open(os.path.join(HERE, "merge-report.txt"), "w", encoding="utf-8")
    out.write("입력 파일 %d개\n" % len(files))
    for k in sorted(counts):
        out.write("  %-28s %3d\n" % (k, counts[k]))
    out.write("\n중복 제거 후 총 %d곳 (좌표 있는 곳 %d)\n\n" % (len(spots), coord))
    out.write("분류별:\n")
    for c in CAT_ORDER:
        if c in per_cat:
            out.write("  %-8s %3d\n" % (c, per_cat[c]))
    out.write("\n지역별:\n")
    for r in REG_ORDER:
        if r in per_reg:
            out.write("  %-6s %3d\n" % (r, per_reg[r]))
    out.close()
    print("OK")


main()
