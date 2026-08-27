# -*- coding: utf-8 -*-
"""세션 기록(jsonl)에서 러닝 스팟(cat:"run") 조사 결과를 긁어 js/data-run.js 에 합친다.

사용법:  python tools/pull-run.py <세션.jsonl>
  이미 있는 이름은 건너뛴다. 좌표는 null 로 두고 나중에 카카오로 채운다.
"""
import io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "js", "data-run.js")
FENCE = re.compile(r"```json\s*(\[.*?\])\s*```", re.S)
KEYS = ["n","r","a","km","kmTxt","s","el","sh","pk","pkTxt","parkSpot",
        "bug","lit","wc","water","season","tip","lat","lng","conf"]


def strings(d):
    if isinstance(d, dict):
        for v in d.values(): yield from strings(v)
    elif isinstance(d, list):
        for v in d: yield from strings(v)
    elif isinstance(d, str):
        yield d


def current():
    dump = os.path.join(ROOT, "tools", "_cur.json")
    subprocess.run(["node", "-e",
        "const vm=require('vm'),fs=require('fs');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(%r,'utf8')+';globalThis.__S=RUN_SPOTS;',c);"
        "fs.writeFileSync(%r, JSON.stringify(c.__S),'utf8');"
        % (JS.replace("\\", "/"), dump.replace("\\", "/"))], check=True)
    rows = json.load(io.open(dump, encoding="utf-8"))
    os.remove(dump)
    return rows


def main(jl):
    rows = current()
    have = {s["n"].strip() for s in rows}
    added = []
    for line in io.open(jl, encoding="utf-8"):
        if "```json" not in line: continue
        try: o = json.loads(line)
        except Exception: continue
        for txt in strings(o):
            for m in FENCE.findall(txt):
                try: arr = json.loads(m)
                except Exception: continue
                if not isinstance(arr, list): continue
                for s in arr:
                    if not isinstance(s, dict) or s.get("cat") != "run": continue
                    if "n" not in s or "conf" not in s: continue
                    name = s["n"].strip()
                    if name in have: continue
                    have.add(name)
                    added.append({k: s.get(k) for k in KEYS})
    rows += added
    body = ",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in rows)
    src = io.open(JS, encoding="utf-8").read()
    new, n = re.subn(r"const RUN_SPOTS = \[.*?\n\];",
                     "const RUN_SPOTS = [\n" + body + "\n];", src, count=1, flags=re.S)
    if n != 1:
        print("!! RUN_SPOTS 배열을 찾지 못했습니다"); sys.exit(1)
    io.open(JS, "w", encoding="utf-8").write(new)
    io.open(os.path.join(ROOT, "tools", "run-report.txt"), "w", encoding="utf-8").write(
        "새로 넣은 러닝 %d곳 (전체 %d곳)\n\n" % (len(added), len(rows))
        + "\n".join("  " + a["n"] + " | " + str(a["r"]) + " | " + str(a["km"]) + "km" for a in added))
    print("OK")


main(sys.argv[1])
