# -*- coding: utf-8 -*-
"""카카오로 찾은 좌표를 js/data-spots.js 에 채워 넣는다.

사용법:  python tools/apply-coords.py <coords.json>
  coords.json 은 {"스팟이름": [lat, lng], ...}
좌표가 이미 있는 항목은 건드리지 않는다.
"""
import io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "js", "data-spots.js")

def main(path):
    coords = json.load(io.open(path, encoding="utf-8"))
    dump = os.path.join(ROOT, "tools", "_cur.json")
    subprocess.run(["node", "-e",
        "const vm=require('vm'),fs=require('fs');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(%r,'utf8')+';globalThis.__S=SPOTS;',c);"
        "fs.writeFileSync(%r, JSON.stringify(c.__S),'utf8');"
        % (JS.replace("\\", "/"), dump.replace("\\", "/"))], check=True)
    spots = json.load(io.open(dump, encoding="utf-8"))
    os.remove(dump)

    hit, miss = 0, []
    for s in spots:
        if s.get("lat") is not None: continue
        c = coords.get(s["n"])
        if c: s["lat"], s["lng"] = c[0], c[1]; hit += 1
        else: miss.append(s["cat"] + " | " + s["n"])

    body = ",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in spots)
    src = io.open(JS, encoding="utf-8").read()
    new, n = re.subn(r"const SPOTS = \[.*?\n\];", "const SPOTS = [\n" + body + "\n];", src, count=1, flags=re.S)
    if n != 1: print("!! SPOTS 배열을 찾지 못했습니다"); sys.exit(1)
    io.open(JS, "w", encoding="utf-8").write(new)

    rep = io.open(os.path.join(ROOT, "tools", "coord-report.txt"), "w", encoding="utf-8")
    rep.write("좌표 채움 %d곳 / 전체 %d곳\n" % (hit, len(spots)))
    if miss:
        rep.write("\n아직 좌표 없는 것 %d곳:\n" % len(miss))
        for m in miss: rep.write("  - %s\n" % m)
    rep.close()
    print("OK")

main(sys.argv[1])
